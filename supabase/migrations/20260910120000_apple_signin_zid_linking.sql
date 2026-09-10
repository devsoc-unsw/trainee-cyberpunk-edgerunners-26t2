-- Sign in with Apple, plus zID linking so an Apple identity (which often
-- hides the real email behind a private relay address) cannot silently
-- create a second account for someone who already signed up with their UNSW
-- email and password.
--
-- zID is derived automatically for the common case -- a student email is
-- literally z1234567@student.unsw.edu.au -- and left null otherwise. A null
-- zID on an email/password account never blocks that person from anything;
-- it just means a later Apple sign-in for the same person will not be
-- caught here, since the pair is only linked when both sides carry the same
-- zID.

alter table public.profiles
add column if not exists zid text;

alter table public.profiles
drop constraint if exists profiles_zid_format;

alter table public.profiles
add constraint profiles_zid_format
check (zid is null or zid ~ '^z[0-9]{7}$');

create unique index if not exists profiles_zid_key
on public.profiles (zid)
where zid is not null;

-- Column-level privilege, same reasoning as username: the "Users can update
-- their own profile" RLS policy is row-scoped only, so the grant is what
-- keeps every other column out of reach of the account it belongs to.
revoke update on table public.profiles from authenticated;
grant update (username, zid) on table public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    candidate_zid text;
begin
    -- A UNSW student's email local-part is their zID. Apple sign-in emails
    -- (a real forwarded address or a private relay one) essentially never
    -- match this, which is intentional: those accounts get asked for their
    -- zID explicitly instead -- see saveZid in state/session.tsx.
    candidate_zid := lower(split_part(new.email, '@', 1));
    if candidate_zid !~ '^z[0-9]{7}$' then
        candidate_zid := null;
    end if;

    -- Never let a collision here fail the signup. Losing the auto-derived
    -- zID just means this profile is treated the same as one where it could
    -- not be derived at all -- worse UX, not a broken signup.
    if candidate_zid is not null and exists (
        select 1 from public.profiles where zid = candidate_zid
    ) then
        candidate_zid := null;
    end if;

    insert into public.profiles (id, email, zid)
    values (new.id, new.email, candidate_zid)
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

-- Backfill zID for accounts that predate this migration, same derivation
-- rule as the trigger above. Deduplicated defensively even though a
-- collision should not be possible among genuine UNSW student emails.
with candidates as (
    select
        profiles.id,
        lower(split_part(auth_users.email, '@', 1)) as candidate_zid
    from public.profiles as profiles
    join auth.users as auth_users on auth_users.id = profiles.id
    where profiles.zid is null
      and lower(split_part(auth_users.email, '@', 1)) ~ '^z[0-9]{7}$'
),
deduped as (
    select
        id,
        candidate_zid,
        row_number() over (partition by candidate_zid order by id) as rank
    from candidates
)
update public.profiles
set zid = deduped.candidate_zid
from deduped
where public.profiles.id = deduped.id
  and deduped.rank = 1;
