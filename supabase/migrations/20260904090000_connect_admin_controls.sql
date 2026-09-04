alter table public.markets
    add column if not exists resolved_outcome_id uuid references public.outcomes(id) on delete restrict,
    add column if not exists resolved_at timestamptz,
    add column if not exists deleted_at timestamptz,
    add column if not exists deleted_by uuid references public.profiles(id) on delete restrict;

alter table public.outcomes
    add column if not exists liquidity bigint not null default 0,
    add column if not exists wager_pool bigint not null default 0;

with wagers as (
    select outcome_id, coalesce(sum(stake), 0)::bigint as total
    from public.positions
    where settled_at is null
    group by outcome_id
)
update public.outcomes
set
    wager_pool = coalesce(wagers.total, 0),
    liquidity = greatest(public.outcomes.pool - coalesce(wagers.total, 0), 0)
from wagers
where wagers.outcome_id = public.outcomes.id;

update public.outcomes
set liquidity = pool
where wager_pool = 0;

alter table public.outcomes
    drop constraint if exists outcomes_liquidity_non_negative,
    drop constraint if exists outcomes_wager_pool_non_negative;

alter table public.outcomes
    add constraint outcomes_liquidity_non_negative check (liquidity >= 0),
    add constraint outcomes_wager_pool_non_negative check (wager_pool >= 0),
    add constraint outcomes_pool_matches_components check (pool = liquidity + wager_pool);

create or replace function public.sync_outcome_pool_components()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' and new.pool > 0 and new.liquidity = 0 and new.wager_pool = 0 then
        new.liquidity := new.pool;
    else
        new.pool := new.liquidity + new.wager_pool;
    end if;
    return new;
end;
$$;

drop trigger if exists outcomes_sync_pool_components on public.outcomes;
create trigger outcomes_sync_pool_components
before insert or update on public.outcomes
for each row execute function public.sync_outcome_pool_components();

alter table public.positions
    add column if not exists status text not null default 'OPEN',
    add column if not exists entry_probability numeric(7, 6);

update public.positions
set status = case
    when settled_at is null then 'OPEN'
    when payout = 0 then 'LOST'
    else 'WON'
end;

update public.positions as position
set entry_probability = case
    when totals.total_pool > 0 then outcome.pool::numeric / totals.total_pool
    else 0.5
end
from public.outcomes as outcome
join (
    select market_id, sum(pool)::numeric as total_pool
    from public.outcomes
    group by market_id
) as totals on totals.market_id = outcome.market_id
where position.outcome_id = outcome.id
  and position.entry_probability is null;

alter table public.positions
    alter column entry_probability set default 0.5,
    alter column entry_probability set not null,
    drop constraint if exists positions_status_check,
    drop constraint if exists positions_entry_probability_check,
    drop constraint if exists positions_status_matches_settlement;

alter table public.positions
    add constraint positions_status_check check (status in ('OPEN', 'WON', 'LOST', 'REFUNDED')),
    add constraint positions_entry_probability_check check (entry_probability >= 0 and entry_probability <= 1),
    add constraint positions_status_matches_settlement check (
        (status = 'OPEN' and settled_at is null and payout is null)
        or (status in ('WON', 'LOST', 'REFUNDED') and settled_at is not null and payout is not null)
    );

alter table public.ledger
    drop constraint if exists ledger_reason_check;

alter table public.ledger
    add constraint ledger_reason_check check (
        reason in (
            'initial_credit',
            'bet_placed',
            'market_settlement',
            'refund',
            'admin_adjustment'
        )
    );

create unique index if not exists ledger_admin_adjustment_ref_id_idx
on public.ledger(ref_id)
where reason = 'admin_adjustment';

alter table public.admin_actions
    add column if not exists target_type text not null default 'OTHER',
    add column if not exists target_id uuid;

alter table public.admin_actions
    drop constraint if exists admin_actions_action_check,
    drop constraint if exists admin_actions_target_type_check;

