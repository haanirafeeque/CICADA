# CICADA Website Implementation Requirements

This is a sanitized copy of the implementation brief. It intentionally omits all answer values and secrets. Read it together with `MEMORY.md` before continuing work.

## Product and stack

Build a complete, production-ready puzzle-hunt pre-event site called CICADA for FANDOM ZONE. Deploy target: Vercel. Use the latest stable Next.js App Router with TypeScript, plain CSS in `app/globals.css`, Route Handlers under `app/api/*`, Upstash Redis via `@upstash/redis`, and Zod validation. Use npm and commit `package-lock.json`. Do not use another database, analytics, third-party scripts, UI libraries, Tailwind, service workers, localStorage, or sessionStorage.

## Machine setup

Target Windows, macOS, or Linux with its native package manager. Required checks already completed for this workspace are recorded in `MEMORY.md`. If continuing on another machine, install Node.js LTS 20+, Git, Vercel CLI, and Playwright Chromium; record versions in `MEMORY.md`. Do not set a global Git author. Do not log into or link Vercel on the user's behalf. Create `.env.local` from `.env.example` locally and have the team supply Upstash credentials. The original setup intent was to scaffold a `cicada` Next.js App Router app, install runtime dependencies `@upstash/redis` and `zod`, install dev dependencies `@playwright/test`, `tsx`, and `vitest`, pin versions, and run an empty-project build before features; the existing scaffold/build are complete.

## Security requirements

1. Never place any answer, flag, hash of an answer, comparison value, or secret in client code, generated client assets, comments, HTML, JSON, or `NEXT_PUBLIC_` variables. All answer checks use server-only environment values.
2. Never send secrets to the browser through props, JSON, or RSC payloads.
3. Normalize submitted answers by trimming, uppercasing, and removing every space and hyphen. Compare equal-length buffers with `crypto.timingSafeEqual` for all stage answers, the riddle, and flag.
4. Use generic errors: never identify a wrong field, proximity, or remaining attempts beyond a neutral lockout notice.
5. Rate-limit every submission per IP and per session using Redis `INCR` and `EXPIRE`. Lock a session for ten minutes after five wrong stage submissions. Limit flag attempts to ten per ten minutes.
6. Store session state server-side in Redis under a cryptographically random ID. The cookie contains only that ID and an HMAC-SHA256 signature using `SESSION_SECRET`; set HttpOnly, Secure in production, SameSite=Lax, path `/`, and max-age two hours.
7. Generate each winner coupon using cryptographically secure random bytes. Store the generated code together with the winner name and normalized email in a Redis hash named `winner:01`, `winner:02`, and so on. Keep HMAC fingerprints of normalized name and email in Redis and atomically reject a claim if either belongs to an existing winner. `REFERRAL_SECRET` must remain stable throughout the event.
8. Set CSP (`default-src 'self'` with only Next-required script allowances), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy` disabling camera, microphone, and geolocation in `next.config.js`.
9. Disable production browser source maps.
10. Add a hidden honeypot to the answer form; silently reject if populated.
11. Validate all server inputs with Zod or equivalent; cap answer input length at 64 characters.
12. Missing required answer or secret values must fail closed. Log missing variable names only on the server; return a neutral “Not available right now” message.

## Environment configuration

Document these names in an empty-valued `.env.example` and README environment table. Never include actual values in source control or handoff files.

- `STAGE1_ANSWER`, `STAGE2_ANSWER`, `STAGE3_ANSWER`: stage answers. The team sets all values; do not hardcode any answer.
- `CTF_RIDDLE_ANSWER`: final riddle answer, supplied through the environment.
- `CTF_FLAG`: team-supplied flag in the required flag format.
- `SESSION_SECRET`, `REFERRAL_SECRET`: random secrets at least 32 characters. `REFERRAL_SECRET` must remain stable throughout the event. Never save secrets in the repository.
- `WINNER_LIMIT`: default 15.
- `CONTACT_NUMBER`: contact number for the 50% refund process.
- `EVENT_NAME`: default FANDOM ZONE.
- `WORKSHOP_NAME`, `WORKSHOP_DATE`, `WORKSHOP_VENUE`: workshop details, placeholders until confirmed.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`: Upstash REST credentials.
- `LAUNCH_AT`: optional ISO timestamp; hide the countdown when empty.

