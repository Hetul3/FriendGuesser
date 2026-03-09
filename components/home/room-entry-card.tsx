"use client";

import { useCallback, useEffect, useEffectEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bootstrapAnonymousPlayer,
  upsertPlayerProfile,
} from "@/lib/player/client";
import {
  findActiveRoomCodeForUser,
} from "@/lib/rooms/client";
import { sanitizeRoomCode } from "@/lib/rooms/code";

type SessionState = "bootstrapping" | "ready" | "error";

type ApiResponse = {
  code: string;
};

async function postJson<T>(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; code?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }

  return payload as T;
}

export function RoomEntryCard() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("bootstrapping");
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bootstrapPlayer = useEffectEvent(async () => {
    try {
      const { user, displayName: existingDisplayName } =
        await bootstrapAnonymousPlayer();

      setPlayerId(user.id);
      if (existingDisplayName) {
        setDisplayName(existingDisplayName);
      }

      const activeRoomCode = await findActiveRoomCodeForUser(user.id);

      if (activeRoomCode) {
        router.replace(`/rooms/${activeRoomCode}`);
        return;
      }

      setSessionState("ready");
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create an anonymous player session.",
      );
    }
  });

  useEffect(() => {
    void bootstrapPlayer();
  }, []);

  const ensureReadyProfile = useCallback(async () => {
    if (!playerId) {
      throw new Error("Player session is not ready yet.");
    }

    const trimmedDisplayName = displayName.trim();

    if (trimmedDisplayName.length < 2) {
      throw new Error("Enter a display name with at least 2 characters.");
    }

    await upsertPlayerProfile(playerId, trimmedDisplayName);
  }, [displayName, playerId]);

  const handleCreateRoom = async () => {
    await ensureReadyProfile();
    const payload = await postJson<ApiResponse>("/api/rooms/create", {});
    router.push(`/rooms/${payload.code}`);
  };

  const handleJoinRoom = async () => {
    await ensureReadyProfile();

    const sanitizedCode = sanitizeRoomCode(roomCode);

    if (sanitizedCode.length !== 6) {
      throw new Error("Enter a valid 6-character room code.");
    }

    const payload = await postJson<ApiResponse>("/api/rooms/join", {
      code: sanitizedCode,
    });

    router.push(`/rooms/${payload.code}`);
  };

  const runAction = (action: () => Promise<void>) => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur">
      <div className="bg-[var(--brand)] px-5 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/72">
          Anonymous rooms
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Join the next hunt</h1>
        <p className="mt-3 text-sm leading-6 text-white/84">
          Create a room code, invite friends, and lock the room when the round
          begins.
        </p>
      </div>

      <div className="space-y-5 px-5 py-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Hetul"
            maxLength={32}
            className="min-h-14 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 text-base outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
          />
        </label>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => runAction(handleCreateRoom)}
            disabled={sessionState !== "ready" || isPending}
            className="min-h-14 rounded-2xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Working..." : "Create room"}
          </button>

          <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] p-3">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Join with room code</span>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(sanitizeRoomCode(event.target.value))}
                placeholder="ABCD23"
                maxLength={6}
                className="min-h-14 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 font-semibold uppercase tracking-[0.2em] outline-none placeholder:tracking-[0.2em] placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
            </label>
            <button
              type="button"
              onClick={() => runAction(handleJoinRoom)}
              disabled={sessionState !== "ready" || isPending}
              className="mt-3 min-h-14 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Working..." : "Join room"}
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--brand-strong)]">Current flow</p>
          <p className="mt-2">
            Anyone in a room can start the round. Starting locks the room,
            snapshots the current players, and randomly selects one hider.
          </p>
        </div>

        <div className="min-h-6 text-sm text-[var(--muted)]">
          {sessionState === "bootstrapping" ? "Preparing anonymous player session..." : null}
          {errorMessage ? (
            <p className="text-[#9d3b28]">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
