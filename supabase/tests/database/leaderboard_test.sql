begin;

select plan(17);

insert into auth.users (id, email)
values
    ('a0000000-0000-0000-0000-000000000001', 'lb-winner@student.unsw.edu.au'),
    ('a0000000-0000-0000-0000-000000000002', 'lb-tie-early@student.unsw.edu.au'),
    ('a0000000-0000-0000-0000-000000000003', 'lb-tie-late@student.unsw.edu.au'),
    ('a0000000-0000-0000-0000-000000000004', 'lb-open@student.unsw.edu.au'),
    ('a0000000-0000-0000-0000-000000000005', 'lb-loss@student.unsw.edu.au'),
    ('b0000000-0000-0000-0000-000000000001', 'collision@student.unsw.edu.au'),
    ('b0000000-0000-0000-0000-000000000002', 'collision@unsw.edu.au');

insert into auth.users (id, email)
select
    md5('leaderboard-filler-' || number)::uuid,
    'lb-filler-' || number || '@student.unsw.edu.au'
from generate_series(1, 52) as number;

update auth.users
set created_at = case id
    when 'a0000000-0000-0000-0000-000000000001' then now() - interval '100 days'
    when 'a0000000-0000-0000-0000-000000000002' then now() - interval '90 days'
    when 'a0000000-0000-0000-0000-000000000003' then now() - interval '80 days'
    when 'a0000000-0000-0000-0000-000000000004' then now() - interval '70 days'
    else created_at
end;

select is(
    (
        select username
        from public.profiles
        where id = 'a0000000-0000-0000-0000-000000000001'
    ),
    'lb-winner',
    'profile username uses the lowercase email prefix'
);

select ok(
    (
        select username like 'collision-%'
        from public.profiles
        where id = 'b0000000-0000-0000-0000-000000000002'
    ),
    'a username collision receives a UUID suffix'
);

select is(
    (
        select count(*)
        from public.ledger
        where profile_id = 'a0000000-0000-0000-0000-000000000001'
          and reason = 'initial_credit'
    ),
    1::bigint,
    'profile creation adds one initial credit entry'
);

select lives_ok(
    $$
        select private.ensure_user_profile(
            'a0000000-0000-0000-0000-000000000001',
            'lb-winner@student.unsw.edu.au'
        )
    $$,
    'profile backfill is safe to repeat'
);

select is(
    (
        select count(*)
        from public.ledger
        where profile_id = 'a0000000-0000-0000-0000-000000000001'
          and reason = 'initial_credit'
    ),
    1::bigint,
    'repeated backfill does not duplicate initial credit'
);

insert into public.markets (id, title, category, closes_at, status)
values
    (
        'a1000000-0000-0000-0000-000000000001',
        'Settled leaderboard market',
        'test',
        now() - interval '1 day',
        'resolved'
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        'Open leaderboard market',
        'test',
        now() + interval '1 day',
        'open'
    );

insert into public.outcomes (id, market_id, name)
values
    (
        'a2000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'Yes'
    ),
    (
        'a2000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'Yes'
    );

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
        'a3000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        100,
        now(),
        500
    ),
    (
        'a3000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        100,
        now(),
        200
    ),
    (
        'a3000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        100,
        now(),
        200
    ),
    (
        'a3000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000002',
        'a2000000-0000-0000-0000-000000000002',
        900,
        null,
        null
    ),
    (
        'a3000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000005',
        'a1000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        100,
        now(),
        0
    );

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000005';
set local role authenticated;

select is(
    (select settled_profit from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000001'),
    400::bigint,
    'winning payout produces the correct realized profit'
);

select is(
    (select settled_profit from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000005'),
    (-100)::bigint,
    'zero-payout loss reduces realized profit'
);

select is(
    (select settled_profit from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000004'),
    0::bigint,
    'open positions do not affect realized profit'
);

select is(
    (select settled_count from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000001'),
    1::bigint,
    'settled count includes settled positions'
);

select is(
    (select count(*) from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000004'),
    1::bigint,
    'a zero-profit user remains ranked'
);

select cmp_ok(
    (select rank from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000002'),
    '<',
    (select rank from public.get_leaderboard() where profile_id = 'a0000000-0000-0000-0000-000000000003'),
    'equal profit is ordered by earlier profile creation'
);

select is(
    (select count(*) from public.get_leaderboard()),
    51::bigint,
    'leaderboard returns the top 50 and an out-of-range current user'
);

select ok(
    exists (
        select 1
        from public.get_leaderboard()
        where profile_id = 'a0000000-0000-0000-0000-000000000005'
          and is_current_user
          and rank > 50
    ),
    'the out-of-range current user is included'
);

select is(
    (
        select count(*)
        from public.get_leaderboard()
        where profile_id = 'a0000000-0000-0000-0000-000000000005'
    ),
    1::bigint,
    'the current user is not duplicated'
);

reset role;
set local role anon;

select throws_ok(
    'select * from public.get_leaderboard()',
    '42501',
    'permission denied for function get_leaderboard',
    'anonymous users cannot execute the leaderboard RPC'
);

reset role;
set local role authenticated;

select is(
    (select count(*) from public.positions),
    1::bigint,
    'the current user can still read their own raw position'
);

select is(
    (
        select count(*)
        from public.positions
        where profile_id = 'a0000000-0000-0000-0000-000000000001'
    ),
    0::bigint,
    'another user raw position remains protected by RLS'
);

select * from finish();

rollback;
