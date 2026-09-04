-- Starting liquidity scales with stake size instead of being pinned to 100.
--
-- admin_create_market seeded liquidity as p_yes_percentage / 100 - p_yes_percentage,
-- so every market opened with exactly 100 total while a single bet can be up to
-- 500 (place_bet caps a stake at least(balance / 5, 500)). Two consequences:
--
--   Payouts. A solo winner is paid stake * total_pool / winning_pool, so their
--   profit works out to stake * (L/2) / (L/2 + stake) at even odds. With L = 100
--   that is +33 on a 100 stake but only +45 on a 500 stake -- the bigger the
--   call, the worse the return.
--
--   Prices. pool = liquidity + wager_pool drives the displayed probability, so
--   one 100-credit bet moved an even market from 50% to 75%.
--
-- The total is now a parameter defaulting to 1000, which is twice the maximum
-- stake. That default gives roughly +83 on a 100 stake and +250 on a 500 stake,
-- and moves an even market to about 55% on a 100-credit bet. Raise it for
-- markets expected to take heavy action; the odds split is unaffected because
-- liquidity is apportioned by p_yes_percentage either way.
--
-- Existing markets are left alone: seeded ones already carry 570-2850, and
-- rewriting live pools would move prices under bets that are already placed.

drop function if exists public.admin_create_market(text, text, text, timestamptz, text, integer, text, integer);

CREATE OR REPLACE FUNCTION public.admin_create_market(p_title text, p_description text, p_category text, p_closes_at timestamp with time zone, p_resolution_criteria text, p_yes_percentage integer DEFAULT 50, p_video_path text DEFAULT NULL::text, p_video_duration_ms integer DEFAULT NULL::integer, p_liquidity bigint DEFAULT 1000)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    v_admin_id uuid := private.require_admin();
    v_market_id uuid;
    v_title text := trim(coalesce(p_title, ''));
    v_category text := trim(coalesce(p_category, ''));
    v_criteria text := trim(coalesce(p_resolution_criteria, ''));
    v_video_path text := nullif(trim(coalesce(p_video_path, '')), '');
    v_yes_liquidity bigint;
    v_no_liquidity bigint;
begin
    if v_title = '' or v_category = '' or v_criteria = '' then
        raise exception 'Question, category and resolution criteria are required';
    end if;
    if p_closes_at is null or p_closes_at <= now() then
        raise exception 'Closing date must be in the future';
    end if;
    -- 100 is the floor because the odds split is a percentage of this total;
    -- below it, 1% of liquidity rounds away and the seeded odds stop being
    -- representable.
    if p_liquidity is null or p_liquidity < 100 then
        raise exception 'Starting liquidity must be at least 100';
    end if;
    if p_yes_percentage not between 1 and 99 then
        raise exception 'YES percentage must be between 1 and 99';
    end if;
    if (v_video_path is null) <> (p_video_duration_ms is null) then
        raise exception 'Video path and duration must be supplied together';
    end if;

    insert into public.markets (
        title, description, category, closes_at, resolution_criteria,
        video_path, video_duration_ms
    ) values (
        v_title, trim(coalesce(p_description, '')), v_category, p_closes_at, v_criteria,
        v_video_path, p_video_duration_ms
    ) returning id into v_market_id;

    -- Liquidity is split by the seeded odds and sums to p_liquidity. Deriving
    -- the NO side by subtraction rather than a second division keeps the total
    -- exact regardless of rounding. Both sides are floored at 1 so no outcome
    -- can ever hold a zero pool, which the payout division depends on.
    v_yes_liquidity := greatest(1, (p_liquidity * p_yes_percentage) / 100);
    v_no_liquidity := greatest(1, p_liquidity - v_yes_liquidity);

    insert into public.outcomes (market_id, name, pool, liquidity, wager_pool)
    values
        (v_market_id, 'Yes', v_yes_liquidity, v_yes_liquidity, 0),
        (v_market_id, 'No', v_no_liquidity, v_no_liquidity, 0);

    perform private.record_probability_point(v_market_id, 'MARKET_CREATED');
    perform private.record_admin_action(
        v_admin_id, 'MARKET_CREATED', 'MARKET', v_market_id,
        v_title, 'Created market', ''
    );
    return v_market_id;
end;
$function$;


CREATE OR REPLACE FUNCTION public.admin_override_odds(p_market_id uuid, p_yes_percentage integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    v_total_liquidity bigint;
    v_yes_liquidity bigint;
    v_no_liquidity bigint;
    v_admin_id uuid := private.require_admin();
    v_reason text := private.require_reason(p_reason);
    v_title text;
begin
    if p_yes_percentage not between 1 and 99 then
        raise exception 'YES percentage must be between 1 and 99';
    end if;

    select title into v_title
    from public.markets
    where id = p_market_id
      and status in ('open', 'closed')
      and deleted_at is null
    for update;

    if not found then
        raise exception 'Only unresolved, undeleted markets can change odds';
    end if;

    if exists (select 1 from public.positions where market_id = p_market_id) then
        raise exception 'Starting odds cannot be changed after the first bet';
    end if;

    -- Re-split the liquidity this market already has, rather than resetting it
    -- to a fixed 100. Overwriting the total here would silently drain a market
    -- that was created with deeper liquidity down to the old hardcoded amount.
    select coalesce(sum(liquidity), 0)::bigint into v_total_liquidity
    from public.outcomes
    where market_id = p_market_id;

    v_yes_liquidity := greatest(1, (v_total_liquidity * p_yes_percentage) / 100);
    v_no_liquidity := greatest(1, v_total_liquidity - v_yes_liquidity);

    update public.outcomes
    set liquidity = case when lower(name) = 'yes' then v_yes_liquidity else v_no_liquidity end,
        pool = case when lower(name) = 'yes' then v_yes_liquidity else v_no_liquidity end
    where market_id = p_market_id;

    perform private.record_probability_point(p_market_id, 'ODDS_OVERRIDE');

    perform private.record_admin_action(
        v_admin_id, 'ODDS_OVERRIDE', 'MARKET', p_market_id,
        v_title, 'Changed YES odds to ' || p_yes_percentage || '%', v_reason
    );
end;
$function$;



revoke all on function public.admin_create_market(text, text, text, timestamptz, text, integer, text, integer, bigint) from public, anon;
grant execute on function public.admin_create_market(text, text, text, timestamptz, text, integer, text, integer, bigint) to authenticated;
