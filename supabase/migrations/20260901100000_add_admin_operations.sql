alter table public.markets
add column if not exists resolved_outcome text;

alter table public.markets
drop constraint if exists markets_resolved_outcome_check;

alter table public.markets
add constraint markets_resolved_outcome_check
check (resolved_outcome is null or lower(resolved_outcome) in ('yes', 'no'));

alter table public.profiles
add column if not exists email text,
add column if not exists status text not null default 'active',
add column if not exists role text not null default 'user';

alter table public.profiles
drop constraint if exists profiles_status_check;

alter table public.profiles
add constraint profiles_status_check
check (lower(status) in ('active', 'suspended'));

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (lower(role) in ('user', 'admin'));

alter table public.ledger
drop constraint if exists ledger_reason_check;

alter table public.ledger
add constraint ledger_reason_check
check (
    reason in (
        'initial_credit',
        'bet_placed',
        'market_settlement',
        'refund',
        'credit_adjustment'
    )
);

create table if not exists public.admin_actions (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references public.profiles(id) on delete restrict,
    action text not null,
    target text not null,
    summary text not null,
    reason text not null,
    created_at timestamptz not null default now(),

    check (
        action in (
            'ODDS_OVERRIDE',
            'BET_REFUNDED',
            'MARKET_VOIDED',
            'MARKET_CREATED',
            'MARKET_UPDATED',
            'MARKET_CLOSED',
            'MARKET_REOPENED',
            'MARKET_RESOLVED',
            'MARKET_DELETED',
            'USER_SUSPENDED',
            'USER_REACTIVATED',
            'USER_ROLE_CHANGED',
            'CREDIT_ADJUSTMENT'
        )
    )
);

create index if not exists admin_actions_created_at_idx
on public.admin_actions(created_at desc);

update public.profiles
set email = auth_users.email
from auth.users as auth_users
where public.profiles.id = auth_users.id
  and public.profiles.email is distinct from auth_users.email;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
        or exists (
            select 1
            from public.profiles
            where id = auth.uid()
              and lower(role) = 'admin'
        );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email);

    insert into public.ledger (
        profile_id,
        delta,
        reason
    )
    select
        new.id,
        1000,
        'initial_credit'
    where not exists (
        select 1
        from public.ledger
        where profile_id = new.id
          and reason = 'initial_credit'
    );

    return new;
end;
$$;

drop policy if exists "Users can read profiles" on public.profiles;
create policy "Users can read their own profile and admins can read all profiles"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or (select public.is_admin()));

drop policy if exists "Users can update their own profile" on public.profiles;
revoke update on table public.profiles from authenticated;

grant insert, select on table public.admin_actions to authenticated;
revoke insert, update, delete on table public.admin_actions from authenticated;
alter table public.admin_actions enable row level security;

create policy "Admins can read admin actions"
on public.admin_actions
for select
to authenticated
using ((select public.is_admin()));

grant insert, update, delete on table public.markets, public.outcomes to authenticated;

create policy "Admins can manage markets"
on public.markets
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage outcomes"
on public.outcomes
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can read all positions"
on public.positions
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can read all ledger entries"
on public.ledger
for select
to authenticated
using ((select public.is_admin()));

