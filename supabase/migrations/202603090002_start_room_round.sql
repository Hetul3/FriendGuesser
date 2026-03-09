create or replace function public.start_room_round(
  target_room_code text,
  actor_user_id uuid,
  hide_duration_seconds integer default 180,
  guess_duration_seconds integer default 900
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.rooms%rowtype;
  participant_ids uuid[];
  chosen_hider uuid;
  created_round_id uuid;
  player_count integer;
begin
  select *
  into target_room
  from public.rooms
  where code = upper(target_room_code)
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if target_room.status <> 'open' then
    raise exception 'ROOM_NOT_OPEN';
  end if;

  if not exists (
    select 1
    from public.room_members
    where room_id = target_room.id
      and user_id = actor_user_id
      and status = 'joined'
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  select array_agg(user_id order by joined_at), count(*)
  into participant_ids, player_count
  from public.room_members
  where room_id = target_room.id
    and status = 'joined';

  if coalesce(player_count, 0) < 2 then
    raise exception 'NOT_ENOUGH_PLAYERS';
  end if;

  chosen_hider := participant_ids[
    1 + floor(random() * array_length(participant_ids, 1))::integer
  ];

  insert into public.rounds (
    room_id,
    started_by,
    hider_user_id,
    status,
    hide_deadline_at,
    guess_deadline_at
  )
  values (
    target_room.id,
    actor_user_id,
    chosen_hider,
    'hiding',
    timezone('utc', now()) + make_interval(secs => hide_duration_seconds),
    timezone('utc', now()) + make_interval(secs => hide_duration_seconds + guess_duration_seconds)
  )
  returning id into created_round_id;

  insert into public.round_participants (round_id, user_id, role)
  select
    created_round_id,
    rm.user_id,
    case
      when rm.user_id = chosen_hider then 'hider'::public.round_participant_role
      else 'seeker'::public.round_participant_role
    end
  from public.room_members rm
  where rm.room_id = target_room.id
    and rm.status = 'joined';

  update public.rooms
  set
    status = 'in_round',
    current_round_id = created_round_id
  where id = target_room.id;

  return created_round_id;
end;
$$;
