import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { sanitizeRoomCode } from "@/lib/rooms/code";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser } from "@/lib/supabase/request-auth";
import type { Database } from "@/lib/supabase/types";

type UploadDemoPhotoBody = {
  code?: string;
  kind?: Database["public"]["Enums"]["photo_kind"];
  dataUrl?: string;
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image payload.");
  }

  const [, mimeType, base64Payload] = match;
  const buffer = Buffer.from(base64Payload, "base64");

  return {
    mimeType,
    buffer,
  };
}

function getFileExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export async function POST(request: NextRequest) {
  let user;

  try {
    user = await requireRequestUser(request);
  } catch {
    return NextResponse.json(
      { error: "You need an active player session before uploading room media." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as UploadDemoPhotoBody | null;
  const code = sanitizeRoomCode(body?.code ?? "");
  const kind = body?.kind;
  const dataUrl = body?.dataUrl?.trim();

  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  if (kind !== "environment" && kind !== "selfie") {
    return NextResponse.json({ error: "Invalid photo kind." }, { status: 400 });
  }

  if (!dataUrl) {
    return NextResponse.json({ error: "Missing image payload." }, { status: 400 });
  }

  let parsed;

  try {
    parsed = parseDataUrl(dataUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid image payload.",
      },
      { status: 400 },
    );
  }

  if (parsed.buffer.byteLength === 0) {
    return NextResponse.json({ error: "Image payload is empty." }, { status: 400 });
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

  const extension = getFileExtension(parsed.mimeType);
  const storagePath = `${user.id}/${room.id}/${kind}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("room-demo-photos")
    .upload(storagePath, parsed.buffer, {
      upsert: false,
      contentType: parsed.mimeType,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Unable to upload room photo." },
      { status: 500 },
    );
  }

  const { error: upsertError } = await admin.from("room_demo_photos").upsert(
    {
      room_id: room.id,
      user_id: user.id,
      kind,
      storage_bucket: "room-demo-photos",
      storage_path: storagePath,
      mime_type: parsed.mimeType,
      byte_size: parsed.buffer.byteLength,
    },
    {
      onConflict: "room_id,user_id,kind",
    },
  );

  if (upsertError) {
    await admin.storage.from("room-demo-photos").remove([storagePath]);

    return NextResponse.json(
      { error: "Unable to save room photo metadata." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
