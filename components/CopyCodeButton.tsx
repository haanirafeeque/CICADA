"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-copy">
      <code className="winner-code">{code}</code>
      <button className="button button--small" type="button" onClick={copyCode} aria-live="polite">
        {copied ? "COPIED" : "COPY CODE"}
      </button>
    </div>
  );
}
