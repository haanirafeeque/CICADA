import type { Metadata } from "next";
import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { Frame } from "@/components/Frame";
import { WorkshopRegistrationLink } from "@/components/WorkshopRegistrationLink";
import { eventReveal, workshopCredit, workshopPlaceholders } from "@/lib/content";
import { requireEnv, requiredChallengeEnv } from "@/lib/server/env";
import { getRedis } from "@/lib/server/redis";
import { readSession } from "@/lib/server/session";
import { getWinnerLimit } from "@/lib/server/winner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "CICADA · FISAT", description: "Your signal has been received." };

export default async function RewardPage() {
  const environment = requireEnv(requiredChallengeEnv);
  const redis = getRedis();
  if (!environment || !redis) {
    return <Frame label="REWARD"><span className="micro-label">SIGNAL UNAVAILABLE</span><h1 className="page-title">Not available right now</h1></Frame>;
  }

  let session;
  try {
    session = await readSession(redis, environment.SESSION_SECRET);
  } catch {
    console.error("[cicada] Winner session could not be loaded.");
    return <Frame label="REWARD"><span className="micro-label">SIGNAL UNAVAILABLE</span><h1 className="page-title">Not available right now</h1></Frame>;
  }

  const winnerIndex = session?.data.winnerIndex;
  if (!session || !winnerIndex || winnerIndex < 1 || winnerIndex > getWinnerLimit()) redirect("/closed");

  const code = session.data.winnerCode;
  if (!code) redirect("/closed");
  const workshopName = process.env.WORKSHOP_NAME?.trim() || workshopPlaceholders.name;
  const workshopDate = process.env.WORKSHOP_DATE?.trim() || workshopPlaceholders.date;
  const workshopVenue = process.env.WORKSHOP_VENUE?.trim() || workshopPlaceholders.venue;
  const contactNumber = process.env.CONTACT_NUMBER?.trim();
  const telephone = contactNumber?.replace(/[^+\d]/gu, "");
  const eventName = process.env.EVENT_NAME?.trim() || "FANDOM ZONE";
  const mulearnImage = existsSync(join(process.cwd(), "public", "images", "mulearn-logo.png"));
  const cyberImage = existsSync(join(process.cwd(), "public", "images", "cybersig-logo.png"));

  return (
    <Frame label="SIGNAL RECEIVED">
      <span className="micro-label">FIRST FIFTEEN</span>
      <h1 className="page-title">CONGRATULATIONS.</h1>
      <div className="reward-card">
        <p className="reveal-copy">{eventReveal}</p>
        <CopyCodeButton code={code} />
        <div className="workshop-details">
          <div><span className="micro-label">WORKSHOP</span><p>{workshopName}</p></div>
          <div><span className="micro-label">DATE</span><p>{workshopDate}</p></div>
          <div><span className="micro-label">VENUE</span><p>{workshopVenue}</p></div>
          <p>{workshopCredit.replace("FANDOM ZONE", eventName)}</p>
          <WorkshopRegistrationLink />
        </div>
        <p className="refund-note">
          Already registered for {eventName}? Contact{" "}
          {telephone ? <a href={`tel:${telephone}`}>{contactNumber}</a> : (contactNumber || "the event team")} to get your 50% back.
        </p>
        <div className="logo-row" aria-label="Event organizers">
          {mulearnImage ? (
            <Image className="brand-logo" src="/images/mulearn-logo.png" alt="µLearn logo" width={400} height={120} />
          ) : <span className="brand-fallback" aria-label="µLearn">µLearn</span>}
          {cyberImage && <Image className="brand-logo" src="/images/cybersig-logo.png" alt="Cybersecurity IG logo" width={400} height={120} />}
        </div>
      </div>
    </Frame>
  );
}
