import type { Metadata } from "next";
import { Frame } from "@/components/Frame";
import { closedCopy, eventReveal } from "@/lib/content";

export const metadata: Metadata = { title: "CICADA · FISAT", description: "The hunt is complete." };

export default function ClosedPage() {
  return (
    <Frame label="HUNT COMPLETE">
      <span className="micro-label">NO FURTHER SIGNALS</span>
      <section className="closed-card">
        <h1 className="closed-title">THE DOOR IS CLOSED.</h1>
        <p className="closed-copy">{closedCopy.replace("THE DOOR IS CLOSED. ", "")}</p>
        <p className="reveal-copy reveal-copy--spaced">{eventReveal}</p>
      </section>
    </Frame>
  );
}
