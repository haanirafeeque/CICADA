import { defineConfig, devices } from "@playwright/test";

const requiredTestVariables = ["STAGE1_ANSWER", "STAGE2_ANSWER", "STAGE3_ANSWER", "CTF_RIDDLE_ANSWER", "CTF_FLAG", "SESSION_SECRET", "REFERRAL_SECRET", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
for (const name of requiredTestVariables) {
  if (!process.env[name]) throw new Error(`Missing test environment value: ${name}. Run npm run test:e2e.`);
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/site.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npx tsx tests/redis-stub.ts",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100/enter",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, NODE_ENV: "development" },
    },
  ],
});
