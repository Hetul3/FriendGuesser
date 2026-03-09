import "server-only";

import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireRequestUser(request?: NextRequest): Promise<User> {
  const authorization = request?.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (bearerToken) {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(bearerToken);

    if (error || !data.user) {
      throw new Error("Auth session missing.");
    }

    return data.user;
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Auth session missing.");
  }

  return user;
}
