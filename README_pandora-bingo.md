# Pandora Bingo

> **v12.0.0** — Song mode retired (artist-only); genre picker replaced by playlist name field; AI/iTunes pool → static shuffled Top 200 pool; DJ Battle separate host target + penalty mode; Spotify whitelist detection with auto-fallback to mic; default source mic; SQLite stats DB on Railway volume; 60-min default time. ✅
> **v11.0.0** — DJ Battle game mode: host vs. players, playlist declaration, artist picks, host scores unguessed artists, 40-min default. ✅
> **v10.6.0** — AudD fully operational: 15s interval, 60s post-match cooldown, per-game + cumulative stats panel, Spotify polling leak fixed, Railway build fix. ✅
> **v10.5.0** — AudD mic detection working: iTunes pick search, EndScreen source fix, 6s clip / retry-on-null. ✅
> **v10.4.0** — AudD audio fingerprinting source, conditional Spotify visibility, `/api/config` endpoint. ✅
> **v10.3.0** — Mobile reconnect fix, back button interception with in-game leave modal, artist mode default. ✅
> **v10.2.0** — Railway deployment: always-on hosting, no sleep timeouts, public URL on Railway infrastructure. ✅
> **v10.1.0** — iOS Spotify fix: manual song fallback in host tab, auto token refresh, relax isPlaying gate. ✅
> **v10.0.0** — Solo mode, dynamic song pools (Last.fm), leaderboard, host force-start from waiting screen. ✅

A real-time multiplayer music prediction game. Pick songs or artists you think will play — first to match wins. Designed to run on phones and any modern browser — no app install required.

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
- Railway volume mounted at `/data` for persistent SQLite stats database (set `STATS_DB_PATH=/data/stats.db` in Railway Variables)

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
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3002/auth/spotify/callback
SPOTIFY_ENABLED=true
AUDD_API_KEY=your_audd_key
STATS_DB_PATH=./stats.db
PORT=3002
```

- `SPOTIFY_ENABLED` — set to `false` to hide the Spotify source option from all users (useful when Spotify dev mode limits who can auth)
- `AUDD_API_KEY` — get a key at [audd.io](https://audd.io). Indie plan: $5/month for 1,000 requests. Keyless mode has a very low daily limit — not suitable for regular use
- `STATS_DB_PATH` — path to the SQLite stats database. Use `./stats.db` locally; set to `/data/stats.db` on Railway (requires a persistent volume mounted at `/data`)
- Spotify credentials from [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)

## Running the Game

### Local (home network / Tailscale)

```bash
bash start.sh
```

- Backend runs on port 3002
- Frontend runs on port 5174 (Vite dev server)
- Access from other devices via Tailscale: `http://100.70.143.100:5174/`

Press Ctrl+C to stop both servers.

### Production / Railway (public URL)

```bash
npm run install:all   # first time only
npm run build         # builds React app into client/dist
npm start             # serves everything from port 3002
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
STATS_DB_PATH=/data/stats.db
NODE_ENV=production
```

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

Previously deployed on Replit. Railway replaced it due to sleep timeouts. See [REPLIT.md](./REPLIT.md) if needed.

### How production mode works

`server/index.js` on start:
- Serves `client/dist` as static files from the same Express server
- Derives the Spotify OAuth redirect URI dynamically from the request host
- Sets CORS to same-origin (no separate frontend port in production)

Local dev is unchanged — `bash start.sh` runs Vite on 5174 with a proxy to 3002.

---

## Features

### Game Modes

**Standard** — Pick 5 artists you predict will play. First to match all 5 wins.

**Newlywed Bingo** — A social prediction mode. Players try to win on their own picks while secretly sabotaging others by guessing which artists they chose.

**Gong Show Bingo** — A chaotic sabotage mode. Pick 10 artists to score points and 5 secret gong artists to cancel other players' points. Duplicate gongers cancel each other and both lose a point. Optional blind mode hides picks until each song plays.

**DJ Battle** — Host vs. players. The host plays their own playlist and declares its name and a hint. Players pick artists they think will appear in the playlist. Players score when they guess right; the host scores when nobody guessed the artist. The host and players race independent score targets. Optional penalty mode deducts points from the DJ when a player scores. Default time limit is 60 minutes.

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

