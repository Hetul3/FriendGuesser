type EnvRecord = Record<string, string | undefined>;

export function requireEnv<T extends EnvRecord, K extends keyof T>(
  env: T,
  keys: readonly K[],
) {
  const missing = keys.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return env as T & Record<K, string>;
}
