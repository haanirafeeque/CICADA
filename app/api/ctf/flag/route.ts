import { NextRequest } from "next/server";
import { compareAnswer } from "@/lib/server/answers";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getRedis } from "@/lib/server/redis";
import { readSession, SESSION_TTL } from "@/lib/server/session";
import { redirectTo, unavailableRedirect } from "@/lib/server/responses";
import { answerSchema, readTextField } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const claimWinnerScript = `
local claimed = redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1])
if not claimed then return 0 end
local index = redis.call('INCR', KEYS[2])
local current = redis.call('GET', KEYS[3])
local data = {}
if current then data = cjson.decode(current) end
data.ctfCompleted = true
if tonumber(index) <= tonumber(ARGV[2]) then data.winnerIndex = tonumber(index) end
redis.call('SET', KEYS[3], cjson.encode(data), 'EX', ARGV[1])
return index
`;

function winnerLimit(): number {
  const configured = Number.parseInt(process.env.WINNER_LIMIT || "15", 10);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 15;
}

export async function POST(request: NextRequest) {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return unavailableRedirect(request, "/ctf");

  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session?.data.stagesVerified || !session.data.riddleSolved) return redirectTo(request, "/enter");
    if (session.data.ctfCompleted) return redirectTo(request, session.data.winnerIndex ? "/reward" : "/closed");

    const rate = await enforceRateLimit(redis, request, "flag", session.id, 10, 10 * 60);
    if (!rate.allowed) return redirectTo(request, "/ctf?status=locked");

    const form = await request.formData();
    const parsed = answerSchema.safeParse({ answer: readTextField(form, "answer") });
    if (!parsed.success || !compareAnswer(parsed.data.answer, environment.CTF_FLAG)) {
      return redirectTo(request, "/ctf?status=flag-wrong");
    }

    const claimResult = await redis.eval(
      claimWinnerScript,
      [`session:${session.id}:completed`, "winners:count", `session:${session.id}`],
      [String(SESSION_TTL), String(winnerLimit())],
    );
    const index = Number(claimResult);

    if (!index) {
      const latest = await readSession(redis, environment.SESSION_SECRET, request);
      return redirectTo(request, latest?.data.winnerIndex ? "/reward" : "/closed");
    }

    return redirectTo(request, index <= winnerLimit() ? "/reward" : "/closed");
  } catch {
    console.error("[cicada] Flag submission could not be completed.");
    return unavailableRedirect(request, "/ctf");
  }
}
