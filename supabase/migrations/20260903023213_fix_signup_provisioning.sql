-- Repairs account signup, which failed with "Database error saving new user".
--
-- Three faults, all introduced by 20260902090000_connect_app_backend.sql:
--   1. handle_new_user wrote the signup email into profiles.username. Emails
--      contain '@' and '.', which the profiles_username_format check rejects,
--      so the trigger raised and took the whole auth.users insert down with it.
--      Every signup failed. Usernames stay null until the onboarding screen
--      collects one, which is what needsUsername already expects.
--   2. It dropped "Users can update their own profile" and left only the admin
--      update policy, so saveUsername could never write. Signup would have led
--      straight into an onboarding screen that could not save.
--   3. It replaced the column-level update grant with a table-wide one, undoing
--      the guard that kept role out of reach of the account it belongs to.
--      Restoring the self-update policy without addressing that would let any
--      user promote themselves to ADMIN.


-- Fault 1. Provision the profile and its starting credit, never the username.
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

    -- Guards against re-crediting a profile that predates this trigger.
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


-- Fault 3. Admins change role and status through a plain table update, so the
-- privilege cannot be withheld at the column level any more without breaking
-- them. A trigger enforces it instead, and unlike a WITH CHECK clause it can
-- compare the new row against the old one. A null auth.uid() means service_role
-- or a migration rather than an end user, which must stay able to seed admins.
create or replace function public.enforce_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (new.role is distinct from old.role or new.status is distinct from old.status)
        and (select auth.uid()) is not null
        and not public.is_admin()
    then
        raise exception 'Only admins can change a profile role or status'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

drop trigger if exists profiles_enforce_privileges on public.profiles;

create trigger profiles_enforce_privileges
before update on public.profiles
for each row
execute function public.enforce_profile_privileges();


-- Fault 2. Let a user write their own row again. The admin policy stays; the
-- two are permissive and OR together.
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
