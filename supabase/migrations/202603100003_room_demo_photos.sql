create table public.room_demo_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.photo_kind not null,
  storage_bucket text not null default 'room-demo-photos',
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (room_id, user_id, kind)
);

create index room_demo_photos_room_id_idx on public.room_demo_photos (room_id);
create index room_demo_photos_user_id_idx on public.room_demo_photos (user_id);

alter table public.room_demo_photos enable row level security;

create policy "room members can read room demo photo metadata"
on public.room_demo_photos
for select
to authenticated
using (public.is_room_member(room_id));

create policy "room members can insert their own room demo photo metadata"
on public.room_demo_photos
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_room_member(room_id)
);

create policy "room members can update their own room demo photo metadata"
on public.room_demo_photos
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_room_member(room_id)
)
with check (
  user_id = auth.uid()
  and public.is_room_member(room_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-demo-photos',
  'room-demo-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "authenticated users can upload demo photos to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-demo-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can update demo photos in their own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'room-demo-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'room-demo-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
