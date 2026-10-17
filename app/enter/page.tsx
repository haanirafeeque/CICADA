import type { Metadata } from "next";
import Link from "next/link";
import { Frame, Notice } from "@/components/Frame";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "CICADA · FISAT", description: "Keep your answers close." };

type EntryPageProps = { searchParams: Promise<{ status?: string }> };

const statusCopy: Record<string, string> = {
  wrong: "One or more answers are not correct.",
  locked: "Please try again in 10 minutes.",
  unavailable: "Not available right now",
  invalid: "Check the required fields and try again.",
};

export default async function EnterPage({ searchParams }: EntryPageProps) {
  const params = await searchParams;
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  let draft: Record<string, string> = {};

  if (environment && redis) {
    try {
      const session = await readSession(redis, environment.SESSION_SECRET, undefined);
      if (session) {
        const saved = await redis.get<Record<string, string>>(`session:${session.id}:entryDraft`);
        if (saved && typeof saved === "object") {
          draft = saved;
          await redis.del(`session:${session.id}:entryDraft`);
        }
      }
    } catch {
      // The form remains available; submission will show the neutral service message.
    }
  }

  const message = !environment || !redis ? "Not available right now" : (params.status ? statusCopy[params.status] : undefined);

  return (
    <Frame label="ANSWER ENTRY">
      <span className="micro-label">THE FINAL CHECKPOINT</span>
      <h1 className="page-title">Keep what you found.</h1>
      <p className="page-lede">Enter the three answers you kept. Use the contact where you can be reached.</p>
      {message && <Notice>{message}</Notice>}

      {environment && redis && (
        <form className="form-card form-grid" action="/api/enter" method="post">
          <div className="field">
            <label htmlFor="stage1">Stage 1</label>
            <input id="stage1" name="stage1" type="text" required maxLength={64} autoComplete="off" autoCapitalize="characters" inputMode="text" defaultValue={draft.stage1} />
          </div>
          <div className="field">
            <label htmlFor="stage2">Stage 2</label>
            <input id="stage2" name="stage2" type="text" required maxLength={64} autoComplete="off" autoCapitalize="characters" inputMode="text" defaultValue={draft.stage2} />
          </div>
          <div className="field">
            <label htmlFor="stage3">Stage 3</label>
            <input id="stage3" name="stage3" type="text" required maxLength={64} autoComplete="off" autoCapitalize="characters" inputMode="text" defaultValue={draft.stage3} />
          </div>
          <div className="field field--optional">
            <label htmlFor="name">Your name <span>OPTIONAL · 40 CHARACTERS MAX</span></label>
            <input id="name" name="name" type="text" maxLength={40} autoComplete="name" defaultValue={draft.name} />
          </div>
          <div className="field">
            <label htmlFor="contact">Phone or email</label>
            <input id="contact" name="contact" type="text" required maxLength={120} autoComplete="email" inputMode="text" defaultValue={draft.contact} />
          </div>
          <label className="honeypot" aria-hidden="true" tabIndex={-1}>
            Leave this field empty
            <input name="website" type="text" autoComplete="off" tabIndex={-1} />
          </label>
          <button className="button form-submit" type="submit">VERIFY <span aria-hidden="true">↗</span></button>
        </form>
      )}
      <Link className="back-link" href="/">← Return to the beginning</Link>
    </Frame>
  );
}
