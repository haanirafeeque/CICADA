"use client";

import { useEffect } from "react";

export function SessionKeepalive() {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/session/refresh", { method: "POST", cache: "no-store" }).catch(() => undefined);
    };
    const timer = window.setInterval(refresh, 30 * 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return null;
}
