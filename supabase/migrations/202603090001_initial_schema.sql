create extension if not exists pgcrypto;

create type public.room_status as enum ('open', 'in_round', 'closed');
create type public.room_member_status as enum ('joined', 'left');
create type public.round_status as enum (
  'hiding',
  'awaiting_hider_submission',
  'seeking',
  'completed',
  'aborted'
);
create type public.round_end_reason as enum (
  'completed',
  'aborted_by_player',
  'aborted_by_host',
  'timeout',
  'cancelled'
);
create type public.round_participant_role as enum ('hider', 'seeker');
create type public.round_participant_status as enum (
  'active',
  'disconnected',
  'submitted',
  'aborted'
);
create type public.photo_kind as enum ('environment', 'selfie');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 32),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  status public.room_status not null default 'open',
  created_by uuid not null references auth.users (id) on delete restrict,
  current_round_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index rooms_created_by_idx on public.rooms (created_by);
create index rooms_status_idx on public.rooms (status);

create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.room_member_status not null default 'joined',
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create index room_members_user_id_idx on public.room_members (user_id);
create index room_members_room_id_status_idx on public.room_members (room_id, status);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  started_by uuid not null references auth.users (id) on delete restrict,
  hider_user_id uuid not null references auth.users (id) on delete restrict,
  winner_user_id uuid null references auth.users (id) on delete set null,
  status public.round_status not null,
  hide_deadline_at timestamptz null,
  guess_deadline_at timestamptz null,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz null,
  ended_reason public.round_end_reason null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status in ('completed', 'aborted') and ended_at is not null)
    or (status not in ('completed', 'aborted'))
  )
);

create index rounds_room_id_idx on public.rounds (room_id);
create index rounds_status_idx on public.rounds (status);
create unique index rounds_one_active_round_per_room_idx
on public.rounds (room_id)
where status in ('hiding', 'awaiting_hider_submission', 'seeking');

create trigger rounds_set_updated_at
before update on public.rounds
for each row
execute function public.set_updated_at();

alter table public.rooms
add constraint rooms_current_round_id_fkey
foreign key (current_round_id) references public.rounds (id) on delete set null;

create table public.round_participants (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.round_participant_role not null,
  status public.round_participant_status not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  reconnected_at timestamptz null,
  primary key (round_id, user_id)
);

create index round_participants_user_id_idx on public.round_participants (user_id);
create unique index round_participants_one_hider_per_round_idx
on public.round_participants (round_id)
where role = 'hider';

create table public.round_clues (
  round_id uuid primary key references public.rounds (id) on delete cascade,
  clue_center_lat double precision not null check (clue_center_lat between -90 and 90),
  clue_center_lng double precision not null check (clue_center_lng between -180 and 180),
  clue_radius_meters integer not null check (clue_radius_meters >= 25),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger round_clues_set_updated_at
before update on public.round_clues
for each row
execute function public.set_updated_at();

create table public.round_locations (
  round_id uuid primary key references public.rounds (id) on delete cascade,
  exact_lat double precision not null check (exact_lat between -90 and 90),
  exact_lng double precision not null check (exact_lng between -180 and 180),
  accuracy_meters double precision null check (accuracy_meters is null or accuracy_meters >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.round_photos (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  kind public.photo_kind not null,
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, kind)
);

create index round_photos_round_id_idx on public.round_photos (round_id);

create table public.guesses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  guessed_lat double precision not null check (guessed_lat between -90 and 90),
  guessed_lng double precision not null check (guessed_lng between -180 and 180),
  accuracy_meters double precision null check (accuracy_meters is null or accuracy_meters >= 0),
  distance_meters double precision null check (distance_meters is null or distance_meters >= 0),
  guessed_at timestamptz not null default timezone('utc', now()),
  unique (round_id, user_id)
);

create index guesses_round_id_idx on public.guesses (round_id);
create index guesses_user_id_idx on public.guesses (user_id);

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = target_room_id
      and rm.user_id = auth.uid()
      and rm.status = 'joined'
  );
$$;

create or replace function public.shares_room_with_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members mine
    join public.room_members theirs
      on theirs.room_id = mine.room_id
    where mine.user_id = auth.uid()
      and mine.status = 'joined'
      and theirs.user_id = target_user_id
      and theirs.status = 'joined'
  );
$$;

create or replace function public.is_round_hider(target_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.round_participants rp
    where rp.round_id = target_round_id
      and rp.user_id = auth.uid()
      and rp.role = 'hider'
  );
$$;

create or replace function public.is_round_seeker(target_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.round_participants rp
    where rp.round_id = target_round_id
      and rp.user_id = auth.uid()
      and rp.role = 'seeker'
  );
$$;

create or replace function public.can_read_round_clues(target_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rounds r
    join public.room_members rm
      on rm.room_id = r.room_id
    where r.id = target_round_id
      and rm.user_id = auth.uid()
      and rm.status = 'joined'
      and r.status in ('seeking', 'completed')
  );
$$;

create or replace function public.can_read_round_results(target_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rounds r
    join public.room_members rm
      on rm.room_id = r.room_id
    where r.id = target_round_id
      and rm.user_id = auth.uid()
      and rm.status = 'joined'
      and r.status in ('completed', 'aborted')
  );
$$;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.shares_room_with_user(uuid) to authenticated;
grant execute on function public.is_round_hider(uuid) to authenticated;
grant execute on function public.is_round_seeker(uuid) to authenticated;
grant execute on function public.can_read_round_clues(uuid) to authenticated;
grant execute on function public.can_read_round_results(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.rounds enable row level security;
alter table public.round_participants enable row level security;
alter table public.round_clues enable row level security;
alter table public.round_locations enable row level security;
alter table public.round_photos enable row level security;
alter table public.guesses enable row level security;

create policy "profiles are readable by users who share a room"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.shares_room_with_user(id)
);

create policy "users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "room members can read rooms they belong to"
on public.rooms
for select
to authenticated
using (public.is_room_member(id));

create policy "room members can read room membership"
on public.room_members
for select
to authenticated
using (public.is_room_member(room_id));

create policy "room members can read rounds in their room"
on public.rounds
for select
to authenticated
using (public.is_room_member(room_id));

create policy "room members can read round participants"
on public.round_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.rounds r
    where r.id = round_id
      and public.is_room_member(r.room_id)
  )
);

create policy "room members can read round clues when available"
on public.round_clues
for select
to authenticated
using (public.can_read_round_clues(round_id));

create policy "hider can insert their round photos during submission"
on public.round_photos
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_round_hider(round_id)
  and exists (
    select 1
    from public.rounds r
    where r.id = round_id
      and r.status = 'awaiting_hider_submission'
  )
);

create policy "hider can read their own photo rows before reveal and members can read clues later"
on public.round_photos
for select
to authenticated
using (
  uploaded_by = auth.uid()
  or public.can_read_round_clues(round_id)
);

create policy "seekers can insert one guess during the seeking phase"
on public.guesses
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_round_seeker(round_id)
  and exists (
    select 1
    from public.rounds r
    where r.id = round_id
      and r.status = 'seeking'
  )
);

create policy "seekers can read their own guesses and members can read results later"
on public.guesses
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_read_round_results(round_id)
);
