-- Seeded liquidity becomes the counterparty, so a correct bet pays out even
-- when nobody took the other side.
--
-- Payouts were parimutuel over user stakes alone. A solo bettor was therefore
-- the entire winning pool AND the entire total pool, so the payout formula
-- returned exactly the stake: being right was worth nothing. Meanwhile the
-- outcome pools already carry a `liquidity` component that sets the starting
-- odds and is shown to bettors as the price, but settlement ignored it.
--
-- Settlement now uses those same pools. Winners split the market's whole pool
-- in proportion to their share of the winning side, so the odds a bettor saw
-- are the odds they are paid at:
--
--   payout = stake * (sum of all outcome pools) / (winning outcome's pool)
--
-- With 50/50 seeding, a solo 100 on YES pays 133 (pools 150 vs 50, total 200).
-- A long shot seeded at 10% pays far more, a heavy favourite barely anything.
-- An evenly matched two-sided market is unchanged: 100 against 100 with 50/50
-- seeding still pays the winner 200.
--
-- Redefined from 20260904155155_resolve_unbacked_winner_as_loss.sql.

create or replace function public.admin_resolve_market(
    p_market_id uuid,
    p_outcome_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_title text;
    v_status text;
    v_outcome_id uuid;
    v_outcome_name text;
    v_total_stakes bigint;
    v_winning_stakes bigint;
    v_total_pool bigint;
    v_winning_pool bigint;
    v_payout_total bigint;
    v_floor_total bigint;
    v_remaining bigint;
begin
    v_outcome_name := upper(trim(coalesce(p_outcome_name, '')));
    if v_outcome_name not in ('YES', 'NO') then
        raise exception 'Outcome must be YES or NO';
    end if;

    select title, status into v_title, v_status
    from public.markets
    where id = p_market_id and deleted_at is null
    for update;

    if not found then
        raise exception 'Market not found';
    end if;
    if v_status <> 'closed' then
        raise exception 'Close betting before resolving the market';
    end if;

    select id into v_outcome_id
    from public.outcomes
    where market_id = p_market_id and upper(name) = v_outcome_name
    for update;

    -- Which branch applies is decided by real money staked by users.
    select coalesce(sum(stake), 0)::bigint into v_total_stakes
    from public.positions
    where market_id = p_market_id and status = 'OPEN';

    select coalesce(sum(stake), 0)::bigint into v_winning_stakes
    from public.positions
    where market_id = p_market_id and outcome_id = v_outcome_id and status = 'OPEN';

    -- What gets paid out is drawn from the outcome pools, which are
    -- liquidity + wager_pool -- the same figures that set the odds shown to
    -- bettors. Including the seeded liquidity is what makes the house the
    -- counterparty, so a correct call still profits when nobody took the other
    -- side. Read before the branches below reset the pools.
    select coalesce(sum(pool), 0)::bigint into v_total_pool
    from public.outcomes
    where market_id = p_market_id;

    select coalesce(pool, 0)::bigint into v_winning_pool
    from public.outcomes
    where id = v_outcome_id;

    -- Nobody bet at all. There is nothing to win or lose, so the market is
    -- voided rather than resolved. Unchanged from the original behaviour.
    if v_total_stakes = 0 then
        update public.outcomes
        set wager_pool = 0, pool = liquidity
        where market_id = p_market_id;

        update public.markets
        set status = 'voided', resolved_outcome_id = null, resolved_at = now()
        where id = p_market_id;

        perform private.record_admin_action(
            v_admin_id, 'MARKET_VOIDED', 'MARKET', p_market_id,
            v_title, 'Voided market because it had no bets', 'No bets placed'
        );
        return;
    end if;

    -- Bets exist, but none of them backed the winning outcome. Every open bet
    -- called it wrong, so every open bet loses.
    --
    -- This branch used to refund all of them and void the market, which made a
    -- wrong call cost nothing whenever the bettor was alone on their side --
    -- the normal case for a single tester. It also kept the portfolio's daily
    -- profit at zero, because a REFUNDED position is worth exactly its stake.
    -- Losers are settled the same way as in the ordinary path below: LOST with
    -- a zero payout, which satisfies positions_status_matches_settlement.
    --
    -- There is deliberately no ledger entry: a losing stake was already debited
    -- when the bet was placed, and there are no winners to distribute it to.
    if v_winning_stakes = 0 then
        update public.positions
        set status = 'LOST', payout = 0, settled_at = now(), updated_at = now()
        where market_id = p_market_id and status = 'OPEN';

        update public.outcomes
        set wager_pool = 0, pool = liquidity
        where market_id = p_market_id;

        update public.markets
        set status = 'resolved', resolved_outcome_id = v_outcome_id, resolved_at = now()
        where id = p_market_id;

        perform private.record_admin_action(
            v_admin_id, 'MARKET_RESOLVED', 'MARKET', p_market_id,
            v_title, 'Resolved ' || v_outcome_name || ' with no winning bets', ''
        );
        return;
    end if;

    if v_winning_pool <= 0 then
        raise exception 'The winning outcome has no pool to pay from';
    end if;

    -- Winners take their proportional share of the whole pool. The remainder is
    -- the house's own liquidity sitting on the winning side, which it keeps --
    -- paying out all of v_total_pool would hand winners the house's own stake
    -- as well, and would make every market a guaranteed loss for the house.
    v_payout_total := (v_winning_stakes * v_total_pool) / v_winning_pool;

    select coalesce(sum((stake * v_total_pool) / v_winning_pool), 0)::bigint
    into v_floor_total
    from public.positions
    where market_id = p_market_id and outcome_id = v_outcome_id and status = 'OPEN';
    v_remaining := v_payout_total - v_floor_total;

    with allocations as (
        select
            id,
            ((stake * v_total_pool) / v_winning_pool)::bigint as floor_payout,
            mod(stake * v_total_pool, v_winning_pool) as remainder,
            created_at
        from public.positions
        where market_id = p_market_id
          and outcome_id = v_outcome_id
          and status = 'OPEN'
    ), ranked as (
        select
            id,
            floor_payout,
            row_number() over (order by remainder desc, created_at asc, id asc) as remainder_rank
        from allocations
    )
    update public.positions as position
    set status = 'WON',
        payout = ranked.floor_payout + case when ranked.remainder_rank <= v_remaining then 1 else 0 end,
        settled_at = now(),
        updated_at = now()
    from ranked
    where position.id = ranked.id;

    update public.positions
    set status = 'LOST', payout = 0, settled_at = now(), updated_at = now()
    where market_id = p_market_id
      and outcome_id <> v_outcome_id
      and status = 'OPEN';

    insert into public.ledger (profile_id, delta, reason, ref_id)
    select profile_id, payout, 'market_settlement', id
    from public.positions
    where market_id = p_market_id and status = 'WON';

    update public.markets
    set status = 'resolved', resolved_outcome_id = v_outcome_id, resolved_at = now()
    where id = p_market_id;

    perform private.record_admin_action(
        v_admin_id, 'MARKET_RESOLVED', 'MARKET', p_market_id,
        v_title, 'Resolved market ' || v_outcome_name, ''
    );
end;
$$;
