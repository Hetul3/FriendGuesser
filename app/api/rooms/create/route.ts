import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/rooms/code";

const MAX_ROOM_CODE_ATTEMPTS = 8;

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You need an active player session before creating a room." },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdminClient();

  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const code = generateRoomCode();
    const { data: room, error: roomError } = await admin
      .from("rooms")
      .insert({
        code,
        created_by: user.id,
      })
      .select("id, code")
      .single();

    if (roomError) {
      if (roomError.code === "23505") {
        continue;
      }

      return NextResponse.json(
        { error: "Unable to create room." },
        { status: 500 },
      );
    }

    const { error: membershipError } = await admin.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
      status: "joined",
    });

    if (membershipError) {
      await admin.from("rooms").delete().eq("id", room.id);

      return NextResponse.json(
        { error: "Room was created but membership setup failed." },
        { status: 500 },
      );
    }

    return NextResponse.json({ code: room.code });
  }

  return NextResponse.json(
    { error: "Unable to generate a unique room code. Try again." },
    { status: 500 },
  );
}