**Manual** — Host taps songs as they play in the Host Controls tab. Works with any music source.

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
- A stats panel (tap "Show stats") tracks API calls, matches, nulls, and retries per game and cumulatively across all sessions on that device

---

### Pick Modes

### Pick Modes

All game modes use **artist mode only**. Song mode has been retired. DJ Battle is always artist mode.

**Artist mode** — Players pick artists. A match occurs when any song by that artist is detected. Matched song titles are shown under the artist name. Matching is case-insensitive and handles featured artists.

### Pick Phase Search

- **Spotify rooms** — Live search against the full Spotify catalog (search-as-you-type, 300ms debounce). Picks carry Spotify artist IDs for reliable match detection.
- **AudD / Manual rooms** — Live search against the iTunes catalog. Players can search by artist name or song title — the song search returns the artist behind it. Same UX as Spotify search. Picks carry iTunes IDs.

### Artist Suggestion Pool

The pick screen shows 50 randomly selected artists from a static pool of ~200 broadly popular cross-genre artists, shuffled fresh each room. This gives players a starting point; the search is always available for anyone not in the pool. Future: pool seeded from actual Spotify playlist tracks or internal game history database.

### Win Conditions

- Matches/points to win: 1–10 (default 5); DJ Battle player target independent from DJ target
- DJ host target: 1–50 (default 10, separate from player target)
- Time limit: 5–60 minutes in 5-minute increments (default 60 for all modes)
- Game ends when a player or the host hits their target OR time runs out
- Tied scores at time expiry → coin flip; DJ Battle uses progress-normalised comparison

### Host Controls

**Manual mode:** mark songs as played, view played list, +5 min, blind mode toggle (Gong Show), end game.

**Spotify mode:** now-playing track with album art, auto-detected list, collapsible manual fallback, +5 min, blind mode toggle, end game.

**AudD mode:** audio input selector, mic status (idle/listening/identifying/error), on-screen debug log, stats panel, auto-detected song log, collapsible manual fallback, +5 min, blind mode toggle, end game.

### Real-time Multiplayer

Built on Socket.io. All game events broadcast instantly — joins, picks confirmed, songs detected, scores, gong events, penalties, wildcards, game over.

Players join via 6-character room code from any device. Railway deployment is fully public — no Tailscale needed. Multiple simultaneous rooms run independently with no interference.

### Player Limit

2–10 players per room.

### Joining and Leaving

Players can join or leave at any time including during an active game. Late joiners go directly to the pick screen; the clock keeps running.

Back button is intercepted throughout the app. During an active game, back shows a confirmation modal. Hosts get a stronger warning — leaving ends the game for all players.

Disconnected players have their slot and state preserved. They can rejoin at any time; the app auto-reconnects from localStorage.

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

- **Local:** `http://127.0.0.1:3002/auth/spotify/callback`
- **Railway:** `https://pandora-bingo.up.railway.app/auth/spotify/callback`

Host setup state saved to sessionStorage before OAuth redirect and restored on return.

---

## Design Decisions

**Artist-only mode** — Song mode has been retired. All game modes use artist mode exclusively. `room.pickMode` is hardcoded to `'artists'` server-side. Song mode code is commented out for potential future re-enablement.

**Playlist name replaces genre** — The genre picker has been retired. The host names their playlist instead. This name drives the artist suggestion pool and is displayed to players on the pick screen. Pool generation is playlist-name-driven, not genre-driven.

**Static artist pool** — The pick screen suggestion pool is 50 randomly selected artists from a hardcoded list of ~200 broadly popular cross-genre artists, shuffled fresh per room. AI and iTunes pool generation were retired due to poor relevance. Future: pool seeded from actual Spotify playlist tracks or historical game data.

**Spotify whitelist detection** — The OAuth callback now checks for `?error=access_denied` from Spotify. When detected, the server redirects to the callback with a `not_whitelisted=1` flag instead of returning a 500. The client shows a clear error message, writes a session flag, downgrades `musicSource` to `audd`, and returns the user to the setup screen with Spotify disabled.

