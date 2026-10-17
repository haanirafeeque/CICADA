# CICADA · FISAT

A dark, mobile-first puzzle hunt built with Next.js App Router, TypeScript, plain CSS, and Upstash Redis. Stage answers, the riddle answer, flag, session key, and referral key are read only on the server from environment variables.

## Local setup

1. Install Node.js LTS 20 or newer and npm.
2. Install dependencies with `npm ci`.
3. Copy `.env.example` to `.env.local` and fill in the team's values. Never commit `.env.local`.
4. Create an Upstash Redis database through the Vercel Marketplace or Upstash console, then set its REST URL and token in `.env.local`.
5. Start the site with `npm run dev` and open `http://localhost:3000`.

The site fails closed if answer values, secrets, or Redis credentials needed for a submission are missing. It logs missing variable names on the server and shows a neutral message to visitors.

## Environment variables

| Variable | Purpose | Required/default |
| --- | --- | --- |
| `STAGE1_ANSWER` | First stage answer, checked server-side | Required |
| `STAGE2_ANSWER` | Second stage answer, checked server-side | Required |
| `STAGE3_ANSWER` | Third stage answer, checked server-side | Required |
| `CTF_RIDDLE_ANSWER` | Final riddle answer, checked server-side | Required |
| `CTF_FLAG` | Web challenge flag, checked server-side | Required |
| `SESSION_SECRET` | HMAC-SHA256 key for signed session cookies; use a random value at least 32 characters long | Required |
| `REFERRAL_SECRET` | HMAC-SHA256 key for winner codes; use a separate random value at least 32 characters long | Required |
| `WINNER_LIMIT` | Maximum number of winner codes | Defaults to `15` |
| `CONTACT_NUMBER` | Contact number for the 50% refund process | Team supplied |
| `EVENT_NAME` | Main event display name | Defaults to `FANDOM ZONE` |
| `WORKSHOP_NAME` | Workshop title | Placeholder when empty |
| `WORKSHOP_DATE` | Workshop date | Placeholder when empty |
| `WORKSHOP_VENUE` | Workshop venue | Placeholder when empty |
| `KV_REST_API_URL` | Upstash Redis REST endpoint | Required |
| `KV_REST_API_TOKEN` | Upstash Redis REST token | Required |
| `LAUNCH_AT` | ISO timestamp for the optional landing countdown | Optional; empty hides it |

Keep every secret and answer out of `NEXT_PUBLIC_` variables. Supply production values through the Vercel project environment settings. The stage values and challenge values are intentionally not documented here.

## Vercel deployment

1. Create a Vercel project from this repository and link it locally with `vercel link` when ready.
2. Add an Upstash Redis database through the Vercel Marketplace integration.
3. Enter every required environment variable in the Vercel project settings for the intended environments.
4. Deploy with `vercel` or connect the Git repository for automatic deployments.
5. Do not configure answers or secrets as public variables. Confirm the production environment has Redis and all required server-only settings before opening the site.

The Vercel CLI is installed locally. Sign in and link the project yourself with `vercel login` and `vercel link`; this project does not log in or deploy on your behalf.

## Updating challenge values

Set all stage answers, the riddle answer, and the flag through `.env.local` for local development and the Vercel environment settings for deployment. Do not add them to source files, documentation, tests, commits, or public environment variables. Stage inputs are trimmed, uppercased, and normalized by removing spaces and hyphens before fixed-length timing-safe comparison.

## Winner codes and closing

With `REFERRAL_SECRET` configured, print the staff verification list with:

```powershell
npx tsx scripts/print-codes.ts
```

The script prints codes for indices 1 through 15. The first `WINNER_LIMIT` successful flag claims receive a code. Later successful completions go to `/closed`; the winner counter is intentionally not decremented. To close the site after all codes are claimed, set `WINNER_LIMIT` to the already claimed count (or temporarily set the environment unavailable) and redeploy. Existing completed sessions retain their server-side state.

## Tests and checks

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
```

The end-to-end suite runs against an in-memory Redis protocol stub and uses generated test-only environment values. It does not include production answers or flags. For a real Vercel verification run, configure the team's actual values and use the deployment checklist in `CODEX_MASTER_PROMPT.md`.

## Challenge note

The `/api/ctf/notes?id=7` IDOR is intentionally vulnerable as part of the web challenge. It only returns the flag note after the current session has solved the riddle; it cannot read other sessions or environment values. Notes 1 and 2 are public. Other IDs return 404.

## Assets

The CICADA mark, social preview, favicon, and Apple touch icon are supplied in `public/`. The µLearn logo should be added to `public/images/mulearn-logo.png`; the Cybersecurity IG and FANDOM ZONE logos are optional assets. The reward page displays a text wordmark fallback until the required µLearn image is supplied.
