import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const baseUrl = "http://localhost:3100";
const redisStubUrl = "http://127.0.0.1:8787";
const stageAnswers = [process.env.STAGE1_ANSWER!, process.env.STAGE2_ANSWER!, process.env.STAGE3_ANSWER!];
const riddleAnswer = process.env.CTF_RIDDLE_ANSWER!;
const flagValue = process.env.CTF_FLAG!;
type PlayerIdentity = { name: string; email: string };
const defaultPlayer: PlayerIdentity = { name: "Test Player", email: "player@example.invalid" };

async function resetRedis(): Promise<void> {
  await fetch(`${redisStubUrl}/__reset`, { method: "POST" });
}

async function submitStages(page: Page, player: PlayerIdentity = defaultPlayer): Promise<void> {
  await page.goto("/enter");
  await page.getByLabel("Stage 1").fill(stageAnswers[0]);
  await page.getByLabel("Stage 2").fill(stageAnswers[1]);
  await page.getByLabel("Stage 3").fill(stageAnswers[2]);
  await page.getByLabel("Your name").fill(player.name);
  await page.getByLabel("Email address").fill(player.email);
  await page.getByRole("button", { name: /verify/i }).click();
  await page.waitForURL("**/ctf");
}

function withSeparator(value: string, separator: " " | "-"): string {
  const splitAt = Math.max(1, Math.floor(value.length / 2));
  return `${value.slice(0, splitAt)}${separator}${value.slice(splitAt)}`;
}

async function submitRiddle(page: Page, answer = riddleAnswer): Promise<void> {
  await page.getByLabel("Your answer").fill(answer);
  await page.getByRole("button", { name: /unlock notes/i }).click();
}

async function solveThroughRiddle(page: Page, answer = riddleAnswer, player: PlayerIdentity = defaultPlayer): Promise<void> {
  await submitStages(page, player);
  await submitRiddle(page, answer);
  await expect(page.getByRole("heading", { name: "One record is missing." })).toBeVisible();
}

async function submitFlag(page: Page, answer = flagValue): Promise<void> {
  await page.getByLabel("Flag").fill(answer);
  await page.getByRole("button", { name: /submit flag/i }).click();
}