**Mic detection as default** — `musicSource` defaults to `'audd'` in HomeScreen. Players without whitelisted Spotify accounts can play immediately without any configuration.

**DJ Battle separate host target** — `room.djHostTarget` (default 10) is the DJ's independent win threshold, separate from `room.matchTarget` (players' target). Both sides race their own numbers. End-game tiebreaking normalises scores to their respective targets for fair comparison.

**DJ Battle penalty mode** — `room.djPenaltyEnabled` toggles a point deduction when any player scores. `room.djPenaltyAmount` (default 1.0, one decimal place) is subtracted from `room.hostScore` using floating-point-safe math. Emits `host_penalty` event so clients can toast the deduction.

**Spotify Jam sync** — When using Spotify, the host can paste a Spotify Group Session (Jam) link into the host tab. The link is stored on the room and broadcast via `game:updated`. Players see a "Join Jam ↗" banner above the tabs, which opens the Spotify app in sync.

**SQLite stats database** — `server/stats-db.js` uses `better-sqlite3` for synchronous access. Schema: `artists` (pick_count, match_count), `songs` (played_count, match_count), `game_sessions` (metadata, ready for expansion). Database path set via `STATS_DB_PATH` env var; defaults to `./stats.db` locally, `/data/stats.db` on Railway (persistent volume required). Accessible via `/api/stats/artists` and `/api/stats/songs`.

**Ambient audio constraints** — `getUserMedia` is called with `echoCancellation`, `noiseSuppression`, and `autoGainControl` all set to `false`. This tells Android the mic session is ambient capture rather than a voice call, keeping Bluetooth audio routing in media mode and preventing speakers from switching to phone speaker.

**Spotify polling source-gated** — `startSpotifyPolling` checks `room.musicSource === 'spotify'` before starting and refuses to run in AudD or manual rooms. The Spotify token is only migrated to a room if that room uses Spotify. This prevents Spotify API calls from leaking into AudD sessions.

**On-screen debug log and stats panel** — The Host (Mic) tab includes a toggleable debug panel (blob size, AudD response, errors) and a stats panel (API calls, matches, nulls, retries — per game and cumulative). Stats persist in localStorage on the host device.

**Server-side Spotify polling** — Keeps access token secure and ensures consistent detection across all player devices. Token auto-refreshes before expiry.

**iOS Spotify detection caveat** — Spotify Web API's currently-playing endpoint is unreliable on iPhone. Server relaxes `isPlaying` gate. Manual fallback available in host tab.

**ID-first match detection** — Spotify/iTunes picks carry track/artist IDs. Server matches by ID first, falls back to title/artist string comparison for static pool or manual picks.

**SPOTIFY_ENABLED flag** — Controls whether the Spotify source option appears in the UI. Single env var; no per-user logic needed. Set to `false` to hide Spotify from all users when the dev-mode whitelist would block them.

**Coin flip tiebreaker** — Server randomly selects from tied players on time expiry.

**No in-memory database** — Game state in server memory. Rooms ephemeral. Player slots preserved across disconnects for the life of the server process. Persistent data (leaderboard, stats) written to JSON/SQLite files on disk.

**Leaderboard is name-based** — Same name in a future game accumulates stats. No two players share a name in the same room. Password auth planned.

**Solo mode** — Host plays alone; waiting screen skipped. Server auto-starts countdown after host confirms picks.

**Back button interception** — History API `pushState` on every screen transition. `popstate` listener handles navigation internally. In-game: blocked with confirmation modal.

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

---

## Project Structure

