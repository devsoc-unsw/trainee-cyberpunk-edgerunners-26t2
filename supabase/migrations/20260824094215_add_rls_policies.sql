alter table public.profiles enable row level security;
alter table public.markets enable row level security;
alter table public.outcomes enable row level security;
alter table public.positions enable row level security;
alter table public.ledger enable row level security;


revoke all on table public.profiles from anon, authenticated;
revoke all on table public.markets from anon, authenticated;
revoke all on table public.outcomes from anon, authenticated;
revoke all on table public.positions from anon, authenticated;
revoke all on table public.ledger from anon, authenticated;


grant select, insert, update on table public.profiles to authenticated;
grant select on table public.markets to authenticated;
grant select on table public.outcomes to authenticated;
grant select on table public.positions to authenticated;
grant select on table public.ledger to authenticated;


create policy "Users can read profiles"
on public.profiles
for select
to authenticated
using (true);


create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);


create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);


create policy "Users can read markets"
on public.markets
for select
to authenticated
using (true);


create policy "Users can read outcomes"
on public.outcomes
for select
to authenticated
using (true);


create policy "Users can read their own positions"
on public.positions
for select
to authenticated
using ((select auth.uid()) = profile_id);


create policy "Users can read their own ledger"
on public.ledger
for select
to authenticated
using ((select auth.uid()) = profile_id);


alter view public.profile_balances
set (security_invoker = true);

revoke all on table public.profile_balances from anon, authenticated;
grant select on table public.profile_balances to authenticated;