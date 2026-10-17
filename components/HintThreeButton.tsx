"use client";

import { useState } from "react";

export function HintThreeButton() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function revealHint() {
    setLoading(true);
    try {
      const response = await fetch("/api/ctf/hint?n=3", { cache: "no-store" });
      const result: { hint?: string; message?: string } = await response.json();
      setMessage(result.hint || result.message || "Not available right now");
    } catch {
      setMessage("Not available right now");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hint-locked">
      <button className="text-button" type="button" onClick={revealHint} disabled={loading}>
        {loading ? "CHECKING…" : "REQUEST ANOTHER SIGNAL"}
      </button>
      {message && <p className="hint-locked__message" aria-live="polite">{message}</p>}
    </div>
  );
}
