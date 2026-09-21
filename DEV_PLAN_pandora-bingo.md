# Pandora Bingo — Beta-Readiness Dev Plan

**Goal:** Public beta by December 2026 — wider invite-only testing on the current Railway-hosted PWA. No app store, no managed auth, no prize infrastructure; that's the separate, decoupled Rewrite track documented in `README_pandora-bingo.md`.

**Plan created:** September 2026
**Status legend:** 🔲 Not started · 🔶 In progress · ✅ Done

> **Claude Code:** read this file (and `README_pandora-bingo.md`) in full before starting any session on this track. At the end of every session, before ending: (1) update the status marker on the session(s) you touched, and (2) append a dated entry to the **Delivery Log** at the bottom summarizing what shipped, what's still open, and any follow-ups for the next session.

---

## Context — September 2026 fire-pit playtest

First real-world outdoor multiplayer test. Spotify connection failed; mic detection fallback worked fine on its own. This is the source of the session plan below.

**Critical / blocking**
- "Join Room" button rendered as visually disabled on mobile even when it should have been active
- "Confirm Selection" button (bottom of the pick screen) was covered by the phone's OS home/back gesture bar
- No "Leave Room" / "Leave Game" control existed for players or the host
- Players couldn't reliably get back into a room after navigating away in the phone browser, despite existing session-persistence/rejoin logic
- When the host's game errored out mid-session, players couldn't cleanly exit the dead room to join the host's replacement room
- The host-side crash's root cause is unknown — nothing currently logs it

**Design mismatch**
- Players believed their artist picks were shaping which songs would play. They weren't — the host had picked an existing Spotify playlist that shuffles independently of any picks. Nothing in the UI corrects this assumption.

**Onboarding gap**
- First-time players (under time and social pressure, late at night) struggled to quickly grasp what each of the 4 game modes does before committing to play

**Social/context caveat:** part of the men's group disengaged due to setup complexity, but this was confounded by lateness and drinking — treat as a real signal on setup friction, not a precise measurement of it.

---

## Session plan

### Session 1 — Mobile navigation & button rendering ✅ (code review done, on-device pass pending)
**Why first:** blocks reliable re-testing of everything else; this class of bug makes the app look broken before any real gameplay issue even comes up.

**Tasks:**
- Audit every fixed/sticky CTA button across `client/src/components/HomeScreen.jsx`, `PickScreen.jsx`, `GameScreen.jsx` for missing `safe-area-inset` padding and z-index conflicts with mobile browser/OS chrome
- Reproduce and fix why "Join Room" renders as disabled-looking on mobile
- Add `padding-bottom: env(safe-area-inset-bottom)` (or equivalent) to any bottom-pinned action button, and re-check button stacking/visibility in both browser-tab and PWA-standalone contexts
- Real-device test pass: at least one real iOS Safari and one real Android Chrome device — emulators have not caught this class of bug so far

**Acceptance criteria:** every primary action button is visible, tappable, and not visually "greyed" when active, on a real iOS device and a real Android device, in both normal browser and installed-PWA mode.

**Files likely touched:** `client/src/components/HomeScreen.jsx`, `PickScreen.jsx`, `GameScreen.jsx`, `client/src/index.css`

---

### Session 2 — Room lifecycle & reconnection hardening 🔲
**Tasks:**
- Add an explicit "Leave Room" control for non-host players — frees their slot server-side (`server/game.js`, new `player:leave` socket event), doesn't affect other players
- Add/confirm an "End Game" confirmation for the host — extend the existing back-button interception logic in `App.jsx` rather than duplicating it
- Add a "this room no longer exists" client state: if a stored room code in localStorage fails to rejoin, show a clear message and route home instead of silently hanging
- Add server-side error logging around game state transitions in `server/index.js` / `game.js` so a future crash leaves a diagnosable trace
- Re-test the existing rejoin-after-backgrounding flow specifically (it's documented as working — find out why it didn't hold up in the field)

**Acceptance criteria:** a player can always get out of a room; a host's crashed/dead room never leaves players stuck; a repeat of the fire-pit crash would leave a log entry Dre can read.

**Files likely touched:** `client/src/App.jsx`, `client/src/socket.js`, `server/game.js`, `server/index.js`

---

### Session 3 — Playlist mental model: quick fix + selection summary 🔲
**Tasks:**
- Add explicit copy on `PickScreen.jsx` / `GameScreen.jsx` for all existing modes clarifying that picks are predictions and don't influence what plays
- Build a host-facing "Selection Summary" panel: after the pick phase closes, aggregate every artist picked across all players and display it to the host (foundation for Session 4, useful standalone even without it)

**Acceptance criteria:** a new player can tell, without being told out loud, that their picks are predictions not playlist inputs; host can see a clean aggregated list of what was picked once the pick phase closes.

**Files likely touched:** `client/src/components/PickScreen.jsx`, `GameScreen.jsx`, `server/game.js` (aggregation)

