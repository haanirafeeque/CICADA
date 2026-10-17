"use client";

import { useEffect, useState } from "react";

function formatRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return `${String(days).padStart(2, "0")} : ${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(remainder).padStart(2, "0")}`;
}

export function Countdown({ launchAt }: { launchAt: string }) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    const target = Date.parse(launchAt);
    if (!Number.isFinite(target)) return;
    const update = () => setRemaining(formatRemaining(target - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [launchAt]);

  if (!remaining) return null;
  return (
    <div className="countdown" aria-label={`Time until launch: ${remaining}`}>
      <span className="micro-label">UNTIL THE FIRST SIGNAL</span>
      <span className="countdown__time">{remaining}</span>
      <span className="countdown__units">DAYS : HOURS : MINUTES : SECONDS</span>
    </div>
  );
}
