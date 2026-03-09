import { notFound } from "next/navigation";

import { RoomPageClient } from "@/components/rooms/room-page-client";
import { sanitizeRoomCode } from "@/lib/rooms/code";

type RoomPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code: rawCode } = await params;
  const code = sanitizeRoomCode(rawCode);

  if (code.length !== 6) {
    notFound();
  }

  return <RoomPageClient code={code} />;
}
