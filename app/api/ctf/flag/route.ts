import { NextRequest } from "next/server";
import { compareAnswer } from "@/lib/server/answers";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getRedis } from "@/lib/server/redis";
import { readSession, SESSION_TTL, type SessionData } from "@/lib/server/session";
import { redirectTo, unavailableRedirect } from "@/lib/server/responses";
import { answerSchema, readTextField } from "@/lib/server/validation";
import { getWinnerCodeKey, getWinnerIdentityKeys, getWinnerLimit, makeWinnerCode } from "@/lib/server/winner";

export const dynamic = "force-dynamic";

const claimWinnerScript = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local current = redis.call('GET', KEYS[3])
local data = {}
if current then data = cjson.decode(current) end
local ttl = ARGV[1]
if redis.call('EXISTS', KEYS[4]) == 1 or redis.call('EXISTS', KEYS[5]) == 1 then
  data.ctfCompleted = true
  data.winnerClaimRejected = true
  redis.call('SET', KEYS[1], '1', 'EX', ttl)
  redis.call('SET', KEYS[3], cjson.encode(data), 'EX', ttl)
  return -1
end
if redis.call('EXISTS', KEYS[6]) == 1 then return -2 end

redis.call('SET', KEYS[1], '1', 'EX', ttl)
local index = redis.call('INCR', KEYS[2])
data.ctfCompleted = true
if tonumber(index) <= tonumber(ARGV[2]) then
  local indexText = string.format('%02d', index)
  redis.call('SET', KEYS[4], indexText)
  redis.call('SET', KEYS[5], indexText)
  redis.call('SET', KEYS[6], indexText)
  redis.call('HSET', 'winner:' .. indexText,
    'name', ARGV[3],
    'email', ARGV[4],
    'couponCode', ARGV[5],
    'winnerIndex', indexText)
  data.winnerIndex = tonumber(index)
  data.winnerCode = ARGV[5]
end
redis.call('SET', KEYS[3], cjson.encode(data), 'EX', ttl)
return index
`;

function completionPath(data?: SessionData | null): string {
  if (data?.winnerIndex) return "/reward";
  return data?.winnerClaimRejected ? "/closed?status=duplicate" : "/closed";
}

export async function POST(request: NextRequest) {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) return unavailableRedirect(request, "/ctf");

  try {
    const session = await readSession(redis, environment.SESSION_SECRET, request);
    if (!session?.data.stagesVerified || !session.data.riddleSolved) return redirectTo(request, "/enter");
    if (session.data.ctfCompleted) return redirectTo(request, completionPath(session.data));
    if (!session.data.contactName?.trim() || !session.data.contactEmail?.trim()) return redirectTo(request, "/enter?status=invalid");

    const rate = await enforceRateLimit(redis, request, "flag", session.id, 10, 10 * 60);
    if (!rate.allowed) return redirectTo(request, "/ctf?status=locked");

    const form = await request.formData();
    const parsed = answerSchema.safeParse({ answer: readTextField(form, "answer") });
    if (!parsed.success || !compareAnswer(parsed.data.answer, environment.CTF_FLAG)) {
      return redirectTo(request, "/ctf?status=flag-wrong");
    }

    const { nameKey, emailKey } = getWinnerIdentityKeys(
      environment.REFERRAL_SECRET,
      session.data.contactName,
      session.data.contactEmail,
    );
    let claimResult = -2;
    for (let attempt = 0; attempt < 3 && claimResult === -2; attempt += 1) {
      const code = makeWinnerCode();
      claimResult = Number(await redis.eval(
        claimWinnerScript,
        [
          `session:${session.id}:completed`,
          "winners:count",
          `session:${session.id}`,
          nameKey,
          emailKey,
          getWinnerCodeKey(code),
        ],
        [
          String(SESSION_TTL),
          String(getWinnerLimit()),
          session.data.contactName,
          session.data.contactEmail,
          code,
        ],
      ));
    }

    if (claimResult === -1) return redirectTo(request, "/closed?status=duplicate");

    if (claimResult === 0) {
      const latest = await readSession(redis, environment.SESSION_SECRET, request);
      return redirectTo(request, completionPath(latest?.data));
    }

    if (claimResult < 0) return unavailableRedirect(request, "/ctf");
    return redirectTo(request, claimResult <= getWinnerLimit() ? "/reward" : "/closed");
  } catch {
    console.error("[cicada] Flag submission could not be completed.");
    return unavailableRedirect(request, "/ctf");
  }
}
