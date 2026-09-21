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

### Session 1 — Mobile navigation & button rendering ✅ (accepted — Android confirmed; iOS Safari + PWA-standalone still need real testing)
**Why first:** blocks reliable re-testing of everything else; this class of bug makes the app look broken before any real gameplay issue even comes up.

**Tasks:**
- Audit every fixed/sticky CTA button across `client/src/components/HomeScreen.jsx`, `PickScreen.jsx`, `GameScreen.jsx` for missing `safe-area-inset` padding and z-index conflicts with mobile browser/OS chrome
- Reproduce and fix why "Join Room" renders as disabled-looking on mobile
- Add `padding-bottom: env(safe-area-inset-bottom)` (or equivalent) to any bottom-pinned action button, and re-check button stacking/visibility in both browser-tab and PWA-standalone contexts
- Real-device test pass: at least one real iOS Safari and one real Android Chrome device — emulators have not caught this class of bug so far

**Acceptance criteria:** every primary action button is visible, tappable, and not visually "greyed" when active, on a real iOS device and a real Android device, in both normal browser and installed-PWA mode.

**Files likely touched:** `client/src/components/HomeScreen.jsx`, `PickScreen.jsx`, `GameScreen.jsx`, `client/src/index.css`

---

### Session 2 — Room lifecycle & reconnection hardening ✅ (accepted — logic verified via scripted tests + deployed to Railway; on-device confirmation still needed for most of it, see delivery log)
**Tasks:**
- Add an explicit "Leave Room" control for non-host players — frees their slot server-side (`server/game.js`, new `player:leave` socket event), doesn't affect other players
- Add/confirm an "End Game" confirmation for the host — extend the existing back-button interception logic in `App.jsx` rather than duplicating it
- Add a "this room no longer exists" client state: if a stored room code in localStorage fails to rejoin, show a clear message and route home instead of silently hanging
- Add server-side error logging around game state transitions in `server/index.js` / `game.js` so a future crash leaves a diagnosable trace
- Re-test the existing rejoin-after-backgrounding flow specifically (it's documented as working — find out why it didn't hold up in the field)

**Acceptance criteria:** a player can always get out of a room; a host's crashed/dead room never leaves players stuck; a repeat of the fire-pit crash would leave a log entry Dre can read.

**Files likely touched:** `client/src/App.jsx`, `client/src/socket.js`, `server/game.js`, `server/index.js`

---

### Session 3 — Playlist mental model: quick fix + selection summary ✅ (code complete, verified via scripted test + build; on-device confirmation pending)
**Tasks:**
- Add explicit copy on `PickScreen.jsx` / `GameScreen.jsx` for all existing modes clarifying that picks are predictions and don't influence what plays
- Build a host-facing "Selection Summary" panel: after the pick phase closes, aggregate every artist picked across all players and display it to the host (foundation for Session 4, useful standalone even without it)

**Acceptance criteria:** a new player can tell, without being told out loud, that their picks are predictions not playlist inputs; host can see a clean aggregated list of what was picked once the pick phase closes.

**Files likely touched:** `client/src/components/PickScreen.jsx`, `GameScreen.jsx`, `server/game.js` (aggregation)

---

### Session 4 — New: player-influenced playlist mode (MVP) ✅ (code complete, verified via string check + build; on-device confirmation pending)
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
- **New, flagged 2026-09-21:** on a real Android device in mobile Chrome, the pick screen renders with a large empty area below the search/toggle controls and above the fixed footer — content reads as noticeably smaller/sparser than expected for the screen size. Viewport meta tag (`width=device-width, initial-scale=1.0`) and CSS were checked and look correct, so root cause is unconfirmed — could be the specific device, mobile Chrome's viewport handling, or something in the app's layout. Needs a dedicated look, ideally with browser devtools remote-debugging the actual device rather than guessing from a screenshot.
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
3. ~~**Player-influenced playlist scope**~~ — **Resolved 2026-09-21:** neither. Dre chose to extend Session 3's existing host-only "Picks" tab (available in every game mode already) with a prompt generator, rather than add a new mode or toggle.
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

