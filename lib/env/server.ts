import "server-only";

import { getPublicEnv, type PublicEnv } from "@/lib/env/public";

type ServerEnv = PublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
};

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicEnv = getPublicEnv();

  if (!serviceRoleKey) {
    throw new Error(
      "Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const validatedEnv: ServerEnv = {
    ...publicEnv,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };

  cachedEnv = validatedEnv;

  return validatedEnv;
}
