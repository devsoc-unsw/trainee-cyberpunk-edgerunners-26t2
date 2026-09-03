-- Read-only. Paste into the remote SQL editor and run.
--
-- "Could not save your username" is the app's fallback text: it appears for any
-- database error, because PostgREST returns errors as plain objects rather than
-- Error instances. These checks tell the two likely causes apart -- the update
-- policy is missing (the UPDATE silently matches no row) or the account has no
-- profiles row at all.

select 'self-update policy exists (migration 20260903)' as check,
       (exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'profiles'
             and policyname = 'Users can update their own profile'
       ))::text as result

union all
select 'all UPDATE policies on profiles',
       coalesce((
           select string_agg(policyname, ', ' order by policyname) from pg_policies
           where schemaname = 'public' and tablename = 'profiles' and cmd = 'UPDATE'
       ), 'NONE')

union all
select 'table-level UPDATE granted to authenticated',
       (exists (
           select 1 from pg_class c, aclexplode(c.relacl) acl
           where c.oid = 'public.profiles'::regclass
             and acl.grantee = 'authenticated'::regrole
             and acl.privilege_type = 'UPDATE'
       ))::text

union all
select 'column-level UPDATE granted to authenticated',
       coalesce((
           select string_agg(a.attname, ', ' order by a.attname)
           from pg_attribute a, aclexplode(a.attacl) acl
           where a.attrelid = 'public.profiles'::regclass
             and acl.grantee = 'authenticated'::regrole
             and acl.privilege_type = 'UPDATE'
       ), 'none')

union all
select 'signup trigger on auth.users',
       (exists (
           select 1 from pg_trigger
           where tgrelid = 'auth.users'::regclass
             and tgname = 'on_auth_user_created'
             and not tgisinternal
       ))::text

union all
select 'profiles_enforce_privileges trigger',
       (exists (
           select 1 from pg_trigger
           where tgrelid = 'public.profiles'::regclass
             and tgname = 'profiles_enforce_privileges'
             and not tgisinternal
       ))::text

union all
select 'auth users with no profiles row',
       (select count(*)::text from auth.users u
        where not exists (select 1 from public.profiles p where p.id = u.id))

union all
select 'profiles whose username is an email address',
       (select count(*)::text from public.profiles where username like '%@%')

union all
-- If either of these is false, 20260902090000 rolled back and the
-- profiles_enforce_privileges trigger from 20260903023213 raises
-- 42703 "record \"new\" has no field \"status\"" on EVERY profile update.
select 'profiles.status column exists (migration 20260902 applied)',
       (exists (
           select 1 from pg_attribute
           where attrelid = 'public.profiles'::regclass
             and attname = 'status' and not attisdropped
       ))::text

union all
select 'profiles.email column exists (migration 20260902 applied)',
       (exists (
           select 1 from pg_attribute
           where attrelid = 'public.profiles'::regclass
             and attname = 'email' and not attisdropped
       ))::text

union all
select 'is_admin() function exists',
       (to_regprocedure('public.is_admin()') is not null)::text

union all
select 'username column is nullable',
       (select not attnotnull from pg_attribute
        where attrelid = 'public.profiles'::regclass and attname = 'username')::text

union all
select 'competing signup trigger (created outside migrations)',
       (exists (
           select 1 from pg_trigger
           where tgrelid = 'auth.users'::regclass
             and tgname = 'create_profile_for_auth_user'
             and not tgisinternal
       ))::text

union all
select 'out-of-band private.* provisioning functions',
       coalesce((
           select string_agg(p.proname, ', ' order by p.proname)
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private'
             and p.proname in ('handle_new_auth_user', 'ensure_user_profile')
       ), 'none')

union all
select 'newest account',
       coalesce((
           select format('%s | has profile: %s | username: %s',
                         u.email, (p.id is not null), coalesce(p.username, 'null'))
           from auth.users u
           left join public.profiles p on p.id = u.id
           order by u.created_at desc
           limit 1
       ), 'no accounts');


-- Optional: run the exact update the app runs, as the signed-in user, and roll
-- it back. Replace both copies of the uuid with the id from "newest account".
--
-- begin;
--     set local role authenticated;
--     set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
--     update public.profiles set username = 'diagnostic_name'
--     where id = '00000000-0000-0000-0000-000000000000'
--     returning username;
-- rollback;
