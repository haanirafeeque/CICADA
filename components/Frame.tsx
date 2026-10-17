import type { ReactNode } from "react";
import Link from "next/link";

export function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <main className="page-frame">
      <div className="page-frame__top">
        <Link className="wordmark" href="/" aria-label="CICADA home">CICADA</Link>
        <span className="micro-label">{label}</span>
      </div>
      <div className="page-frame__content">{children}</div>
      <footer className="page-frame__footer">CICADA · FISAT</footer>
    </main>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="form-notice" role="status">{children}</p>;
}
