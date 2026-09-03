alter table public.profiles
    add column if not exists email text,
    add column if not exists role text not null default 'USER',
    add column if not exists status text not null default 'ACTIVE';

alter table public.profiles
    drop constraint if exists profiles_role_check,
    drop constraint if exists profiles_status_check;

alter table public.profiles
    add constraint profiles_role_check check (role in ('USER', 'ADMIN')),
    add constraint profiles_status_check check (status in ('ACTIVE', 'SUSPENDED'));

alter table public.markets
    add column if not exists description text not null default '',
    add column if not exists resolution_criteria text not null default '';

alter table public.markets
    drop constraint if exists markets_status_check;

alter table public.markets
    add constraint markets_status_check check (status in ('open', 'closed', 'resolved', 'voided'));

update public.markets
set
    description = 'A live prediction market. Make a YES or NO prediction before the market closes.'
where description = '';

update public.markets
set
    resolution_criteria = 'Resolves according to the official outcome described in the market question.'
where resolution_criteria = '';

update public.profiles
set email = auth_users.email
from auth.users as auth_users
where public.profiles.id = auth_users.id
  and public.profiles.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    profile_username text;
begin
    profile_username := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
        nullif(new.email, ''),
        new.id::text
    );

    insert into public.profiles (id, username, email)
    values (new.id, profile_username, new.email)
    on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email);

    if not exists (
        select 1
        from public.ledger
        where profile_id = new.id
          and reason = 'initial_credit'
    ) then
        insert into public.ledger (profile_id, delta, reason)
        values (new.id, 1000, 'initial_credit');
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, username, email)
select
    auth_users.id,
    coalesce(nullif(auth_users.email, ''), auth_users.id::text),
    auth_users.email
from auth.users as auth_users
on conflict (id) do update
set email = coalesce(public.profiles.email, excluded.email);

insert into public.ledger (profile_id, delta, reason)
select profiles.id, 1000, 'initial_credit'
from public.profiles
where not exists (
    select 1
    from public.ledger
    where ledger.profile_id = profiles.id
      and ledger.reason = 'initial_credit'
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'ADMIN'
          and status = 'ACTIVE'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Users can read profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke update on table public.profiles from authenticated;
grant update on table public.profiles to authenticated;

grant insert, update, delete on table public.markets to authenticated;
grant insert, update, delete on table public.outcomes to authenticated;

create policy "Admins can insert markets"
on public.markets
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update markets"
on public.markets
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete markets"
on public.markets
for delete
to authenticated
using ((select public.is_admin()));

create policy "Admins can insert outcomes"
on public.outcomes
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update outcomes"
on public.outcomes
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete outcomes"
on public.outcomes
for delete
to authenticated
using ((select public.is_admin()));

create policy "Admins can read positions"
on public.positions
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can read ledger"
on public.ledger
for select
to authenticated
using ((select public.is_admin()));

create table if not exists public.admin_actions (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references public.profiles(id) on delete restrict,
    action text not null,
    target text not null,
    summary text not null,
    reason text not null default '',
    created_at timestamptz not null default now(),

    check (action in (
        'MARKET_CREATED',
        'MARKET_UPDATED',
        'ODDS_OVERRIDE',
        'BET_REFUNDED',
        'MARKET_VOIDED',
        'ROLE_UPDATED',
        'USER_SUSPENDED',
        'CREDIT_ADJUSTMENT'
    ))
);

create index if not exists admin_actions_created_at_idx
on public.admin_actions(created_at desc);

alter table public.admin_actions enable row level security;

revoke all on table public.admin_actions from anon, authenticated;
grant select, insert on table public.admin_actions to authenticated;

create policy "Admins can read admin actions"
on public.admin_actions
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can create admin actions"
on public.admin_actions
for insert
to authenticated
with check (
    (select public.is_admin())
    and admin_id = (select auth.uid())
);