### 2026-09-21 — Session 1: on-device pass + pick-screen layout follow-ups

**On-device test (Android Chrome, real hardware, via Tailscale):**
- ✅ "Join Room" button no longer reads as disabled — cyan glow/border renders correctly
- ✅ DJ Battle mode card no longer crashes Home
- Found in the field: the host's "Start game anyway" force-start banner (only visible to hosts, shown while other players are still picking) floated as a `position:fixed` overlay directly on top of the Confirm picks button, with no reserved space — a real instance of the same "overlapping CTA" bug class as the original fire-pit report, just not caught by code review since it's host-only and state-dependent.

**Fixed, then iterated further based on live feedback:**
- Replaced the standalone force-start banner with a shared `PickFooter` component (`client/src/components/PickScreen.jsx`) — fixed to the bottom of the viewport, used by all four pick-screen variants (Standard, Newlywed, Gong Show, DJ Battle). The screen's own action button always renders first; the host banner (when present) stacks below it, so they can never overlap again.
- Along the way, the artist-suggestion list was found to be its own nested `overflow-y:auto` box capped at 420px, separate from page scroll — confusing on mobile (two different scroll gestures needed to reach the Confirm button). Per Dre's direction: added a "Show suggested artists" toggle (`ToggleSwitch` component), **default off**, so the screen opens uncluttered; when enabled, results render in a smaller (280px) independently-scrolling pane. Search-as-you-type results always show regardless of toggle state.
- The Room Code badge (`RoomCodeBadge.jsx`, shown globally via `App.jsx` whenever a room is active) was then found to crowd the new fixed footer at the bottom-left. Changed it from a static always-expanded badge to a collapsible one — starts as a small "🔑 ROOM" pill, tap to expand/collapse the full code. Applies everywhere the badge renders, not just the pick screen.
- All changes verified live on the Android device across iterations, not just via `npm run build`.

**Committed:** `8cfd832` — "Session 1: fix mobile button visibility, pick-screen layout, room badge clutter". 1 commit ahead of `origin/main`, **not pushed**.

**Not yet done:**
- iOS Safari has not been tested at all this session (only Android Chrome, real hardware) — the original acceptance criteria calls for both. Worth a pass before calling Session 1 fully closed across platforms.
- Installed-PWA-standalone mode not retested with these latest changes (only normal browser-tab mode).
- Session 1 is otherwise functionally complete and closed pending the iOS/PWA passes above. Session 2 (Room lifecycle & reconnection hardening) is next and unblocked.

### 2026-09-21 — Session 2: Room lifecycle & reconnection hardening

