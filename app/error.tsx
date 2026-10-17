"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {

  return (
    <main className="page-frame">
      <div className="page-frame__top"><Link className="wordmark" href="/">CICADA</Link><span className="micro-label">SIGNAL INTERRUPTED</span></div>
      <section className="page-frame__content">
        <span className="micro-label">500 · TEMPORARY ERROR</span>
        <h1 className="page-title">Not available right now</h1>
        <p className="page-lede">The signal could not be reached. Try again in a moment.</p>
        <button className="button button--start" onClick={reset}>TRY AGAIN <span aria-hidden="true">↻</span></button>
      </section>
      <footer className="page-frame__footer">CICADA · FISAT</footer>
    </main>
  );
}