async function seedSession(context: BrowserContext, state: Record<string, unknown>): Promise<string> {
  const id = randomBytes(32).toString("base64url");
  const secret = process.env.SESSION_SECRET!;
  const signature = createHmac("sha256", secret).update(id).digest("base64url");
  const seeded = {
    stagesVerified: true,
    riddleOpenedAt: Date.now(),
    ...state,
  };
  await fetch(`${redisStubUrl}/__seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: `session:${id}`, value: seeded }),
  });
  await context.addCookies([{
    name: "cicada_session",
    value: `${id}.${signature}`,
    url: baseUrl,
    httpOnly: true,
    sameSite: "Lax",
  }]);
  return id;
}

async function verifyNoHorizontalOverflow(page: Page): Promise<void> {
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport + 1);
}

test.beforeEach(async () => resetRedis());

test("landing loads with the required copy and no reveal", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response?.headers()["content-security-policy"]).toContain("'nonce-");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["permissions-policy"]).toContain("camera=()");
  await expect(page).toHaveTitle("CICADA · FISAT");
  await expect(page.getByRole("heading", { name: "SOMETHING IS STIRRING" })).toBeVisible();
  await expect(page.getByText("BENEATH FISAT")).toBeVisible();
  await expect(page.getByText("A puzzle hunt. Keep your answers.")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("link", { name: /enter your answers/i }).first()).toHaveAttribute("href", "/enter");
  const source = await page.content();
  expect(source).not.toContain("µLearn");
  expect(source).not.toContain("Cybersecurity IG");
  expect(source).not.toContain("FANDOM ZONE");
});

test("wrong stage values are rejected and kept in the form", async ({ page }) => {
  await page.goto("/enter");
  const wrong = `wrong-${randomBytes(8).toString("hex")}`;
  await page.getByLabel("Stage 1").fill(wrong);
  await page.getByLabel("Stage 2").fill(stageAnswers[1]);
  await page.getByLabel("Stage 3").fill(stageAnswers[2]);
  await page.getByLabel("Your name").fill(defaultPlayer.name);
  await page.getByLabel("Email address").fill(defaultPlayer.email);
  await page.getByRole("button", { name: /verify/i }).click();
  await expect(page).toHaveURL(/status=wrong/u);
  await expect(page.getByText("One or more answers are not correct.")).toBeVisible();
  await expect(page.getByLabel("Stage 1")).toHaveValue(wrong);
  await expect(page.getByLabel("Stage 2")).toHaveValue(stageAnswers[1]);
});

test("correct stage values unlock the challenge", async ({ page }) => {
  await submitStages(page);
  await expect(page.getByRole("heading", { name: "The field is open." })).toBeVisible();
  const cookie = (await page.context().cookies()).find((item) => item.name === "cicada_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(cookie?.secure).toBe(false);
  expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{40,50}\.[A-Za-z0-9_-]{40,50}$/u);
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
  expect(cookie!.expires).toBeLessThanOrEqual(Date.now() / 1000 + 2 * 60 * 60 + 5);
});

test("the challenge redirects unverified visitors", async ({ page }) => {
  await page.goto("/ctf");
  await expect(page).toHaveURL(/\/enter$/u);
});

test("riddle rejects a wrong value and accepts the environment value", async ({ page }) => {
  await submitStages(page);
  await submitRiddle(page, `wrong-${randomBytes(8).toString("hex")}`);
  await expect(page).toHaveURL(/status=riddle-wrong/u);
  await expect(page.getByText("That does not open the next door.")).toBeVisible();
  await submitRiddle(page);
  await expect(page.getByRole("heading", { name: "One record is missing." })).toBeVisible();
});

test("the riddle accepts answers separated by spaces and hyphens", async ({ page }) => {
  await submitStages(page);
  await submitRiddle(page, withSeparator(riddleAnswer, " "));
  await expect(page.getByRole("heading", { name: "One record is missing." })).toBeVisible();
  await resetRedis();
  await page.context().clearCookies();
  await submitStages(page);
  await submitRiddle(page, withSeparator(riddleAnswer.toLowerCase(), "-"));
  await expect(page.getByRole("heading", { name: "One record is missing." })).toBeVisible();
});

test("hint one is visible and hint three unlocks after three hours", async ({ page }) => {
  await submitStages(page);
  await expect(page.getByText("This hunt is a pre-event.")).toBeVisible();
  await page.getByRole("button", { name: "REQUEST ANOTHER SIGNAL" }).click();
  await expect(page.getByText(/^Hint 2 unlocks in 3h/u)).toBeVisible();

  const lockedResponse = await page.request.get("/api/ctf/hint?n=3");
  const locked = await lockedResponse.json() as { hint?: string; message?: string };
  expect(locked.hint).toBeUndefined();
  expect(locked.message).toMatch(/^Hint 2 unlocks in 3h/u);

  const cookie = (await page.context().cookies()).find((item) => item.name === "cicada_session");
  expect(cookie).toBeTruthy();
  const id = cookie!.value.slice(0, cookie!.value.lastIndexOf("."));
  const ttl = await (await fetch(`${redisStubUrl}/__ttl?key=session%3A${id}`)).json() as { result: number };
  expect(ttl.result).toBeGreaterThan(3 * 60 * 60);
  await fetch(`${redisStubUrl}/__mutate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: `session:${id}`, riddleOpenedAt: Date.now() - 3 * 60 * 60 * 1000 - 1 }),
  });
  const unlockedResponse = await page.request.get("/api/ctf/hint?n=3");
  const unlocked = await unlockedResponse.json() as { hint?: string; message?: string };
  expect(unlocked.hint).toBe("Fans gather in one place. Write that place's name in capitals, with no spaces.");
  expect(unlocked.message).toBeUndefined();
  await page.getByRole("button", { name: "REQUEST ANOTHER SIGNAL" }).click();
  await expect(page.getByText(unlocked.hint!)).toBeVisible();
});