---

### Session 4 — New: player-influenced playlist mode (MVP) 🔲
See feature spec below. Manual/copy-paste only for v1 — no new external API integration.

**Tasks:**
- Extend the Selection Summary panel (Session 3) with a generated suggested playlist-prompt string built from the aggregated picks
- Host can copy the prompt and paste it into Spotify/Apple Music's own AI/prompt-based playlist generation
- Decide scope per Open Decision #3 below (new mode vs. toggle) before starting

**Acceptance criteria:** host can go from "pick phase closed" to "here's a prompt I can paste into my music app" in one screen, with zero new external API calls.

**Files likely touched:** `client/src/components/GameScreen.jsx` or a new component, `server/game.js`

---

### Session 5 — Setup flow & onboarding 🔲
**Tasks:**
- Trim the number of screens/decisions between opening the app and having a live room, especially for first-time hosts
- Add a one-line, plain-language description of each mode visible on `HomeScreen.jsx` before the host commits to it
- Embed the short explainer video/GIF (produced outside this session, as content) once available — a "How to Play" link/section

**Acceptance criteria:** a first-time host can start a room without needing anything explained out loud; a first-time player can tell what a mode does before the game starts.

**Files likely touched:** `client/src/components/HomeScreen.jsx`

---

### Session 6 — Beta readiness pass 🔲
**Tasks:**
- Close out the pending v12.1 PWA on-device testing checklist: Android install flow, iOS Add to Home Screen, standalone launch, background reminder notification, Wake Lock behavior
- Cross-browser pass specifically targeting the button/safe-area bug class from Session 1, since it varies by device
- Add a lightweight in-app feedback mechanism (even a simple "report a bug" link/form) — beta testers won't be sitting next to the host to narrate problems live

**Acceptance criteria:** PWA checklist fully checked off; a beta tester hitting a bug has a way to tell Dre about it without a group chat message.

**Files likely touched:** `client/public/manifest.webmanifest`, `sw.js`, `client/src/hooks/useWakeLock.js`, `useAuddBackgroundReminder.js`, plus whatever the feedback mechanism needs

---

## Feature spec draft — Player-influenced playlist mode

**Problem:** players assumed their picks shaped the playlist. They don't, currently — the host just points at an existing Spotify playlist that shuffles independently.

**MVP approach (Session 4):**
1. After the pick phase closes, the host's Selection Summary panel (built in Session 3) aggregates every artist picked across all players into one list
2. The panel generates a suggested prompt string, e.g.: *"Create a playlist featuring: [aggregated artist list], plus similar-sounding artists"*
3. Host copies that prompt and pastes it into their music app's own AI/prompt-based playlist generation (e.g. Spotify's AI DJ / playlist tools) to build the actual playlist before or during the game
4. No new external API integration for v1 — this is a copy-paste bridge, not an automated pipeline

**Why manual for v1:** verify at the start of Session 4 whether Spotify (or another target app) exposes a public API for prompt-based playlist generation that a third party could call on a user's behalf. As of this plan, that's assumed not to be reliably available, so the manual/copy-paste bridge is the safe MVP scope regardless.

**Stretch (not in scope for December beta):** if a workable API exists, automate playlist creation directly from the app rather than requiring a copy-paste round trip.

---

## Open decisions (pending Dre's input — don't block Session 1 or 2 on these)

1. **Beta scope** — confirmed as widening the current PWA to more testers (not the App Store rewrite)? Assumed yes for this plan.
2. **Leave-mid-game handling** — for a non-host player, does leaving just free their slot and let the game continue as-is, or does it need special handling for role-based modes (DJ Battle's host, Newlywed Bingo's paired secret guesses)?
3. **Player-influenced playlist scope** — new distinct game mode, or a toggle any existing mode can enable?
4. **Sequencing** — strictly bug fixes (Sessions 1–2) before feature work (Sessions 3–4), or interleaved?

---

## Delivery log

_Claude Code: append a dated entry here after each session — what shipped, what's still open, anything the next session needs to know. Update the relevant session's status marker above at the same time._

### 2026-09-20 — Session 1: Mobile navigation & button rendering

