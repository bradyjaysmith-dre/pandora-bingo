# Pandora Bingo

> **v10.6.0** — AudD fully operational: 15s interval, 60s post-match cooldown, per-game + cumulative stats panel, Spotify polling leak fixed, Railway build fix. ✅
> **v10.5.0** — AudD mic detection working: iTunes pick search, EndScreen source fix, 6s clip / retry-on-null. ✅
> **v10.4.0** — AudD audio fingerprinting source, conditional Spotify visibility, `/api/config` endpoint. ✅
> **v10.3.0** — Mobile reconnect fix, back button interception with in-game leave modal, artist mode default. ✅
> **v10.2.0** — Railway deployment: always-on hosting, no sleep timeouts, public URL on Railway infrastructure. ✅
> **v10.1.0** — iOS Spotify fix: manual song fallback in host tab, auto token refresh, relax isPlaying gate. ✅
> **v10.0.0** — Solo mode, dynamic song pools (Last.fm), leaderboard, host force-start from waiting screen. ✅

A real-time multiplayer music prediction game. Pick songs or artists you think will play — first to match wins. Designed to run on phones and any modern browser — no app install required.

## How to Play

1. Host creates a room, selects a game mode, and shares the room code
2. Players join via room code from any device
3. Everyone picks songs or artists from the genre pool
4. Songs are detected automatically (Spotify or mic) or the host marks them manually
5. First player to match their target wins
6. If time runs out with a tie, a coin flip decides the winner

## Requirements

