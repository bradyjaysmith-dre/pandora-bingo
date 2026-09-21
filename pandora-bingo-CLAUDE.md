# Pandora Bingo — Claude Code Context

Multiplayer music bingo. Listed as part of the Coherence Suite, but deployed
and running differently from the other four apps — treat the shared-stack
notes below as a starting assumption to verify, not a confirmed fact.

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

Known gaps to close before/during the rewrite (unconfirmed, not yet audited):
- Git repo status was unconfirmed as of the July 2026 `~/projects/` move
- Actual prod database (SQLite vs. Railway-managed Postgres) unverified
- Auth mechanism in prod (shared `JWT_SECRET` vs. Spotify OAuth tokens vs. both) unverified
- No security audit on record for this app specifically

See `README_pandora-bingo.md` → "Planned Rewrite — Public Release Track" for
the full decision log and open questions.

## Location & Deployment
- Path: `~/projects/pandora-bingo` (moved from `~/pandora-bingo` in the July
  2026 folder migration)
- Deployment: **Railway** (production) — not run locally via
  `start.sh`/`stop-app.sh` the way PTM/GoalKeeper/Manifest/Assemble are.
- Real-time layer: **Socket.io**
- Auth: **Spotify OAuth**

## Stack — unverified specifics
The Coherence Suite's general stack (React + Vite, Node + Express, SQLite,
JWT, inline styles, dark theme) is listed as applying suite-wide, but the
handoff notes don't confirm the details for Pandora Bingo specifically —
worth a quick look at `package.json` / `server/` before assuming it matches
the other four exactly. In particular:
- Confirm whether it's using the shared `JWT_SECRET` pattern or Spotify OAuth
  session tokens exclusively (or both).
- Confirm SQLite vs. anything Railway-managed (e.g. Postgres add-on) — the
  suite convention is SQLite-over-Postgres always, but Railway deployments
  sometimes default to a managed Postgres instance, which would be a
  deviation worth knowing about upfront.

## Known Issues / Open Items
- No git repo confirmed for this project as of the July 2026 reorganization
  — moved into `~/projects/` but not otherwise touched. Worth setting one up
  if version history matters going forward, especially since it's a
  production deployment.
- No dedicated security audit findings on record for this app (past audits
  focused on PTM, Lifestyle Design, and Assemble).
- Not wired into `~/stop-app.sh` (expected, since it's Railway-hosted, not a
  local start/stop target).

## Suite-Wide Conventions (apply where relevant)
- Complete replacement files for complex components; targeted edits for simple changes
- Quick answers first, then caveats
- Honest pushback welcome — yield when directed to relent
- No TypeScript unless asked
- Dark theme on all apps
- Standard `.gitignore` if/when a repo is initialized:
  `node_modules/`, `certs/`, `*.pem`, `*.key`, `.env`, `*.db`, `*.db-journal`, `dist/`, `.DS_Store`

## Suggested first Claude Code session task
Before doing any feature work here, have Claude Code do a quick inventory
pass (`package.json`, `server/`, deployment config) to fill in the gaps
above — this file is thinner than the other four because the handoff docs
simply have less detail on Pandora Bingo's internals.