create or replace function public.record_admin_action(
    p_action text,
    p_target text,
    p_summary text,
    p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.admin_actions (admin_id, action, target, summary, reason)
    values (auth.uid(), p_action, p_target, p_summary, coalesce(nullif(trim(p_reason), ''), 'No reason provided'));
end;
$$;

revoke all on function public.record_admin_action(text, text, text, text) from public;

create or replace function public.create_market(
    p_title text,
    p_description text,
    p_category text,
    p_closes_at timestamptz,
    p_resolution_criteria text,
    p_yes_pool bigint default 0,
    p_no_pool bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_market_id uuid;
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    if nullif(trim(p_title), '') is null then
        raise exception 'Market title is required';
    end if;

    if p_closes_at <= now() then
        raise exception 'Closing date must be in the future';
    end if;

    insert into public.markets (
        title,
        description,
        category,
        closes_at,
        resolution_criteria,
        status,
        resolved_outcome
    )
    values (
        trim(p_title),
        coalesce(p_description, ''),
        trim(p_category),
        p_closes_at,
        coalesce(p_resolution_criteria, ''),
        'open',
        null
    )
    returning id into v_market_id;

    insert into public.outcomes (market_id, name, pool)
    values
        (v_market_id, 'Yes', greatest(p_yes_pool, 0)),
        (v_market_id, 'No', greatest(p_no_pool, 0));

    perform public.record_admin_action(
        'MARKET_CREATED',
        v_market_id::text,
        'Created market "' || trim(p_title) || '"',
        'Market created'
    );

    return jsonb_build_object('market_id', v_market_id);
end;
$$;

revoke all on function public.create_market(text, text, text, timestamptz, text, bigint, bigint) from public;
grant execute on function public.create_market(text, text, text, timestamptz, text, bigint, bigint) to authenticated;

create or replace function public.update_market(
    p_market_id uuid,
    p_title text,
    p_description text,
    p_category text,
    p_closes_at timestamptz,
    p_resolution_criteria text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_old_status text;
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    select status into v_old_status
    from public.markets
    where id = p_market_id
    for update;

    if not found then
        raise exception 'Market not found';
    end if;

    if nullif(trim(p_title), '') is null then
        raise exception 'Market title is required';
    end if;

    update public.markets
    set
        title = trim(p_title),
        description = coalesce(p_description, ''),
        category = trim(p_category),
        closes_at = p_closes_at,
        resolution_criteria = coalesce(p_resolution_criteria, '')
    where id = p_market_id;

    perform public.record_admin_action(
        'MARKET_UPDATED',
        p_market_id::text,
        'Updated market "' || trim(p_title) || '"',
        'Market details updated'
    );

    return jsonb_build_object('market_id', p_market_id, 'status', v_old_status);
end;
$$;

revoke all on function public.update_market(uuid, text, text, text, timestamptz, text) from public;
grant execute on function public.update_market(uuid, text, text, text, timestamptz, text) to authenticated;

create or replace function public.set_market_status(
    p_market_id uuid,
    p_status text,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_title text;
    v_old_status text;
    v_action text;
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    if lower(p_status) not in ('open', 'closed') then
        raise exception 'Use the resolve or void action for terminal market states';
    end if;

    select title, status into v_title, v_old_status
    from public.markets
    where id = p_market_id
    for update;

    if not found then
        raise exception 'Market not found';
    end if;

    if v_old_status in ('resolved', 'voided') then
        raise exception 'A resolved or voided market cannot be reopened';
    end if;

    update public.markets
    set status = lower(p_status), resolved_outcome = null
    where id = p_market_id;

    v_action := case when lower(p_status) = 'open' then 'MARKET_REOPENED' else 'MARKET_CLOSED' end;
    perform public.record_admin_action(
        v_action,
        p_market_id::text,
        initcap(lower(p_status)) || ' betting for "' || v_title || '"',
        p_reason
    );

    return jsonb_build_object('market_id', p_market_id, 'status', lower(p_status));
end;
$$;

revoke all on function public.set_market_status(uuid, text, text) from public;
grant execute on function public.set_market_status(uuid, text, text) to authenticated;

create or replace function public.override_market_odds(
    p_market_id uuid,
    p_yes_percent integer,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_total bigint;
    v_yes_pool bigint;
    v_no_pool bigint;
    v_title text;
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    if p_yes_percent < 0 or p_yes_percent > 100 then
        raise exception 'YES percentage must be between 0 and 100';
    end if;

    select title into v_title from public.markets where id = p_market_id for update;
    if not found then raise exception 'Market not found'; end if;

    select coalesce(sum(pool), 0) into v_total
    from public.outcomes
    where market_id = p_market_id;

    v_yes_pool := floor(v_total * p_yes_percent / 100.0)::bigint;
    v_no_pool := v_total - v_yes_pool;

    update public.outcomes
    set pool = case when lower(name) = 'yes' then v_yes_pool else v_no_pool end
    where market_id = p_market_id;

    perform public.record_admin_action(
        'ODDS_OVERRIDE',
        p_market_id::text,
        'Changed YES odds to ' || p_yes_percent || '% for "' || v_title || '"',
        p_reason
    );

    return jsonb_build_object('market_id', p_market_id, 'yes_percent', p_yes_percent);
end;
$$;

revoke all on function public.override_market_odds(uuid, integer, text) from public;
grant execute on function public.override_market_odds(uuid, integer, text) to authenticated;

create or replace function public.resolve_market(
    p_market_id uuid,
    p_winning_outcome text,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_title text;
    v_status text;
    v_total_pool bigint;
    v_winning_pool bigint;
    v_position record;
    v_payout bigint;
begin
    if not public.is_admin() then
        raise exception 'Admin access required';
    end if;

    if lower(p_winning_outcome) not in ('yes', 'no') then
        raise exception 'Winning outcome must be YES or NO';
    end if;

    select title, status into v_title, v_status
    from public.markets
    where id = p_market_id
    for update;

    if not found then raise exception 'Market not found'; end if;
    if v_status in ('resolved', 'voided') then raise exception 'Market is already settled'; end if;

    select coalesce(sum(pool), 0) into v_total_pool
    from public.outcomes where market_id = p_market_id;

    select coalesce(sum(pool), 0) into v_winning_pool
    from public.outcomes
    where market_id = p_market_id and lower(name) = lower(p_winning_outcome);

    for v_position in
        select positions.id, positions.profile_id, positions.stake
        from public.positions
        join public.outcomes on outcomes.id = positions.outcome_id
        where positions.market_id = p_market_id
          and lower(outcomes.name) = lower(p_winning_outcome)
    loop
        if v_winning_pool > 0 then
            v_payout := round((v_position.stake::numeric / v_winning_pool) * v_total_pool)::bigint;
            if v_payout > 0 then
                insert into public.ledger (profile_id, delta, reason, ref_id)
                values (v_position.profile_id, v_payout, 'market_settlement', v_position.id);
            end if;
        end if;
    end loop;

    update public.markets
    set status = 'resolved', resolved_outcome = lower(p_winning_outcome)
    where id = p_market_id;

    perform public.record_admin_action(
        'MARKET_RESOLVED',
        p_market_id::text,
        'Resolved "' || v_title || '" as ' || upper(p_winning_outcome),
        p_reason
    );

    return jsonb_build_object('market_id', p_market_id, 'winning_outcome', lower(p_winning_outcome));
end;
$$;

revoke all on function public.resolve_market(uuid, text, text) from public;
grant execute on function public.resolve_market(uuid, text, text) to authenticated;

create or replace function public.void_market(
    p_market_id uuid,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_title text;
    v_status text;
    v_position record;
begin
    if not public.is_admin() then raise exception 'Admin access required'; end if;

    select title, status into v_title, v_status
    from public.markets where id = p_market_id for update;
    if not found then raise exception 'Market not found'; end if;
    if v_status = 'resolved' then raise exception 'A resolved market cannot be voided'; end if;
    if v_status = 'voided' then raise exception 'Market is already voided'; end if;

    for v_position in
        select id, profile_id, stake
        from public.positions
        where market_id = p_market_id
    loop
        if not exists (
            select 1 from public.ledger
            where ref_id = v_position.id and reason = 'refund'
        ) then
            insert into public.ledger (profile_id, delta, reason, ref_id)
            values (v_position.profile_id, v_position.stake, 'refund', v_position.id);
        end if;
    end loop;

    update public.markets
    set status = 'voided', resolved_outcome = null
    where id = p_market_id;

    perform public.record_admin_action(
        'MARKET_VOIDED',
        p_market_id::text,
        'Voided market "' || v_title || '" and refunded bets',
        p_reason
    );

    return jsonb_build_object('market_id', p_market_id, 'status', 'voided');
end;
$$;

revoke all on function public.void_market(uuid, text) from public;
grant execute on function public.void_market(uuid, text) to authenticated;

create or replace function public.delete_market(p_market_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_title text;
begin
    if not public.is_admin() then raise exception 'Admin access required'; end if;

    select title into v_title from public.markets where id = p_market_id for update;
    if not found then raise exception 'Market not found'; end if;
    if exists (select 1 from public.positions where market_id = p_market_id) then
        raise exception 'Market cannot be deleted while it has bets';
    end if;

    delete from public.markets where id = p_market_id;
    perform public.record_admin_action(
        'MARKET_DELETED', p_market_id::text, 'Deleted market "' || v_title || '"', 'Market deleted'
    );
    return jsonb_build_object('market_id', p_market_id);
end;
$$;

revoke all on function public.delete_market(uuid) from public;
grant execute on function public.delete_market(uuid) to authenticated;

create or replace function public.refund_position(
    p_position_id uuid,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_profile_id uuid;
    v_stake bigint;
    v_title text;
begin
    if not public.is_admin() then raise exception 'Admin access required'; end if;

    select positions.profile_id, positions.stake, markets.title
    into v_profile_id, v_stake, v_title
    from public.positions
    join public.markets on markets.id = positions.market_id
    where positions.id = p_position_id
    for update of positions;

    if not found then raise exception 'Bet not found'; end if;
    if exists (select 1 from public.ledger where ref_id = p_position_id and reason = 'refund') then
        raise exception 'Bet has already been refunded';
    end if;

    insert into public.ledger (profile_id, delta, reason, ref_id)
    values (v_profile_id, v_stake, 'refund', p_position_id);

    perform public.record_admin_action(
        'BET_REFUNDED', p_position_id::text, 'Refunded ' || v_stake || ' credits for "' || v_title || '"', p_reason
    );
    return jsonb_build_object('position_id', p_position_id, 'refund', v_stake);
end;
$$;

revoke all on function public.refund_position(uuid, text) from public;
grant execute on function public.refund_position(uuid, text) to authenticated;

create or replace function public.adjust_user_balance(
    p_user_id uuid,
    p_delta bigint,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text;
begin
    if not public.is_admin() then raise exception 'Admin access required'; end if;
    if p_delta = 0 then raise exception 'Credit adjustment cannot be zero'; end if;

    select email into v_email from public.profiles where id = p_user_id;
    if not found then raise exception 'User not found'; end if;

    insert into public.ledger (profile_id, delta, reason)
    values (p_user_id, p_delta, 'credit_adjustment');

    perform public.record_admin_action(
        'CREDIT_ADJUSTMENT', p_user_id::text, 'Adjusted ' || coalesce(v_email, p_user_id::text) || ' by ' || p_delta || ' credits', p_reason
    );
    return jsonb_build_object('user_id', p_user_id, 'delta', p_delta);
end;
$$;

revoke all on function public.adjust_user_balance(uuid, bigint, text) from public;
grant execute on function public.adjust_user_balance(uuid, bigint, text) to authenticated;

create or replace function public.set_user_status(
    p_user_id uuid,
    p_status text,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text;
begin
    if not public.is_admin() then raise exception 'Admin access required'; end if;
    if lower(p_status) not in ('active', 'suspended') then raise exception 'Invalid user status'; end if;
    if p_user_id = auth.uid() and lower(p_status) = 'suspended' then raise exception 'You cannot suspend yourself'; end if;

    update public.profiles
    set status = lower(p_status)
    where id = p_user_id
    returning email into v_email;
    if not found then raise exception 'User not found'; end if;

    perform public.record_admin_action(
        case when lower(p_status) = 'suspended' then 'USER_SUSPENDED' else 'USER_REACTIVATED' end,
        p_user_id::text,
        'Marked ' || coalesce(v_email, p_user_id::text) || ' as ' || lower(p_status),
        p_reason
    );
    return jsonb_build_object('user_id', p_user_id, 'status', lower(p_status));
end;
$$;

revoke all on function public.set_user_status(uuid, text, text) from public;
grant execute on function public.set_user_status(uuid, text, text) to authenticated;

create or replace function public.set_user_role(
    p_user_id uuid,
    p_role text,
    p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text;
begin
    if not public.is_admin() then raise exception 'Admin access required'; end if;
    if lower(p_role) not in ('user', 'admin') then raise exception 'Invalid user role'; end if;

    update public.profiles
    set role = lower(p_role)
    where id = p_user_id
    returning email into v_email;
    if not found then raise exception 'User not found'; end if;

    perform public.record_admin_action(
        'USER_ROLE_CHANGED', p_user_id::text,
        'Marked ' || coalesce(v_email, p_user_id::text) || ' as ' || lower(p_role), p_reason
    );
    return jsonb_build_object('user_id', p_user_id, 'role', lower(p_role));
end;
$$;

revoke all on function public.set_user_role(uuid, text, text) from public;
grant execute on function public.set_user_role(uuid, text, text) to authenticated;

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
    v_profile_status text;
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
    if v_profile_id is null then raise exception 'Authentication required'; end if;
    if p_stake is null or p_stake < 10 then raise exception 'Minimum stake is 10'; end if;

    select status into v_profile_status from public.profiles where id = v_profile_id for update;
    if not found then raise exception 'Profile not found'; end if;
    if lower(v_profile_status) = 'suspended' then raise exception 'Your account is suspended'; end if;

    select outcomes.market_id, markets.status, markets.closes_at
    into v_market_id, v_market_status, v_closes_at
    from public.outcomes
    join public.markets on markets.id = outcomes.market_id
    where outcomes.id = p_outcome_id
    for update of outcomes, markets;
    if not found then raise exception 'Outcome not found'; end if;
    if v_market_status <> 'open' then raise exception 'Market is not open'; end if;
    if v_closes_at <= now() then raise exception 'Market has already closed'; end if;

    select coalesce(sum(delta), 0) into v_balance
    from public.ledger where profile_id = v_profile_id;
    if p_stake > v_balance then raise exception 'Stake exceeds available balance of %', v_balance; end if;

    v_max_stake := least(v_balance / 5, 500);
    if p_stake > v_max_stake then raise exception 'Maximum stake is %', v_max_stake; end if;

    select id, outcome_id into v_existing_position_id, v_existing_outcome_id
    from public.positions
    where profile_id = v_profile_id and market_id = v_market_id
    limit 1 for update;

    if found then
        if v_existing_outcome_id <> p_outcome_id then
            raise exception 'You already placed a bet on the opposite outcome for this market';
        end if;
        update public.positions
        set stake = stake + p_stake, updated_at = now()
        where id = v_existing_position_id
        returning stake into v_new_stake;
    else
        insert into public.positions (profile_id, market_id, outcome_id, stake)
        values (v_profile_id, v_market_id, p_outcome_id, p_stake)
        returning id, stake into v_existing_position_id, v_new_stake;
    end if;

    insert into public.ledger (profile_id, delta, reason, ref_id)
    values (v_profile_id, -p_stake, 'bet_placed', v_existing_position_id);

    update public.outcomes set pool = pool + p_stake
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
