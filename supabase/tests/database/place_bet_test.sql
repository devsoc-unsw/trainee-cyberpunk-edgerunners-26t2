begin;

select plan(16);

insert into auth.users (id, email)
values (
    '90000000-0000-0000-0000-000000000099',
    'place-bet-test@example.com'
);

insert into public.markets (
    id,
    title,
    category,
    closes_at,
    status
)
values
    (
        '90000000-0000-0000-0000-000000000001',
        'Open test market',
        'test',
        now() + interval '1 day',
        'open'
    ),
    (
        '90000000-0000-0000-0000-000000000002',
        'Closed test market',
        'test',
        now() - interval '1 day',
        'open'
    );

insert into public.outcomes (
    id,
    market_id,
    name,
    pool
)
values
    (
        '91000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        'Yes',
        100
    ),
    (
        '91000000-0000-0000-0000-000000000002',
        '90000000-0000-0000-0000-000000000001',
        'No',
        100
    ),
    (
        '91000000-0000-0000-0000-000000000003',
        '90000000-0000-0000-0000-000000000002',
        'Yes',
        100
    );

set local request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000099';

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'balance is 1000 before the under-minimum test'
);

select throws_ok(
    $$
        select public.place_bet(
            '91000000-0000-0000-0000-000000000001',
            9
        )
    $$,
    'P0001',
    'Minimum stake is 10',
    'stake below 10 is rejected'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'under-minimum rejection leaves balance unchanged'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'balance is 1000 before the over-cap test'
);

select throws_ok(
    $$
        select public.place_bet(
            '91000000-0000-0000-0000-000000000001',
            201
        )
    $$,
    'P0001',
    'Maximum stake is 200',
    'stake above 20 percent of balance is rejected'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'over-cap rejection leaves balance unchanged'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'balance is 1000 before the insufficient-balance test'
);

select throws_ok(
    $$
        select public.place_bet(
            '91000000-0000-0000-0000-000000000001',
            1001
        )
    $$,
    'P0001',
    'Stake exceeds available balance of 1000',
    'stake exceeding the available balance is rejected'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'insufficient-balance rejection leaves balance unchanged'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'balance is 1000 before the closed-market test'
);

select throws_ok(
    $$
        select public.place_bet(
            '91000000-0000-0000-0000-000000000003',
            10
        )
    $$,
    'P0001',
    'Market has already closed',
    'bet on a market past closes_at is rejected'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    1000::bigint,
    'closed-market rejection leaves balance unchanged'
);

select lives_ok(
    $$
        select public.place_bet(
            '91000000-0000-0000-0000-000000000001',
            100
        )
    $$,
    'valid same-side bet succeeds before opposite-side test'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    900::bigint,
    'balance is 900 before the opposite-side test'
);

select throws_ok(
    $$
        select public.place_bet(
            '91000000-0000-0000-0000-000000000002',
            10
        )
    $$,
    'P0001',
    'You already placed a bet on the opposite outcome for this market',
    'opposite-side bet is rejected'
);

select is(
    (
        select coalesce(sum(delta), 0)::bigint
        from public.ledger
        where profile_id = '90000000-0000-0000-0000-000000000099'
    ),
    900::bigint,
    'opposite-side rejection leaves balance unchanged'
);

select * from finish();

rollback;
