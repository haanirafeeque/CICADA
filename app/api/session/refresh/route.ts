import { NextRequest, NextResponse } from "next/server";
import { coreSessionEnv, requireEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession, SESSION_TTL, setSessionCookie, signedCookie } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const environment = requireEnv(coreSessionEnv);
  const redis = getRedis();
  if (!environment || !redis) return NextResponse.json({ message: "Not available right now" }, { status: 503 });

  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session) return NextResponse.json({ message: "Not available right now" }, { status: 401 });
    await redis.expire(`session:${session.id}`, SESSION_TTL);
    const response = NextResponse.json({ refreshed: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    return setSessionCookie(response, signedCookie(session.id, environment.SESSION_SECRET));
  } catch {
    console.error("[cicada] Session could not be refreshed.");
    return NextResponse.json({ message: "Not available right now" }, { status: 503 });
  }
}
