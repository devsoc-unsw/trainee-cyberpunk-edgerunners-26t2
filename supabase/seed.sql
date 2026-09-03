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

insert into auth.users (id, email, created_at)
values
    ('30000000-0000-0000-0000-000000000001', 'avi@student.unsw.edu.au', now() - interval '5 days'),
    ('30000000-0000-0000-0000-000000000002', 'eric@student.unsw.edu.au', now() - interval '4 days'),
    ('30000000-0000-0000-0000-000000000003', 'ivan@student.unsw.edu.au', now() - interval '3 days'),
    ('30000000-0000-0000-0000-000000000004', 'shin@student.unsw.edu.au', now() - interval '2 days'),
    ('30000000-0000-0000-0000-000000000005', 'zihan@student.unsw.edu.au', now() - interval '1 day')
on conflict (id) do nothing;

update public.profiles
set username = case id
    when '30000000-0000-0000-0000-000000000001' then 'avi'
    when '30000000-0000-0000-0000-000000000002' then 'eric'
    when '30000000-0000-0000-0000-000000000003' then 'ivan'
    when '30000000-0000-0000-0000-000000000004' then 'shin'
    when '30000000-0000-0000-0000-000000000005' then 'zihan'
end
where id in (
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005'
);

insert into public.markets (id, title, category, closes_at, status)
values
    (
        '10000000-0000-0000-0000-000000000016',
        'Did the library extend its opening hours?',
        'campus',
        now() - interval '8 days',
        'resolved'
    ),
    (
        '10000000-0000-0000-0000-000000000017',
        'Did the home team score first?',
        'sports',
        now() - interval '6 days',
        'resolved'
    ),
    (
        '10000000-0000-0000-0000-000000000018',
        'Did the campus event attract 500 students?',
        'campus',
        now() - interval '4 days',
        'resolved'
    ),
    (
        '10000000-0000-0000-0000-000000000019',
        'Did the new album reach the top ten?',
        'entertainment',
        now() - interval '2 days',
        'resolved'
    )
on conflict (id) do update
set
    title = excluded.title,
    category = excluded.category,
    closes_at = excluded.closes_at,
    status = excluded.status;

insert into public.outcomes (id, market_id, name, pool)
values
    ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000016', 'Yes', 500),
    ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000017', 'Yes', 500),
    ('20000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000018', 'No', 250),
    ('20000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000019', 'Yes', 100)
on conflict (market_id, name) do update
set pool = excluded.pool;

insert into public.positions (
    id,
    profile_id,
    market_id,
    outcome_id,
    stake,
    settled_at,
    payout
)
values
    (
        '40000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000016',
        '20000000-0000-0000-0000-000000000031',
        100,
        now() - interval '7 days',
        500
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000017',
        '20000000-0000-0000-0000-000000000032',
        200,
        now() - interval '5 days',
        500
    ),
    (
        '40000000-0000-0000-0000-000000000003',
        '30000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000018',
        '20000000-0000-0000-0000-000000000033',
        100,
        now() - interval '3 days',
        250
    ),
    (
        '40000000-0000-0000-0000-000000000004',
        '30000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000019',
        '20000000-0000-0000-0000-000000000034',
        100,
        now() - interval '1 day',
        0
    )
on conflict (profile_id, market_id, outcome_id) do update
set
    stake = excluded.stake,
    settled_at = excluded.settled_at,
    payout = excluded.payout,
    updated_at = now();

commit;
