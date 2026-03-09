import "server-only";

import { getPublicEnv } from "@/lib/env/public";
import { requireEnv } from "@/lib/env/shared";

let cachedEnv:
  | (ReturnType<typeof getPublicEnv> & {
      SUPABASE_SERVICE_ROLE_KEY: string;
    })
  | undefined;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = requireEnv(process.env, ["SUPABASE_SERVICE_ROLE_KEY"]);

  cachedEnv = {
    ...getPublicEnv(),
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };

  return cachedEnv;
}
