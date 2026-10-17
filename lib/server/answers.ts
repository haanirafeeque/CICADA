import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export function normalizeAnswer(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/gu, "");
}

export function compareAnswer(submitted: string, expected: string): boolean {
  const left = createHash("sha256").update(normalizeAnswer(submitted), "utf8").digest();
  const right = createHash("sha256").update(normalizeAnswer(expected), "utf8").digest();
  return timingSafeEqual(left, right);
}
