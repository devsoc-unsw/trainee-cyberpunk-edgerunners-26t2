-- Automatic market expiry.
--
-- place_bet already refuses a bet once closes_at has passed, so wagering was
-- never at risk. What was missing is the status transition: a market stayed
-- 'open' forever after its deadline, and admin_resolve_market refuses to run
-- unless status = 'closed'. That left an admin manually closing every expired
-- market before it could be resolved. This closes them on a schedule instead.

create extension if not exists pg_cron;

create or replace function private.close_expired_markets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_closed integer;
begin
    -- Only 'open' markets are touched. A market that is already resolved or
    -- voided keeps that status even though its closes_at is in the past.
    update public.markets
    set status = 'closed'
    where status = 'open'
      and closes_at <= now();

    get diagnostics v_closed = row_count;
    return v_closed;
end;
$$;

revoke all on function private.close_expired_markets()
    from public, anon, authenticated;

-- Runs as postgres, which owns the function, so no grant to a Data API role is
-- needed. Re-scheduling under the same job name replaces the existing entry, so
-- this migration stays idempotent. cron.job must be managed through
-- cron.schedule/cron.unschedule -- Supabase blocks direct writes to that table.
select cron.schedule(
    'close-expired-markets',
    '* * * * *',
    $job$select private.close_expired_markets()$job$
);
