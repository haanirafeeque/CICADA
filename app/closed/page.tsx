import type { Metadata } from "next";
import { Frame } from "@/components/Frame";
import { WorkshopRegistrationLink } from "@/components/WorkshopRegistrationLink";
import { closedCopy, eventReveal, workshopCredit, workshopPlaceholders } from "@/lib/content";

export const metadata: Metadata = { title: "CICADA · FISAT", description: "The hunt is complete." };

type ClosedPageProps = { searchParams: Promise<{ status?: string }> };

export default async function ClosedPage({ searchParams }: ClosedPageProps) {
  const params = await searchParams;
  const duplicateClaim = params.status === "duplicate";
  const workshopName = process.env.WORKSHOP_NAME?.trim() || workshopPlaceholders.name;
  const workshopDate = process.env.WORKSHOP_DATE?.trim() || workshopPlaceholders.date;
  const workshopVenue = process.env.WORKSHOP_VENUE?.trim() || workshopPlaceholders.venue;
  const eventName = process.env.EVENT_NAME?.trim() || "FANDOM ZONE";

  return (
    <Frame label="HUNT COMPLETE">
      <span className="micro-label">NO FURTHER SIGNALS</span>
      <section className="closed-card">
        <h1 className="closed-title">{duplicateClaim ? "ONE CODE PER PERSON." : "THE DOOR IS CLOSED."}</h1>
        <p className="closed-copy">
          {duplicateClaim
            ? "This name or email has already claimed a coupon code. Each person may claim one code. Contact the organizers if you think this is a mistake."
            : closedCopy.replace("THE DOOR IS CLOSED. ", "")}
        </p>
        <p className="reveal-copy reveal-copy--spaced">{eventReveal}</p>
        <div className="workshop-details">
          <div><span className="micro-label">WORKSHOP</span><p>{workshopName}</p></div>
          <div><span className="micro-label">DATE</span><p>{workshopDate}</p></div>
          <div><span className="micro-label">VENUE</span><p>{workshopVenue}</p></div>
          <p>{workshopCredit.replace("FANDOM ZONE", eventName)}</p>
          <WorkshopRegistrationLink />
        </div>
      </section>
    </Frame>
  );
}
