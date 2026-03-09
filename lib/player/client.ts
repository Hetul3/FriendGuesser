"use client";

import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type PlayerBootstrapResult = {
  user: User;
  displayName: string | null;
};

export async function bootstrapAnonymousPlayer(): Promise<PlayerBootstrapResult> {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { user: existingUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  let user = existingUser;

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      throw error;
    }

    user = data.user;
  }

  if (!user) {
    throw new Error("Unable to create or restore an anonymous player session.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

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
    throw error;
  }
}
