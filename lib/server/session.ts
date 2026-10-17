import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Redis } from "@upstash/redis";

export const SESSION_COOKIE = "cicada_session";
export const SESSION_TTL = 24 * 60 * 60;
export const SESSION_COOKIE_TTL = 2 * 60 * 60;

export type SessionData = {
  stagesVerified?: boolean;
  contactName?: string;
  contact?: string;
  riddleSolved?: boolean;
  riddleOpenedAt?: number;
  ctfCompleted?: boolean;
  winnerIndex?: number;
};

export type SessionContext = { id: string; data: SessionData };

function cookieSignature(id: string, secret: string): string {
  return createHmac("sha256", secret).update(id).digest("base64url");
}

export function signedCookie(id: string, secret: string): string {
  return `${id}.${cookieSignature(id, secret)}`;
}

function parseSignedCookie(value: string | undefined, secret: string): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 0) return null;
  const id = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^[A-Za-z0-9_-]{40,50}$/u.test(id) || !/^[A-Za-z0-9_-]{40,50}$/u.test(signature)) return null;

  const expected = Buffer.from(cookieSignature(id, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null;
}

export async function readSession(
  redis: Redis,
  secret: string,
  request?: NextRequest,
): Promise<SessionContext | null> {
  const cookieValue = request
    ? request.cookies.get(SESSION_COOKIE)?.value
    : (await cookies()).get(SESSION_COOKIE)?.value;
  const id = parseSignedCookie(cookieValue, secret);
  if (!id) return null;

  try {
    const data = await redis.get<SessionData>(`session:${id}`);
    if (!data || typeof data !== "object") return null;
    return { id, data };
  } catch (error) {
    console.error("[cicada] Session could not be loaded from Redis.");
    throw error;
  }
}

export async function createSession(redis: Redis): Promise<SessionContext & { cookieValue: string }> {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) throw new Error("Session configuration unavailable");
  const id = randomBytes(32).toString("base64url");
  const data: SessionData = {};
  await redis.set(`session:${id}`, data, { ex: SESSION_TTL });
  return { id, data, cookieValue: signedCookie(id, secret) };
}

export async function saveSession(redis: Redis, context: SessionContext): Promise<void> {
  await redis.set(`session:${context.id}`, context.data, { ex: SESSION_TTL });
}

export function setSessionCookie(response: NextResponse, value: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_TTL,
  });
  return response;
}

export function sessionCookieValue(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}
