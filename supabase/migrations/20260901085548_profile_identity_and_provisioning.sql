-- Profile identity, roles, and account provisioning.
--
-- Three gaps this closes:
--   1. Nothing created a profiles row when someone signed up, so a freshly
--      verified account had no profile and no starting credit -- place_bet
--      would fail with 'Profile not found'.
--   2. The client decided who was an admin. Roles now live on the profile and
--      are not writable by the account they belong to.
--   3. Usernames were only unique case-sensitively and had no format rules,
--      so 'eric' and 'Eric' could both exist and read as the same person.


-- Usernames: 3-20 characters, letters, digits and underscores. Null until the
-- user picks one on the "What should we call you?" screen.
alter table public.profiles
drop constraint if exists profiles_username_format;

alter table public.profiles
add constraint profiles_username_format
check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

-- The case-insensitive index below is strictly stronger than the case
-- sensitive unique constraint created with the column, so drop that one
-- rather than maintain two indexes over the same data.
alter table public.profiles
drop constraint if exists profiles_username_key;

create unique index if not exists profiles_username_lower_key
on public.profiles (lower(username));


alter table public.profiles
add column if not exists role text not null default 'USER';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('USER', 'ADMIN'));


-- Column-level privileges, rather than a trigger, keep role out of reach of
-- the account it belongs to: the "Users can update their own profile" policy
-- still applies, but `authenticated` has no UPDATE privilege on role at all,
-- so an escalation attempt is rejected before RLS is even consulted.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, username) on table public.profiles to authenticated;
grant update (username) on table public.profiles to authenticated;


-- Give every new auth user a profile and their starting credit in the same
-- transaction that creates the user, so neither can go missing.
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

    -- The row already existed, so it has been credited before. Crediting it
    -- again here would mint free balance on every replay.
    if not found then
        return new;
    end if;

    insert into public.ledger (profile_id, delta, reason)
    values (new.id, 1000, 'initial_credit');

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- Backfill accounts that predate the trigger.
insert into public.profiles (id)
select users.id
from auth.users as users
on conflict (id) do nothing;

insert into public.ledger (profile_id, delta, reason)
select profiles.id, 1000, 'initial_credit'
from public.profiles as profiles
where not exists (
    select 1
    from public.ledger as ledger
    where ledger.profile_id = profiles.id
      and ledger.reason = 'initial_credit'
);
