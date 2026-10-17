import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Frame, Notice } from "@/components/Frame";
import { HintThreeButton } from "@/components/HintThreeButton";
import { NotesPanel } from "@/components/NotesPanel";
import { SessionKeepalive } from "@/components/SessionKeepalive";
import { hintOne, riddleText } from "@/lib/content";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession } from "@/lib/server/session";
import { openRiddleWindow } from "@/lib/server/winner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "CICADA · FISAT", description: "The final field challenge." };

type CtfPageProps = { searchParams: Promise<{ status?: string; id?: string }> };

const statusCopy: Record<string, string> = {
  "riddle-wrong": "That does not open the next door.",
  "riddle-solved": "The next signal is ready.",
  "flag-wrong": "That submission could not be verified.",
  locked: "Please try again in 10 minutes.",
  unavailable: "Not available right now",
};

export default async function CtfPage({ searchParams }: CtfPageProps) {
  const params = await searchParams;
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) {
    return <Frame label="FIELD CHALLENGE"><span className="micro-label">SIGNAL UNAVAILABLE</span><h1 className="page-title">Not available right now</h1></Frame>;
  }

  let session;
  try {
    session = await readSession(redis, environment.SESSION_SECRET);
    if (!session?.data.stagesVerified) redirect("/enter");
    if (session.data.ctfCompleted) redirect(session.data.winnerIndex ? "/reward" : "/closed");
    await openRiddleWindow(redis, session);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[cicada] Challenge session could not be loaded.");
    return <Frame label="FIELD CHALLENGE"><span className="micro-label">SIGNAL UNAVAILABLE</span><h1 className="page-title">Not available right now</h1></Frame>;
  }

  const message = params.status ? statusCopy[params.status] : undefined;

  return (
    <Frame label="FIELD CHALLENGE">
      <SessionKeepalive />
      <span className="micro-label">ONE LAST SIGNAL</span>
      <h1 className="page-title">The field is open.</h1>
      <p className="page-lede">Follow what is there. Leave the rest behind.</p>
      {message && <Notice>{message}</Notice>}

      {!session.data.riddleSolved ? (
        <section className="riddle-card" aria-labelledby="riddle-heading">
          <span className="micro-label">FINAL RIDDLE</span>
          <h2 className="section-heading" id="riddle-heading">{riddleText}</h2>
          <div className="hint-box">
            <span className="micro-label">SIGNAL 01 · AVAILABLE</span>
            <p>{hintOne}</p>
          </div>
          <HintThreeButton />
          <form className="challenge-form" action="/api/ctf/riddle" method="post">
            <div className="field">
              <label htmlFor="riddle-answer">Your answer</label>
              <input id="riddle-answer" name="answer" type="text" required maxLength={64} autoComplete="off" autoCapitalize="characters" inputMode="text" />
            </div>
            <button className="button" type="submit">UNLOCK NOTES <span aria-hidden="true">↗</span></button>
          </form>
        </section>
      ) : (
        <>
          <NotesPanel selectedId={params.id || null} />
          <section className="riddle-card" aria-labelledby="flag-heading">
            <span className="micro-label">WEB CHALLENGE</span>
            <h2 className="section-heading" id="flag-heading">One record is missing.</h2>
            <p className="page-lede">Look beyond the listed notes. Some paths are only visible when requested.</p>
            <form className="challenge-form" action="/api/ctf/flag" method="post">
              <div className="field">
                <label htmlFor="flag-answer">Flag</label>
                <input id="flag-answer" name="answer" type="text" required maxLength={64} autoComplete="off" autoCapitalize="characters" inputMode="text" />
              </div>
              <button className="button" type="submit">SUBMIT FLAG <span aria-hidden="true">↗</span></button>
            </form>
          </section>
        </>
      )}
    </Frame>
  );
}
