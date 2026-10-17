import { NextRequest } from "next/server";
import { compareAnswer } from "@/lib/server/answers";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { enforceRateLimit, isStageLocked, recordWrongStage } from "@/lib/server/rate-limit";
import { getRedis } from "@/lib/server/redis";
import { createSession, readSession, saveSession, setSessionCookie } from "@/lib/server/session";
import { redirectTo, unavailableRedirect } from "@/lib/server/responses";
import { entrySchema, readTextField } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return unavailableRedirect(request, "/enter");

  let session = null;
  let cookieValue: string | undefined;
  try {
    session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session) {
      const created = await createSession(redis);
      session = { id: created.id, data: created.data };
      cookieValue = created.cookieValue;
    }

    const rate = await enforceRateLimit(redis, request, "enter", session.id, 20, 10 * 60);
    if (!rate.allowed) {
      const response = redirectTo(request, "/enter?status=locked");
      return cookieValue ? setSessionCookie(response, cookieValue) : response;
    }

    if (await isStageLocked(redis, session.id)) {
      const response = redirectTo(request, "/enter?status=locked");
      return cookieValue ? setSessionCookie(response, cookieValue) : response;
    }

    const form = await request.formData();
    const candidate = {
      stage1: readTextField(form, "stage1"),
      stage2: readTextField(form, "stage2"),
      stage3: readTextField(form, "stage3"),
      name: readTextField(form, "name"),
      contact: readTextField(form, "contact"),
      website: readTextField(form, "website"),
    };

    if (candidate.website.length > 0) {
      const response = redirectTo(request, "/enter");
      return cookieValue ? setSessionCookie(response, cookieValue) : response;
    }

    const parsed = entrySchema.safeParse(candidate);
    if (!parsed.success) {
      const response = redirectTo(request, "/enter?status=invalid");
      return cookieValue ? setSessionCookie(response, cookieValue) : response;
    }

    const firstCorrect = compareAnswer(parsed.data.stage1, environment.STAGE1_ANSWER);
    const secondCorrect = compareAnswer(parsed.data.stage2, environment.STAGE2_ANSWER);
    const thirdCorrect = compareAnswer(parsed.data.stage3, environment.STAGE3_ANSWER);
    const correct = firstCorrect && secondCorrect && thirdCorrect;

    if (!correct) {
      const lockout = await recordWrongStage(redis, session.id);
      await redis.set(
        `session:${session.id}:entryDraft`,
        { stage1: parsed.data.stage1, stage2: parsed.data.stage2, stage3: parsed.data.stage3, name: parsed.data.name, contact: parsed.data.contact },
        { ex: 10 * 60 },
      );
      const response = redirectTo(request, lockout ? "/enter?status=locked" : "/enter?status=wrong");
      return cookieValue ? setSessionCookie(response, cookieValue) : response;
    }

    await redis.del(`session:${session.id}:entryDraft`, `wrong:stage:${session.id}`, `lock:stage:${session.id}`);
    session.data.stagesVerified = true;
    session.data.contactName = parsed.data.name;
    session.data.contact = parsed.data.contact;
    await saveSession(redis, session);
    const response = redirectTo(request, "/ctf");
    return cookieValue ? setSessionCookie(response, cookieValue) : response;
  } catch {
    console.error("[cicada] Stage submission could not be completed.");
    return unavailableRedirect(request, "/enter");
  }
}
