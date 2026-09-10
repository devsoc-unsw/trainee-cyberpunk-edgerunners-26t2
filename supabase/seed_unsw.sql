-- UNSW-flavoured variant of seed.sql.
--
-- Same shape as seed.sql, but every market is a UNSW question and the ids sit
-- in their own 30000000-/40000000- ranges so this file can be loaded alongside
-- seed.sql without colliding with it.
--
-- Categories are lowercased to match the feed's discovery chips
-- (app/(tabs)/feed/index.tsx compares market.category case-insensitively):
-- sports, stem, politics and crypto are filterable; campus markets only show
-- under "All".

begin;

insert into public.markets (
    id,
    title,
    description,
    category,
    closes_at,
    resolution_criteria,
    status
)
values
    (
        '30000000-0000-0000-0000-000000000001',
        'Will UNSW beat USYD in the rugby derby?',
        'The Eastern Suburbs derby is the biggest fixture on the UNSW sporting calendar.',
        'sports',
        now() + interval '1 day',
        'Resolves YES if UNSW is recorded as the winner of the next scheduled UNSW v USYD rugby fixture. A draw resolves NO.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'Will UNSW finish top five at Nationals?',
        'UNSW has been a perennial top-tier finisher at Nationals.',
        'sports',
        now() + interval '2 days',
        'Resolves YES if UNSW places fifth or better on the official UniSport Nationals overall medal tally.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'Will 1000+ students join intramural sport?',
        'Intramural signups open in week one and close at the end of week two.',
        'sports',
        now() + interval '3 days',
        'Resolves YES if UNSW Sport publishes a registration figure above 1000 for the current term.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        'Will UNSW rowing win the next regatta?',
        'The crew has been training out of the Sydney International Regatta Centre all season.',
        'sports',
        now() + interval '5 days',
        'Resolves YES if UNSW is placed first in the premier eight at the next intervarsity regatta.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000005',
        'Will Sunswift set a new solar record?',
        'Sunswift Racing holds multiple Guinness World Records for solar-powered vehicles.',
        'stem',
        now() + interval '7 days',
        'Resolves YES if a new record attempt by UNSW Sunswift is officially ratified before the market closes.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000006',
        'Will UNSW publish in Nature or Science?',
        'UNSW research output is tracked publicly through the university newsroom.',
        'stem',
        now() + interval '10 days',
        'Resolves YES if a paper with a UNSW-affiliated corresponding author appears in Nature or Science during the current term.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000007',
        'Will UNSW announce quantum funding?',
        'UNSW is home to one of the largest silicon quantum computing groups in the world.',
        'stem',
        now() + interval '14 days',
        'Resolves YES if UNSW publicly announces new funding for quantum computing research before the market closes.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000008',
        'Will CSE offer a new AI course?',
        'The CSE course list for next term is published ahead of enrolment.',
        'stem',
        now() + interval '21 days',
        'Resolves YES if a course code not offered this year and centred on AI or machine learning appears in the next term handbook.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000009',
        'Will the SRC pass a housing motion?',
        'Housing costs in Kensington and Randwick have been a recurring SRC agenda item.',
        'politics',
        now() + interval '30 days',
        'Resolves YES if the SRC minutes record a passed motion on student housing during the current term.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000010',
        'Will election turnout beat last year?',
        'Turnout figures are published with the official election results.',
        'politics',
        now() + interval '45 days',
        'Resolves YES if the official turnout for the next UNSW student election exceeds the prior year figure.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000011',
        'Will UNSW change the trimester calendar?',
        'The three-term calendar has been under review since it was introduced.',
        'politics',
        now() + interval '60 days',
        'Resolves YES if UNSW formally announces a change to the academic calendar structure before the market closes.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000012',
        'Will Blockchain Soc run a hackathon?',
        'The society has run at least one hackathon in each of the last few years.',
        'crypto',
        now() + interval '75 days',
        'Resolves YES if UNSW Blockchain Society publicly announces and holds a hackathon during the current term.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000013',
        'Will a UNSW team win a blockchain hackathon?',
        'UNSW teams regularly enter ETHGlobal and similar events.',
        'crypto',
        now() + interval '90 days',
        'Resolves YES if a team with UNSW student members is listed as a prize winner at an international blockchain hackathon.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000014',
        'Will the library open 24 hours for exams?',
        'The Main Library has run extended hours during past exam periods.',
        'campus',
        now() + interval '100 days',
        'Resolves YES if UNSW Library publishes 24-hour opening hours covering any part of the current exam period.',
        'open'
    ),
    (
        '30000000-0000-0000-0000-000000000015',
        'Will the Roundhouse sell out Thursday?',
        'Roundhouse ticket releases are announced through Arc each week.',
        'campus',
        now() + interval '120 days',
        'Resolves YES if the next Thursday night Roundhouse event is listed as sold out before doors open.',
        'open'
    )
