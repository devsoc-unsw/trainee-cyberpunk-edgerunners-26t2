begin;

select plan(6);


insert into auth.users (id, email)
values
    ('11111111-1111-1111-1111-111111111111', 'user1@test.com'),
    ('22222222-2222-2222-2222-222222222222', 'user2@test.com');


insert into public.profiles (id, username)
values
    ('11111111-1111-1111-1111-111111111111', 'user1'),
    ('22222222-2222-2222-2222-222222222222', 'user2')
on conflict (id) do update
set username = excluded.username;


insert into public.markets (
    id,
    title,
    category,
    closes_at
)
values (
    '33333333-3333-3333-3333-333333333333',
    'Test Market',
    'Test',
    '2099-01-01 00:00:00+00'
);


insert into public.outcomes (
    id,
    market_id,
    name
)
values (
    '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    'Yes'
);


insert into public.positions (
    id,
    profile_id,
    market_id,
    outcome_id,
    stake
)
values
    (
        '55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
        100
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
        100
    );

update public.markets
set deleted_at = now()
where id = '33333333-3333-3333-3333-333333333333';


insert into public.ledger (
    id,
    profile_id,
    delta,
    reason
)
select seed.id::uuid, seed.profile_id::uuid, seed.delta, seed.reason
from (values
    (
        '77777777-7777-7777-7777-777777777777',
        '11111111-1111-1111-1111-111111111111',
        1000,
        'initial_credit'
    ),
    (
        '88888888-8888-8888-8888-888888888888',
        '22222222-2222-2222-2222-222222222222',
        1000,
        'initial_credit'
    )
) as seed(id, profile_id, delta, reason)
where not exists (
    select 1
    from public.ledger
    where ledger.profile_id = seed.profile_id::uuid
      and ledger.reason = 'initial_credit'
);


select is(
    (
        select count(*) = 5 and bool_and(c.relrowsecurity)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
        and c.relname in (
            'profiles',
            'markets',
            'outcomes',
            'positions',
            'ledger'
        )
    ),
    true,
    'RLS is enabled on all five tables'
);


set local role authenticated;
set local request.jwt.claim.sub =
    '11111111-1111-1111-1111-111111111111';


select is(
    (select count(*) from public.positions),
    1::bigint,
    'User can read their own position'
);


select is(
    (
        select title
        from public.markets
        where id = '33333333-3333-3333-3333-333333333333'
    ),
    'Test Market',
    'User can read a soft-deleted market referenced by their position'
);


select is(
    (
        select count(*)
        from public.positions
        where profile_id =
            '22222222-2222-2222-2222-222222222222'
    ),
    0::bigint,
    'User cannot read another user position'
);


select is(
    (select count(*) from public.ledger),
    1::bigint,
    'User can read their own ledger row'
);


select is(
    (
        select count(*)
        from public.ledger
        where profile_id =
            '22222222-2222-2222-2222-222222222222'
    ),
    0::bigint,
    'User cannot read another user ledger row'
);


select * from finish();

rollback;
