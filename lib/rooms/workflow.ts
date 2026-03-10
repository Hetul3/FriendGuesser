import type { Database } from "@/lib/supabase/types";

type RoomStatus = Database["public"]["Enums"]["room_status"];

export type JoinRoomDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: "room_locked";
    };

export function decideJoinRoom(input: {
  roomStatus: RoomStatus;
  isExistingMember: boolean;
}): JoinRoomDecision {
  if (!input.isExistingMember && input.roomStatus !== "open") {
    return {
      allowed: false,
      reason: "room_locked",
    };
  }

  return {
    allowed: true,
  };
}

export type StartRoundDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: "not_a_member" | "room_not_open" | "not_enough_players";
    };

export function decideStartRound(input: {
  roomStatus: RoomStatus;
  joinedMembersCount: number;
  actorIsMember: boolean;
}): StartRoundDecision {
  if (!input.actorIsMember) {
    return {
      allowed: false,
      reason: "not_a_member",
    };
  }

  if (input.roomStatus !== "open") {
    return {
      allowed: false,
      reason: "room_not_open",
    };
  }

  if (input.joinedMembersCount < 2) {
    return {
      allowed: false,
      reason: "not_enough_players",
    };
  }

  return {
    allowed: true,
  };
}

export type AutoReturnCandidate = {
  code: string;
  status: RoomStatus;
  updatedAt: string;
};

export function selectAutoReturnRoomCode(candidates: AutoReturnCandidate[]) {
  const activeRooms = candidates
    .filter((candidate) => candidate.status === "in_round")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return activeRooms[0]?.code ?? null;
}

export type LeaveRoomDecision =
  | {
      allowed: true;
      closeRoom: true;
      ejectAllMembers: true;
      deleteRoomData: true;
    }
  | {
      allowed: false;
      reason: "active_round";
    };

export function decideLeaveRoom(input: { roomStatus: RoomStatus }): LeaveRoomDecision {
  if (input.roomStatus === "in_round") {
    return {
      allowed: false,
      reason: "active_round",
    };
  }

  return {
    allowed: true,
    closeRoom: true,
    ejectAllMembers: true,
    deleteRoomData: true,
  };
}
