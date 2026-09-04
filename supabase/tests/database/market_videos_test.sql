begin;

select plan(14);

insert into auth.users (id, email)
values
    ('a1000000-0000-0000-0000-000000000001', 'video-admin@example.com'),
    ('a1000000-0000-0000-0000-000000000002', 'video-user@example.com');

insert into public.profiles (id, username, role)
values
    ('a1000000-0000-0000-0000-000000000001', 'video_admin', 'ADMIN'),
    ('a1000000-0000-0000-0000-000000000002', 'video_user', 'USER')
on conflict (id) do update
set username = excluded.username,
    role = excluded.role;

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';

select lives_ok(
    $$select public.admin_create_market(
        'Video market', 'Description', 'Test', now() + interval '1 day', 'Criteria', 50,
        'a1000000-0000-0000-0000-000000000001/markets/one.mp4', 10000
    )$$,
    'admin can create a market with a video'
);

select is(
    (select video_path from public.markets where title = 'Video market'),
    'a1000000-0000-0000-0000-000000000001/markets/one.mp4',
    'create RPC attaches the video path'
);

select lives_ok(
    $$select public.admin_update_market(
        (select id from public.markets where title = 'Video market'),
        'Video market', 'Description', 'Test', now() + interval '2 days', 'Criteria',
        'a1000000-0000-0000-0000-000000000001/markets/two.mp4', 20000
    )$$,
    'admin can replace video metadata'
);

select lives_ok(
    $$select public.admin_update_market(
        (select id from public.markets where title = 'Video market'),
        'Video market', 'Description', 'Test', now() + interval '2 days', 'Criteria', null, null
    )$$,
    'admin can detach video metadata'
);

reset role;

select throws_ok(
    $$insert into public.markets (title, category, closes_at, video_path, video_duration_ms)
      values ('Too long', 'Test', now() + interval '1 day', 'clip.mp4', 30001)$$,
    '23514',
    null,
    'database rejects videos over 30 seconds'
);

select is((select file_size_limit from storage.buckets where id = 'videos'), 52428800::bigint, 'bucket limit is 50 MB');
select is((select allowed_mime_types from storage.buckets where id = 'videos'), array['video/mp4']::text[], 'bucket only accepts MP4');

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
select lives_ok(
    $$insert into storage.objects (bucket_id, name, metadata)
      values ('videos', 'a1000000-0000-0000-0000-000000000001/markets/policy.mp4', '{"mimetype":"video/mp4"}')$$,
    'admin can create an object in their own folder'
);

set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000002';
select throws_ok(
    $$insert into storage.objects (bucket_id, name, metadata)
      values ('videos', 'a1000000-0000-0000-0000-000000000002/markets/nope.mp4', '{"mimetype":"video/mp4"}')$$,
    '42501', null, 'normal user cannot upload video objects'
);
select is(
    (select count(*) from storage.objects where bucket_id = 'videos' and name like '%/markets/policy.mp4'),
    1::bigint,
    'authenticated users can publicly read video objects'
);
select lives_ok(
    $$update storage.objects set name = 'changed.mp4'
      where bucket_id = 'videos' and name like '%/markets/policy.mp4'$$,
    'a blocked normal-user update safely affects no rows'
);
select is(
    (select count(*) from storage.objects where bucket_id = 'videos' and name like '%/markets/policy.mp4'),
    1::bigint,
    'failed update leaves the video object unchanged'
);
select throws_ok(
    $$delete from storage.objects
      where bucket_id = 'videos' and name like '%/markets/policy.mp4'$$,
    '42501',
    'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
    'normal user cannot directly delete video objects'
);
select is(
    (select count(*) from storage.objects where bucket_id = 'videos' and name like '%/markets/policy.mp4'),
    1::bigint,
    'failed delete leaves the video object unchanged'
);

select * from finish();
rollback;
