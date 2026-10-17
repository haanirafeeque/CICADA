import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { guidelines, landingCopy } from "@/lib/content";

export default function Home() {
  const launchAt = process.env.LAUNCH_AT?.trim();
  const showCountdown = launchAt && Number.isFinite(Date.parse(launchAt));

  return (
    <main className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__index micro-label">FIELD NOTE 001 <span>·</span> FISAT</div>
        <div className="landing-hero__center">
          <Image
            className="landing-logo"
            src="/images/cicada-logo.png"
            alt="White cicada emblem"
            width={478}
            height={176}
            priority
            sizes="(max-width: 600px) 220px, 320px"
          />
          <p className="micro-label landing-kicker">THE SIGNAL IS NOT AN ACCIDENT</p>
          <h1 id="landing-title">{landingCopy.title}</h1>
          <p className="landing-subtitle">{landingCopy.subtitle}</p>
          <p className="landing-description">{landingCopy.description}</p>
          {showCountdown && <Countdown launchAt={launchAt} />}
          <Link className="button landing-action" href="/enter">{landingCopy.action}<span aria-hidden="true">↗</span></Link>
        </div>
        <div className="landing-hero__scroll micro-label" aria-hidden="true">SCROLL TO OBSERVE <span>↓</span></div>
      </section>

      <section className="guidelines section-wrap" aria-labelledby="guidelines-title">
        <div className="section-heading">
          <span className="micro-label">BEFORE YOU BEGIN</span>
          <h2 id="guidelines-title">Guidelines</h2>
        </div>
        <ol className="guidelines-list">
          {guidelines.map((rule, index) => (
            <li key={rule}>
              <span className="guidelines-number">0{index + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
        <Link className="button guidelines-action" href="/enter">{landingCopy.action}<span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="landing-footer">
        <span>{landingCopy.footer}</span>
        <span className="micro-label">THE HUNT IS QUIET. FOR NOW.</span>
      </footer>
    </main>
  );
}
