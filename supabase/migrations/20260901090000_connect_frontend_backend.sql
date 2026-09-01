alter table public.markets
add column if not exists description text not null default '',
add column if not exists resolution_criteria text not null default '';

alter table public.markets
drop constraint if exists markets_status_check;

alter table public.markets
add constraint markets_status_check
check (status in ('open', 'closed', 'resolved', 'voided'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;

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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.ensure_current_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_profile_id uuid;
    v_balance bigint;
begin
    v_profile_id := auth.uid();

    if v_profile_id is null then
        raise exception 'Authentication required';
    end if;

    insert into public.profiles (id)
    values (v_profile_id)
    on conflict (id) do nothing;

    insert into public.ledger (
        profile_id,
        delta,
        reason
    )
    select
        v_profile_id,
        1000,
        'initial_credit'
    where not exists (
        select 1
        from public.ledger
        where profile_id = v_profile_id
          and reason = 'initial_credit'
    );

    select coalesce(sum(delta), 0)
    into v_balance
    from public.ledger
    where profile_id = v_profile_id;

    return jsonb_build_object(
        'profile_id', v_profile_id,
        'balance', greatest(v_balance, 0)
    );
end;
$$;

revoke all on function public.ensure_current_profile() from public;
grant execute on function public.ensure_current_profile() to authenticated;

create or replace view public.leaderboard as
select
    profiles.id as profile_id,
    coalesce(
        nullif(profiles.username, ''),
        'Student ' || substring(profiles.id::text from 1 for 8)
    ) as username,
    greatest(coalesce(sum(ledger.delta), 0), 0) as balance
from public.profiles
left join public.ledger
on profiles.id = ledger.profile_id
group by profiles.id, profiles.username;

revoke all on table public.leaderboard from anon, authenticated;
grant select on table public.leaderboard to authenticated;
