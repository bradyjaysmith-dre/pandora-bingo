# Pandora Bingo

> **v12.2.0** — Beta-Readiness Sprint, Sessions 1–6: mobile button/safe-area fixes; explicit Leave Room controls with proper server-side room cleanup; crash logging on every socket handler; "picks are predictions, not playlist inputs" copy + host-facing Selection Summary panel; playlist-prompt generator (paste into Spotify/Apple Music's AI playlist tools) built on the Selection Summary; trimmed host setup form (collapsed DJ Battle advanced fields) + player-facing mode descriptions in the Lobby; in-app "report a bug" feedback mechanism with an admin-gated viewing endpoint; fixed a live data-loss bug (leaderboard was being wiped on every Railway redeploy — now on the persistent volume); fixed the manual "mark as played" screen, which had been completely non-functional since song mode was retired; playlist name is now optional in Standard mode. ⚠️ Code shipped and live on Railway; on-device testing (PWA install checklist, cross-browser pass, an Android Chrome rendering issue, the "How to Play" video) is still pending — see `DEV_PLAN_pandora-bingo.md` for the session-by-session detail and current testing status.
> **v12.1.0** — PWA support: installable on iOS/Android home screen, standalone display (no browser chrome); hand-rolled manifest + service worker (not vite-plugin-pwa — hit a workbox-build build bug on Railway); Wake Lock keeps host screen on during mic detection; background-reminder notification alerts host when mic detection pauses on tab backgrounding. ⚠️ Needs on-device testing before considered done — see PWA section below.
> **v12.0.0** — Song mode retired (artist-only); genre picker replaced by playlist name field; AI/iTunes pool → static shuffled Top 200 pool; DJ Battle separate host target + penalty mode; Spotify whitelist detection with auto-fallback to mic; default source mic; 60-min default time. ✅
> **v11.0.0** — DJ Battle game mode: host vs. players, playlist declaration, artist picks, host scores unguessed artists, 40-min default. ✅
> **v10.6.0** — AudD fully operational: 15s interval, 60s post-match cooldown, per-game + cumulative stats panel, Spotify polling leak fixed, Railway build fix. ✅
> **v10.5.0** — AudD mic detection working: iTunes pick search, EndScreen source fix, 6s clip / retry-on-null. ✅
> **v10.4.0** — AudD audio fingerprinting source, conditional Spotify visibility, `/api/config` endpoint. ✅
> **v10.3.0** — Mobile reconnect fix, back button interception with in-game leave modal, artist mode default. ✅
> **v10.2.0** — Railway deployment: always-on hosting, no sleep timeouts, public URL on Railway infrastructure. ✅
> **v10.1.0** — iOS Spotify fix: manual song fallback in host tab, auto token refresh, relax isPlaying gate. ✅
> **v10.0.0** — Solo mode, dynamic song pools (Last.fm), leaderboard, host force-start from waiting screen. ✅

A real-time multiplayer music prediction game. Pick songs or artists you think will play — first to match wins. Designed to run on phones and any modern browser — no app install required.

## 🔥 Active Sprint — Beta-Readiness (Target: Public Beta by December 2026)

**Status:** Sessions 1–6 are all code-complete and live on Railway. This is a separate, near-term track from the Planned Rewrite below — it's about widening testing on the *current* Railway-hosted PWA (no app store, no real accounts, no prize infrastructure), not the store-ready rewrite. The December beta target does not depend on any decision in the Planned Rewrite section.

Full session-by-session task breakdown, acceptance criteria, and delivery log live in **`DEV_PLAN_pandora-bingo.md`** — read that file first at the start of any Claude Code session on this track. It also tracks exactly what has and hasn't been confirmed on real devices — the code being shipped doesn't mean every acceptance criterion has been device-verified yet.

### What shipped (Sessions 1–6)

1. **Mobile navigation & button rendering** — fixed the "Join Room" disabled-appearance bug (missing `-webkit-appearance` reset), safe-area-inset padding on fixed/bottom CTAs, a shared `PickFooter` so the host's force-start banner can never overlap the Confirm button again
2. **Room lifecycle & leave/recovery** — explicit "Leave Room" control on every in-room screen, with real server-side cleanup (a departed player no longer silently blocks pick-phase completion for the table); host leaving now properly ends the game instead of abandoning a live room; stale/dead room codes are detected and the session is cleared instead of retrying forever; every socket handler now catches and logs errors instead of the whole process crashing silently
3. **Playlist mental model** — explicit "predictions only, doesn't control what plays" copy on every pick screen and in-game; a host-facing Selection Summary tab aggregating what everyone picked
4. **Player-influenced playlist mode (MVP)** — the Selection Summary tab generates a copy-paste prompt for Spotify/Apple Music's own AI playlist tools; no new external API integration
5. **Setup flow & onboarding** — DJ Battle's secondary tuning fields are now collapsed behind an "Advanced" toggle; players see the same one-line mode description the host does, now surfaced in the Lobby too (not just during host setup)
6. **Beta readiness pass** — in-app "🐛 Report a bug" feedback mechanism (reachable from every screen, admin-gated viewing endpoint); found and fixed a live data-loss bug where `leaderboard.json` was being wiped on every Railway redeploy instead of living on the persistent volume

### Known open items (see `DEV_PLAN_pandora-bingo.md` for detail)

- PWA on-device testing checklist not yet run (Android install flow, iOS Add to Home Screen, standalone launch, Wake Lock, background reminder)
- Cross-browser pass targeting the Session 1 button/safe-area bug class
- An Android Chrome rendering issue (pick screen renders with a large blank gap on at least one real device) — flagged, root cause unconfirmed
- "How to Play" explainer video/GIF — blocked on content, not code
- Original fire-pit playtest findings (mobile button rendering, room recovery, playlist mental model, onboarding) are the reason Sessions 1–5 exist and are addressed by the work above; see the delivery log in `DEV_PLAN_pandora-bingo.md` for what was actually verified on-device vs. shipped-but-unverified

---

## 🚧 Planned Rewrite — Public Release Track

**Status:** Planning phase (as of July 2026). The current v12.x codebase below is the family/friends version. A rewrite is planned to take Pandora Bingo to the Apple App Store and Google Play Store, with real user accounts and prize-backed contests. This section is the living decision log for that effort — update it as choices firm up, same pattern as the Agon project. Decoupled from the Beta-Readiness Sprint above.

### Rewrite goals
1. **App store readiness** — Apple App Store + Google Play. Current app is a PWA (v12.1); rewrite will need a native/hybrid shell (React Native/Expo is the leading candidate, matching the approach already planned for Agon Phase 3) and store-compliant policies (privacy policy, ToS, account deletion flow).
2. **Robust user-account system** — real accounts, not the current name-based/localStorage identity. Leading candidate: a managed auth provider (Clerk/Auth0/Supabase Auth) rather than hand-rolling — same reasoning as Agon: password hashing, MFA, session handling, and social login essentially for free, and expensive to retrofit later. Existing Spotify OAuth likely becomes a linked account/source rather than the primary identity.
3. **Prize-backed contests** — **decision made:** third-party gift cards, **house-funded** (Dre funds the prize, not pooled entry fees). This is the same safe lane Agon planned for its Phase 1 (a provider like Tremendous or Tango Card triggers the payout; the app never touches or custodies the prize value itself). House-funded (rather than entry-fee-funded) sidesteps the entry-fee/prize-pool legal complexity entirely — no money transmission, no "consideration" element, no need to build the harder skill-vs-chance defensibility case that a paid-entry cash pool would require.

    **Worth flagging:** unlike Agon (skill-based challenges), Pandora Bingo's outcomes involve genuine chance (which song plays, mic detection timing, etc.). That's fine for house-funded, no-entry-fee prizes — but it's a reason to stay away from paid entry + cash payout for this app specifically, even further into the roadmap than Agon might. If entry fees are ever considered later, that needs its own legal consult before any code gets written, same gating pattern as Agon §7.

### Known gaps to audit before/during rewrite
Carried over from the current handoff notes — none of these are confirmed, just flagged:
- **Git repo status** — confirmed active as of the Beta-Readiness Sprint: own repo at `github.com:bradyjaysmith-dre/pandora-bingo`, in sync with `origin/main`, Railway auto-deploys on push. (This item used to say "unconfirmed" — it's resolved; leaving the note only for the rewrite-specific questions below.)
- **Database in actual use** — confirmed: no SQL database of any kind is in use. Persistent app data (leaderboard, feedback reports) is plain JSON on Railway's mounted volume (see `server/dataDir.js`). A `STATS_DB_PATH` env var and SQLite/`better-sqlite3` stats database were documented in earlier revisions of this README but were never actually built — no `stats-db.js` exists anywhere in git history. The rewrite (real accounts + prize records) likely wants a real relational database (Postgres, per the same transactional-integrity reasoning used for Agon) regardless of what the current app uses.
- **Auth mechanism** — confirmed: Spotify OAuth session tokens only, no shared `JWT_SECRET` pattern (this app isn't part of the Coherence Suite's shared-auth convention despite being grouped with it in some older notes).
- **No security audit on record** for this app specifically (past audits covered PTM, Lifestyle Design, Assemble) — worth doing once real accounts and prize payouts are in scope, given store review and basic user-trust requirements.

### Open questions for the rewrite (to resolve before architecture decisions)
1. Keep Socket.io real-time layer as-is, or does a mobile shell change that (e.g. React Native's networking/background constraints)?
2. Does Spotify OAuth remain required, or does the rewrite lean harder on the AudD/mic-detection path (which is platform-agnostic) as primary, with Spotify as an optional enhancement?
3. Gift card provider choice — Tremendous vs. Tango Card vs. other; which has the smoother API/store-compliance story?
4. What triggers a gift-card prize — win a specific contest mode, leaderboard placement, some frequency/cooldown to control cost as a house-funded system? Needs a cost-control design, not just a mechanic.
5. Does the existing name-based leaderboard/stats system migrate to the new account system, or reset clean at launch?
6. Repo/versioning convention going forward — does this project adopt Agon's git-patch delivery workflow, or keep the current "full replacement files for complex components" habit?

---

## How to Play

1. Host creates a room, names their playlist, selects a game mode, and shares the room code
2. Players join via room code from any device
3. Everyone picks artists they predict will play — search by artist name or song title
4. Songs are detected automatically (Spotify or mic) or the host marks them manually
5. First player to match their target wins
6. If time runs out with a tie, a coin flip decides the winner

## Requirements

- Node.js v18+
- npm
- Spotify account + developer credentials (for Spotify source only)
- AudD API key (recommended — get one at audd.io; Indie plan $5/month for 1,000 requests; keyless mode has a very low daily limit)
- A Railway volume mounted at `/data` for persistent data (leaderboard, in-app feedback reports) — without it, that data is wiped on every redeploy. `RAILWAY_VOLUME_MOUNT_PATH` is set automatically by Railway once a volume is attached; nothing to configure by hand beyond attaching the volume in Railway's dashboard.

## Setup

### 1. Clone the repo

```bash
git clone git@github.com:bradyjaysmith-dre/pandora-bingo.git
cd pandora-bingo
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Environment variables

Create a file at `server/.env`:
```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3009/auth/spotify/callback
SPOTIFY_ENABLED=true
AUDD_API_KEY=your_audd_key
PORT=3009
FEEDBACK_ADMIN_KEY=some_random_string
```

- `SPOTIFY_ENABLED` — set to `false` to hide the Spotify source option from all users (useful when Spotify dev mode limits who can auth)
- `AUDD_API_KEY` — get a key at [audd.io](https://audd.io). Indie plan: $5/month for 1,000 requests. Keyless mode has a very low daily limit — not suitable for regular use
- Spotify credentials from [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- `FEEDBACK_ADMIN_KEY` — optional. Gates `GET /api/feedback` (view submitted in-app bug reports). Unset by default, in which case the route 404s. Set your own random string to enable it, then visit `/api/feedback?key=your_string` to view reports. **Set this directly in your deployment's env vars, not by asking an AI assistant to set it for you** — see the Design Decisions note below.

## Running the Game

### Local (home network / Tailscale)

```bash
bash start.sh
```

- Backend runs on port 3009
- Frontend runs on port 5174 (Vite dev server)
- Access from other devices via Tailscale: `http://100.70.143.100:5174/`
- `bash start.sh logs` tails the combined backend/frontend log (`/tmp/pandora.log`)
- `bash start.sh stop` stops both — also clears anything still bound to ports 3009/5174 as a safety net, so it's safe to run even after an unclean shutdown

Press Ctrl+C to stop both servers (or run `bash start.sh stop` from another terminal).

### Production / Railway (public URL)

```bash
npm run install:all   # first time only
npm run build         # builds React app into client/dist
npm start             # serves everything from port 3009
```

## Deployment

### Railway (live — primary deployment)

Live at:
```
https://pandora-bingo.up.railway.app
```

Environment variables set in Railway's Variables tab:
```
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI=https://pandora-bingo.up.railway.app/auth/spotify/callback
SPOTIFY_ENABLED=true
AUDD_API_KEY=your_audd_key
NODE_ENV=production
FEEDBACK_ADMIN_KEY=your_own_random_string   # optional — see Setup section above
```

A persistent volume must be mounted at `/data` (Railway sets `RAILWAY_VOLUME_MOUNT_PATH` automatically once attached) — this is what `leaderboard.json` and in-app feedback reports live on. Without it, that data is silently wiped on every redeploy.

#### Deploying updates

Railway auto-deploys on every push to `main`:

```bash
git add .
git commit -m "your message"
git push
```

#### Spotify host whitelist note

The Spotify app is in **Development mode**, limiting OAuth to whitelisted accounts only. If a non-whitelisted user attempts to connect Spotify, the app now detects the `access_denied` error from Spotify's OAuth callback, shows a clear explanation, and automatically falls back to mic detection. The Spotify source card is disabled for the remainder of that session. Set `SPOTIFY_ENABLED=false` in Railway Variables to hide the Spotify option entirely.

### Replit (archived)

Previously deployed on Replit. Railway replaced it due to sleep timeouts. See [REPLIT.md](./REPLIT.md) if needed — note its port references predate the 3002→3009 local dev port change and haven't been updated, since that deployment path is no longer used.

### How production mode works

`server/index.js` on start:
- Serves `client/dist` as static files from the same Express server
- Derives the Spotify OAuth redirect URI dynamically from the request host
- Sets CORS to same-origin (no separate frontend port in production)

Local dev is unchanged — `bash start.sh` runs Vite on 5174 with a proxy to 3009.

---

## Features

### Game Modes

**Standard** — Pick 5 artists you predict will play. First to match all 5 wins. Playlist name is optional in this mode — see Design Decisions.

**Newlywed Bingo** — A social prediction mode. Players try to win on their own picks while secretly sabotaging others by guessing which artists they chose.

**Gong Show Bingo** — A chaotic sabotage mode. Pick 10 artists to score points and 5 secret gong artists to cancel other players' points. Duplicate gongers cancel each other and both lose a point. Optional blind mode hides picks until each song plays.

**DJ Battle** — Host vs. players. The host plays their own playlist and declares its name and a hint. Players pick artists they think will appear in the playlist. Players score when they guess right; the host scores when nobody guessed the artist. The host and players race independent score targets. Optional penalty mode deducts points from the DJ when a player scores. Default time limit is 60 minutes. Secondary tuning fields (pick count, DJ score target, penalty settings) are collapsed behind an "Advanced" toggle in host setup — defaults work for most games.

Every mode's one-line description is shown to the host during setup **and** to players in the Lobby before the game starts (`client/src/gameModeInfo.js` is the shared source for this copy).

---

### DJ Battle Rules

The host declares their playlist name and an optional hint to players before picking begins. Players search the full catalog for artists — there is no genre pool restriction.

**Scoring:**
- A song plays → any player who picked that artist scores +1 (independently — duplicates both score)
- A song plays → nobody picked that artist → host scores +1
- **Penalty mode (optional)** — when any player scores, the host loses a configurable number of points (default 1.0, one decimal place). Enabled as a toggle at room creation.

**Win condition:** Host and players race independent targets. Host wins when reaching `djHostTarget` (default 10). Players win when reaching `matchTarget` (default 5). First to their own target wins. If time expires, scores are normalised to their respective targets and highest progress wins. Ties go to coin flip.

**Host win** means the playlist was too unpredictable — players collectively failed to block enough points. Player win means the crowd read the DJ correctly.

**Pick count** is configurable by the host (1–15 artists per player, default 5). DJ Battle is always artist mode — song mode is not applicable.

---

### Newlywed Bingo Rules

**Mains (5)** — Your primary picks. All 5 must play to win. Visible to other players.

**Backups (3)** — Insurance picks. Each one that plays clears one unit of backup debt imposed by opponents' successful guesses.

**Secret guesses (3)** — Hidden from all other players. Predict songs you think someone else picked. Revealed at end of game.

#### Penalty rule

When a guessed song plays and it was in another player's picks, that player gains one unit of backup debt — one more backup must play before they can win. Debt is capped at 3 (total backups available).

#### Wildcard rule

If 2 of your 3 secret guesses successfully hit, you earn a wildcard — a random unplayed song assigned as a bonus backup slot.

#### Win condition

Win when: main score ≥ match target AND backup debt fully cleared. On time expiry, highest effective score wins. Uncleared debt is factored into tiebreaking. Ties go to coin flip.

---

### Gong Show Bingo Rules

**Mains (10)** — Each one that plays earns +1 point.

**Gong songs (5)** — Secret. Cannot gong your own mains. When a gonged song plays:
- No gong → main pickers score normally
- Exactly one gong → gong fires, main pickers get no point, gonger credited
- Two or more gongs → gong cancels, main pickers score normally, every duplicate gonger loses 1 point

**Blind mode** — Host toggle, changeable mid-game. Picks reveal one at a time as songs play.

---

### Music Sources

The host selects a source when creating a room. **Mic detection is the default.**

**Auto-detect (mic)** — The host's browser captures short audio clips via microphone every 15 seconds and identifies the song via AudD audio fingerprinting. Works with any music app. Best results when the host device is near the speaker. No Spotify account required. Includes iTunes catalog search during the pick phase and a manual fallback grid. Multiple simultaneous games on different devices work independently with no interference.

**Spotify** — Server polls the host's Spotify account every 5 seconds. Fully automatic match detection. Requires Spotify OAuth and a whitelisted account (dev mode). Only shown when `SPOTIFY_ENABLED=true`. If the connecting account is not whitelisted, the app detects the OAuth error, shows a clear message, and automatically falls back to mic detection — the Spotify card is disabled for that session.

**Manual** — Host taps a predicted artist to mark it as played, in the Host Controls tab. Works with any music source.

#### Manual "mark as played" grid

All three music sources have a manual click-to-mark UI: Manual mode's primary screen, and a "didn't detect it" fallback under both Spotify and AudD. All three list **every artist any confirmed player predicted** (deduplicated, alphabetical) — tapping one records it as played and scores it for anyone who picked it, same as an auto-detected match. This replaced a static song-title pool that had been silently empty (and therefore non-functional) since song mode was retired — see Design Decisions.

#### AudD mic detection notes

- Requires browser microphone permission on the host device
- Play music through a speaker near the host device for best results
- Uses ambient audio constraints (`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false`) to prevent Android from rerouting audio to the phone speaker — Bluetooth speakers stay connected
- Captures a 6-second clip every 15 seconds; on a null result, one automatic retry fires after 3 seconds
- After a successful match, polling pauses for 60 seconds before resuming — conserves API calls since the same song is still playing
- AudD Indie plan: $5/month for 1,000 requests. At ~1–2 calls per song identified, this covers many game nights per month
- If detection misses a song, use the manual fallback grid in the Host (Mic) tab
- The audio input device selector allows choosing from available inputs (useful on desktop with multiple audio devices)
- An on-screen debug log (tap "Show debug log") shows blob size, AudD response, and errors in real time
- A stats panel (tap "Show stats") tracks API calls, matches, nulls, and retries per game and cumulatively across all sessions on that device — this is a **client-side, localStorage-only** panel, not backed by any server database (see Design Decisions — there is no server-side stats database in this app)

---

### Progressive Web App

Pandora Bingo is installable to the home screen on iOS and Android, launching full-screen with no browser chrome (`display: standalone`).

**Manifest & service worker are hand-rolled, not plugin-generated.** `vite-plugin-pwa` was tried first but hit a `workbox-build` dynamic-require bug specific to Railway's Nixpacks build container (built fine locally, failed on deploy). Replaced with:
- `client/public/manifest.webmanifest` — static file, copied to `dist/` root by Vite automatically, no plugin needed
- `client/public/sw.js` — minimal hand-written service worker: pass-through `fetch` handler (satisfies installability criteria without caching anything — this is live multiplayer state, not offline content), `notificationclick` handler to focus the app
- Registered manually in `client/src/main.jsx`

**Icons** are a placeholder set (`client/public/icons/`) in the app's existing navy/cyan/gold theme — swap for real branding anytime, same filenames/sizes (192, 512, maskable variants, apple-touch-icon).

**Installing:**
- **Android (Chrome)** — look for an install icon in the address bar, or ⋮ menu → "Install app". No automatic banner is guaranteed; depends on Chrome's engagement heuristics.
- **iOS (Safari)** — no automatic prompt exists on iOS at all. Manual only: Share icon → Add to Home Screen.

**Host mic-detection reminder** — while AudD mic detection is running, backgrounding the tab pauses detection (the OS suspends `getUserMedia` the moment the page loses foreground). The host can tap "🔔 Enable" in the Host (Mic) tab to get a system notification the instant they switch apps, reminding them to come back. This only covers the moment of backgrounding, not a recurring nag while genuinely away — a repeating reminder would need server-triggered Web Push (VAPID keys + subscription storage), which is a separate, heavier piece of work, not yet built.

**Wake Lock** — the host's screen is kept awake (`useWakeLock` hook) while mic detection is actively listening, reducing accidental backgrounding from screen auto-lock. Re-acquires automatically if the OS releases it (which happens whenever the tab goes hidden, wake lock or not).

**Known limitation — no true background mic capture.** A PWA cannot keep `getUserMedia` alive when backgrounded, on either iOS or Android — this is an OS-level restriction, not something fixable in this codebase. True background mic capture would require a native wrapper (Capacitor), with a foreground service on Android (straightforward) and a background `audio` mode entitlement on iOS (works, but draws App Store review scrutiny and shows a persistent recording indicator). Not planned unless App Store presence becomes a goal.

**⚠️ Testing checklist for this release (not yet verified on-device — tracked as Beta-Readiness Sprint Session 6):**
- [ ] Android Chrome: install prompt or menu option appears; installed app launches standalone (no address bar)
- [ ] iOS Safari: Add to Home Screen works manually; launches standalone
- [ ] DevTools → Application → Manifest shows no errors, all icons load
- [ ] Host (Mic) tab: tap "Enable" reminders, background the tab during an active AudD room, confirm notification fires
- [ ] Tapping the reminder notification returns focus to the app
- [ ] Screen stays awake on the host device while mic detection is listening

---

### Pick Modes

All game modes use **artist mode only**. Song mode has been retired. DJ Battle is always artist mode.

**Artist mode** — Players pick artists. A match occurs when any song by that artist is detected. Matched song titles are shown under the artist name. Matching is case-insensitive and handles featured artists.

### Pick Phase Search

- **Spotify rooms** — Live search against the full Spotify catalog (search-as-you-type, 300ms debounce). Picks carry Spotify artist IDs for reliable match detection.
- **AudD / Manual rooms** — Live search against the iTunes catalog. Players can search by artist name or song title — the song search returns the artist behind it. Same UX as Spotify search. Picks carry iTunes IDs.

### Artist Suggestion Pool

The pick screen shows 50 randomly selected artists from a static pool of ~200 broadly popular cross-genre artists, shuffled fresh each room. This gives players a starting point (hidden behind a "Show suggested artists" toggle, default off, so the screen doesn't open cluttered); the search is always available for anyone not in the pool. The playlist name is not currently used to shape this pool — see Design Decisions. Future: pool seeded from actual Spotify playlist tracks or internal game history.

### Win Conditions

- Matches/points to win: 1–10 (default 5); DJ Battle player target independent from DJ target
- DJ host target: 1–50 (default 10, separate from player target)
- Time limit: 5–60 minutes in 5-minute increments (default 60 for all modes)
- Game ends when a player or the host hits their target OR time runs out
- Tied scores at time expiry → coin flip; DJ Battle uses progress-normalised comparison

### Host Controls

**Manual mode:** tap a predicted artist to mark it played (see "Manual mark as played grid" above), view played list, +5 min, blind mode toggle (Gong Show), end game.

**Spotify mode:** now-playing track with album art, auto-detected list, collapsible manual fallback (predicted artists, same as Manual mode), +5 min, blind mode toggle, end game.

**AudD mode:** audio input selector, mic status (idle/listening/identifying/error), on-screen debug log, stats panel, auto-detected song log, collapsible manual fallback (predicted artists, same as Manual mode), +5 min, blind mode toggle, end game.

**Selection Summary ("Picks" tab, host-only)** — once the pick phase closes, shows every artist any player picked, ranked by how many players picked it, plus a generated prompt ("Create a playlist featuring: ..., plus similar-sounding artists") with a one-tap copy button for pasting into Spotify's or Apple Music's own AI playlist generation tools.

### Real-time Multiplayer

Built on Socket.io. All game events broadcast instantly — joins, picks confirmed, songs detected, scores, gong events, penalties, wildcards, game over.

Players join via 6-character room code from any device. Railway deployment is fully public — no Tailscale needed. Multiple simultaneous rooms run independently with no interference.

### Player Limit

2–10 players per room.

### Joining and Leaving

Players can join or leave at any time including during an active game. Late joiners go directly to the pick screen; the clock keeps running.

An explicit "✕ Leave" control is visible on every in-room screen. For a non-host player, leaving actually frees their slot server-side (they're removed from the room, not just disconnected) so they can't block the table from starting or finishing a round. For the host, leaving properly ends the game for everyone and tears down the room's server-side timers — it isn't left running for nobody.

Back button is also intercepted throughout the app. During an active game, back shows the same confirmation modal as the Leave button. Hosts get a stronger warning — leaving ends the game for all players.

Disconnected players (as opposed to an explicit Leave) have their slot and state preserved. They can rejoin at any time; the app auto-reconnects from localStorage. If a stored room code no longer exists on the server (e.g. it was cleaned up, or the process restarted), the client detects this, clears the dead session, and shows a clear message instead of retrying forever.

### In-App Feedback

A "🐛" button, visible on every screen (including Home), opens a short bug-report form. Submissions are stored with automatically attached context (room code, game mode, phase, host/player, user agent, URL) — the reporter doesn't have to describe their device or what screen they were on. No accounts, no auth on submission. Viewing reports (`GET /api/feedback`) is gated behind a `FEEDBACK_ADMIN_KEY` env var — see Setup/Deployment above.

### Play Again

Room stays open after a game ends with the same code. Host can change any settings (mode, genre, pick mode, time limit, source) before starting the next round. All current players carry over.

### Session Persistence

Player identity stored in localStorage. Survives tab close, browser restart, accidental navigation. On return, client emits a rejoin event and server restores the existing slot.

Socket.io connection drops (mobile browser suspension) are handled with infinite reconnection retries. On every reconnect, the client re-emits the rejoin event automatically.

---

## Spotify Integration

Host authenticates via Spotify OAuth before creating a room:
1. Host redirected to Spotify's authorization page
2. Server receives access token via callback
3. Token associated with the game room
4. Server polls now-playing endpoint every 5 seconds during gameplay
5. Matches triggered automatically when a picked song or artist is detected

Token auto-refreshes before expiry (1-hour lifetime). Redirect URI derived dynamically from request host — works on any deployment without code changes.

- **Local:** `http://127.0.0.1:3009/auth/spotify/callback`
- **Railway:** `https://pandora-bingo.up.railway.app/auth/spotify/callback`

Host setup state saved to sessionStorage before OAuth redirect and restored on return.

---

## Design Decisions

**Artist-only mode** — Song mode has been retired. All game modes use artist mode exclusively. `room.pickMode` is hardcoded to `'artists'` server-side. Song mode code is commented out for potential future re-enablement.

**Playlist name replaces genre, but doesn't shape the pool yet** — The genre picker has been retired. The host names their playlist instead, and it's displayed to players on the pick screen. `getDynamicPool()` (`server/dynamic-songs.js`) currently returns a shuffled static pool regardless of the playlist name — the name isn't functionally wired to pool generation yet, which is why it's now optional in Standard mode (Newlywed, Gong Show, and DJ Battle still require it since they surface it to players directly, independent of whether it shapes the pool). Worth remembering if pool generation is ever revisited — the requirement could be reinstated everywhere at that point.

**Static artist pool** — The pick screen suggestion pool is 50 randomly selected artists from a hardcoded list of ~200 broadly popular cross-genre artists, shuffled fresh per room. AI and iTunes pool generation were retired due to poor relevance. Future: pool seeded from actual Spotify playlist tracks or historical game data.

**No server-side stats database** — Earlier revisions of this README described a `server/stats-db.js` SQLite database (`better-sqlite3`, artist/song pick and match counts, `/api/stats/*` endpoints) and a `STATS_DB_PATH` env var. That was never actually built — there's no `stats-db.js` anywhere in this repo's git history. The only real "stats" feature is the client-side, localStorage-only AudD call-stats panel described under Music Sources. If a real server-side stats database is ever built, this is the section to update.

**Volume-aware persistent storage (`server/dataDir.js`)** — Resolves where JSON data files (`leaderboard.json`, `feedback.json`) actually live: `RAILWAY_VOLUME_MOUNT_PATH` (Railway's persistent volume, `/data`) when present, falling back to the server directory for local dev where no volume exists. Includes a one-time migration that copies any file found at the old ephemeral location the first time it runs against a volume. Added after discovering `leaderboard.json` had been writing to the container's ephemeral filesystem — wiped on every Railway redeploy — despite a volume already being provisioned.

**Crash-safe socket handlers (`wrapHandler` in `server/index.js`)** — every `socket.on(...)` handler is wrapped so a thrown error or rejected promise is logged with room context and reported to the client, instead of propagating and crashing the entire Node process (which previously took every active room down at once for every connected player, with no log trace explaining why). `process.on('uncaughtException'/'unhandledRejection')` is a last-resort net on top of that. Business-logic rejections (duplicate name, room not found, room full) are separately `console.warn`'d — those don't throw, so `wrapHandler` alone didn't cover them.

**Manual marking uses predicted artists, not a song pool** — `room.songPool` is permanently empty (song mode is retired), so the old manual "click to mark as played" UI silently rendered nothing, in all three music sources' manual-marking screens, since the pool it iterated was never populated. `ManualMarkGrid` (`client/src/components/GameScreen.jsx`) replaces all three with a list of every artist any confirmed player predicted, and `host:play_song` now actually passes the artist name through to `game.playSong` instead of dropping it.

**In-app feedback, admin-gated by a shared secret, not real auth** — this app has no auth system to hook a "report a bug" viewer into, so `GET /api/feedback` checks a query-param key against a `FEEDBACK_ADMIN_KEY` env var rather than building real authentication for one internal-facing endpoint. Unset by default (route 404s). Set it directly in your deployment's dashboard, not by having an AI coding assistant set it on your behalf — the value would end up in that assistant's session logs, which is a weaker guarantee than a secret that only ever lives in your host's own env var storage.

**Spotify whitelist detection** — The OAuth callback now checks for `?error=access_denied` from Spotify. When detected, the server redirects to the callback with a `not_whitelisted=1` flag instead of returning a 500. The client shows a clear error message, writes a session flag, downgrades `musicSource` to `audd`, and returns the user to the setup screen with Spotify disabled.

**Mic detection as default** — `musicSource` defaults to `'audd'` in HomeScreen. Players without whitelisted Spotify accounts can play immediately without any configuration.

**DJ Battle separate host target** — `room.djHostTarget` (default 10) is the DJ's independent win threshold, separate from `room.matchTarget` (players' target). Both sides race their own numbers. End-game tiebreaking normalises scores to their respective targets for fair comparison.

**DJ Battle penalty mode** — `room.djPenaltyEnabled` toggles a point deduction when any player scores. `room.djPenaltyAmount` (default 1.0, one decimal place) is subtracted from `room.hostScore` using floating-point-safe math. Emits `host_penalty` event so clients can toast the deduction.

**Spotify Jam sync** — When using Spotify, the host can paste a Spotify Group Session (Jam) link into the host tab. The link is stored on the room and broadcast via `game:updated`. Players see a "Join Jam ↗" banner above the tabs, which opens the Spotify app in sync.

**Ambient audio constraints** — `getUserMedia` is called with `echoCancellation`, `noiseSuppression`, and `autoGainControl` all set to `false`. This tells Android the mic session is ambient capture rather than a voice call, keeping Bluetooth audio routing in media mode and preventing speakers from switching to phone speaker.

**Spotify polling source-gated** — `startSpotifyPolling` checks `room.musicSource === 'spotify'` before starting and refuses to run in AudD or manual rooms. The Spotify token is only migrated to a room if that room uses Spotify. This prevents Spotify API calls from leaking into AudD sessions.

**On-screen debug log and stats panel** — The Host (Mic) tab includes a toggleable debug panel (blob size, AudD response, errors) and a stats panel (API calls, matches, nulls, retries — per game and cumulative). Stats persist in localStorage on the host device — not a server database (see "No server-side stats database" above).

**Server-side Spotify polling** — Keeps access token secure and ensures consistent detection across all player devices. Token auto-refreshes before expiry.

**iOS Spotify detection caveat** — Spotify Web API's currently-playing endpoint is unreliable on iPhone. Server relaxes `isPlaying` gate. Manual fallback available in host tab.

**ID-first match detection** — Spotify/iTunes picks carry track/artist IDs. Server matches by ID first, falls back to title/artist string comparison for static pool, manually-marked, or manual picks.

**SPOTIFY_ENABLED flag** — Controls whether the Spotify source option appears in the UI. Single env var; no per-user logic needed. Set to `false` to hide Spotify from all users when the dev-mode whitelist would block them.

**Coin flip tiebreaker** — Server randomly selects from tied players on time expiry.

**No database of any kind — in-memory game state, JSON files for persistence.** Game state (rooms, players, picks, scores) lives entirely in server memory — rooms are ephemeral and disappear if the process restarts. Persistent data that needs to survive a restart (leaderboard, in-app feedback reports) is plain JSON on disk via `server/dataDir.js`, not any SQL database. See "No server-side stats database" above for the one thing this README used to claim otherwise.

**Leaderboard is name-based** — Same name in a future game accumulates stats. No two players share a name in the same room. Password auth planned.

**Solo mode** — Host plays alone; waiting screen skipped. Server auto-starts countdown after host confirms picks.

**Back button interception** — History API `pushState` on every screen transition. `popstate` listener handles navigation internally. In-game: blocked with confirmation modal, same as the explicit Leave button.

**Mobile socket reconnection** — Infinite retry on drop. On every `connect` event, client re-emits `player:rejoin`.

**Newlywed guesses server-only** — Never broadcast to other clients. Hits computed server-side when a song plays.

**DJ Battle host auto-confirmed** — In DJ Battle the host doesn't submit picks. `host:start` immediately marks the host player as confirmed so the server's "all confirmed" check never waits on them. Only non-host players need to confirm before the game starts.

**DJ Battle host score is room-level state** — `room.hostScore` is a plain number on the room object, updated server-side in `playSongDJBattle`. It is included in every `game:updated` broadcast so all clients see the live DJ score without any special socket event.

**DJ Battle winner representation** — When the host wins mid-game or on time expiry, the winner object is set to `{ ...host, isHostWin: true }`. This lets the existing `game:over` / leaderboard / EndScreen machinery work without branching — clients check `winner.isHostWin` to customize the end-game display.

**DJ Battle pick count is configurable** — `djPickCount` (1–15, default 5) is set by the host at room creation and stored on the room. The pick screen reads `room.djPickCount` as its limit, so it adapts without any client-side hardcoding.

**Gong picks server-only** — Never sent to other clients. Clients receive only outcomes (`game:gong_events`) after the fact.

**Gong backfire is intentional** — Duplicate gonging is a risk, not a bug. Meta-strategy layer.

**Single-port production** — Express serves Vite-built frontend from `client/dist`. Socket.io and all API routes share the same origin.

**Vite in dependencies** — `vite` and `@vitejs/plugin-react` are in `dependencies` (not `devDependencies`) in `client/package.json`. Railway/Nixpacks sets `NODE_ENV=production` during build, which causes npm to skip devDependencies — moving them to dependencies ensures the build succeeds.

**Hand-rolled PWA manifest + service worker, not vite-plugin-pwa** — `vite-plugin-pwa` was tried first but its `generateSW` step hit `Error: Dynamic require of "workbox-build" is not supported` specifically in Railway's Nixpacks build container (built cleanly in local dev). Rather than chase a plugin/environment compatibility bug, the manifest and service worker are static hand-written files (`client/public/manifest.webmanifest`, `client/public/sw.js`), copied to `dist/` by Vite's normal `public/` handling with zero build-time dependency on workbox-build. This also fits the app better — a live multiplayer game has no real offline content worth precaching, so Workbox's generated caching strategies weren't buying much anyway.

**`start.sh`'s real-PID launch pattern** — both the backend and frontend are launched as `(cd DIR && exec CMD) &` rather than a plain `cmd &` (or, for the frontend, `npm run dev &`, which wraps the real vite process inside npm's own — `$!` captured npm's PID, not vite's, so `stop` didn't reliably take vite and its child processes down with it). `stop` also falls back to a port-scoped `fuser -k <port>/tcp` on both ports as a safety net. This is the same fix already applied to a couple of the other Coherence Suite apps' `start.sh` scripts, applied here after orphaned dev processes (some hours old) were found silently serving stale code to what looked like fresh test runs.

---

## Project Structure

```
pandora-bingo/
  server/
    index.js           Express + Socket.io entry; /api/config, /api/audd/identify,
                       /api/itunes/search, /api/spotify/search, /api/leaderboard,
                       /api/feedback (POST + admin-gated GET); serves client/dist in
                       prod; Spotify polling source-gated; DJ Battle host
                       auto-confirmed on start; Spotify OAuth whitelist error
                       detection + redirect; every socket handler wrapped for
                       crash-safe error logging (wrapHandler)
    game.js            Room state, player management, scoring; all game modes;
                       DJ Battle (playSongDJBattle, endGameDJBattle, djHostTarget,
                       djPenaltyEnabled, djPenaltyAmount, hostScore);
                       artist-only matching; removePlayer (explicit leave, distinct
                       from a dropped connection); song mode commented out
    dataDir.js         Resolves the persistent-data directory (Railway volume when
                       mounted, falls back to server/ for local dev); one-time
                       migration for data left at the old ephemeral location
    audd.js            AudD proxy — multipart POST to api.audd.io; API key server-side only
    dynamic-songs.js   Static ~200-artist pool shuffled to 50 per room; playlist name
                       accepted but not currently used to shape the pool (see Design
                       Decisions); Last.fm/AI pool generation retired
    songs.js           Static song/artist pools by genre (retained for reference; no longer
                       used for pool generation)
    leaderboard.js     Persistent player stats (JSON, volume-aware via dataDir.js);
                       name-based identity; win tracking
    feedback.js        In-app bug reports (JSON, volume-aware via dataDir.js); no auth
                       on submission, admin-key-gated viewing
    spotify.js         Spotify OAuth, now-playing polling, searchTracks, searchArtists
    leaderboard.json   Auto-generated; persistent player stats (not committed; lives on
                       the Railway volume in production, server/ locally)
    feedback.json      Auto-generated; submitted bug reports (not committed; same
                       volume-aware location as leaderboard.json)
    .env               Local credentials (not committed)
  client/
    src/
      main.jsx               React entry; registers client/public/sw.js on load
      App.jsx               Screen routing, History API back button, socket reconnect,
                            in-game leave modal, global "✕ Leave" and "🐛 Report a bug"
                            buttons, stale-session handling (room:rejoin_failed)
      gameModeInfo.js        Shared per-mode label/accent/description — single source
                            of truth used by both HomeScreen and LobbyScreen so the
                            copy can't drift out of sync between host setup and Lobby
      socket.js              Socket.io client with aggressive reconnection settings
      index.css               Base styles
      hooks/
        useWakeLock.js        Keeps host screen awake while mic detection is listening;
                              re-acquires on visibility return (OS auto-releases on hide)
        useAuddBackgroundReminder.js
                              Notification permission handling + visibility-triggered
                              "return to the app" reminder during AudD mic detection
      components/
        HomeScreen.jsx        Name entry, host setup; playlist name field (optional in
                              Standard mode, required elsewhere); mic detection as
                              default source; Spotify whitelist error detection +
                              disabled card; DJ Battle settings (host target, penalty
                              mode, penalty amount — collapsed behind an "Advanced"
                              toggle); artist-only mode; mode copy sourced from
                              gameModeInfo.js
        LobbyScreen.jsx       Room code display, player list, mode badge + one-line
                              description (sourced from gameModeInfo.js, same copy
                              the host saw during setup), start + solo start buttons
        LeaderboardScreen.jsx All-time player stats: matches, wins, games played
        PickScreen.jsx        Artist-only pick flows for all 4 modes; unified useSearch
                              hook (artist search via song title or name); static pool
                              suggestion grid (toggle, default off); "predictions only"
                              copy on every mode's player-facing screen; DJ Battle host
                              waiting notice + playlist display; shared PickFooter so
                              the host force-start banner can't overlap the confirm button
        GameScreen.jsx        Timer, card, scoreboard, host controls, event toasts;
                              DJ Battle card with separate host/player targets, penalty
                              display, penalty toast; Spotify Jam host panel + player
                              banner; AudD mic capture loop; debug log; stats panel;
                              Wake Lock + background reminder wired in here; host-only
                              "Picks" Selection Summary tab + playlist-prompt generator;
                              ManualMarkGrid (shared by all 3 music sources' manual
                              marking UI, lists predicted artists, not a dead song pool);
                              "predictions only" copy
        EndScreen.jsx         Winner, final scores (DJ host row with djHostTarget);
                              play again settings with all DJ Battle options; retired
                              genre picker + pick mode toggle commented out
        RoomCodeBadge.jsx      Collapsible room-code pill shown on every in-room screen
                              (tap to expand/collapse), positioned to avoid the Leave
                              and feedback buttons
        FeedbackModal.jsx      "🐛 Report a bug" form — POSTs to /api/feedback with
                              room code/mode/phase/device context auto-attached
        SpotifyCallback.jsx   OAuth callback; whitelist error detection; auto-fallback
                              to mic; session flag + redirect to home with error message
    public/
      manifest.webmanifest   PWA manifest — static file, hand-written (no build plugin)
      sw.js                  Minimal hand-written service worker — pass-through fetch
                              handler, notificationclick focus handler
      icons/                 PWA icon set: 192/512 + maskable variants, apple-touch-icon
                              (placeholder art in the app's navy/cyan/gold theme)
    index.html              iOS standalone meta tags, manifest link, apple-touch-icon
    package.json            vite + @vitejs/plugin-react in dependencies (not devDependencies)
                            so Railway build succeeds with NODE_ENV=production
    vite.config.js          Plain @vitejs/plugin-react — no PWA build plugin (see Design
                            Decisions: hand-rolled manifest/SW avoids a workbox-build bug)
    dist/                   Built frontend (generated by npm run build; not committed)
  railway.json              Railway build and start commands
  package.json              Root scripts: install:all, build, start, dev
  start.sh                  Local one-command launcher (Vite + Express); real-PID
                            launch pattern + port-scoped stop fallback (see Design
                            Decisions); bash start.sh logs tails the combined log
  archive.sh                Snapshot project to ~/pandora-bingo-milestones/<name>/
  .gitignore                Excludes .env, node_modules, client/dist, caches,
                            leaderboard.json, feedback.json
  README_pandora-bingo.md   This file
  DEV_PLAN_pandora-bingo.md Active Beta-Readiness Sprint plan — session breakdown,
                            acceptance criteria, open decisions, delivery log, and
                            what's actually been confirmed on real devices vs. shipped
  REPLIT.md                 Archived Replit deployment guide (port references predate
                            the 3002→3009 local dev port change)
```

---

## Roadmap

### Completed

- v1 — Core multiplayer, room codes, song mode
- v2 — Artist picks with dedicated 50-item pool
- v3 — Spotify OAuth, auto-detection, now-playing polling
- v4 — Played songs history visible to all players in real time
- v5 — Newlywed Bingo: mains, backups, secret guesses, backup debt, wildcards
- v6 — Gong Show Bingo: mains, gong picks, backfire logic, blind mode
- v7 — Spotify redirect fix, play again in same room, mid-game join, session persistence
- v8 — Production build, Replit deployment, dynamic redirect URI, single-port Express
- v9 — Live Spotify search in pick phase; ID-based pick storage; ID-first match detection; album art thumbnails; static pool fallback
- v9.1 — Retro TV UI theme; synthesized sound effects; room code badge; localStorage reconnection
- v10.0 — Solo mode; Last.fm dynamic pools with disk cache; persistent leaderboard; host force-start
- v10.1 — iOS Spotify fix: manual fallback, token auto-refresh, relaxed isPlaying gate
- v10.2 — Railway migration; always-on hosting; auto-deploy on push
- v10.3 — Mobile socket reconnect; back button interception; in-game leave modal; artist mode default
- v10.4 — AudD audio fingerprinting source; SPOTIFY_ENABLED flag; /api/config endpoint; audio input device selector
- v10.5 — iTunes catalog search in AudD rooms; EndScreen source selector fix; 6s clip / retry-on-null; platform-neutral device selector hint text
- v10.6 — AudD fully operational: 15s polling interval; 60s post-match cooldown; per-game + cumulative stats panel; Spotify polling leak fixed (source-gated); Android BT speaker fix (ambient constraints); circular ref crash fixes; Railway build fix (vite moved to dependencies)
- v11.0 — DJ Battle game mode: host declares playlist, players pick artists, host scores unguessed artists, independent player scoring, configurable pick count (1–15), 40-min default time, host auto-confirmed at pick phase start, `game:dj_events` socket event, purple scoreboard host row
- v12.0 — Song mode retired (artist-only); genre picker replaced by playlist name field (all modes); Last.fm/AI pool retired → static ~200-artist shuffled pool; Spotify Jam link sharing in host tab; DJ Battle separate host target (`djHostTarget`) + penalty mode (`djPenaltyEnabled`, `djPenaltyAmount`); Spotify whitelist error detection with auto-fallback to mic; mic detection as default source; 60-min default time limit; EndScreen DJ host score fix
- v12.1 — PWA support: installable to home screen, standalone display on iOS/Android; hand-rolled `manifest.webmanifest` + `sw.js` (dropped `vite-plugin-pwa` after a `workbox-build` bug broke the Railway build); `useWakeLock` keeps host screen on during mic detection; `useAuddBackgroundReminder` notifies the host when they background the tab mid-detection; placeholder icon set added
- v12.2 — Beta-Readiness Sprint Sessions 1–6 (see top of this file for the full list): mobile button/safe-area fixes; explicit Leave Room with real server-side cleanup; crash-safe socket handlers; playlist-mental-model copy + Selection Summary panel + playlist-prompt generator; trimmed host setup + player-facing mode descriptions; in-app feedback mechanism; fixed leaderboard data loss on redeploy; fixed the manual mark-as-played screen (was completely dead); playlist name optional in Standard mode; fixed `start.sh` leaving orphaned dev processes

### Upcoming

**Note:** the items below are the backlog for everything not already folded into the Beta-Readiness Sprint (see top of this file and `DEV_PLAN_pandora-bingo.md`).

- **⚠️ On-device testing for the Beta-Readiness Sprint** — PWA install/standalone/Wake Lock checklist (Session 6), cross-browser button/safe-area pass, an Android Chrome rendering issue found 2026-09-21 (pick screen renders with an unexpectedly large blank gap on at least one real device), "How to Play" explainer video/GIF (blocked on content, not code) — see `DEV_PLAN_pandora-bingo.md` for full detail on each
- Wire the playlist name into actual pool generation (currently ignored by `getDynamicPool()` — see Design Decisions)
- Build a real server-side stats database and StatsScreen UI, if that's still wanted — the one described in earlier revisions of this README was never built (see Design Decisions)
- Seed artist suggestion pool from actual Spotify playlist tracks (host provides playlist URL/ID)
- Internal game history database for smart pool generation (play counts, pick frequency, match rate)
- Newlywed targeted guesses — assign a guess to a specific player rather than the field
- Pre-game countdown timer
- Password auth for leaderboard (replace name-based identity)
- Mobile UI refinements
- Spotify playback control (play/pause/skip from within the game)
- Recurring background reminder via Web Push (VAPID keys + subscription storage) if the single on-background notification isn't enough in practice
- A nicer viewer for in-app feedback reports than raw JSON at `/api/feedback?key=...`, if that turns out to matter in practice

### Rewrite Track (see "Planned Rewrite" section above for full context)

- [ ] Choose a real database for the rewrite (current app has none — see Design Decisions)
- [ ] Security audit (none on record for this app specifically)
- [ ] Choose and integrate managed auth provider (Clerk/Auth0/Supabase) for real user accounts
- [ ] Decide React Native/Expo shell vs. continued PWA-only for store distribution
- [ ] Choose gift-card provider (Tremendous vs. Tango Card) and design house-funded prize trigger + cost controls
- [ ] Draft privacy policy, ToS, account deletion flow (store requirements)
- [ ] Resolve open questions listed in "Planned Rewrite" section before committing to architecture