test("note 03 is unavailable before riddle verification and returns only the flag note after", async ({ page }) => {
  await submitStages(page);
  const publicNote = await page.request.get("/api/notes/01");
  expect(publicNote.status()).toBe(200);
  expect((await publicNote.json() as { id: string }).id).toBe("01");
  const blocked = await page.request.get("/api/notes/03");
  expect(blocked.status()).toBe(404);
  expect((await page.request.get("/api/notes/7")).status()).toBe(404);
  expect((await page.request.get("/api/ctf/notes?id=7")).status()).toBe(404);
  await submitRiddle(page);
  const opened = await page.request.get("/api/notes/03");
  expect(opened.status()).toBe(200);
  const payload = await opened.json() as { id: string; note: string; flag: string };
  expect(payload.id).toBe("03");
  expect(payload.flag).toBe(flagValue);
  expect(Object.keys(payload).sort()).toEqual(["flag", "id", "note"]);
  await page.goto("/ctf?id=03");
  await expect(page.locator(".flag-value")).toHaveText(flagValue);
  await page.getByText("Need a beginner hint?").click();
  await expect(page.getByText("Open your browser's Developer Tools and select Network. Find the /api/notes/... request made when a listed note loads. Can you request a note number that is not listed?")).toBeVisible();
  await expect(page.getByText("Still stuck? Watch the CICADA Instagram page for an extra hint in its Story.")).toBeVisible();
});

test("flag rejects a wrong value and a correct flag reveals the winner page", async ({ page }) => {
  await solveThroughRiddle(page);
  await submitFlag(page, `wrong-${randomBytes(8).toString("hex")}`);
  await expect(page).toHaveURL(/status=flag-wrong/u);
  await submitFlag(page);
  await expect(page).toHaveURL(/\/reward$/u);
  await expect(page.getByRole("heading", { name: "CONGRATULATIONS." })).toBeVisible();
  const code = await page.locator(".winner-code").innerText();
  expect(code).toMatch(/^CICADA-(?:[0-9A-F]{4}-){5}[0-9A-F]{4}$/u);
  const storedWinner = await (await fetch(`${redisStubUrl}/__inspect?key=winner%3A01`)).json() as { result: { name: string; email: string; couponCode: string; winnerIndex: string } };
  expect(storedWinner.result).toEqual({ name: defaultPlayer.name, email: defaultPlayer.email, couponCode: code, winnerIndex: "01" });
});

test("wrong stage submissions lock the session after five attempts", async ({ page }) => {
  await page.goto("/enter");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel("Stage 1").fill(`wrong-${randomBytes(6).toString("hex")}`);
    await page.getByLabel("Stage 2").fill(stageAnswers[1]);
    await page.getByLabel("Stage 3").fill(stageAnswers[2]);
    await page.getByLabel("Your name").fill(defaultPlayer.name);
    await page.getByLabel("Email address").fill(defaultPlayer.email);
    await page.getByRole("button", { name: /verify/i }).click();
    if (attempt < 4) await expect(page).toHaveURL(/status=wrong/u);
  }
  await expect(page).toHaveURL(/status=locked/u);
  await expect(page.getByText("Please try again in 10 minutes.")).toBeVisible();
});

test("flag attempts are limited to ten per session in ten minutes", async ({ page }) => {
  await solveThroughRiddle(page);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.request.post("/api/ctf/flag", { form: { answer: `wrong-${randomBytes(6).toString("hex")}` } });
  }
  await page.request.post("/api/ctf/flag", { form: { answer: `wrong-${randomBytes(6).toString("hex")}` } });
  const locked = await page.goto("/ctf?status=locked");
  expect(locked?.status()).toBe(200);
  await expect(page.getByText("Please try again in 10 minutes.")).toBeVisible();
});

