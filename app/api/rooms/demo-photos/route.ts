import { NextRequest, NextResponse } from "next/server";

import { sanitizeRoomCode } from "@/lib/rooms/code";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser } from "@/lib/supabase/request-auth";

export async function GET(request: NextRequest) {
  console.log("rooms.demo-photos request received", {
    hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
    userAgent: request.headers.get("user-agent"),
  });

  const code = sanitizeRoomCode(request.nextUrl.searchParams.get("code") ?? "");

  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  let user;

  try {
    user = await requireRequestUser(request);
  } catch {
    return NextResponse.json(
      { error: "You need an active player session before viewing room media." },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id")
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
    .select("room_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .eq("status", "joined")
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: "Unable to verify room membership." },
      { status: 500 },
    );
  }

  if (!membership) {
    return NextResponse.json({ error: "You are not in this room." }, { status: 403 });
  }

  const { data: rows, error: rowsError } = await admin
    .from("room_demo_photos")
    .select("id, kind, storage_bucket, storage_path, user_id, created_at")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false });

  if (rowsError) {
    return NextResponse.json(
      { error: "Unable to load room media metadata." },
      { status: 500 },
    );
  }

  const photos = await Promise.all(
    rows.map(async (row) => {
      const { data } = await admin.storage
        .from(row.storage_bucket)
        .createSignedUrl(row.storage_path, 60 * 30);

      return {
        id: row.id,
        kind: row.kind,
        userId: row.user_id,
        createdAt: row.created_at,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ photos });
}
