-- Persisted market probability history.
--
-- The home feed charted a hardcoded probabilityHistory map keyed by '1'..'4',
-- which never matched a real market UUID, so every market drew the same four
-- fake series. Nothing recorded how a market's odds actually moved. This stores
-- a point every time the YES probability changes, so the chart can show it.
--
-- Probability is derived from the outcome pools rather than stored on the
-- market, so a point is a snapshot: whoever changes a pool records one.

create table if not exists public.market_probability_points (
    id uuid primary key default gen_random_uuid(),
    market_id uuid not null references public.markets(id) on delete cascade,
    yes_probability numeric(6, 5) not null check (yes_probability between 0 and 1),
    total_pool bigint not null check (total_pool >= 0),
    source text not null,
    recorded_at timestamptz not null default now(),

    constraint market_probability_points_source_check check (source in (
        'MARKET_CREATED',
        'ODDS_OVERRIDE',
        'BET_PLACED',
        'BET_REFUNDED'
    ))
);

-- Every read is "the series for this market, oldest first".
create index if not exists market_probability_points_market_recorded_idx
on public.market_probability_points (market_id, recorded_at);

alter table public.market_probability_points enable row level security;

-- New tables get no privileges by default -- 20260904074053 left the
-- ALTER DEFAULT PRIVILEGES revokes in place -- so both roles are explicit.
revoke all on table public.market_probability_points from anon, authenticated;
grant select on table public.market_probability_points to authenticated;
grant all on table public.market_probability_points to service_role;

-- History is readable exactly when its market is. The subquery runs under the
-- caller's privileges, so the markets SELECT policy decides visibility and this
-- policy cannot leak a market the reader could not already see. Writes have no
-- policy at all: points are only ever inserted by the definer function below.
drop policy if exists "Users can read market probability points"
    on public.market_probability_points;

create policy "Users can read market probability points"
on public.market_probability_points
for select
to authenticated
using (
    exists (
        select 1
        from public.markets
        where markets.id = market_probability_points.market_id
    )
);

-- Snapshots the market's current YES probability. Kept in `private` and
-- revoked from the Data API roles: it is a helper for the definer functions
-- below, never something a client should be able to call.
create or replace function private.record_probability_point(
    p_market_id uuid,
    p_source text
)
returns void
language sql
security definer
set search_path = ''
as $fn$
    insert into public.market_probability_points (
        market_id,
        yes_probability,
        total_pool,
        source
    )
    select
        p_market_id,
        case
            when coalesce(sum(pool), 0) > 0
            then round(
                coalesce(sum(pool) filter (where lower(name) = 'yes'), 0)::numeric
                    / sum(pool),
                5
            )
            else 0.5
        end,
        coalesce(sum(pool), 0),
        p_source
    from public.outcomes
    where market_id = p_market_id;
$fn$;

revoke all on function private.record_probability_point(uuid, text)
    from public, anon, authenticated;

-- Existing markets have no history at all. Give each one an opening point
-- stamped with the market's creation time so its chart is not empty.
insert into public.market_probability_points (
    market_id,
    yes_probability,
    total_pool,
    source,
    recorded_at
)
select
    markets.id,
    case
        when coalesce(sum(outcomes.pool), 0) > 0
        then round(
            coalesce(sum(outcomes.pool) filter (where lower(outcomes.name) = 'yes'), 0)::numeric
                / sum(outcomes.pool),
            5
        )
        else 0.5
    end,
    coalesce(sum(outcomes.pool), 0),
    'MARKET_CREATED',
    markets.created_at
from public.markets
left join public.outcomes on outcomes.market_id = markets.id
where not exists (
    select 1
    from public.market_probability_points
    where market_probability_points.market_id = markets.id
)
group by markets.id, markets.created_at;

-- The four paths that move a market's probability now each record a point.
-- Resolving or voiding a market is deliberately not one of them: those reset
-- wager_pool to zero as part of settlement, which would draw a phantom swing
-- back to the seeded odds after the market had already stopped trading.
--
-- Each function below is its previous definition from
-- 20260904090000_connect_admin_controls.sql with the recording call added.

