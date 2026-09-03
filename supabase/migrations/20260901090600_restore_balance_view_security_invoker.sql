-- Restore RLS enforcement on profile_balances.
--
-- 20260824094215_add_rls_policies.sql set `security_invoker = true` on this
-- view so that the ledger's own RLS policy ("Users can read their own ledger")
-- decided which rows were summed. 20260826104741_ensure_non_negative_balance.sql
-- then rebuilt the view with `create or replace view` and no options, which
-- resets the option rather than preserving it.
--
-- The result: the view ran as its owner, bypassed RLS on ledger, and returned
-- every user's balance to any authenticated caller. Verified against a local
-- database -- two accounts, and both balances were readable from one session.
alter view public.profile_balances
set (security_invoker = true);
