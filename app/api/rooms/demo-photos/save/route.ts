import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeRoomCode } from "@/lib/rooms/code";
import { requireRequestUser } from "@/lib/supabase/request-auth";
import type { Database } from "@/lib/supabase/types";

type SaveDemoPhotoBody = {
  code?: string;
  kind?: Database["public"]["Enums"]["photo_kind"];
  storagePath?: string;
  mimeType?: string;
  byteSize?: number;
};

export async function POST(request: NextRequest) {
  let user;

  try {
    user = await requireRequestUser(request);
  } catch {
    return NextResponse.json(
      { error: "You need an active player session before saving room media." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as SaveDemoPhotoBody | null;
  const code = sanitizeRoomCode(body?.code ?? "");
  const kind = body?.kind;
  const storagePath = body?.storagePath?.trim();
  const mimeType = body?.mimeType?.trim();
  const byteSize = body?.byteSize;

  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  if (kind !== "environment" && kind !== "selfie") {
    return NextResponse.json({ error: "Invalid photo kind." }, { status: 400 });
  }

  if (!storagePath || !mimeType || !byteSize || byteSize <= 0) {
    return NextResponse.json(
      { error: "Missing required photo metadata." },
      { status: 400 },
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

  const { error: upsertError } = await admin.from("room_demo_photos").upsert(
    {
      room_id: room.id,
      user_id: user.id,
      kind,
      storage_bucket: "room-demo-photos",
      storage_path: storagePath,
      mime_type: mimeType,
      byte_size: byteSize,
    },
    {
      onConflict: "room_id,user_id,kind",
    },
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "Unable to save room photo metadata." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