**Shipped:**
- **"Join Room" disabled-looking button — root cause + fix:** no button had `-webkit-appearance: none` / `appearance: none`. Mobile Safari/Chrome layer native button chrome on top of author styles by default, and this app's buttons use translucent `rgba()` backgrounds (e.g. `btnPrimary` = `rgba(0,212,255,0.15)`), which is exactly the combination that reads as greyed-out/disabled under native chrome even though the button is fully tappable. Added a global reset in `client/src/index.css` (`button { -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent; }`). This applies to *all* buttons app-wide, not just Join Room, since the same style pattern (`btnPrimary`, `btnSecondary`, etc.) is reused everywhere.
- **Safe-area-inset audit on fixed/bottom CTAs** — `viewport-fit=cover` was already set in `index.html` (prerequisite for `env(safe-area-inset-*)` to do anything), but nothing was consuming it. Added bottom safe-area padding to:
  - `PickScreen.jsx` `sharedStyles().wrap` — the confirm/lock-in-picks buttons sit at the very end of the scrollable pick flow with no bottom buffer; the last ~20-34px is exactly the OS gesture-bar zone. This is very likely the actual "Confirm Selection got covered" bug from the fire-pit playtest.
  - `PickScreen.jsx` `HostForceStartBanner` — fixed, `bottom: 20` → `bottom: calc(20px + env(safe-area-inset-bottom))`.
  - `GameScreen.jsx` main `s.wrap` — host-control buttons (End game, +5 min, Blind toggle) sit at the bottom of tab content with no buffer.
  - `HomeScreen.jsx` outer wrapper — top+bottom safe-area padding added defensively (lower risk since content is vertically centered, not bottom-pinned, but cheap insurance).
  - `RoomCodeBadge.jsx` — fixed bottom-left badge (informational only, `pointerEvents:none`), nudged above the gesture zone for visual consistency.
- **z-index audit:** reviewed every `position: fixed`/`sticky` element across `App.jsx`, `HomeScreen.jsx`, `PickScreen.jsx`, `GameScreen.jsx`, `RoomCodeBadge.jsx`. Stacking order is internally consistent (curtains 0 → card content 1 → force-start banner 200 → grace overlay 300 → toasts/error banner 1000 → leave modal 2000) — found no actual z-index *conflicts* between the app's own elements. The reported "z-index conflicts with OS chrome" symptom is better explained by the missing safe-area-inset padding above, not a stacking-order bug.
- **Bonus fix (found during audit, not in original scope):** `HomeScreen.jsx`'s DJ Battle mode-card `onClick` called `setPickMode('artists')`, but the `pickMode` state was removed when song mode was retired in v12.0 — this state setter no longer exists. It was a `ReferenceError` that would crash the whole Home screen the instant a host tapped the DJ Battle card. Removed the dead call. This wasn't part of the button-rendering bug reports but was a live crash sitting directly in the file under audit, so fixed it here rather than leaving it for a later session to rediscover.
- `npm run build` (client) verified green after all changes.

**⚠️ Not verified — code review only, needs Dre's on-device pass:**
- Whether the `-webkit-appearance` fix actually resolves the visual "disabled" look on a real iOS Safari / Android Chrome device — this is the best-supported root cause for the reported symptom, but there was no way to render and screenshot on real hardware in this environment.
- Whether the safe-area padding actually clears the gesture bar in practice, in both normal mobile-browser-tab mode and installed-PWA standalone mode — same rendering limitation.
- No emulator or real-device testing was performed at all this session (per the DEV_PLAN acceptance criteria, emulators haven't caught this bug class historically anyway, so the real test is the real-device pass).

**Follow-ups for next session (or before closing Session 1):**
- Real-device test pass: one iOS Safari device, one Android Chrome device, both normal-tab and installed-PWA mode. Specifically re-run the original fire-pit repro (tap Join Room, scroll to bottom of a pick screen, check DJ Battle mode card doesn't crash). **Not yet done — Dre needs to run this himself before Session 1 can be marked fully closed.**
- If the button still looks disabled after this fix on a real device, the next suspect is the low-opacity `rgba()` background values themselves (e.g. bump `C.cyanDim` from 0.15 to something more solid) rather than the appearance reset — but don't make that change speculatively before seeing the on-device result.
- Session 2 (Room lifecycle & reconnection hardening) is next per the plan and is unblocked by this session.

**Unrelated local-dev-only change made while setting up for the on-device test:** Pandora Bingo's local dev backend port was moved from **3002 → 3009** — port 3002 collides with GoalKeeper's server in the Coherence Suite port map, and Dre didn't want to interrupt GoalKeeper to free it. Changed: `server/index.js` (PORT fallback), `client/vite.config.js` (3 proxy targets), `server/.env` (local, gitignored, not in the diff), `README_pandora-bingo.md` (all local-port references). Frontend stays on 5174. **Does not affect Railway production** — Railway assigns its own `PORT` at deploy time regardless of the code fallback. If Spotify OAuth is ever tested locally, the redirect URI registered in the Spotify Developer Dashboard also needs updating to `http://127.0.0.1:3009/auth/spotify/callback` (external, not something Claude Code can do).

**Resuming after a break:** nothing has been committed yet — all Session 1 changes (button/safe-area fixes + this port change) are uncommitted in the working tree, visible via `git status`/`git diff`. To resume on-device testing: `bash start.sh` from the repo root, then open `http://100.70.143.100:5174/` on a phone on the same Tailscale network. `bash start.sh stop` when done. Still need Dre's go-ahead on the diff before running `git add . && git commit && git push`.
