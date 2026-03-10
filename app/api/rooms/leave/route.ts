import { NextRequest, NextResponse } from "next/server";

import { sanitizeRoomCode } from "@/lib/rooms/code";
import { decideLeaveRoom } from "@/lib/rooms/workflow";
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

  const leaveDecision = decideLeaveRoom({
    roomStatus: room.status,
  });

  if (!leaveDecision.allowed) {
    return NextResponse.json(
      { error: "Leaving an active round is not supported yet." },
      { status: 409 },
    );
  }

  const { data: roomPhotos, error: roomPhotosError } = await admin
    .from("room_demo_photos")
    .select("storage_bucket, storage_path")
    .eq("room_id", room.id);

  if (roomPhotosError) {
    return NextResponse.json(
      { error: "Unable to load room photos for cleanup." },
      { status: 500 },
    );
  }

  const bucketGroups = new Map<string, string[]>();

  for (const row of roomPhotos) {
    const existing = bucketGroups.get(row.storage_bucket) ?? [];
    existing.push(row.storage_path);
    bucketGroups.set(row.storage_bucket, existing);
  }

  for (const [bucket, paths] of bucketGroups.entries()) {
    const { error: storageError } = await admin.storage.from(bucket).remove(paths);

    if (storageError) {
      return NextResponse.json(
        { error: "Unable to delete room photos during cleanup." },
        { status: 500 },
      );
    }
  }

  const { error: membershipsError } = await admin
    .from("room_members")
    .update({
      status: "left",
      last_seen_at: new Date().toISOString(),
    })
    .eq("room_id", room.id);

  if (membershipsError) {
    return NextResponse.json(
      { error: "Unable to eject room members during cleanup." },
      { status: 500 },
    );
  }

  const { error: deleteRoomError } = await admin.from("rooms").delete().eq("id", room.id);

  if (deleteRoomError) {
    return NextResponse.json(
      { error: "Unable to close and delete the room." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, closed: true });
}
