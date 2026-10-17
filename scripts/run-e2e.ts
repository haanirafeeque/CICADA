import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testEnvironment = {
  STAGE1_ANSWER: randomBytes(12).toString("hex"),
  STAGE2_ANSWER: randomBytes(12).toString("hex"),
  STAGE3_ANSWER: randomBytes(12).toString("hex"),
  CTF_RIDDLE_ANSWER: randomBytes(12).toString("hex"),
  CTF_FLAG: `CICADA{${randomBytes(18).toString("hex")}}`,
  SESSION_SECRET: randomBytes(48).toString("base64url"),
  REFERRAL_SECRET: randomBytes(48).toString("base64url"),
  WINNER_LIMIT: "15",
  KV_REST_API_URL: "http://127.0.0.1:8787",
  KV_REST_API_TOKEN: "local-test-token",
  NODE_ENV: "development" as const,
};

const childEnvironment: NodeJS.ProcessEnv = { ...process.env, ...testEnvironment };
delete childEnvironment.NO_COLOR;
delete childEnvironment.FORCE_COLOR;

const result = spawnSync(
  process.execPath,
  [resolve("node_modules/@playwright/test/cli.js"), "test", ...process.argv.slice(2)],
  { stdio: "inherit", env: childEnvironment },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
