# Pandora Bingo — Claude Code Context

Multiplayer music bingo. Not part of the Coherence Suite's shared-stack
convention (SQLite/JWT_SECRET/etc.) despite being grouped with it in some
older handoff notes — see "Stack" below for what's actually true.

## Planned Rewrite — Public Release Track (as of July 2026)

Planning is underway for a rewrite targeting Apple App Store / Google Play,
with real user accounts and prize-backed contests. **This is planning, not
yet in progress** — treat the rest of this file as describing the current
v12.x app until the rewrite actually starts.

Decisions made so far:
- **Prizes: third-party gift cards, house-funded** (not entry-fee-funded).
  Dre funds the prize directly; a provider like Tremendous or Tango Card
  handles payout. No pooled entry fees, no money transmission, no consideration
  element — avoids the gambling-law complexity that a paid-entry cash pool
  would trigger. Note bingo outcomes involve genuine chance (unlike Agon's
  skill-based challenges), so paid-entry + cash payout should be treated as
  much riskier here than for Agon, and isn't currently planned.
- **Account system:** leaning toward a managed auth provider (Clerk/Auth0/
  Supabase), replacing the current name-based/localStorage identity. Not
  finalized.
- **Store shell:** React Native/Expo is the leading candidate, mirroring
  Agon's Phase 3 plan. Not finalized.

Known gaps to close before/during the rewrite:
- No database of any kind currently exists (confirmed — see Stack below);
  the rewrite (real accounts + prize records) will want a real one, likely
  Postgres per the same reasoning used for Agon
- No security audit on record for this app specifically

See `README_pandora-bingo.md` → "Planned Rewrite — Public Release Track" for
the full decision log and open questions.

## Location & Deployment
- Path: `~/projects/pandora-bingo`
- Own git repo, remote `origin` at `git@github.com:bradyjaysmith-dre/pandora-bingo.git`,
  kept in sync with `origin/main`
- Deployment: **Railway** (production, `https://pandora-bingo.up.railway.app`),
  auto-deploys on every push to `main`. Project name on Railway is
  `imaginative-kindness`, service `pandora-bingo` — there's a second,
  unrelated Railway project (`genuine-wonder`) that also happens to have a
  service named `pandora-bingo`; don't link to that one by mistake.
- Local dev **is** run via `start.sh` (`bash start.sh`, `start.sh stop`,
  `start.sh logs`) — the earlier note here saying otherwise was wrong.
  Backend on port 3009, Vite dev server on port 5174.
- Real-time layer: **Socket.io**
- Auth: **Spotify OAuth only** — no shared `JWT_SECRET` pattern (this app
  doesn't use the Coherence Suite's shared-auth convention)

## Stack — confirmed
- **Frontend:** React + Vite, inline styles, dark theme (navy/cyan/gold
  "retro TV" aesthetic) — same conventions as the Coherence Suite, but this
  app isn't actually one of those five.
- **Backend:** Node + Express + Socket.io, CommonJS.
- **Database: none.** Game state lives entirely in server memory (rooms are
  ephemeral, gone on process restart). The only persistent data is
  `leaderboard.json` and `feedback.json` — plain JSON files on disk, written
  via `server/dataDir.js`, which resolves to Railway's mounted volume
  (`/data`, via `RAILWAY_VOLUME_MOUNT_PATH`) in production or the server
  directory in local dev. **Not SQLite, not Postgres.** Earlier revisions of
  the README described a `server/stats-db.js` SQLite database that was
  planned but never built — don't trust that description if you see it
  anywhere; it's been corrected in the README as of 2026-09-22.
- A Railway volume must be mounted at `/data` for `leaderboard.json`/
  `feedback.json` to survive redeploys. This was **not** the case until
  2026-09-22 — those files had been silently writing to the ephemeral
  container filesystem and getting wiped on every deploy. Fixed; see the
  DEV_PLAN delivery log for that date.

## Known Issues / Open Items
- No dedicated security audit findings on record for this app (past audits
  focused on PTM, Lifestyle Design, and Assemble).
- Not wired into `~/stop-app.sh` — fine, it has its own `start.sh stop`.
- Beta-Readiness Sprint (`DEV_PLAN_pandora-bingo.md`) is the active work
  track as of September 2026 — read that file first, it's more current than
  this one for anything about what's shipped vs. what's still open,
  especially real-device testing status.
- An Android Chrome rendering bug was flagged 2026-09-21 (pick screen
  renders with an unexpectedly large blank area on at least one real
  device) — root cause not yet found, see DEV_PLAN Session 6.

## Suite-Wide Conventions (apply where relevant)
- Complete replacement files for complex components; targeted edits for simple changes
- Quick answers first, then caveats
- Honest pushback welcome — yield when directed to relent
- No TypeScript unless asked
- Dark theme on all apps
- `.gitignore` already covers `node_modules/`, `client/dist/`, `.env`,
  `leaderboard.json`, `feedback.json`, `song-cache.json`

## Suggested first Claude Code session task
Read `DEV_PLAN_pandora-bingo.md` in full before starting any work on the
Beta-Readiness Sprint — it has session-by-session scope, acceptance
criteria, and a delivery log that tracks what's actually been verified on a
real device vs. shipped-but-unverified. Don't assume something works on a
phone just because the code looks right; several bugs this sprint (button
rendering, the manual mark-as-played screen) only became apparent once
actually tested or traced through server logs.
