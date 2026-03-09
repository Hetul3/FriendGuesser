import { NextRequest, NextResponse } from "next/server";

import { sanitizeRoomCode } from "@/lib/rooms/code";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type JoinRequestBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You need an active player session before joining a room." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as JoinRequestBody | null;
  const code = sanitizeRoomCode(body?.code ?? "");

  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, code, status")
    .eq("code", code)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: "Unable to load that room." }, { status: 500 });
  }

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const { data: existingMembership, error: membershipLookupError } = await admin
    .from("room_members")
    .select("room_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipLookupError) {
    return NextResponse.json(
      { error: "Unable to check room membership." },
      { status: 500 },
    );
  }

  if (!existingMembership && room.status !== "open") {
    return NextResponse.json(
      { error: "This room is locked because a round is already in progress." },
      { status: 409 },
    );
  }

  const { error: joinError } = await admin.from("room_members").upsert(
    {
      room_id: room.id,
      user_id: user.id,
      status: "joined",
      last_seen_at: new Date().toISOString(),
    },
    {
      onConflict: "room_id,user_id",
    },
  );

  if (joinError) {
    return NextResponse.json({ error: "Unable to join room." }, { status: 500 });
  }

  return NextResponse.json({ code: room.code });
}