create or replace function public.admin_create_market(
    p_title text,
    p_description text,
    p_category text,
    p_closes_at timestamptz,
    p_resolution_criteria text,
    p_yes_percentage integer default 50
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_market_id uuid;
    v_title text := trim(coalesce(p_title, ''));
    v_category text := trim(coalesce(p_category, ''));
    v_criteria text := trim(coalesce(p_resolution_criteria, ''));
begin
    if v_title = '' or v_category = '' or v_criteria = '' then
        raise exception 'Question, category and resolution criteria are required';
    end if;
    if p_closes_at is null or p_closes_at <= now() then
        raise exception 'Closing date must be in the future';
    end if;
    if p_yes_percentage not between 1 and 99 then
        raise exception 'YES percentage must be between 1 and 99';
    end if;

    insert into public.markets (title, description, category, closes_at, resolution_criteria)
    values (v_title, trim(coalesce(p_description, '')), v_category, p_closes_at, v_criteria)
    returning id into v_market_id;

    insert into public.outcomes (market_id, name, pool, liquidity, wager_pool)
    values
        (v_market_id, 'Yes', p_yes_percentage, p_yes_percentage, 0),
        (v_market_id, 'No', 100 - p_yes_percentage, 100 - p_yes_percentage, 0);

    perform private.record_probability_point(v_market_id, 'MARKET_CREATED');

    perform private.record_admin_action(
        v_admin_id, 'MARKET_CREATED', 'MARKET', v_market_id,
        v_title, 'Created market', ''
    );
    return v_market_id;
end;
$$;

create or replace function public.admin_override_odds(
    p_market_id uuid,
    p_yes_percentage integer,
    p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_reason text := private.require_reason(p_reason);
    v_title text;
begin
    if p_yes_percentage not between 1 and 99 then
        raise exception 'YES percentage must be between 1 and 99';
    end if;

    select title into v_title
    from public.markets
    where id = p_market_id
      and status in ('open', 'closed')
      and deleted_at is null
    for update;

    if not found then
        raise exception 'Only unresolved, undeleted markets can change odds';
    end if;

    if exists (select 1 from public.positions where market_id = p_market_id) then
        raise exception 'Starting odds cannot be changed after the first bet';
    end if;

    update public.outcomes
    set liquidity = case when lower(name) = 'yes' then p_yes_percentage else 100 - p_yes_percentage end,
        pool = case when lower(name) = 'yes' then p_yes_percentage else 100 - p_yes_percentage end
    where market_id = p_market_id;

    perform private.record_probability_point(p_market_id, 'ODDS_OVERRIDE');

    perform private.record_admin_action(
        v_admin_id, 'ODDS_OVERRIDE', 'MARKET', p_market_id,
        v_title, 'Changed YES odds to ' || p_yes_percentage || '%', v_reason
    );
end;
$$;

create or replace function public.admin_refund_bet(
    p_position_id uuid,
    p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_reason text := private.require_reason(p_reason);
    v_profile_id uuid;
    v_market_id uuid;
    v_outcome_id uuid;
    v_stake bigint;
    v_target text;
begin
    select position.profile_id, position.market_id, position.outcome_id, position.stake,
           coalesce(profile.username, 'Student') || ' · ' || market.title
    into v_profile_id, v_market_id, v_outcome_id, v_stake, v_target
    from public.positions as position
    join public.profiles as profile on profile.id = position.profile_id
    join public.markets as market on market.id = position.market_id
    where position.id = p_position_id and position.status = 'OPEN'
    for update of position, market;

    if not found then
        raise exception 'Only an open bet can be refunded';
    end if;

    insert into public.ledger (profile_id, delta, reason, ref_id)
    values (v_profile_id, v_stake, 'refund', p_position_id);

    update public.positions
    set status = 'REFUNDED', payout = v_stake, settled_at = now(), updated_at = now()
    where id = p_position_id;

    update public.outcomes
    set wager_pool = greatest(wager_pool - v_stake, 0),
        pool = greatest(pool - v_stake, liquidity)
    where id = v_outcome_id;

    perform private.record_probability_point(v_market_id, 'BET_REFUNDED');

    perform private.record_admin_action(
        v_admin_id, 'BET_REFUNDED', 'BET', p_position_id,
        v_target, 'Removed and refunded bet', v_reason
    );
end;
$$;

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
    v_profile_id uuid := auth.uid();
    v_market_id uuid;
    v_market_status text;
    v_closes_at timestamptz;
    v_balance bigint;
    v_max_stake bigint;
    v_existing_position_id uuid;
    v_existing_outcome_id uuid;
    v_existing_stake bigint;
    v_existing_probability numeric;
    v_new_stake bigint;
    v_new_pool bigint;
    v_probability numeric;
begin
    if v_profile_id is null then raise exception 'Authentication required'; end if;
    if p_stake is null or p_stake < 10 then raise exception 'Minimum stake is 10'; end if;

    perform 1 from public.profiles
    where id = v_profile_id and status = 'ACTIVE'
    for update;
    if not found then raise exception 'An active profile is required'; end if;

    select outcome.market_id, market.status, market.closes_at,
           case when totals.total_pool > 0 then outcome.pool::numeric / totals.total_pool else 0.5 end
    into v_market_id, v_market_status, v_closes_at, v_probability
    from public.outcomes as outcome
    join public.markets as market on market.id = outcome.market_id
    join (
        select market_id, sum(pool)::numeric as total_pool
        from public.outcomes group by market_id
    ) as totals on totals.market_id = outcome.market_id
    where outcome.id = p_outcome_id and market.deleted_at is null
    for update of outcome, market;

    if not found then raise exception 'Outcome not found'; end if;
    if v_market_status <> 'open' then raise exception 'Market is not open'; end if;
    if v_closes_at <= now() then raise exception 'Market has already closed'; end if;

    select coalesce(sum(delta), 0)::bigint into v_balance
    from public.ledger where profile_id = v_profile_id;
    if p_stake > v_balance then raise exception 'Stake exceeds available balance of %', v_balance; end if;

    v_max_stake := least(v_balance / 5, 500);
    if p_stake > v_max_stake then raise exception 'Maximum stake is %', v_max_stake; end if;

    select id, outcome_id, stake, entry_probability
    into v_existing_position_id, v_existing_outcome_id, v_existing_stake, v_existing_probability
    from public.positions
    where profile_id = v_profile_id and market_id = v_market_id and status = 'OPEN'
    limit 1 for update;

    if found then
        if v_existing_outcome_id <> p_outcome_id then
            raise exception 'You already placed a bet on the opposite outcome for this market';
        end if;
        v_new_stake := v_existing_stake + p_stake;
        update public.positions
        set stake = v_new_stake,
            entry_probability = ((v_existing_stake * v_existing_probability) + (p_stake * v_probability)) / v_new_stake,
            updated_at = now()
        where id = v_existing_position_id;
    else
        insert into public.positions (profile_id, market_id, outcome_id, stake, entry_probability)
        values (v_profile_id, v_market_id, p_outcome_id, p_stake, v_probability)
        returning id, stake into v_existing_position_id, v_new_stake;
    end if;

    insert into public.ledger (profile_id, delta, reason, ref_id)
    values (v_profile_id, -p_stake, 'bet_placed', v_existing_position_id);

    update public.outcomes
    set wager_pool = wager_pool + p_stake, pool = pool + p_stake
    where id = p_outcome_id
    returning pool into v_new_pool;

    perform private.record_probability_point(v_market_id, 'BET_PLACED');

    return jsonb_build_object(
        'position_id', v_existing_position_id,
        'stake', v_new_stake,
        'pool', v_new_pool,
        'balance', v_balance - p_stake
    );
end;
$$;