on conflict (id) do update
set
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    closes_at = excluded.closes_at,
    resolution_criteria = excluded.resolution_criteria,
    status = excluded.status;

-- pool = liquidity + wager_pool is the invariant the odds and the payout split
-- both read from, so seeded pools are recorded as house liquidity with no
-- wagers against them yet. That makes the house the counterparty for the first
-- bet placed on any of these markets.
insert into public.outcomes (
    id,
    market_id,
    name,
    pool,
    liquidity,
    wager_pool
)
values
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Yes', 1400, 1400, 0),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'No', 1100, 1100, 0),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Yes', 900, 900, 0),
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'No', 1100, 1100, 0),
    ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'Yes', 1300, 1300, 0),
    ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', 'No', 700, 700, 0),
    ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004', 'Yes', 800, 800, 0),
    ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000004', 'No', 1200, 1200, 0),
    ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000005', 'Yes', 1500, 1500, 0),
    ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000005', 'No', 1000, 1000, 0),
    ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', 'Yes', 1650, 1650, 0),
    ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000006', 'No', 850, 850, 0),
    ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000007', 'Yes', 1200, 1200, 0),
    ('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000007', 'No', 800, 800, 0),
    ('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000008', 'Yes', 1050, 1050, 0),
    ('40000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000008', 'No', 950, 950, 0),
    ('40000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000009', 'Yes', 1400, 1400, 0),
    ('40000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000009', 'No', 600, 600, 0),
    ('40000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000010', 'Yes', 700, 700, 0),
    ('40000000-0000-0000-0000-000000000020', '30000000-0000-0000-0000-000000000010', 'No', 1300, 1300, 0),
    ('40000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000011', 'Yes', 500, 500, 0),
    ('40000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000011', 'No', 1500, 1500, 0),
    ('40000000-0000-0000-0000-000000000023', '30000000-0000-0000-0000-000000000012', 'Yes', 1600, 1600, 0),
    ('40000000-0000-0000-0000-000000000024', '30000000-0000-0000-0000-000000000012', 'No', 400, 400, 0),
    ('40000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000013', 'Yes', 750, 750, 0),
    ('40000000-0000-0000-0000-000000000026', '30000000-0000-0000-0000-000000000013', 'No', 1250, 1250, 0),
    ('40000000-0000-0000-0000-000000000027', '30000000-0000-0000-0000-000000000014', 'Yes', 1350, 1350, 0),
    ('40000000-0000-0000-0000-000000000028', '30000000-0000-0000-0000-000000000014', 'No', 650, 650, 0),
    ('40000000-0000-0000-0000-000000000029', '30000000-0000-0000-0000-000000000015', 'Yes', 1150, 1150, 0),
    ('40000000-0000-0000-0000-000000000030', '30000000-0000-0000-0000-000000000015', 'No', 850, 850, 0)
-- Only the house side is re-seeded. wager_pool is left alone because it holds
-- real user stakes: resetting it to zero on a re-run would erase bets that
-- positions and the ledger still account for. The outcomes_sync_pool_components
-- trigger recomputes pool as liquidity + wager_pool, so pool is not set here.
on conflict (market_id, name) do update
set liquidity = excluded.liquidity;

-- Same reason as seed.sql: these markets bypass admin_create_market, so nothing
-- has recorded their opening probability and the migration backfill ran before
-- they existed. Without an opening point the feed chart has nothing to anchor
-- to and a market's first bet draws a flat line instead of a step.
--
-- This has to run before the bets below, not after as in seed.sql. place_bet
-- records a point of its own, so a market that has already been bet on no
-- longer matches the not-exists guard and would never get its opening point.
select private.record_probability_point(markets.id, 'MARKET_CREATED')
from public.markets
where not exists (
    select 1
    from public.market_probability_points
    where market_probability_points.market_id = markets.id
);

-- Seeded bettors, so the markets open with volume on them.
--
-- The feed reads volume as the sum of outcome.wagerPool, which only place_bet
-- ever moves -- house liquidity does not count. Writing wager_pool directly
-- would be a lie the rest of the schema then trips over: resolve_market pays
-- winners out of sum(pool), so phantom wagers with no positions behind them
-- inflate real payouts at the house's expense. These are real accounts placing
-- real bets through the real function instead.
--
-- Inserting the auth.users row is enough to provision each account: the
-- on_auth_user_created trigger creates the profile and credits it 1000.
-- Local use only -- these rows are meaningless against a hosted project.
insert into auth.users (id, email)
values
    ('50000000-0000-0000-0000-000000000001', 'unsw-seed-bettor-01@example.com'),
    ('50000000-0000-0000-0000-000000000002', 'unsw-seed-bettor-02@example.com'),
    ('50000000-0000-0000-0000-000000000003', 'unsw-seed-bettor-03@example.com'),
    ('50000000-0000-0000-0000-000000000004', 'unsw-seed-bettor-04@example.com'),
    ('50000000-0000-0000-0000-000000000005', 'unsw-seed-bettor-05@example.com'),
    ('50000000-0000-0000-0000-000000000006', 'unsw-seed-bettor-06@example.com'),
    ('50000000-0000-0000-0000-000000000007', 'unsw-seed-bettor-07@example.com'),
    ('50000000-0000-0000-0000-000000000008', 'unsw-seed-bettor-08@example.com')
