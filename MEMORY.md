# Project Memory

## Summary and status

CICADA is a dark, mobile-first FANDOM ZONE pre-event puzzle hunt built with Next.js App Router, TypeScript, plain CSS, and Upstash Redis. The site, server routes, session handling, rate limits, hint gate, intentionally limited IDOR challenge, and winner flow are implemented. Do not put answer values, flags, hashes of those values, or secret values in source, tests, docs, comments, memory, or commits.

The local project is implemented and verified. Production deployment is not configured. The team still needs to provide Upstash credentials, challenge values, workshop/contact details, the required µLearn logo, and Vercel project access. Do not log in or deploy on the user's behalf.

## Completed work

- [x] Installed Node.js 24.20.0, npm 11.19.0, Git 2.53.0, Vercel CLI 64.5.0, and Playwright Chromium on Windows.
- [x] Scaffolded the Next.js App Router app and installed dependencies with a pinned `package-lock.json`.
- [x] Implemented the landing page, answer entry, CTF, reward, closed, 404, and 500 pages.
- [x] Added server-only answer checks, signed HttpOnly sessions, Redis-backed state/rate limits, 3-hour hint gating, the note 7 challenge, and atomic winner allocation.
- [x] Added CSP/security headers, nonce-based script policy, reduced-motion styling, and responsive layouts.
- [x] Copied the supplied CICADA logo, social image, favicon, and Apple icon into `public/` without changing those files.
- [x] Added `.env.example`, README setup/deployment steps, staff code generator, sanitized `CODEX_MASTER_PROMPT.md`, and unit/browser tests.
- [x] Removed the scaffold's competing `app/favicon.ico` so the supplied `public/favicon.ico` is used.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test:unit`: 12 passed.
- `npm run test:e2e`: 16 passed, including stage and flag flows, hint timing, IDOR gating, 15-winner limit, answer/flag non-disclosure, and mobile/responsive overflow.
- `npm run build`: passed; routes compile as dynamic server output.
- `npm audit --omit=dev --audit-level=high`: 0 production dependency vulnerabilities.
- Full `npm audit --audit-level=high` reports 5 high findings through the development-only ESLint chain (`eslint-config-next` → `fast-glob` → `micromatch` → `braces@3.0.3`). npm's suggested `--force` fix downgrades the Next ESLint config to 14.x, so it was not applied.
- Production landing page visually checked at desktop size.

## Environment and setup

- OS: Windows 11.
- Node.js: v24.20.0 at `C:\Program Files\nodejs`; current Codex shell may need that path prepended because it inherited an older PATH.
- npm: 11.19.0.
- Git: 2.53.0.windows.3; global default branch is `main`. Do not set a global Git author.
- Vercel CLI: 64.5.0; not logged in or linked to a project.
- Next.js: 16.4.2; React: 19.3.0.
- Playwright Chromium browser build: v1248.
- For local use, run `npm ci`, copy `.env.example` to `.env.local`, fill team values and Upstash REST credentials, then run `npm run dev` and open `http://localhost:3000`.

## Environment variable names

`STAGE1_ANSWER`, `STAGE2_ANSWER`, `STAGE3_ANSWER`, `CTF_RIDDLE_ANSWER`, `CTF_FLAG`, `SESSION_SECRET`, `REFERRAL_SECRET`, `WINNER_LIMIT`, `CONTACT_NUMBER`, `EVENT_NAME`, `WORKSHOP_NAME`, `WORKSHOP_DATE`, `WORKSHOP_VENUE`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and optional `LAUNCH_AT`.

Never record any variable values here. All secrets and challenge values belong in local ignored `.env.local` or the appropriate Vercel server environment settings. `SESSION_SECRET` and `REFERRAL_SECRET` should be separate random values of at least 32 characters.

## Remaining team steps

- Add `public/images/mulearn-logo.png`; `public/images/cybersig-logo.png` is optional.
- Supply Upstash URL/token, all challenge values, contact number, and workshop name/date/venue.
- Add production values to Vercel, then connect the project and deploy with the team's account.
- Verify the configured production site before announcing it.

## Structure

- `app/`: pages, API routes, global CSS.
- `components/`: interactive and reusable UI.
- `lib/`: public copy and server-only security/session helpers.
- `scripts/`: local E2E runner and staff code utility.
- `tests/`: unit tests, Playwright coverage, and in-memory Redis stub.
- `public/`: supplied assets.
- `CODEX_MASTER_PROMPT.md`: sanitized implementation brief; no answer values or secrets.