- Node.js v18+
- npm
- Spotify account + developer credentials (for Spotify source only)
- AudD API key (recommended — get one at audd.io; Indie plan $5/month for 1,000 requests; keyless mode has a very low daily limit)

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
PORT=3002
```

- `SPOTIFY_ENABLED` — set to `false` to hide the Spotify source option from all users (useful when Spotify dev mode limits who can auth)
- `AUDD_API_KEY` — get a key at [audd.io](https://audd.io). Indie plan: $5/month for 1,000 requests. Keyless mode has a very low daily limit — not suitable for regular use
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

The Spotify app is in **Development mode**, limiting OAuth to whitelisted accounts only. Set `SPOTIFY_ENABLED=false` in Railway Variables to hide the Spotify option from guests. Flip it to `true` when a whitelisted host is running a session.

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

**Standard** — Pick 5 songs or artists you predict will play. First to match all 5 wins.

**Newlywed Bingo** — A social prediction mode. Players try to win on their own picks while secretly sabotaging others by guessing what they chose.

**Gong Show Bingo** — A chaotic sabotage mode. Pick 10 songs to score points and 5 secret gong songs to cancel other players' points. Duplicate gongers cancel each other and both lose a point. Optional blind mode hides picks until each song plays.

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

The host selects a source when creating a room:

**Auto-detect (mic)** — The host's browser captures short audio clips via microphone every 15 seconds and identifies the song via AudD audio fingerprinting. Works with any music app. Best results when the host device is near the speaker. No Spotify account required. Includes iTunes catalog search during the pick phase and a manual fallback grid. Multiple simultaneous games on different devices work independently with no interference.

**Spotify** — Server polls the host's Spotify account every 5 seconds. Fully automatic match detection. Requires Spotify OAuth and a whitelisted account (dev mode). Only shown when `SPOTIFY_ENABLED=true`. Includes live Spotify catalog search during the pick phase.

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

All three game modes support song mode and artist mode. **Artist mode is the default.**

**Song mode** — Players pick specific songs. Match occurs when that exact song is detected.

**Artist mode** — Players pick artists. Match occurs when any song by that artist is detected. Matched song titles shown under the artist name. Matching is case-insensitive and handles featured artists.

Song and artist pools are independent. No artist appears more than once in either pool.

### Pick Phase Search

- **Spotify rooms** — Live search against the full Spotify catalog (search-as-you-type, 300ms debounce). Picks carry Spotify track/artist IDs for reliable match detection.
- **AudD rooms** — Live search against the iTunes catalog. Same UX as Spotify search. Picks carry iTunes IDs.
- **Manual rooms** — Genre pool only; no search.

### Genres

6 genres, 50 songs and 50 artists each (dynamically refreshed from Last.fm, static fallback):
- Pop · Hip-Hop · Rock · R&B · Country · Electronic

### Win Conditions

- Matches to win: 1–10 (default 5)
- Time limit: 5–60 minutes in 5-minute increments (default 15)
- Game ends when a player hits the target OR time runs out
- Tied scores at time expiry → coin flip

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

**Separate song and artist pools** — Prevents duplicates and gives each mode its own strategic pool.

**Artist mode is the default** — More forgiving and better suited to detection (artist names more stable than song titles across regions/releases).

**AudD detection is client-driven** — The host's browser captures audio and POSTs blobs to `/api/audd/identify`. The server proxies to AudD and returns results. The API key never leaves the server. Deduplication via `auddLastTrack` map prevents the same song being scored twice from consecutive clips.

**AudD polling conservation** — After a successful identification, the client pauses captures for 60 seconds. A song typically plays for 3–4 minutes; there's no value in burning API calls on clips of the same track. Combined with the 15-second interval and retry-on-null logic, a typical game night uses 20–40 calls against a monthly budget of 1,000.

**Ambient audio constraints** — `getUserMedia` is called with `echoCancellation`, `noiseSuppression`, and `autoGainControl` all set to `false`. This tells Android the mic session is ambient capture rather than a voice call, keeping Bluetooth audio routing in media mode and preventing speakers from switching to phone speaker.

**Spotify polling source-gated** — `startSpotifyPolling` checks `room.musicSource === 'spotify'` before starting and refuses to run in AudD or manual rooms. The Spotify token is only migrated to a room if that room uses Spotify. This prevents Spotify API calls from leaking into AudD sessions.

**iTunes search for AudD rooms** — `/api/itunes/search` uses Apple's free public search API, no key required. Returns the same shape as Spotify search (`{ id, title, artist, albumArt }` for tracks; `{ id, name }` for artists). The `useSearch` hook in PickScreen routes to Spotify or iTunes based on `room.musicSource`.

**On-screen debug log and stats panel** — The Host (Mic) tab includes a toggleable debug panel (blob size, AudD response, errors) and a stats panel (API calls, matches, nulls, retries — per game and cumulative). Stats persist in localStorage on the host device.

**Server-side Spotify polling** — Keeps access token secure and ensures consistent detection across all player devices. Token auto-refreshes before expiry.

**iOS Spotify detection caveat** — Spotify Web API's currently-playing endpoint is unreliable on iPhone. Server relaxes `isPlaying` gate. Manual fallback available in host tab.

**ID-first match detection** — Spotify/iTunes picks carry track/artist IDs. Server matches by ID first, falls back to title/artist string comparison for static pool or manual picks.

**SPOTIFY_ENABLED flag** — Controls whether the Spotify source option appears in the UI. Single env var; no per-user logic needed. Set to `false` to hide Spotify from all users when the dev-mode whitelist would block them.

**Coin flip tiebreaker** — Server randomly selects from tied players on time expiry.

**No database** — Game state in server memory. Rooms ephemeral. Player slots preserved across disconnects for the life of the server process.

**Leaderboard is name-based** — Same name in a future game accumulates stats. No two players share a name in the same room. Password auth planned.

**Dynamic pools with persistent cache** — Last.fm API fetched on room creation, saved to `server/song-cache.json`. Cache used on API failure. Static `songs.js` is the final fallback.

**Solo mode** — Host plays alone; waiting screen skipped. Server auto-starts countdown after host confirms picks.

**Back button interception** — History API `pushState` on every screen transition. `popstate` listener handles navigation internally. In-game: blocked with confirmation modal.

**Mobile socket reconnection** — Infinite retry on drop. On every `connect` event, client re-emits `player:rejoin`.

**Newlywed guesses server-only** — Never broadcast to other clients. Hits computed server-side when a song plays.

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
                       /api/itunes/search, /api/spotify/search; serves client/dist in prod;
                       Spotify polling source-gated to prevent leaking into AudD rooms
    game.js            Room state, player management, scoring; all game modes;
                       ID-first match detection with string fallback
    audd.js            AudD proxy — multipart POST to api.audd.io; API key server-side only
    songs.js           Static song/artist pools by genre (50 each; final fallback)
    dynamic-songs.js   Last.fm API fetch with disk cache; falls back to cache then static
    leaderboard.js     Persistent player stats (JSON); name-based identity; win tracking
    spotify.js         Spotify OAuth, now-playing polling, searchTracks, searchArtists
    song-cache.json    Auto-generated; Last.fm pool cache per genre (not committed)
    leaderboard.json   Auto-generated; persistent player stats (not committed)
    .env               Local credentials (not committed)
  client/
    src/
      App.jsx               Screen routing, History API back button, socket reconnect,
                            in-game leave modal
      socket.js             Socket.io client with aggressive reconnection settings
      index.css             Base styles
      components/
        HomeScreen.jsx        Name entry, host setup; fetches /api/config for source options;
                              Manual / AudD / Spotify source cards; artist mode default
        LobbyScreen.jsx       Room code display, player list, start + solo start buttons
        LeaderboardScreen.jsx All-time player stats: matches, wins, games played
        PickScreen.jsx        Pick flows for all 3 modes; unified useSearch hook (Spotify +
                              iTunes); SearchPicker; SelectedChips; ProgressDots
        GameScreen.jsx        Timer, card, scoreboard, host controls, event toasts;
                              AudD mic capture loop with ambient constraints; 15s interval;
                              60s post-match cooldown; audio input device selector;
                              on-screen debug log; per-game + cumulative stats panel
        EndScreen.jsx         Winner, final scores, play again with settings;
                              fetches /api/config for source options; artist mode default
        SpotifyCallback.jsx   OAuth callback handler
    package.json            vite + @vitejs/plugin-react in dependencies (not devDependencies)
                            so Railway build succeeds with NODE_ENV=production
    dist/                   Built frontend (generated by npm run build; not committed)
  railway.json              Railway build and start commands
  package.json              Root scripts: install:all, build, start, dev
  start.sh                  Local one-command launcher (Vite + Express)
  archive.sh                Snapshot project to ~/pandora-bingo-milestones/<name>/
  .gitignore                Excludes .env, node_modules, client/dist, caches
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

### Upcoming

- Manual fallback in host controls should show only songs/artists players actually picked, not full genre pool
- In AudD artist mode, exploit artist-only matching to potentially improve detection accuracy
- Newlywed targeted guesses — assign a guess to a specific player rather than the field
- Pre-game countdown timer
- Password auth for leaderboard (replace name-based identity)
- Mobile UI refinements
- Spotify playback control (play/pause/skip from within the game)