alter table public.admin_actions
    add constraint admin_actions_action_check check (action in (
        'MARKET_CREATED',
        'MARKET_UPDATED',
        'ODDS_OVERRIDE',
        'MARKET_CLOSED',
        'MARKET_REOPENED',
        'MARKET_RESOLVED',
        'MARKET_VOIDED',
        'MARKET_DELETED',
        'BET_REFUNDED',
        'ROLE_UPDATED',
        'USER_SUSPENDED',
        'USER_REACTIVATED',
        'CREDIT_ADJUSTMENT'
    )),
    add constraint admin_actions_target_type_check check (target_type in ('MARKET', 'BET', 'USER', 'OTHER'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles
        where id = (select auth.uid())
          and role = 'ADMIN'
          and status = 'ACTIVE'
    );
$$;

create or replace function private.require_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := auth.uid();
begin
    if v_admin_id is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;

    perform 1
    from public.profiles
    where id = v_admin_id
      and role = 'ADMIN'
      and status = 'ACTIVE'
    for update;

    if not found then
        raise exception 'Active admin access required' using errcode = '42501';
    end if;

    return v_admin_id;
end;
$$;

create or replace function private.require_reason(p_reason text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_reason text := trim(coalesce(p_reason, ''));
begin
    if v_reason = '' then
        raise exception 'A reason is required';
    end if;
    return v_reason;
end;
$$;

create or replace function private.record_admin_action(
    p_admin_id uuid,
    p_action text,
    p_target_type text,
    p_target_id uuid,
    p_target text,
    p_summary text,
    p_reason text default ''
)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.admin_actions (
        admin_id,
        action,
        target_type,
        target_id,
        target,
        summary,
        reason
    ) values (
        p_admin_id,
        p_action,
        p_target_type,
        p_target_id,
        p_target,
        p_summary,
        coalesce(p_reason, '')
    );
$$;

revoke all on function private.require_admin() from public, anon, authenticated;
revoke all on function private.require_reason(text) from public, anon, authenticated;
revoke all on function private.record_admin_action(uuid, text, text, uuid, text, text, text) from public, anon, authenticated;

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

    perform private.record_admin_action(
        v_admin_id, 'MARKET_CREATED', 'MARKET', v_market_id,
        v_title, 'Created market', ''
    );
    return v_market_id;
end;
$$;

create or replace function public.admin_update_market(
    p_market_id uuid,
    p_title text,
    p_description text,
    p_category text,
    p_closes_at timestamptz,
    p_resolution_criteria text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_title text := trim(coalesce(p_title, ''));
    v_category text := trim(coalesce(p_category, ''));
    v_criteria text := trim(coalesce(p_resolution_criteria, ''));
begin
    if v_title = '' or v_category = '' or v_criteria = '' then
        raise exception 'Question, category and resolution criteria are required';
    end if;
    if p_closes_at is null then
        raise exception 'Closing date is required';
    end if;

    update public.markets
    set title = v_title,
        description = trim(coalesce(p_description, '')),
        category = v_category,
        closes_at = p_closes_at,
        resolution_criteria = v_criteria
    where id = p_market_id
      and status in ('open', 'closed')
      and deleted_at is null;

    if not found then
        raise exception 'Only unresolved, undeleted markets can be edited';
    end if;

    perform private.record_admin_action(
        v_admin_id, 'MARKET_UPDATED', 'MARKET', p_market_id,
        v_title, 'Updated market details', ''
    );
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

    perform private.record_admin_action(
        v_admin_id, 'ODDS_OVERRIDE', 'MARKET', p_market_id,
        v_title, 'Changed YES odds to ' || p_yes_percentage || '%', v_reason
    );
end;
$$;

create or replace function public.admin_set_market_betting(
    p_market_id uuid,
    p_open boolean
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
    v_closes_at timestamptz;
begin
    select title, status, closes_at into v_title, v_status, v_closes_at
    from public.markets
    where id = p_market_id and deleted_at is null
    for update;

    if not found then
        raise exception 'Market not found';
    end if;

    if p_open then
        if v_status <> 'closed' then
            raise exception 'Only a closed, unresolved market can reopen';
        end if;
        if v_closes_at <= now() then
            raise exception 'Set a future closing date before reopening';
        end if;
        update public.markets set status = 'open' where id = p_market_id;
        perform private.record_admin_action(v_admin_id, 'MARKET_REOPENED', 'MARKET', p_market_id, v_title, 'Reopened betting', '');
    else
        if v_status <> 'open' then
            raise exception 'Only an open market can close';
        end if;
        update public.markets set status = 'closed' where id = p_market_id;
        perform private.record_admin_action(v_admin_id, 'MARKET_CLOSED', 'MARKET', p_market_id, v_title, 'Closed betting', '');
    end if;
end;
$$;

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
    v_total_pool bigint;
    v_winning_pool bigint;
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

    select coalesce(sum(stake), 0)::bigint into v_total_pool
    from public.positions
    where market_id = p_market_id and status = 'OPEN';

    select coalesce(sum(stake), 0)::bigint into v_winning_pool
    from public.positions
    where market_id = p_market_id and outcome_id = v_outcome_id and status = 'OPEN';

    if v_total_pool = 0 or v_winning_pool = 0 then
        insert into public.ledger (profile_id, delta, reason, ref_id)
        select profile_id, stake, 'refund', id
        from public.positions
        where market_id = p_market_id and status = 'OPEN';

        update public.positions
        set status = 'REFUNDED', payout = stake, settled_at = now(), updated_at = now()
        where market_id = p_market_id and status = 'OPEN';

        update public.outcomes
        set wager_pool = 0, pool = liquidity
        where market_id = p_market_id;

        update public.markets
        set status = 'voided', resolved_outcome_id = null, resolved_at = now()
        where id = p_market_id;

        perform private.record_admin_action(
            v_admin_id, 'MARKET_VOIDED', 'MARKET', p_market_id,
            v_title, 'Voided and refunded market because no bets backed the winning outcome',
            'No winning bets'
        );
        return;
    end if;

    select coalesce(sum((stake * v_total_pool) / v_winning_pool), 0)::bigint
    into v_floor_total
    from public.positions
    where market_id = p_market_id and outcome_id = v_outcome_id and status = 'OPEN';
    v_remaining := v_total_pool - v_floor_total;

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

create or replace function public.admin_void_market(
    p_market_id uuid,
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
    v_status text;
begin
    select title, status into v_title, v_status
    from public.markets
    where id = p_market_id and deleted_at is null
    for update;

    if not found then
        raise exception 'Market not found';
    end if;
    if v_status not in ('open', 'closed') then
        raise exception 'Only unresolved markets can be voided';
    end if;

    insert into public.ledger (profile_id, delta, reason, ref_id)
    select profile_id, stake, 'refund', id
    from public.positions
    where market_id = p_market_id and status = 'OPEN';

    update public.positions
    set status = 'REFUNDED', payout = stake, settled_at = now(), updated_at = now()
    where market_id = p_market_id and status = 'OPEN';

    update public.outcomes
    set wager_pool = 0, pool = liquidity
    where market_id = p_market_id;

    update public.markets
    set status = 'voided', resolved_outcome_id = null, resolved_at = now()
    where id = p_market_id;

    perform private.record_admin_action(
        v_admin_id, 'MARKET_VOIDED', 'MARKET', p_market_id,
        v_title, 'Voided market and refunded open bets', v_reason
    );
end;
$$;

create or replace function public.admin_delete_market(
    p_market_id uuid,
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
    select title into v_title
    from public.markets
    where id = p_market_id and deleted_at is null
    for update;

    if not found then
        raise exception 'Market not found';
    end if;
    if exists (
        select 1 from public.positions
        where market_id = p_market_id and status = 'OPEN'
    ) then
        raise exception 'Void and refund all open bets before deleting this market';
    end if;

    update public.markets
    set deleted_at = now(), deleted_by = v_admin_id
    where id = p_market_id;

    perform private.record_admin_action(
        v_admin_id, 'MARKET_DELETED', 'MARKET', p_market_id,
        v_title, 'Deleted market', v_reason
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
    v_outcome_id uuid;
    v_stake bigint;
    v_target text;
begin
    select position.profile_id, position.outcome_id, position.stake,
           coalesce(profile.username, 'Student') || ' · ' || market.title
    into v_profile_id, v_outcome_id, v_stake, v_target
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

    perform private.record_admin_action(
        v_admin_id, 'BET_REFUNDED', 'BET', p_position_id,
        v_target, 'Removed and refunded bet', v_reason
    );
end;
$$;

create or replace function public.admin_adjust_credits(
    p_profile_id uuid,
    p_delta bigint,
    p_reason text,
    p_request_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_reason text := private.require_reason(p_reason);
    v_balance bigint;
    v_name text;
begin
    if p_delta is null or p_delta = 0 then
        raise exception 'Credit adjustment cannot be zero';
    end if;
    if p_request_id is null then
        raise exception 'Request ID is required';
    end if;

    select coalesce(username, email, 'Student') into v_name
    from public.profiles
    where id = p_profile_id
    for update;

    if not found then
        raise exception 'User not found';
    end if;

    if exists (
        select 1 from public.ledger
        where reason = 'admin_adjustment'
          and ref_id = p_request_id
          and profile_id = p_profile_id
          and delta = p_delta
    ) then
        select coalesce(sum(delta), 0)::bigint into v_balance
        from public.ledger where profile_id = p_profile_id;
        return v_balance;
    end if;

    if exists (select 1 from public.ledger where reason = 'admin_adjustment' and ref_id = p_request_id) then
        raise exception 'Request ID has already been used';
    end if;

    select coalesce(sum(delta), 0)::bigint into v_balance
    from public.ledger where profile_id = p_profile_id;

    if v_balance + p_delta < 0 then
        raise exception 'Credit adjustment cannot make the balance negative';
    end if;

    insert into public.ledger (profile_id, delta, reason, ref_id)
    values (p_profile_id, p_delta, 'admin_adjustment', p_request_id);

    perform private.record_admin_action(
        v_admin_id, 'CREDIT_ADJUSTMENT', 'USER', p_profile_id,
        v_name, 'Adjusted credits by ' || case when p_delta > 0 then '+' else '' end || p_delta, v_reason
    );
    return v_balance + p_delta;
end;
$$;

create or replace function public.admin_set_user_role(
    p_profile_id uuid,
    p_role text,
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
    v_role text := upper(trim(coalesce(p_role, '')));
    v_old_role text;
    v_status text;
    v_name text;
begin
    if v_role not in ('USER', 'ADMIN') then
        raise exception 'Role must be USER or ADMIN';
    end if;

    select role, status, coalesce(username, email, 'Student')
    into v_old_role, v_status, v_name
    from public.profiles
    where id = p_profile_id
    for update;

    if not found then raise exception 'User not found'; end if;
    if p_profile_id = v_admin_id and v_role <> 'ADMIN' then
        raise exception 'You cannot remove your own admin access';
    end if;
    if v_old_role = 'ADMIN' and v_status = 'ACTIVE' and v_role <> 'ADMIN'
       and (select count(*) from public.profiles where role = 'ADMIN' and status = 'ACTIVE') <= 1 then
        raise exception 'The final active admin cannot be removed';
    end if;

    update public.profiles set role = v_role where id = p_profile_id;
    perform private.record_admin_action(
        v_admin_id, 'ROLE_UPDATED', 'USER', p_profile_id,
        v_name, 'Changed role from ' || v_old_role || ' to ' || v_role, v_reason
    );
end;
$$;

create or replace function public.admin_set_user_status(
    p_profile_id uuid,
    p_status text,
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
    v_status text := upper(trim(coalesce(p_status, '')));
    v_old_status text;
    v_role text;
    v_name text;
begin
    if v_status not in ('ACTIVE', 'SUSPENDED') then
        raise exception 'Status must be ACTIVE or SUSPENDED';
    end if;

    select status, role, coalesce(username, email, 'Student')
    into v_old_status, v_role, v_name
    from public.profiles
    where id = p_profile_id
    for update;

    if not found then raise exception 'User not found'; end if;
    if p_profile_id = v_admin_id and v_status = 'SUSPENDED' then
        raise exception 'You cannot suspend yourself';
    end if;
    if v_role = 'ADMIN' and v_old_status = 'ACTIVE' and v_status = 'SUSPENDED'
       and (select count(*) from public.profiles where role = 'ADMIN' and status = 'ACTIVE') <= 1 then
        raise exception 'The final active admin cannot be suspended';
    end if;

    update public.profiles set status = v_status where id = p_profile_id;
    perform private.record_admin_action(
        v_admin_id,
        case when v_status = 'SUSPENDED' then 'USER_SUSPENDED' else 'USER_REACTIVATED' end,
        'USER', p_profile_id, v_name,
        case when v_status = 'SUSPENDED' then 'Suspended user' else 'Reactivated user' end,
        v_reason
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

    return jsonb_build_object(
        'position_id', v_existing_position_id,
        'stake', v_new_stake,
        'pool', v_new_pool,
        'balance', v_balance - p_stake
    );
end;
$$;

create or replace function public.get_leaderboard()
returns table (
    profile_id uuid,
    username text,
    rank bigint,
    settled_profit bigint,
    settled_count bigint,
    is_current_user boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    with scores as (
        select
            profile.id as profile_id,
            coalesce(profile.username, 'student_' || right(replace(profile.id::text, '-', ''), 6)) as username,
            auth_user.created_at as account_created_at,
            coalesce(sum(position.payout - position.stake) filter (where position.status in ('WON', 'LOST')), 0)::bigint as settled_profit,
            count(position.id) filter (where position.status in ('WON', 'LOST')) as settled_count
        from public.profiles as profile
        join auth.users as auth_user on auth_user.id = profile.id
        left join public.positions as position on position.profile_id = profile.id
        group by profile.id, profile.username, auth_user.created_at
    ), ranked as (
        select scores.*,
               row_number() over (order by settled_profit desc, account_created_at asc, profile_id asc) as rank
        from scores
    )
    select ranked.profile_id, ranked.username, ranked.rank,
           ranked.settled_profit, ranked.settled_count,
           ranked.profile_id = (select auth.uid())
    from ranked
    where ranked.rank <= 50 or ranked.profile_id = (select auth.uid())
    order by ranked.rank;
$$;

drop policy if exists "Users can read markets" on public.markets;
create policy "Users can read markets"
on public.markets
for select
to authenticated
using (deleted_at is null or (select public.is_admin()));

revoke insert, update, delete on table public.markets from authenticated;
revoke insert, update, delete on table public.outcomes from authenticated;
revoke insert, update, delete on table public.positions from authenticated;
revoke insert, update, delete on table public.ledger from authenticated;
revoke insert, update, delete on table public.admin_actions from authenticated;
revoke update on table public.profiles from authenticated;
revoke insert on table public.profiles from authenticated;
grant update (username) on table public.profiles to authenticated;
grant insert (id, username, email) on table public.profiles to authenticated;

revoke all on function public.admin_create_market(text, text, text, timestamptz, text, integer) from public, anon;
revoke all on function public.admin_update_market(uuid, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.admin_override_odds(uuid, integer, text) from public, anon;
revoke all on function public.admin_set_market_betting(uuid, boolean) from public, anon;
revoke all on function public.admin_resolve_market(uuid, text) from public, anon;
revoke all on function public.admin_void_market(uuid, text) from public, anon;
revoke all on function public.admin_delete_market(uuid, text) from public, anon;
revoke all on function public.admin_refund_bet(uuid, text) from public, anon;
revoke all on function public.admin_adjust_credits(uuid, bigint, text, uuid) from public, anon;
revoke all on function public.admin_set_user_role(uuid, text, text) from public, anon;
revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon;

grant execute on function public.admin_create_market(text, text, text, timestamptz, text, integer) to authenticated;
grant execute on function public.admin_update_market(uuid, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.admin_override_odds(uuid, integer, text) to authenticated;
grant execute on function public.admin_set_market_betting(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_market(uuid, text) to authenticated;
grant execute on function public.admin_void_market(uuid, text) to authenticated;
grant execute on function public.admin_delete_market(uuid, text) to authenticated;
grant execute on function public.admin_refund_bet(uuid, text) to authenticated;
grant execute on function public.admin_adjust_credits(uuid, bigint, text, uuid) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
grant execute on function public.place_bet(uuid, bigint) to authenticated;
grant execute on function public.get_leaderboard() to authenticated;
