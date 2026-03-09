export type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

let cachedEnv: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !appUrl ? "NEXT_PUBLIC_APP_URL" : null,
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
  ].filter((value): value is string => value !== null);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const validatedEnv: PublicEnv = {
    NEXT_PUBLIC_APP_URL: appUrl!,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey!,
  };

  cachedEnv = validatedEnv;

  return validatedEnv;
}
