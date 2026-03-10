import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_GUESS_DURATION_SECONDS,
  DEFAULT_HIDE_DURATION_SECONDS,
} from "@/lib/rooms/constants";
import { sanitizeRoomCode } from "@/lib/rooms/code";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser } from "@/lib/supabase/request-auth";

type StartRequestBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  console.log("rooms.start request received", {
    hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    userAgent: request.headers.get("user-agent"),
  });

  let user;

  try {
    user = await requireRequestUser(request);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "AUTH_UNKNOWN";
    console.error("rooms.start auth failed", {
      detail,
      hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    });

    return NextResponse.json(
      {
        error: "You need an active player session before starting a round.",
        detail:
          process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as StartRequestBody | null;
  const code = sanitizeRoomCode(body?.code ?? "");

  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("start_room_round", {
    target_room_code: code,
    actor_user_id: user.id,
    hide_duration_seconds: DEFAULT_HIDE_DURATION_SECONDS,
    guess_duration_seconds: DEFAULT_GUESS_DURATION_SECONDS,
  });

  if (error) {
    const message = error.message || "Unable to start round.";

    if (
      message.includes("ROOM_NOT_OPEN") ||
      message.includes("NOT_A_MEMBER") ||
      message.includes("NOT_ENOUGH_PLAYERS")
    ) {
      return NextResponse.json({ error: humanizeStartError(message) }, { status: 409 });
    }

    return NextResponse.json({ error: "Unable to start round." }, { status: 500 });
  }

  return NextResponse.json({ roundId: data });
}

function humanizeStartError(message: string) {
  if (message.includes("ROOM_NOT_OPEN")) {
    return "This room is already in a round.";
  }

  if (message.includes("NOT_A_MEMBER")) {
    return "You must be in the room before you can start a round.";
  }

  if (message.includes("NOT_ENOUGH_PLAYERS")) {
    return "At least 2 players are required to start a round.";
  }

  return "Unable to start round.";
}