```
pandora-bingo/
  server/
    index.js           Express + Socket.io entry; /api/config, /api/audd/identify,
                       /api/itunes/search, /api/spotify/search, /api/stats/artists,
                       /api/stats/songs; serves client/dist in prod; Spotify polling
                       source-gated; DJ Battle host auto-confirmed on start;
                       Spotify OAuth whitelist error detection + redirect
    game.js            Room state, player management, scoring; all game modes;
                       DJ Battle (playSongDJBattle, endGameDJBattle, djHostTarget,
                       djPenaltyEnabled, djPenaltyAmount, hostScore);
                       artist-only matching; song mode commented out
    stats-db.js        SQLite stats database (better-sqlite3); artist pick/match counts,
                       song played/match counts, game_sessions table; path via STATS_DB_PATH
    audd.js            AudD proxy — multipart POST to api.audd.io; API key server-side only
    dynamic-songs.js   Static ~200-artist pool shuffled to 50 per room; playlist name
                       accepted for future seeding; Last.fm/AI pool generation retired
    songs.js           Static song/artist pools by genre (retained for reference; no longer
                       used for pool generation)
    leaderboard.js     Persistent player stats (JSON); name-based identity; win tracking
    spotify.js         Spotify OAuth, now-playing polling, searchTracks, searchArtists
    leaderboard.json   Auto-generated; persistent player stats (not committed)
    stats.db           Auto-generated locally; on Railway lives at /data/stats.db (not committed)
    .env               Local credentials (not committed)
  client/
    src/
      App.jsx               Screen routing, History API back button, socket reconnect,
                            in-game leave modal
      socket.js             Socket.io client with aggressive reconnection settings
      index.css             Base styles
      components/
        HomeScreen.jsx        Name entry, host setup; playlist name field (all modes);
                              mic detection as default source; Spotify whitelist error
                              detection + disabled card; DJ Battle settings (host target,
                              penalty mode, penalty amount); artist-only mode
        LobbyScreen.jsx       Room code display, player list, start + solo start buttons
        LeaderboardScreen.jsx All-time player stats: matches, wins, games played
        PickScreen.jsx        Artist-only pick flows for all 4 modes; unified useSearch
                              hook (artist search via song title or name); static pool
                              suggestion grid; DJ Battle host waiting notice + playlist display
        GameScreen.jsx        Timer, card, scoreboard, host controls, event toasts;
                              DJ Battle card with separate host/player targets, penalty
                              display, penalty toast; Spotify Jam host panel + player
                              banner; AudD mic capture loop; debug log; stats panel
        EndScreen.jsx         Winner, final scores (DJ host row with djHostTarget);
                              play again settings with all DJ Battle options; retired
                              genre picker + pick mode toggle commented out
        SpotifyCallback.jsx   OAuth callback; whitelist error detection; auto-fallback
                              to mic; session flag + redirect to home with error message
    package.json            vite + @vitejs/plugin-react in dependencies (not devDependencies)
                            so Railway build succeeds with NODE_ENV=production
    dist/                   Built frontend (generated by npm run build; not committed)
  railway.json              Railway build and start commands
  package.json              Root scripts: install:all, build, start, dev
  start.sh                  Local one-command launcher (Vite + Express)
  archive.sh                Snapshot project to ~/pandora-bingo-milestones/<name>/
  .gitignore                Excludes .env, node_modules, client/dist, caches, stats.db
  README_pandora-bingo.md   This file
  REPLIT.md                 Archived Replit deployment guide
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
- v12.0 — Song mode retired (artist-only); genre picker replaced by playlist name field (all modes); Last.fm/AI pool retired → static ~200-artist shuffled pool; Spotify Jam link sharing in host tab; DJ Battle separate host target (`djHostTarget`) + penalty mode (`djPenaltyEnabled`, `djPenaltyAmount`); Spotify whitelist error detection with auto-fallback to mic; mic detection as default source; SQLite stats DB on Railway persistent volume; 60-min default time limit; EndScreen DJ host score fix; `stats-db.js` with artists/songs/game_sessions schema

### Upcoming

- Build StatsScreen UI — sortable artist/song stats table accessible from host tab
- Hook stat recording into game events (pick submission, song played, artist matched)
- Manual fallback grid should show only artists players actually picked, not full pool
- Seed artist suggestion pool from actual Spotify playlist tracks (host provides playlist URL/ID)
- Internal game history database for smart pool generation (play counts, pick frequency, match rate)
- Newlywed targeted guesses — assign a guess to a specific player rather than the field
- Pre-game countdown timer
- Password auth for leaderboard (replace name-based identity)
- Mobile UI refinements
- Spotify playback control (play/pause/skip from within the game)