## Routes and behavior

### `/` landing page

- Full-height black hero with white `/images/cicada-logo.png`, title “SOMETHING IS STIRRING”, subtitle “BENEATH FISAT”, and “A puzzle hunt. Keep your answers.”
- Optional `LAUNCH_AT` countdown.
- Guidelines contain exactly these four rules:
  1. One stage is released every day. There are 3 in total.
  2. Solve each stage and keep your answer. Nobody will ask for it until the end.
  3. No answers will be posted here. Do not ask for them.
  4. At the end, enter all three answers. Collect all three answers. Something awaits those who do.
- Button “ENTER YOUR ANSWERS” links to `/enter`.
- Do not mention the main event, µLearn, Cybersecurity IG, workshops, codes, or prizes on this page.
- Footer “CICADA · FISAT”.

### `/enter`

- Three stage inputs, required name (max 40 chars), required email address, and hidden honeypot.
- Submit label “VERIFY”. Use a progressive-enhancement server form so core flow works with JavaScript disabled.
- Submit to `/api/enter`. Apply rate/lockout logic and verify all stages only on the server.
- On wrong values, show “One or more answers are not correct.” and keep form values without identifying the failing field or adding hints.
- On success, save `stagesVerified`, name, and normalized email in the server session and redirect to `/ctf`.
- Never disclose answer lengths or field-specific clues.

### `/ctf`

- Redirect to `/enter` until session `stagesVerified` is true.
- On first verified visit set server-side `riddleOpenedAt`.
- Riddle text, verbatim: “This hunt was built to lead you to something bigger. Its main event is named after a place where fans gather. Write the name of that place in capital letters, with no spaces.” Store only public text in `lib/content.ts`.
- Post to `/api/ctf/riddle`; compare against `CTF_RIDDLE_ANSWER`; success sets `riddleSolved`.
- Hint 1, always visible: “This hunt is a pre-event. The main event is the next big gathering on campus, and it has a name that every fan knows.”
- Hint 3, locked until three hours after the first verified `/ctf` visit: “Fans gather in one place. Write that place's name in capitals, with no spaces.”
- Put both hints in `lib/content.ts`. `GET /api/ctf/hint?n=3` must return only remaining-time text until unlock; after unlock return hint 3. Do not create a hint 2.
- After the riddle is solved show a Notes panel with public notes 01 and 02. Note 02 includes “Not every note is listed here.” Fetch notes via `GET /api/notes/{id}`.
- Paths `/api/notes/01` and `/api/notes/02` return public text. `/api/notes/03` is the intentional IDOR challenge: return only the flag note if `riddleSolved`; otherwise 404. Every other path ID returns 404. Isolate the vulnerability so it reveals no other data, environment values, or sessions.
- Give CTF beginners an optional progressive hint near the Notes panel. Tell players to watch the CICADA Instagram Story for an additional hint when posted.
- Flag form posts to `/api/ctf/flag`; check `CTF_FLAG` server-side with normalization and timing-safe compare; rate-limit it.

### Winner handling

- On flag success, atomically reject names or emails already used by a winner; otherwise use Redis `INCR winners:count` as the winner index and store the winner hash.
- If index <= configured limit: save winner index and `ctfCompleted=true`, redirect `/reward`.
- If index exceeds limit: do not decrement; set `ctfCompleted=true` without winner index, redirect `/closed`.
- Use `SET session:{id}:completed 1 NX` to prevent a second claim. A repeated flag submission must not mint another index or code.

### `/reward`

