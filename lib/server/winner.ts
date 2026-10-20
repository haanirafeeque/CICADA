import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Redis } from "@upstash/redis";
import { SESSION_TTL, type SessionContext } from "@/lib/server/session";

export function getWinnerLimit(): number {
  const value = Number.parseInt(process.env.WINNER_LIMIT || "15", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 15;
}

export function makeWinnerCode(): string {
  const value = randomBytes(12).toString("hex").toUpperCase();
  const groups = value.match(/.{4}/gu) ?? [];
  return `CICADA-${groups.join("-")}`;
}

export function getWinnerIdentityKeys(secret: string, name: string, email: string) {
  const normalizedName = name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const nameFingerprint = createHmac("sha256", secret).update(`name:${normalizedName}`).digest("hex");
  const emailFingerprint = createHmac("sha256", secret).update(`email:${normalizedEmail}`).digest("hex");
  return {
    nameKey: `winner:by-name:${nameFingerprint}`,
    emailKey: `winner:by-email:${emailFingerprint}`,
  };
}

export function getWinnerCodeKey(code: string): string {
  const fingerprint = createHash("sha256").update(code).digest("hex");
  return `winner:by-code:${fingerprint}`;
}

export async function openRiddleWindow(redis: Redis, session: SessionContext): Promise<void> {
  if (session.data.riddleOpenedAt) return;
  session.data.riddleOpenedAt = Date.now();
  await redis.set(`session:${session.id}`, session.data, { ex: SESSION_TTL });
}