on conflict (id) do nothing;

-- handle_new_user deliberately leaves username null (an email fails
-- profiles_username_format), so name them here. This also puts them on the
-- leaderboard, which excludes unnamed profiles -- a populated board is the
-- point, but it is why the seeded eight appear there.
update public.profiles
set username = 'unsw_seed_' || right(replace(id::text, '-', ''), 2)
where id between '50000000-0000-0000-0000-000000000001'
             and '50000000-0000-0000-0000-000000000008'
  and username is null;

-- Bets are placed through public.place_bet so that positions, the ledger,
-- outcome pools and the probability history all stay in agreement. place_bet
-- reads auth.uid(), hence the per-bet jwt claim; the settings are
-- transaction-local and cleared at the end of the block.
--
-- The stakes below were chosen to sit under place_bet's own ceiling of
-- least(balance / 5, 500) given the order they are placed in, which is why
-- each bettor's stakes descend. The clamp is a safety net for edits: a stake
-- raised past the cap is trimmed rather than aborting the whole seed.
do $$
declare
    v_bet record;
    v_balance bigint;
    v_max_stake bigint;
    v_stake bigint;
begin
    for v_bet in
        select * from (values
        ( 1, '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 200), -- m01 Yes
        ( 2, '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 150), -- m03 Yes
        ( 3, '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', 110), -- m05 No
        ( 4, '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000013', 80), -- m07 Yes
        ( 5, '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000019', 60), -- m10 Yes
        ( 6, '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000024', 45), -- m12 No
        ( 7, '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 200), -- m01 No
        ( 8, '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000006', 150), -- m03 No
        ( 9, '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000009', 110), -- m05 Yes
        (10, '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000015', 80), -- m08 Yes
        (11, '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000020', 60), -- m10 No
        (12, '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000025', 45), -- m13 Yes
        (13, '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 200), -- m01 Yes
        (14, '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', 150), -- m03 Yes
        (15, '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000011', 110), -- m06 Yes
        (16, '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000016', 80), -- m08 No
        (17, '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000019', 60), -- m10 Yes
        (18, '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000026', 45), -- m13 No
        (19, '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 200), -- m01 No
        (20, '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000007', 150), -- m04 Yes
        (21, '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000012', 110), -- m06 No
        (22, '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000015', 80), -- m08 Yes
        (23, '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000021', 60), -- m11 Yes
        (24, '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000025', 45), -- m13 Yes
        (25, '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 200), -- m01 Yes
        (26, '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000008', 150), -- m04 No
        (27, '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000011', 110), -- m06 Yes
        (28, '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000017', 80), -- m09 Yes
        (29, '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000022', 60), -- m11 No
        (30, '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000027', 45), -- m14 Yes
        (31, '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', 200), -- m02 Yes
        (32, '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000009', 150), -- m05 Yes
        (33, '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000012', 110), -- m06 No
        (34, '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000018', 80), -- m09 No
        (35, '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000023', 60), -- m12 Yes
        (36, '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000028', 45), -- m14 No
        (37, '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000004', 200), -- m02 No
        (38, '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000010', 150), -- m05 No
        (39, '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000013', 110), -- m07 Yes
        (40, '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000017', 80), -- m09 Yes
        (41, '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000024', 60), -- m12 No
        (42, '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000029', 45), -- m15 Yes
        (43, '50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000003', 200), -- m02 Yes
        (44, '50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000009', 150), -- m05 Yes
        (45, '50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000014', 110), -- m07 No
        (46, '50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000018', 80), -- m09 No
        (47, '50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000023', 60), -- m12 Yes
        (48, '50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000030', 45)  -- m15 No
        ) as bets(seq, profile_id, outcome_id, stake)
        order by seq
    loop
        -- Re-running the seed must not stack a second bet onto a position that
        -- is already there.
        if exists (
            select 1 from public.positions
            where profile_id = v_bet.profile_id::uuid
              and outcome_id = v_bet.outcome_id::uuid
        ) then
            continue;
        end if;

        perform set_config(
            'request.jwt.claims',
            json_build_object('sub', v_bet.profile_id)::text,
            true
        );
        perform set_config('request.jwt.claim.sub', v_bet.profile_id, true);

        select coalesce(sum(delta), 0)::bigint into v_balance
        from public.ledger
        where profile_id = v_bet.profile_id::uuid;

        v_max_stake := least(v_balance / 5, 500);
        v_stake := least(v_bet.stake::bigint, v_max_stake);

        if v_stake >= 10 then
            perform public.place_bet(v_bet.outcome_id::uuid, v_stake);
        end if;
    end loop;

    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

commit;