- Server guard requires completed CTF and winner index within limit; otherwise redirect `/closed`.
- Show “CONGRATULATIONS.” and “This was a pre-event of FANDOM ZONE, conducted by the Cybersecurity IG.”
- Show the generated code large with a copy button and no localStorage.
- Show workshop name/date/venue and “Conducted by µLearn as part of FANDOM ZONE.”
- Show “Already registered for FANDOM ZONE? Contact {CONTACT_NUMBER} to get your 50% back.” with a `tel:` link.
- Logo row uses `/images/mulearn-logo.png` (required) and `/images/cybersig-logo.png` (optional only when present).

### `/closed`

- Used for completed non-winners and visitors without a valid winner on `/reward`.
- Show “THE DOOR IS CLOSED. All 15 codes have been claimed. Thank you for playing.” plus the same event reveal text. Never show a code.

### Error routes

- Provide custom 404 and 500 styling without stack traces.

## Design, accessibility, and metadata

- Sleek minimal dark design: black `#000`, text `#EDEDED`, muted `#8A8A8A`, one thin divider.
- Geometric sans for display/body; monospace for puzzle copy and labels. Use `next/font/google` if available without destabilizing builds; provide local system fallbacks.
- Subtle fade-in and faint noise texture. Disable all animation under `prefers-reduced-motion`.
- Center the CICADA mark, max width 220px mobile and 320px desktop.
- Outlined white buttons, filled on hover/focus, visible keyboard focus rings.
- Mobile first, touch targets >=44px, no hover-only interactions, use `dvh`/`min-height` for tall sections.
- Inputs use suitable `inputmode`, `autocomplete="off"`, and `autocapitalize="characters"` for answers.
- `next/image` with explicit sizes and descriptive alt text.
- Title and meta description: “CICADA · FISAT”.
- Supplied assets include `cicada-logo.png`, `og.png`, `favicon.ico`, and `apple-touch-icon.png`. Copy supplied assets into `public/` without replacing them. Team will supply required `mulearn-logo.png`; `cybersig-logo.png` and `fandom-zone-logo.png` are optional. Logos must be transparent PNGs, at least 400px wide. Do not add stage posters.
- Do not copy text, logos, or assets from reference sites. Match the supplied Instagram artwork loosely.

## Public content file

`lib/content.ts` contains only public text: landing copy, guidelines, riddle text, both hints, public notes 1 and 2, note 7 placeholder text (no flag value), and workshop placeholders. It must not contain answers, flags, or secrets.

## Testing and final checklist

Add Playwright tests for landing render; wrong/correct stage submissions (read values from environment); `/ctf` verification gate; wrong/right riddle including normalized variants; hint visibility, locked/unlocked using mocked time; notes IDOR 404 before riddle success and note after; wrong/right flag; rate limits; first 15 winners; 16th redirect; reward guard; repeated flag submission; mobile layouts at 360px for every page.

Before finishing, run lint, typecheck, build, and browser/security checks. Search `.next/static` for answer values and the flag with zero matches; ensure page source has no answers; ensure no secret uses a `NEXT_PUBLIC_` prefix; ensure ID 7 returns 404 before riddle verification. Check missing-env fail-closed behavior. Test responsive widths 360, 390, 768, 1024, 1440. Lighthouse mobile performance, accessibility, and best practices target 90+. Report checks in a concise checklist, calling out anything not verified.

## Deliverables

- Complete project tree.
- `README.md` with local setup, Vercel deployment, environment variable table, setting answers, printing winner codes, and closing after the winner limit.
- Empty-valued `.env.example`.
- A note explaining the intentional IDOR challenge only exposes the flag.
- `MEMORY.md` updated after scaffold, pages, APIs, tests, and deployment milestones. It must track status, decisions, variable names (never values), file structure, run/test steps, known issues, and exact next step.

## Hard prohibitions

- No hardcoded answer values or flags anywhere in the repository, including tests.
- No `localStorage` or `sessionStorage`.
- Never show a code to anyone who has not won.
- Do not reveal event/organization/workshop/prize material on the landing page or its guidelines.
- No analytics, trackers, or external scripts.
- Never write answer, flag, riddle-answer, secret, or environment values into docs, comments, memory, or commits.
