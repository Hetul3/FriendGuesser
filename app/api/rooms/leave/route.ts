import { NextRequest, NextResponse } from "next/server";

import { sanitizeRoomCode } from "@/lib/rooms/code";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser } from "@/lib/supabase/request-auth";

type LeaveRequestBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  console.log("rooms.leave request received", {
    hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    userAgent: request.headers.get("user-agent"),
  });

  let user;

  try {
    user = await requireRequestUser(request);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "AUTH_UNKNOWN";
    console.error("rooms.leave auth failed", {
      detail,
      hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    });

    return NextResponse.json(
      {
        error: "You need an active player session before leaving a room.",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as LeaveRequestBody | null;
  const code = sanitizeRoomCode(body?.code ?? "");

  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, status, current_round_id")
    .eq("code", code)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: "Unable to load that room." }, { status: 500 });
  }

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await admin
    .from("room_members")
    .select("status")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: "Unable to verify room membership." },
      { status: 500 },
    );
  }

  if (!membership || membership.status !== "joined") {
    return NextResponse.json(
      { error: "You are not currently in this room." },
      { status: 409 },
    );
  }

  if (room.status === "in_round") {
    return NextResponse.json(
      { error: "Leaving an active round is not supported yet." },
      { status: 409 },
    );
  }

  const { error: leaveError } = await admin
    .from("room_members")
    .update({
      status: "left",
      last_seen_at: new Date().toISOString(),
    })
    .eq("room_id", room.id)
    .eq("user_id", user.id);

  if (leaveError) {
    return NextResponse.json({ error: "Unable to leave room." }, { status: 500 });
  }

  const { count: remainingMembers, error: countError } = await admin
    .from("room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("status", "joined");

  if (countError) {
    return NextResponse.json(
      { error: "Left the room, but failed to refresh room state." },
      { status: 500 },
    );
  }

  if ((remainingMembers ?? 0) === 0) {
    const { error: closeError } = await admin
      .from("rooms")
      .update({
        status: "closed",
      })
      .eq("id", room.id);

    if (closeError) {
      return NextResponse.json(
        { error: "Left the room, but failed to close the empty room." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
