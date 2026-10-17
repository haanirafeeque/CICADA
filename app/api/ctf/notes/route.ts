import { NextRequest } from "next/server";
import { noteSevenPlaceholder, publicNotes } from "@/lib/content";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession } from "@/lib/server/session";
import { jsonNoStore } from "@/lib/server/responses";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return jsonNoStore({ message: "Not available right now" }, 503);

  const id = request.nextUrl.searchParams.get("id");
  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session?.data.stagesVerified) return jsonNoStore({ message: "Not found" }, 404);
    if (id === "1" || id === "2") return jsonNoStore({ id, note: publicNotes[id] });
    if (id !== "7" || !session.data.riddleSolved) return jsonNoStore({ message: "Not found" }, 404);

    return jsonNoStore({ id: 7, note: noteSevenPlaceholder, flag: environment.CTF_FLAG });
  } catch {
    console.error("[cicada] Challenge note could not be loaded.");
    return jsonNoStore({ message: "Not available right now" }, 503);
  }
}
