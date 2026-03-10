"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CaptureDemoPanel } from "@/components/camera/capture-demo-panel";
import { LiveLocationPanel } from "@/components/maps/live-location-panel";
import { bootstrapAnonymousPlayer } from "@/lib/player/client";
import { fetchRoomSnapshot, type RoomSnapshot } from "@/lib/rooms/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type RoomPageClientProps = {
  code: string;
};

async function postJson(url: string, body: Record<string, string>) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const tokenPreview = session?.access_token
    ? `${session.access_token.slice(0, 12)}...`
    : null;

  console.log("[room-page] request:start", {
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
    | { error?: string }
    | null;

  console.log("[room-page] request:finish", {
    url,
    status: response.status,
    ok: response.ok,
    payload,
  });

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }
}

export function RoomPageClient({ code }: RoomPageClientProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [isPending, startTransition] = useTransition();

  const loadSnapshot = useCallback(async () => {
    try {
      const { user } = await bootstrapAnonymousPlayer();
      console.log("[room-page] loadSnapshot:user", { userId: user.id, code });
      setPlayerId(user.id);

      const nextSnapshot = await fetchRoomSnapshot(code, user.id);
      console.log("[room-page] loadSnapshot:result", {
        code,
        found: Boolean(nextSnapshot),
      });

      if (!nextSnapshot) {
        setSnapshot(null);
        setErrorMessage("This room is unavailable or you are not a member.");
        return;
      }

      setSnapshot(nextSnapshot);
      setErrorMessage(null);
    } catch (error) {
      console.error("[room-page] loadSnapshot failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load the room.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`room:${snapshot.room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${snapshot.room.id}`,
        },
        () => {
          void loadSnapshot();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${snapshot.room.id}`,
        },
        () => {
          void loadSnapshot();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${snapshot.room.id}`,
        },
        () => {
          void loadSnapshot();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "round_participants",
        },
        () => {
          void loadSnapshot();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSnapshot, snapshot]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadSnapshot();
      }
    }, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadSnapshot();
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadSnapshot, snapshot]);

  const currentUser = useMemo(
    () => snapshot?.members.find((member) => member.id === playerId) ?? null,
    [playerId, snapshot?.members],
  );

  const hiderName = useMemo(() => {
    if (!snapshot?.activeRound) {
      return null;
    }

    return (
      snapshot.members.find(
        (member) => member.id === snapshot.activeRound?.hiderUserId,
      )?.displayName ?? "Unknown player"
    );
  }, [snapshot]);

  const currentRole = useMemo(() => {
    if (!snapshot?.activeRound || !playerId) {
      return null;
    }

    return (
      snapshot.activeRound.participants.find(
        (participant) => participant.user_id === playerId,
      )?.role ?? null
    );
  }, [playerId, snapshot]);

  const handleStartRound = async () => {
    await postJson("/api/rooms/start", {
      code,
    });
    await loadSnapshot();
  };

  const handleLeaveRoom = async () => {
    await postJson("/api/rooms/leave", {
      code,
    });

    router.replace("/");
  };

  const handleCopyCode = async () => {
    if (!snapshot) {
      return;
    }

    try {
      await navigator.clipboard.writeText(snapshot.room.code);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    } catch (error) {
      console.error("[room-page] copy code failed", error);
      setCopyState("failed");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    }
  };

  const runAction = (action: () => Promise<void>) => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        console.error("[room-page] action failed", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      }
    });
  };

  if (isLoading) {
    return (
      <main className="app-shell min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-6 text-[var(--ink)]">
        <div className="page-orb page-orb--coral" />
        <div className="page-orb page-orb--mint" />
        <div className="page-card mx-auto max-w-md rounded-[2.2rem] p-5">
          <p className="text-sm text-[var(--muted)]">Loading room...</p>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="app-shell min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-6 text-[var(--ink)]">
        <div className="page-orb page-orb--coral" />
        <div className="page-orb page-orb--mint" />
        <div className="page-card mx-auto max-w-md rounded-[2.2rem] p-5">
          <h1 className="text-2xl font-semibold">Room unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {errorMessage ?? "This room could not be loaded."}
          </p>
          <Link
            href="/"
            className="primary-button mt-4 inline-flex min-h-12 items-center justify-center rounded-[1.2rem] px-4 text-sm font-semibold"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-[var(--ink)]">
      <div className="page-orb page-orb--coral" />
      <div className="page-orb page-orb--mint" />
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <section className="page-card rounded-[2.2rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="pill-badge accent-chip">
                Room code
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[0.16em] text-[var(--ink)]">
                {snapshot.room.code}
              </h1>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="primary-button min-h-11 rounded-[1.2rem] px-4 text-sm font-semibold"
              >
                {copyState === "copied"
                  ? "Code copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy code"}
              </button>
              <button
                type="button"
                onClick={() => runAction(handleLeaveRoom)}
                disabled={isPending}
                className="secondary-button min-h-11 rounded-[1.2rem] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Working..." : "Leave room"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="soft-panel rounded-[1.4rem] p-3">
              <p className="font-semibold text-[var(--brand-strong)]">Room state</p>
              <p className="mt-2 capitalize text-[var(--muted)]">
                {snapshot.room.status.replace("_", " ")}
              </p>
            </div>
            <div className="soft-panel rounded-[1.4rem] p-3">
              <p className="font-semibold text-[var(--brand-strong)]">You</p>
              <p className="mt-2 text-[var(--muted)]">
                {currentUser?.displayName ?? "Player"}
              </p>
            </div>
          </div>
        </section>

        <section className="page-card rounded-[2.2rem] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Players</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {snapshot.members.length} joined
              </p>
            </div>
            <button
              type="button"
              onClick={() => runAction(handleStartRound)}
              disabled={
                snapshot.room.status !== "open" ||
                snapshot.members.length < 2 ||
                isPending
              }
              className="primary-button min-h-12 rounded-[1.2rem] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Starting..." : "Start round"}
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {snapshot.members.map((member) => (
              <li
                key={member.id}
                className="soft-panel flex items-center justify-between rounded-[1.35rem] px-4 py-3"
              >
                <span className="font-medium">
                  {member.displayName}
                  {member.isCurrentUser ? " (you)" : ""}
                </span>
                <span className="text-sm text-[var(--muted)]">Ready</span>
              </li>
            ))}
          </ul>

          {snapshot.room.status === "open" ? (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Everyone already here can head into the next round together.
              Starting locks the room and picks the hider from the current
              group.
            </p>
          ) : null}
        </section>

        {snapshot.activeRound ? (
          <section className="page-card rounded-[2.2rem] p-5">
            <h2 className="text-xl font-semibold">Active round</h2>
            <div className="mt-4 grid gap-3">
              <div className="soft-panel rounded-[1.4rem] p-3 text-sm">
                <p className="font-semibold text-[var(--brand-strong)]">Hider</p>
                <p className="mt-2 text-[var(--muted)]">{hiderName}</p>
              </div>
              <div className="soft-panel rounded-[1.4rem] p-3 text-sm">
                <p className="font-semibold text-[var(--brand-strong)]">Your role</p>
                <p className="mt-2 capitalize text-[var(--muted)]">
                  {currentRole ?? "Unknown"}
                </p>
              </div>
              <div className="soft-panel rounded-[1.4rem] p-3 text-sm">
                <p className="font-semibold text-[var(--brand-strong)]">Status</p>
                <p className="mt-2 capitalize text-[var(--muted)]">
                  {snapshot.activeRound.status.replaceAll("_", " ")}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <LiveLocationPanel />
        <CaptureDemoPanel
          roomCode={snapshot.room.code}
          playerId={playerId}
        />

        <div className="min-h-6 text-sm text-[#9d3b28]">
          {errorMessage ? (
            <div className="rounded-[1rem] border border-[#efb2b7] bg-[#fff1f2] px-3 py-2">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
