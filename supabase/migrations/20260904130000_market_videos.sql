alter table public.markets
    add column if not exists video_path text,
    add column if not exists video_duration_ms integer;

alter table public.markets
    drop constraint if exists markets_video_duration_check,
    drop constraint if exists markets_video_metadata_pair_check;

alter table public.markets
    add constraint markets_video_duration_check check (
        video_duration_ms is null or video_duration_ms between 1 and 30000
    ),
    add constraint markets_video_metadata_pair_check check (
        (video_path is null and video_duration_ms is null)
        or (video_path is not null and video_duration_ms is not null)
    );

update storage.buckets
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4']::text[]
where id = 'videos';

drop policy if exists "Users can upload videos to their own folder" on storage.objects;
drop policy if exists "Users can update their own videos" on storage.objects;
drop policy if exists "Users can delete their own videos" on storage.objects;
drop policy if exists "Admins can upload market videos" on storage.objects;
drop policy if exists "Admins can update market videos" on storage.objects;
drop policy if exists "Admins can delete market videos" on storage.objects;

create policy "Admins can upload market videos"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
);

create policy "Admins can update market videos"
on storage.objects for update to authenticated
using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
)
with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
);

create policy "Admins can delete market videos"
on storage.objects for delete to authenticated
using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
);

drop function if exists public.admin_create_market(text, text, text, timestamptz, text, integer);
create function public.admin_create_market(
    p_title text,
    p_description text,
    p_category text,
    p_closes_at timestamptz,
    p_resolution_criteria text,
    p_yes_percentage integer default 50,
    p_video_path text default null,
    p_video_duration_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_market_id uuid;
    v_title text := trim(coalesce(p_title, ''));
    v_category text := trim(coalesce(p_category, ''));
    v_criteria text := trim(coalesce(p_resolution_criteria, ''));
    v_video_path text := nullif(trim(coalesce(p_video_path, '')), '');
begin
    if v_title = '' or v_category = '' or v_criteria = '' then
        raise exception 'Question, category and resolution criteria are required';
    end if;
    if p_closes_at is null or p_closes_at <= now() then
        raise exception 'Closing date must be in the future';
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

    insert into public.outcomes (market_id, name, pool, liquidity, wager_pool)
    values
        (v_market_id, 'Yes', p_yes_percentage, p_yes_percentage, 0),
        (v_market_id, 'No', 100 - p_yes_percentage, 100 - p_yes_percentage, 0);

    perform private.record_probability_point(v_market_id, 'MARKET_CREATED');
    perform private.record_admin_action(
        v_admin_id, 'MARKET_CREATED', 'MARKET', v_market_id,
        v_title, 'Created market', ''
    );
    return v_market_id;
end;
$$;

drop function if exists public.admin_update_market(uuid, text, text, text, timestamptz, text);
create function public.admin_update_market(
    p_market_id uuid,
    p_title text,
    p_description text,
    p_category text,
    p_closes_at timestamptz,
    p_resolution_criteria text,
    p_video_path text default null,
    p_video_duration_ms integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.require_admin();
    v_title text := trim(coalesce(p_title, ''));
    v_category text := trim(coalesce(p_category, ''));
    v_criteria text := trim(coalesce(p_resolution_criteria, ''));
    v_video_path text := nullif(trim(coalesce(p_video_path, '')), '');
begin
    if v_title = '' or v_category = '' or v_criteria = '' then
        raise exception 'Question, category and resolution criteria are required';
    end if;
    if p_closes_at is null then
        raise exception 'Closing date is required';
    end if;
    if (v_video_path is null) <> (p_video_duration_ms is null) then
        raise exception 'Video path and duration must be supplied together';
    end if;

    update public.markets
    set title = v_title,
        description = trim(coalesce(p_description, '')),
        category = v_category,
        closes_at = p_closes_at,
        resolution_criteria = v_criteria,
        video_path = v_video_path,
        video_duration_ms = p_video_duration_ms
    where id = p_market_id
      and status in ('open', 'closed')
      and deleted_at is null;

    if not found then
        raise exception 'Only unresolved, undeleted markets can be edited';
    end if;

    perform private.record_admin_action(
        v_admin_id, 'MARKET_UPDATED', 'MARKET', p_market_id,
        v_title, 'Updated market details', ''
    );
end;
$$;

revoke all on function public.admin_create_market(text, text, text, timestamptz, text, integer, text, integer) from public, anon;
revoke all on function public.admin_update_market(uuid, text, text, text, timestamptz, text, text, integer) from public, anon;
grant execute on function public.admin_create_market(text, text, text, timestamptz, text, integer, text, integer) to authenticated;
grant execute on function public.admin_update_market(uuid, text, text, text, timestamptz, text, text, integer) to authenticated;
