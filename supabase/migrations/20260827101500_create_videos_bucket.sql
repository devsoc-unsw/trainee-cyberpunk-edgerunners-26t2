insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;


create policy "Users can upload videos to their own folder"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);


create policy "Users can update their own videos"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);


create policy "Users can delete their own videos"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);


create policy "Anyone can read videos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'videos');
