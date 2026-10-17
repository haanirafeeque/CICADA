import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireEnv } from "@/lib/server/env";

const requiredNames = [
  "STAGE1_ANSWER",
  "STAGE2_ANSWER",
  "STAGE3_ANSWER",
  "CTF_RIDDLE_ANSWER",
  "CTF_FLAG",
  "SESSION_SECRET",
  "REFERRAL_SECRET",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;

describe("required environment checks", () => {
  beforeEach(() => {
    for (const name of requiredNames) vi.stubEnv(name, randomBytes(48).toString("base64url"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(requiredNames)("fails closed when %s is missing", (name) => {
    vi.stubEnv(name, "");
    const serverLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(requireEnv(requiredNames)).toBeNull();
    expect(serverLog).toHaveBeenCalledWith(expect.stringContaining(name));
  });

  it.each(["SESSION_SECRET", "REFERRAL_SECRET"] as const)("rejects a short %s", (name) => {
    vi.stubEnv(name, "short");
    expect(requireEnv([name])).toBeNull();
  });

  it("accepts a complete configured set", () => {
    expect(requireEnv(requiredNames)).not.toBeNull();
  });
});
