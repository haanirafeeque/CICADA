import { NextRequest } from "next/server";
import { hintThree } from "@/lib/content";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession } from "@/lib/server/session";
import { jsonNoStore } from "@/lib/server/responses";

export const dynamic = "force-dynamic";

function remainingText(milliseconds: number): string {
  const totalMinutes = Math.ceil(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `Hint 2 unlocks in ${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export async function GET(request: NextRequest) {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return jsonNoStore({ message: "Not available right now" }, 503);

  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session?.data.stagesVerified || !session.data.riddleOpenedAt) {
      return jsonNoStore({ message: "Not found" }, 404);
    }

    if (request.nextUrl.searchParams.get("n") !== "3") return jsonNoStore({ message: "Not found" }, 404);
    const unlockAt = session.data.riddleOpenedAt + 3 * 60 * 60 * 1000;
    const remaining = unlockAt - Date.now();
    if (remaining > 0) return jsonNoStore({ message: remainingText(remaining) });
    return jsonNoStore({ hint: hintThree });
  } catch {
    console.error("[cicada] Hint could not be loaded.");
    return jsonNoStore({ message: "Not available right now" }, 503);
  }
}
