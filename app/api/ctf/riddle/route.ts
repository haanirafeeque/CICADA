import { NextRequest } from "next/server";
import { compareAnswer } from "@/lib/server/answers";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getRedis } from "@/lib/server/redis";
import { readSession, saveSession } from "@/lib/server/session";
import { redirectTo, unavailableRedirect } from "@/lib/server/responses";
import { answerSchema, readTextField } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return unavailableRedirect(request, "/ctf");

  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session?.data.stagesVerified) return redirectTo(request, "/enter");
    if (session.data.ctfCompleted) return redirectTo(request, session.data.winnerIndex ? "/reward" : "/closed");

    const rate = await enforceRateLimit(redis, request, "riddle", session.id, 15, 10 * 60);
    if (!rate.allowed) return redirectTo(request, "/ctf?status=locked");

    const form = await request.formData();
    const parsed = answerSchema.safeParse({ answer: readTextField(form, "answer") });
    if (!parsed.success) return redirectTo(request, "/ctf?status=riddle-wrong");

    if (!compareAnswer(parsed.data.answer, environment.CTF_RIDDLE_ANSWER)) {
      return redirectTo(request, "/ctf?status=riddle-wrong");
    }

    session.data.riddleSolved = true;
    await saveSession(redis, session);
    return redirectTo(request, "/ctf?status=riddle-solved");
  } catch {
    console.error("[cicada] Riddle submission could not be completed.");
    return unavailableRedirect(request, "/ctf");
  }
}
