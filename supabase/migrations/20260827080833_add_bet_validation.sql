create or replace function public.place_bet(
    p_outcome_id uuid,
    p_stake bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_profile_id uuid;
    v_market_id uuid;
    v_market_status text;
    v_closes_at timestamptz;
    v_balance bigint;
    v_max_stake bigint;
    v_existing_position_id uuid;
    v_existing_outcome_id uuid;
    v_new_stake bigint;
    v_new_pool bigint;
begin
    v_profile_id := auth.uid();

    if v_profile_id is null then
        raise exception 'Authentication required';
    end if;

    if p_stake is null or p_stake < 10 then
        raise exception 'Minimum stake is 10';
    end if;

    perform 1
    from public.profiles
    where id = v_profile_id
    for update;

    if not found then
        raise exception 'Profile not found';
    end if;

    select
        outcomes.market_id,
        markets.status,
        markets.closes_at
    into
        v_market_id,
        v_market_status,
        v_closes_at
    from public.outcomes
    join public.markets
        on markets.id = outcomes.market_id
    where outcomes.id = p_outcome_id
    for update of outcomes, markets;

    if not found then
        raise exception 'Outcome not found';
    end if;

    if v_market_status <> 'open' then
        raise exception 'Market is not open';
    end if;

    if v_closes_at <= now() then
        raise exception 'Market has already closed';
    end if;

    select coalesce(sum(delta), 0)
    into v_balance
    from public.ledger
    where profile_id = v_profile_id;

    if p_stake > v_balance then
        raise exception
            'Stake exceeds available balance of %',
            v_balance;
    end if;

    v_max_stake := least(v_balance / 5, 500);

    if p_stake > v_max_stake then
        raise exception
            'Maximum stake is %',
            v_max_stake;
    end if;

    select
        id,
        outcome_id
    into
        v_existing_position_id,
        v_existing_outcome_id
    from public.positions
    where profile_id = v_profile_id
      and market_id = v_market_id
    limit 1
    for update;

    if found then
        if v_existing_outcome_id <> p_outcome_id then
            raise exception
                'You already placed a bet on the opposite outcome for this market';
        end if;

        update public.positions
        set
            stake = stake + p_stake,
            updated_at = now()
        where id = v_existing_position_id
        returning stake into v_new_stake;
    else
        insert into public.positions (
            profile_id,
            market_id,
            outcome_id,
            stake
        )
        values (
            v_profile_id,
            v_market_id,
            p_outcome_id,
            p_stake
        )
        returning id, stake
        into v_existing_position_id, v_new_stake;
    end if;

    insert into public.ledger (
        profile_id,
        delta,
        reason,
        ref_id
    )
    values (
        v_profile_id,
        -p_stake,
        'bet_placed',
        v_existing_position_id
    );

    update public.outcomes
    set pool = pool + p_stake
    where id = p_outcome_id
    returning pool into v_new_pool;

    return jsonb_build_object(
        'position_id', v_existing_position_id,
        'stake', v_new_stake,
        'pool', v_new_pool,
        'balance', v_balance - p_stake
    );
end;
$$;

revoke all on function public.place_bet(uuid, bigint) from public;
grant execute on function public.place_bet(uuid, bigint) to authenticated;