**Shipped:**
- **Explicit Leave control:** a small "✕ Leave" button now renders on every in-room screen (lobby, pick, waiting, game — not just reachable via phone-back-button while in-game as before). It opens the existing `LeaveModal` (`client/src/App.jsx`) — reused, not duplicated.
- **Leaving now actually frees the slot server-side.** Previously `confirmLeave()` only cleared local state; the player stayed in `room.players` forever, and if they left mid-picking, `checkAllConfirmedAndStart` could never fire because it waits on every player to confirm. Added `game.removePlayer(code, playerId)` (`server/game.js`) and a `player:leave` socket handler (`server/index.js`) that removes the player, re-broadcasts room state, and re-checks whether the remaining players can now start. Verified with a scripted socket test: player leaves unconfirmed mid-picking → removed from the room → host confirming alone now correctly auto-starts the game instead of hanging.
- **Host leaving now tears the room down properly.** The host path in `confirmLeave()` now emits the existing `host:end_game` event before going home, instead of just clearing local state and leaving the room's timer/polling intervals running server-side with nobody connected.
- **Stale-room rejoin no longer loops silently.** `player:rejoin` failures now emit a distinct `room:rejoin_failed` event (was: generic `error` toast that auto-dismissed after 4s while the dead session stayed in localStorage, so Socket.io's infinite reconnection kept retrying it forever). Client now clears the session, resets to the home screen, and shows a clear one-shot message. Verified with a scripted test against a room code that doesn't exist on the server.
- **Crash logging.** Every `socket.on(...)` handler in `server/index.js` is now wrapped by a `wrapHandler` helper that catches sync throws and rejected promises, logs `[socket:<event>] room=<code>` to stderr, and emits a graceful error to the client instead of letting the exception propagate. An uncaught exception in a handler previously crashed the entire Node process — taking every active room down at once, which plausibly explains the unexplained fire-pit host crash. Added `process.on('uncaughtException'/'unhandledRejection')` as a last-resort net. Verified: sent a malformed `host:create` payload designed to throw — server emitted a graceful error and stayed up and responsive afterward (confirmed via a follow-up HTTP request).
- `npm run build` (client) verified green.

**Verified locally (scripted socket.io-client tests against the dev server, not on-device):**
- Player leaving mid-picking frees their slot and unblocks game start for the rest of the table.
- Rejoin against a nonexistent room code emits `room:rejoin_failed`, not a generic error.
- A thrown exception inside a socket handler no longer kills the server process.

**Not yet done — needs Dre's on-device pass:**
- Real backgrounding/reconnect retest (the original "existing rejoin logic didn't hold up in the field" report) — this needs a real phone backgrounding a real tab, not a scripted client.
- Visual check of the new "✕ Leave" button placement against the safe-area/notch on a real device (added `top: calc(12px + env(safe-area-inset-top))` defensively, same pattern as Session 1's bottom-inset fixes, but unverified on hardware).
- Host-leave-mid-DJ-Battle and Newlywed-partner-leaves scenarios were *not* given special-case handling (per DEV_PLAN Open Decision #2 — explicitly deferred, not a gap). Worth a deliberate playtest if those modes see real use before beta.

**Out of scope, by design:** role-based unwind logic for Newlywed/DJ Battle when a player leaves mid-game (Open Decision #2 said not to block Session 2 on this).

**Resuming after a break:** committed as `4090bef`, pushed to `origin/main`, and confirmed deployed on Railway (status SUCCESS, matching commit hash, verified via `railway status`). Session 3 (Playlist mental model / Selection Summary) is next.

### 2026-09-21 — On-device testing round (Sessions 1 & 2) + acceptance

Dre tested Session 2 against the live Railway deploy (iOS Safari hosting, Android Chrome joining). Accepting Sessions 1 & 2 as shipped. Per Dre's instruction: only mark testing items as confirmed where he explicitly said so — everything else stays flagged as needing real-device testing, even though the underlying code is accepted and live.

**Confirmed working (real devices, Railway production):**
- End-to-end join flow: iOS Safari hosts a room, Android Chrome (mobile browser, not PWA) joins by room code and reaches the pick screen. This was initially misreported as a broken "Join Room" button — root cause was that the Android device was pointed at the Tailscale-local dev build (unreachable from that network), not a code bug. Confirmed via Railway HTTP/network logs: zero requests from the Android device reached Railway during the failed attempt, then a full request trail appeared once re-tested against the real Railway URL.

**New issue found — flagged for later, not fixed now (Dre's call):**
- Android Chrome mobile browser (real device): pick screen content renders noticeably too small, with a large empty gap below the search/toggle area and above the fixed footer. Confirmed by Dre as a genuine rendering issue, not just the expected "nothing searched yet" empty state. Viewport meta tag and CSS were checked and look correct — root cause unconfirmed (device vs. browser vs. app code). Added to Session 6 as a flagged item; needs dedicated investigation, ideally with remote devtools on the actual device.

**Still flagged as needing real-device testing (not yet confirmed by Dre, code is shipped regardless):**
- iOS Safari: Join Room button appearance, DJ Battle card, pick-screen safe-area/footer layout, new "✕ Leave" button placement against the notch/Dynamic Island (all Session 1 + Session 2 UI changes)
- Real app-backgrounding/reconnect retest (the original fire-pit "rejoin didn't hold up in the field" report) — Session 2's fix was only verified via scripted socket tests, not a real phone backgrounding a real tab
- Host-leave and player-leave flows on real devices (server logic confirmed via scripted tests + this session's join-flow confirmation, but the Leave button UX itself hasn't been tapped on a real phone)
- PWA-standalone mode (Add to Home Screen) — not retested since the Session 1 layout changes

**Next:** Session 3 (Playlist mental model / Selection Summary) is next per the plan. The Android Chrome scaling issue stays parked under Session 6 until Dre wants to dig into it.

### 2026-09-21 — Session 3: Playlist mental model + Selection Summary

**Shipped:**
- **"Predictions only" copy.** Added a one-line note — *"Predictions only — your picks don't control what plays"* — under the subtitle on all four pick screens (`client/src/components/PickScreen.jsx`: Standard, Newlywed, Gong Show, DJ Battle player view) and once more during play in `GameScreen.jsx` (below the mode-badge row, visible to all players). Deliberately **not** added to DJ Battle's host view — the host actually did choose the real playlist, so the note doesn't apply to them.
- **Host-facing Selection Summary.** New "Picks" tab in `GameScreen.jsx`'s existing tab bar (alongside My card / Scores / Host controls), host-only. Aggregates every player's `picks` array (the primary-pick field in every game mode — `submitPicks`/`submitNewlywedPicks`/`submitGongShowPicks` in `server/game.js` all write into it) into a sorted "artist · picked by N players" list, computed inline client-side from `room` state already being broadcast — no server or protocol changes needed.
- `npm run build` (client) verified green.

**Verified:**
- Scripted socket.io-client test (2 players, overlapping picks: both pick "Alpha" and "Bravo", plus 3 unique picks each) against the real dev server confirmed the aggregation produces the exact expected ranking (Alpha:2, Bravo:2, then the six unique picks at 1 each).
- Confirmed all new copy strings and the "Picks" tab label are present in the production build output (`client/dist/assets/*.js`).

**Not yet done — needs Dre's on-device pass:** none of this session's UI has been tapped on a real device yet (copy placement, tab layout, chip wrapping on a narrow phone screen). Same "code shipped, on-device unconfirmed" status as the rest of Sessions 1 & 2's newer pieces.

**Explicitly out of scope (per the plan):** Session 4's playlist-prompt string generator — this session only built the aggregation and display that Session 4 will read from.

**Resuming after a break:** committed as `348a93c`, pushed, deployed to Railway (confirmed SUCCESS).

### 2026-09-21 — Session 4: player-influenced playlist mode (MVP)

**Open Decision #3 resolved before starting:** Dre chose "neither" — extend Session 3's existing host-only "Picks" tab (already present in every game mode) rather than add a new selectable mode or a toggle. This kept the feature to a single, small extension of existing UI.

**Shipped:**
- `client/src/components/GameScreen.jsx`'s "Picks" summary tab now generates a suggested playlist prompt from the same ranked pick aggregation built in Session 3: *"Create a playlist featuring: [artists in picked-count order], plus similar-sounding artists"* — shown in a read-only textarea (tap-to-select-all on focus) with a "📋 Copy prompt" button using `navigator.clipboard.writeText`.
- Copy success/failure feedback reuses the existing `addToast` mechanism already in this file (no new UI primitive) — green toast on success, red toast with a manual-copy fallback hint if clipboard access fails.
- No server changes, no new external API calls, per the plan's explicit MVP constraint — pure client-side string generation from data already in `room` state.
- `npm run build` verified green.

**Verified:**
- Re-ran the exact prompt-string template against Session 3's known-good aggregation test output (Alpha:2, Bravo:2, plus 6 singles) — produced the correct comma-joined string in picked-count order.
- Confirmed "Suggested playlist prompt," "Copy prompt," and the generated template text are present in the production build output.

**Not yet done — needs Dre's on-device pass:** the Copy button's clipboard behavior specifically is worth a real-device check (clipboard permissions can behave differently across mobile Safari/Chrome than in a desktop dev environment) — not verified beyond the build-output string check above.

**Next:** Session 5 (Setup flow & onboarding) is next per the plan.
