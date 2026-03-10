"use client";

import { useCallback, useEffect, useEffectEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bootstrapAnonymousPlayer,
  upsertPlayerProfile,
} from "@/lib/player/client";
import { findActiveRoomCodeForUser } from "@/lib/rooms/client";
import { sanitizeRoomCode } from "@/lib/rooms/code";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type SessionState = "bootstrapping" | "ready" | "error";

type ApiResponse = {
  code: string;
};

async function postJson<T>(url: string, body: Record<string, string>) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const tokenPreview = session?.access_token
    ? `${session.access_token.slice(0, 12)}...`
    : null;

  console.log("[rooms] request:start", {
    url,
    hasSession: Boolean(session),
    hasAccessToken: Boolean(session?.access_token),
    tokenPreview,
    body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; code?: string }
    | null;

  console.log("[rooms] request:finish", {
    url,
    status: response.status,
    ok: response.ok,
    payload,
  });

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
      console.log("[rooms] bootstrap complete", {
        userId: user.id,
        hasDisplayName: Boolean(existingDisplayName),
      });

      setPlayerId(user.id);
      if (existingDisplayName) {
        setDisplayName(existingDisplayName);
      }

      const activeRoomCode = await findActiveRoomCodeForUser(user.id);
      console.log("[rooms] active room lookup", {
        userId: user.id,
        activeRoomCode,
      });

      if (activeRoomCode) {
        router.replace(`/rooms/${activeRoomCode}`);
        return;
      }

      setSessionState("ready");
    } catch (error) {
      console.error("[rooms] bootstrap failed", error);
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
        console.error("[rooms] action failed", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      }
    });
  };

  return (
    <section className="page-card overflow-hidden rounded-[2.25rem]">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#5d7453_0%,#7d8f62_36%,#a6b783_64%,#88a9bb_100%)] px-5 py-6 text-white">
        <div className="absolute right-[-1.5rem] top-[-1rem] h-24 w-24 rounded-full bg-white/12 blur-sm" />
        <div className="absolute bottom-[-2rem] left-[-1rem] h-28 w-28 rounded-full bg-[#f2dfb5]/18 blur-sm" />
        <p className="pill-badge text-white/96">
          Anonymous rooms
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
          Head outside and start the hunt
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/88">
          Make a room, pull your friends in, and use the app like a shared
          field guide for the round.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/16 px-3 py-2 font-semibold text-white/92">
            Private rooms
          </span>
          <span className="rounded-full bg-white/16 px-3 py-2 font-semibold text-white/92">
            Outdoor rounds
          </span>
          <span className="rounded-full bg-white/16 px-3 py-2 font-semibold text-white/92">
            Trail-ready
          </span>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Trail name"
            maxLength={32}
            className="min-h-14 w-full rounded-[1.4rem] border border-[var(--line)] bg-white/88 px-4 text-base outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(108,140,97,0.12)]"
          />
        </label>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => runAction(handleCreateRoom)}
            disabled={sessionState !== "ready" || isPending}
            className="primary-button min-h-14 rounded-[1.4rem] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Working..." : "Create room"}
          </button>

          <div className="soft-panel rounded-[1.6rem] border-dashed p-3">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">Join with room code</span>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(sanitizeRoomCode(event.target.value))}
                placeholder="ABCD23"
                maxLength={6}
                className="min-h-14 w-full rounded-[1.4rem] border border-[var(--line)] bg-white/88 px-4 font-semibold uppercase tracking-[0.2em] outline-none placeholder:tracking-[0.2em] placeholder:text-[var(--muted)] focus:border-[var(--accent-strong)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(143,183,199,0.16)]"
              />
            </label>
            <button
              type="button"
              onClick={() => runAction(handleJoinRoom)}
              disabled={sessionState !== "ready" || isPending}
              className="secondary-button mt-3 min-h-14 w-full rounded-[1.4rem] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Working..." : "Join room"}
            </button>
          </div>
        </div>

        <div className="soft-panel rounded-[1.5rem] p-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--brand-strong)]">Current flow</p>
          <p className="mt-2">
            Anyone in a room can start the round. Starting locks the room,
            snapshots the current players, and randomly selects one hider.
          </p>
        </div>

        <div className="min-h-6 text-sm text-[var(--muted)]">
          {sessionState === "bootstrapping" ? (
            <span className="accent-chip inline-flex rounded-full px-3 py-2 font-medium">
              Preparing anonymous player session...
            </span>
          ) : null}
          {errorMessage ? (
            <p className="mt-2 rounded-[1rem] border border-[#efb2b7] bg-[#fff1f2] px-3 py-2 text-[#9d3b28]">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
