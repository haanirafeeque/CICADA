import "server-only";
import { createHash } from "node:crypto";
import type { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export type LimitResult = { allowed: true } | { allowed: false; retryAfter: number };

function clientAddress(request: NextRequest): string {
  const real = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return real || forwarded || "unknown";
}

function keyFor(scope: string, type: "ip" | "session", value: string): string {
  const digest = createHash("sha256").update(value).digest("hex");
  return `rate:${scope}:${type}:${digest}`;
}

async function incrementWindow(redis: Redis, key: string, windowSeconds: number, max: number): Promise<boolean> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count <= max;
}

export async function enforceRateLimit(
  redis: Redis,
  request: NextRequest,
  scope: string,
  sessionId: string,
  max: number,
  windowSeconds: number,
): Promise<LimitResult> {
  const ipAllowed = await incrementWindow(redis, keyFor(scope, "ip", clientAddress(request)), windowSeconds, max);
  const sessionAllowed = await incrementWindow(redis, keyFor(scope, "session", sessionId), windowSeconds, max);
  return ipAllowed && sessionAllowed ? { allowed: true } : { allowed: false, retryAfter: windowSeconds };
}

export async function isStageLocked(redis: Redis, sessionId: string): Promise<boolean> {
  return Boolean(await redis.get(`lock:stage:${sessionId}`));
}

export async function recordWrongStage(redis: Redis, sessionId: string): Promise<boolean> {
  const key = `wrong:stage:${sessionId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 10 * 60);
  if (count >= 5) {
    await redis.set(`lock:stage:${sessionId}`, "1", { ex: 10 * 60 });
    return true;
  }
  return false;
}
