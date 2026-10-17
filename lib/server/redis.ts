import "server-only";
import { Redis } from "@upstash/redis";

export function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    return new Redis({ url, token, automaticDeserialization: true });
  } catch {
    console.error("[cicada] Redis client could not be initialized.");
    return null;
  }
}
