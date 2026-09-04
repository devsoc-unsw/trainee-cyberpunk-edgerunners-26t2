-- Repairs privileges clobbered by 20260904074053_remote_schema.sql.

grant all on table
    public.profiles,
    public.markets,
    public.outcomes,
    public.positions,
    public.ledger,
    public.admin_actions,
    public.profile_balances
to service_role;

revoke all on function public.handle_new_user()
    from public, anon, authenticated, service_role;

revoke all on function public.prevent_ledger_changes()
    from public, anon, authenticated, service_role;

revoke all on function public.enforce_profile_privileges()
    from public, anon, authenticated, service_role;