test("the 16th successful CTF completion is closed and cannot receive a code", async ({ browser }) => {
  test.setTimeout(180_000);
  const winnerCodes = new Set<string>();
  for (let index = 1; index <= 16; index += 1) {
    const page = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${index}` } });
    await solveThroughRiddle(page, riddleAnswer, { name: `Test Player ${index}`, email: `player-${index}@example.invalid` });
    await submitFlag(page);
    if (index <= 15) {
      await expect(page).toHaveURL(/\/reward$/u);
      await expect(page.locator(".winner-code")).toBeVisible();
      const code = await page.locator(".winner-code").innerText();
      expect(code).toMatch(/^CICADA-(?:[0-9A-F]{4}-){5}[0-9A-F]{4}$/u);
      expect(winnerCodes.has(code)).toBe(false);
      winnerCodes.add(code);
    } else {
      await expect(page).toHaveURL(/\/closed$/u);
      await expect(page.getByText(/All 15 codes have been claimed/u)).toBeVisible();
      await expect(page.locator(".winner-code")).toHaveCount(0);
    }
    await page.context().close();
  }
  expect(winnerCodes.size).toBe(15);
});

test("reward is blocked for non-winners and repeated claims do not increment the counter", async ({ page }) => {
  await page.goto("/reward");
  await expect(page).toHaveURL(/\/closed$/u);

  await solveThroughRiddle(page);
  await submitFlag(page);
  await expect(page).toHaveURL(/\/reward$/u);
  const before = await (await fetch(`${redisStubUrl}/__inspect?key=winners%3Acount`)).json() as { result: number };
  expect(before.result).toBe(1);
  await page.request.post("/api/ctf/flag", { form: { answer: flagValue } });
  const after = await (await fetch(`${redisStubUrl}/__inspect?key=winners%3Acount`)).json() as { result: number };
  expect(after.result).toBe(1);
});

test("server-rendered pages and generated client assets contain no configured answer or flag values", async ({ page }) => {
  const staticRoot = join(process.cwd(), ".next", "static");
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) visit(path);
      else files.push(path);
    }
  };
  visit(staticRoot);
  const staticBundle = files.map((path) => readFileSync(path).toString("utf8")).join("\n");
  for (const value of [...stageAnswers, riddleAnswer, flagValue]) expect(staticBundle).not.toContain(value);

  for (const route of ["/", "/enter", "/closed", "/404", "/500", "/not-a-real-page"]) {
    await page.goto(route);
    const markup = await page.content();
    for (const value of [...stageAnswers, riddleAnswer, flagValue]) expect(markup).not.toContain(value);
  }
  await seedSession(page.context(), { riddleSolved: false });
  await page.goto("/ctf");
  const riddleMarkup = await page.content();
  for (const value of [...stageAnswers, riddleAnswer, flagValue]) expect(riddleMarkup).not.toContain(value);
  await seedSession(page.context(), { ctfCompleted: true, winnerIndex: 1, winnerCode: "CICADA-ABCD-ABCD-ABCD-ABCD-ABCD", riddleSolved: true });
  await page.goto("/reward");
  const rewardMarkup = await page.content();
  for (const value of [...stageAnswers, riddleAnswer, flagValue]) expect(rewardMarkup).not.toContain(value);
});

test("mobile layout has no horizontal overflow on all pages at 360px", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 });
  for (const route of ["/", "/enter", "/closed", "/404", "/500", "/not-a-real-page"]) {
    await page.goto(route);
    await verifyNoHorizontalOverflow(page);
  }

  await seedSession(page.context(), { riddleSolved: false });
  await page.goto("/ctf");
  await verifyNoHorizontalOverflow(page);

  await seedSession(page.context(), { ctfCompleted: true, winnerIndex: 1, winnerCode: "CICADA-ABCD-ABCD-ABCD-ABCD-ABCD", riddleSolved: true });
  await page.goto("/reward");
  await verifyNoHorizontalOverflow(page);
  await page.close();
});

test("responsive layout has no horizontal overflow at 390, 768, 1024, and 1440px", async ({ browser }) => {
  const page = await browser.newPage();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/enter", "/closed", "/404", "/500", "/not-a-real-page"]) {
      await page.goto(route);
      await verifyNoHorizontalOverflow(page);
    }
    await seedSession(page.context(), { riddleSolved: false });
    await page.goto("/ctf");
    await verifyNoHorizontalOverflow(page);
    await seedSession(page.context(), { ctfCompleted: true, winnerIndex: 1, winnerCode: "CICADA-ABCD-ABCD-ABCD-ABCD-ABCD", riddleSolved: true });
    await page.goto("/reward");
    await verifyNoHorizontalOverflow(page);
  }
  await page.close();
});
