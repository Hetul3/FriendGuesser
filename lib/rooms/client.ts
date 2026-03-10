"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/types";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomDemoPhotoRow = Database["public"]["Tables"]["room_demo_photos"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RoundRow = Database["public"]["Tables"]["rounds"]["Row"];
type RoundParticipantRow =
  Database["public"]["Tables"]["round_participants"]["Row"];

export type LobbyMember = {
  id: string;
  displayName: string;
  isCurrentUser: boolean;
  status: RoomMemberRow["status"];
};

export type LobbyRound = {
  id: string;
  status: RoundRow["status"];
  startedAt: string;
  hideDeadlineAt: string | null;
  guessDeadlineAt: string | null;
  hiderUserId: string;
  participants: RoundParticipantRow[];
};

export type RoomSnapshot = {
  room: RoomRow;
  members: LobbyMember[];
  activeRound: LobbyRound | null;
};

export type RoomDemoPhoto = RoomDemoPhotoRow;

export async function findActiveRoomCodeForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId)
    .eq("status", "joined");

  if (membershipError) {
    throw membershipError;
  }

  const roomIds = memberships.map((membership) => membership.room_id);

  if (roomIds.length === 0) {
    return null;
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("code, status, updated_at")
    .in("id", roomIds)
    .eq("status", "in_round")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (roomsError) {
    throw roomsError;
  }

  return rooms[0]?.code ?? null;
}

export async function fetchRoomSnapshot(code: string, currentUserId: string) {
  const supabase = getSupabaseBrowserClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  const { data: members, error: membersError } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", room.id)
    .eq("status", "joined")
    .order("joined_at", { ascending: true });

  if (membersError) {
    throw membersError;
  }

  const userIds = members.map((member) => member.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map<string, ProfileRow>(
    profiles.map((profile) => [profile.id, profile]),
  );

  let activeRound: LobbyRound | null = null;

  if (room.current_round_id) {
    const [{ data: round, error: roundError }, { data: participants, error: participantsError }] =
      await Promise.all([
        supabase
          .from("rounds")
          .select("*")
          .eq("id", room.current_round_id)
          .maybeSingle(),
        supabase
          .from("round_participants")
          .select("*")
          .eq("round_id", room.current_round_id),
      ]);

    if (roundError) {
      throw roundError;
    }

    if (participantsError) {
      throw participantsError;
    }

    if (round) {
      activeRound = {
        id: round.id,
        status: round.status,
        startedAt: round.started_at,
        hideDeadlineAt: round.hide_deadline_at,
        guessDeadlineAt: round.guess_deadline_at,
        hiderUserId: round.hider_user_id,
        participants,
      };
    }
  }

  return {
    room,
    members: members.map((member) => ({
      id: member.user_id,
      displayName: profilesById.get(member.user_id)?.display_name ?? "Player",
      isCurrentUser: member.user_id === currentUserId,
      status: member.status,
    })),
    activeRound,
  } satisfies RoomSnapshot;
}

export async function fetchRoomDemoPhotos(code: string) {
  const supabase = getSupabaseBrowserClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return [];
  }

  const { data, error } = await supabase
    .from("room_demo_photos")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
