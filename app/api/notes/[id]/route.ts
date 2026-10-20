import { NextRequest } from "next/server";
import { noteThreePlaceholder, publicNotes } from "@/lib/content";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession } from "@/lib/server/session";
import { jsonNoStore } from "@/lib/server/responses";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return jsonNoStore({ message: "Not available right now" }, 503);

  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session?.data.stagesVerified) return jsonNoStore({ message: "Not found" }, 404);
    if (id === "01" || id === "02") return jsonNoStore({ id, note: publicNotes[id] });
    if (id !== "03" || !session.data.riddleSolved) return jsonNoStore({ message: "Not found" }, 404);

    return jsonNoStore({ id: "03", note: noteThreePlaceholder, flag: environment.CTF_FLAG });
  } catch {
    console.error("[cicada] Challenge note could not be loaded.");
    return jsonNoStore({ message: "Not available right now" }, 503);
  }
}
