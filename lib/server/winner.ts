import "server-only";
import { createHmac } from "node:crypto";
import type { Redis } from "@upstash/redis";
import { SESSION_TTL, type SessionContext } from "@/lib/server/session";

export function getWinnerLimit(): number {
  const value = Number.parseInt(process.env.WINNER_LIMIT || "15", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 15;
}

export function makeWinnerCode(secret: string, index: number): string {
  const digest = createHmac("sha256", secret).update(`winner:${index}`).digest("hex").slice(0, 8).toUpperCase();
  return `CICADA-${digest}`;
}

export async function openRiddleWindow(redis: Redis, session: SessionContext): Promise<void> {
  if (session.data.riddleOpenedAt) return;
  session.data.riddleOpenedAt = Date.now();
  await redis.set(`session:${session.id}`, session.data, { ex: SESSION_TTL });
}
