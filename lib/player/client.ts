"use client";

import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type PlayerBootstrapResult = {
  user: User;
  displayName: string | null;
};

export async function bootstrapAnonymousPlayer(): Promise<PlayerBootstrapResult> {
  const supabase = getSupabaseBrowserClient();
  console.log("[auth] bootstrapAnonymousPlayer:start");

  const {
    data: { user: existingUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  let user = existingUser;

  if (!user) {
    console.log("[auth] bootstrapAnonymousPlayer:no-user, signing in anonymously");
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("[auth] signInAnonymously failed", error);
      throw error;
    }

    user = data.user;
  }

  if (!user) {
    throw new Error("Unable to create or restore an anonymous player session.");
  }

  console.log("[auth] bootstrapAnonymousPlayer:user-ready", {
    userId: user.id,
    isAnonymous: user.is_anonymous,
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] profile lookup failed", profileError);
    throw profileError;
  }

  console.log("[auth] bootstrapAnonymousPlayer:profile", {
    hasDisplayName: Boolean(profile?.display_name),
  });

  return {
    user,
    displayName: profile?.display_name ?? null,
  };
}

export async function upsertPlayerProfile(
  userId: string,
  displayName: string,
) {
  const supabase = getSupabaseBrowserClient();
  console.log("[auth] upsertPlayerProfile:start", {
    userId,
    displayNameLength: displayName.trim().length,
  });

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: displayName.trim(),
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    console.error("[auth] upsertPlayerProfile failed", error);
    throw error;
  }

  console.log("[auth] upsertPlayerProfile:success", { userId });
}
