import "server-only";

export type ServerEnv = Record<string, string>;

export function requireEnv(names: readonly string[]): ServerEnv | null {
  const values: ServerEnv = {};
  const missing: string[] = [];

  for (const name of names) {
    const value = process.env[name]?.trim();
    const secretTooShort = (name === "SESSION_SECRET" || name === "REFERRAL_SECRET") && (value?.length ?? 0) < 32;
    if (!value || secretTooShort) missing.push(name);
    else values[name] = value;
  }

  if (missing.length) {
    for (const name of missing) {
      console.error(`[cicada] Missing or invalid required environment variable: ${name}`);
    }
    return null;
  }

  return values;
}

export const coreSessionEnv = ["SESSION_SECRET", "KV_REST_API_URL", "KV_REST_API_TOKEN"] as const;

export const requiredChallengeEnv = [
  ...coreSessionEnv,
  "STAGE1_ANSWER",
  "STAGE2_ANSWER",
  "STAGE3_ANSWER",
  "CTF_RIDDLE_ANSWER",
  "CTF_FLAG",
  "REFERRAL_SECRET",
] as const;
