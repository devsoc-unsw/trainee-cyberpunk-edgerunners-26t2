begin;

insert into public.markets (
    id,
    title,
    category,
    closes_at,
    status
)
values
    (
        '10000000-0000-0000-0000-000000000001',
        'Will Australia win its next cricket match?',
        'sports',
        now() + interval '1 day',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Will the home team score first?',
        'sports',
        now() + interval '2 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'Will the match have more than 2 goals?',
        'sports',
        now() + interval '3 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'Will the final go to overtime?',
        'sports',
        now() + interval '5 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        'Will a new AI model be announced this month?',
        'technology',
        now() + interval '7 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000006',
        'Will Bitcoin finish the week above its current price?',
        'technology',
        now() + interval '10 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000007',
        'Will a major phone company announce a new device?',
        'technology',
        now() + interval '14 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000008',
        'Will an open-source project reach 100000 stars?',
        'technology',
        now() + interval '21 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000009',
        'Will the new movie lead the weekend box office?',
        'entertainment',
        now() + interval '30 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000010',
        'Will the new album reach the top ten?',
        'entertainment',
        now() + interval '45 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000011',
        'Will the series be renewed for another season?',
        'entertainment',
        now() + interval '60 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000012',
        'Will the game win an industry award?',
        'entertainment',
        now() + interval '75 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000013',
        'Will the campus event attract over 500 students?',
        'campus',
        now() + interval '90 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000014',
        'Will the university extend library opening hours?',
        'campus',
        now() + interval '100 days',
        'open'
    ),
    (
        '10000000-0000-0000-0000-000000000015',
        'Will the campus cafe launch a new menu?',
        'campus',
        now() + interval '120 days',
        'open'
    )
on conflict (id) do update
set
    title = excluded.title,
    category = excluded.category,
    closes_at = excluded.closes_at,
    status = excluded.status;

update public.markets
set
    description = coalesce(nullif(description, ''), 'A live prediction market. Make a YES or NO prediction before the market closes.'),
    resolution_criteria = coalesce(nullif(resolution_criteria, ''), 'Resolves according to the official outcome described in the market question.');

insert into public.outcomes (
    id,
    market_id,
    name,
    pool
)
values
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Yes', 850),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'No', 620),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Yes', 430),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'No', 510),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Yes', 700),
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'No', 360),
    ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', 'Yes', 290),
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'No', 410),
    ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Yes', 1200),
    ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'No', 980),
    ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000006', 'Yes', 1500),
    ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'No', 1350),
    ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000007', 'Yes', 640),
    ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'No', 720),
    ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000008', 'Yes', 530),
    ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000008', 'No', 470),
    ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000009', 'Yes', 810),
    ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000009', 'No', 760),
    ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000010', 'Yes', 690),
    ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000010', 'No', 540),
    ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000011', 'Yes', 460),
    ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000011', 'No', 390),
    ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000012', 'Yes', 920),
    ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000012', 'No', 880),
    ('20000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000013', 'Yes', 340),
    ('20000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000013', 'No', 270),
    ('20000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000014', 'Yes', 310),
    ('20000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000014', 'No', 260),
    ('20000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000015', 'Yes', 380),
    ('20000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000015', 'No', 330)
on conflict (market_id, name) do update
set pool = excluded.pool;

-- These markets are inserted straight into the table rather than through
-- admin_create_market, so nothing has recorded their opening probability. The
-- migration's backfill cannot help either: migrations run before this file, so
-- there were no markets to backfill. Without this the feed chart has no point
-- to anchor to and a market's first bet draws a flat line instead of a step.
select private.record_probability_point(markets.id, 'MARKET_CREATED')
from public.markets
where not exists (
    select 1
    from public.market_probability_points
    where market_probability_points.market_id = markets.id
);

commit;
