# Pandora Bingo

> **v10.3.0** — Mobile reconnect fix, back button interception with in-game leave modal, artist mode default. ✅
> **v10.2.0** — Railway deployment: always-on hosting, no sleep timeouts, public URL on Railway infrastructure. ✅
> **v10.1.0** — iOS Spotify fix: manual song fallback in host tab, auto token refresh, relax isPlaying gate. ✅
> **v10.0.0** — Solo mode, dynamic song pools (Last.fm), leaderboard, host force-start from waiting screen. ✅
> **v9.1.0** — Retro TV game show UI, synthesized sounds, localStorage reconnection, room code badge. ✅
> **v9.0.0** — All three game modes fully functional. Spotify OAuth + live search + ID-based match detection. ✅

A real-time multiplayer music prediction game. Pick songs or artists you think will play — first to match wins.

## How to Play

1. Host creates a room, selects a game mode, and shares the room code
2. Players join via room code from any device on the network
3. Everyone picks songs or artists from the genre pool
4. Songs are detected automatically via Spotify, or the host marks them manually
5. First player to match their target wins
6. If time runs out with a tie, a coin flip decides the winner

## Requirements

- Node.js v18+
- npm
- Spotify account (for Spotify mode)
- Spotify developer app credentials (Client ID and Client Secret)

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
PORT=3002
```

Get credentials at https://developer.spotify.com/dashboard

## Running the Game

### Local (home network / Tailscale)

From the pandora-bingo folder:

```bash
bash start.sh
```

- Backend runs on port 3002
- Frontend runs on port 5174 (Vite dev server)
- Access from other devices via Tailscale: http://100.70.143.100:5174/

Press Ctrl+C to stop both servers.

### Production / Railway (public URL, no Tailscale)

The server serves the built React frontend directly — no Vite dev server needed. Express and the frontend share a single port.

```bash
npm run install:all   # install all dependencies (first time only)
npm run build         # build the React app into client/dist
npm start             # serve everything from port 3002
```

## Deployment

### Railway (live — primary deployment)

The project is deployed on Railway at a public URL — no Tailscale required. Always-on hosting; no sleep timeouts.

The live deployment is at:
```
https://pandora-bingo.up.railway.app
```

Environment variables (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `NODE_ENV`) are set in Railway's Variables tab. The Spotify redirect URI registered in the Spotify Developer Dashboard is:
```
https://pandora-bingo.up.railway.app/auth/spotify/callback
```

#### Deploying updates

Railway auto-deploys on every push to `main`:

```bash
git add .
git commit -m "your message"
git push
```

Railway will pick up the push, run the build command from `railway.json`, and redeploy automatically. No manual shell steps needed.

#### Spotify host whitelist note

The Spotify app is currently in **Development mode**, which limits OAuth access to whitelisted accounts. Only accounts explicitly added in the Spotify Developer Dashboard can authenticate as host. This is sufficient for private game nights. To open hosting to any Spotify user, submit the app for Spotify's Extended Quota review (organizations with 250k+ MAUs only as of May 2025).

### Replit (archived)

The project was previously deployed on Replit. The Replit deployment is no longer the primary host. Railway replaced it due to Replit's free-tier sleep timeouts.

See [REPLIT.md](./REPLIT.md) if you need to redeploy there.

### How production mode works

When `server/index.js` starts, it:
- Serves `client/dist` as static files from the same Express server
- Derives the Spotify OAuth redirect URI dynamically from the request host, so it works on any domain without hardcoding
- Sets CORS to same-origin (no separate frontend port in production)

Local dev is unchanged — `bash start.sh` still runs Vite on 5174 with the proxy to 3002.

---

## Features

### Game Modes

The host selects a game mode when creating a room:

**Standard** — The classic mode. Pick 5 songs or artists you predict will play. First to match all 5 wins.

**Newlywed Bingo** — A social prediction mode inspired by The Newlywed Game. Players try to win on their own picks while secretly sabotaging others by guessing what they chose. See the full rules below.

**Gong Show Bingo** — A chaotic sabotage mode. Pick 10 songs to score points and 5 secret gong songs to cancel other players' points. But if two players gong the same song, the gong backfires and both gongers lose a point. An optional blind mode hides your own picks from yourself until each song plays.

---

### Newlywed Bingo Rules

Each player submits three sets of picks in sequence before the game begins:

**Mains (5)** — Your primary picks. All 5 must play for you to win. Visible to other players on the scoreboard.

**Backups (3)** — Insurance picks. These absorb penalties applied by other players' successful guesses. Not required to play for a normal win, but each one that plays clears one unit of backup debt.

**Secret guesses (3)** — Hidden from all other players during the game. You are predicting songs or artists you think at least one other player included in their mains or backups. Revealed at the end of the game.

#### Penalty rule

When a song plays that matches one of your secret guesses, the server checks whether that song appears in any other player's mains or backups. Every player who had that song in their 8 picks receives one unit of backup debt — meaning one of their backups must also play before they can win. Applies to all affected players simultaneously.

If a player has exhausted all 3 backups, no further debt can be added. They win on their 5 mains alone.

#### Wildcard rule

If 2 of your 3 secret guesses successfully hit (the guessed song plays and was in another player's picks), you earn a wildcard. The server assigns one random unplayed song from the genre pool as a bonus backup slot.

#### Win condition

A player wins when all of the following are true:
- Their main score has reached the match target
- Their backup debt is fully cleared (backups or wildcards played ≥ debt owed)

If time runs out, the player with the highest effective score wins. Uncleared backup debt is factored into tiebreaking. Ties go to a coin flip.

---

### Gong Show Bingo Rules

Each player submits two sets of picks before the game begins:

**Mains (10)** — Songs you predict will play. Each one that plays earns you +1 point.

**Gong songs (5)** — Secret picks. You cannot gong your own main picks. When a gonged song plays, the following logic applies:

- **No gong** — Main pickers score normally.
- **Exactly one gong** — The gong fires. Main pickers are cancelled and receive no point. The gonger is credited.
- **Two or more gongs** — The gong cancels itself. Main pickers score normally. Every duplicate gonger loses 1 point.

When a gong fires, all players see who gonged the song and who lost their point.

#### Blind mode

An optional host toggle (can be changed during the game from the Host Controls tab). When on, each player's picks — both mains and gongs — are hidden from themselves until the moment each song plays. Your card reveals one pick at a time as the music progresses.

---

### Music Sources

The host chooses the music source when creating a room:

**Spotify mode** — The server polls the host's Spotify account every 5 seconds to detect what is currently playing. Songs and artist matches are detected and scored automatically. The host must connect their Spotify account via OAuth before creating the room. Requires an active Spotify session playing music during the game.

**Manual mode** — The host clicks songs as they play in the Host Controls tab. Works with any music source — Spotify, YouTube, radio, live DJ, Pandora, Amazon Music, etc.

### Pick Modes

All three game modes support song mode and artist mode. **Artist mode is the default.**

**Song mode** — Players pick specific songs from a pool. A match occurs when that exact song is detected as playing.

**Artist mode** — Players pick artists from a separate pool. A match occurs when any song by that artist is detected. In artist mode, the matched song titles are shown under the artist name on each player's card. Artist matching is case-insensitive and handles featured artists (e.g. "Ed Sheeran, Denise Chaila" matches "Ed Sheeran").

The song pool and artist pool are independent lists. No artist appears more than once in either pool.

### Genres

6 genres supported, each with 50 songs and 50 artists (dynamically refreshed from Last.fm with static fallback):
- Pop
- Hip-Hop
- Rock
- R&B
- Country
- Electronic

### Win Conditions

- **Matches to win** — 1 to 10 matches required (default: 5)
- **Time limit** — 5 to 60 minutes in 5-minute increments (default: 15)
- The game ends when a player hits the match target OR time runs out
- If time runs out with tied scores, a coin flip determines the winner

### Host Controls

In manual mode, the host has a controls tab to:
- Mark songs as played by clicking them
- View a running list of played songs with artist names
- Add 5 minutes to the clock
- Toggle blind mode on/off (Gong Show only)
- End the game early

In Spotify mode, the host controls tab shows:
- Currently playing track with album art
- Auto-detected songs list
- Collapsible manual fallback list (for iOS detection gaps)
- Add time, blind mode toggle, and end game buttons

### Played Songs History

All players can see a running list of songs that have been played during the game. The played songs list appears on each player's My Card tab, showing the song title and artist for every track detected or marked as played. This updates in real time as the game progresses.

### Real-time Multiplayer

Built on Socket.io. All game events are broadcast instantly to every player in the room — player joins, picks confirmed, songs detected, scores updated, gong events, penalties applied, wildcards awarded, game over.

Players join from any device using the 6-character room code. On Railway, anyone with the URL can join from anywhere. On local, players join via Tailscale.

### Player Limit

2 to 10 players per room.

### Joining and Leaving

Players can join or leave at any time, including during an active game. Late joiners are sent directly to the pick screen and can participate from that point forward — the game clock keeps running while they pick.

The browser back button is intercepted throughout the app — it navigates between app screens rather than exiting the app entirely. Pressing back during an active game shows a styled confirmation modal before leaving. The host receives a stronger warning noting that leaving ends the game for all players.

If a player disconnects or accidentally navigates away, their slot and game state are preserved. They can rejoin the same room at any time — the app automatically reconnects from localStorage on return.

### Play Again

At the end of a game the room stays open with the same code. The host can start a new game from the end screen, optionally changing any settings (mode, genre, pick mode, time limit, music source) before kicking off the next round. All current players carry over and new players can join before the next game starts.

### Session Persistence

Player identity is stored in localStorage on join. This survives tab close, browser restart, and accidental navigation. On return, the client automatically emits a rejoin event and the server restores state from the existing player slot. If the stored session is expired or the room no longer exists, the player joins fresh as a new participant.

When the Socket.io connection drops (e.g. mobile browser suspension), the client reconnects automatically with infinite retry and re-emits the rejoin event on reconnect, putting the socket back into the room's broadcast channel without requiring a manual refresh.

## Spotify Integration

The host authenticates via Spotify OAuth before creating a room. The server:
1. Redirects the host to Spotify's authorization page
2. Receives the access token via callback
3. Associates the token with the game room
4. Polls the Spotify now-playing endpoint every 5 seconds during gameplay
5. Automatically triggers matches when a picked song or artist is detected

The Spotify redirect URI is derived dynamically from the request host — no hardcoded URL. Register whichever URI matches your deployment in the Spotify Developer Dashboard:

- **Local:** `http://127.0.0.1:3002/auth/spotify/callback`
- **Railway:** `https://pandora-bingo.up.railway.app/auth/spotify/callback`

Host setup state (genre, mode, all settings) is saved to session storage before the OAuth redirect and restored automatically on return, so no settings are lost during authentication.

Future: Last.fm scrobbling support is planned as an alternative to Spotify for users who prefer a different music source.

## Design Decisions

**Separate song and artist pools** — Artist mode uses a dedicated artist list rather than deriving artists from the song list. This prevents duplicates and gives each mode its own strategic pool.

**Artist mode is the default pick mode** — Artist picks are more forgiving and better suited to Spotify's now-playing detection, which returns full artist metadata. Song titles vary across regions and releases; artist names are more stable.

**Server-side Spotify polling** — The server handles all Spotify API calls rather than the client. This keeps the access token secure and ensures all players see consistent match detection regardless of their device. The access token is automatically refreshed before expiry (tokens last 1 hour) so long game sessions don't lose detection mid-game.

**iOS Spotify detection caveat** — The Spotify Web API's currently-playing endpoint is unreliable when playback is on an iPhone (iOS app uses a local playback context the API can't always see). The server relaxes the `isPlaying` requirement and still processes tracks when the API returns the track data. If auto-detection still misses a song, the host has a manual fallback list in the Host Controls tab (collapsible, labeled "Song not detected?") — tap any song to mark it played.

**Server-side Spotify search** — The `/api/spotify/search` endpoint proxies pick-phase search queries through the server using the room's stored host token. The client never holds or uses the Spotify access token directly.

**Track change detection** — Matches are triggered only when a new track starts playing, not on every poll. This prevents duplicate matches and handles the 5-second polling interval correctly.

**ID-first match detection** — When picks are made via Spotify search, they carry a Spotify track ID (songs) or artist ID (artists). The server matches by ID first, falling back to title/artist string comparison for picks from the static pool or manual mode. This eliminates false positives from alternate titles, featured artist formatting, and capitalization inconsistencies.

**Coin flip tiebreaker** — Simple and fair. The server randomly selects a winner from tied players when time expires.

**No database** — Game state lives in server memory. Rooms are ephemeral — created and destroyed per session. Player slots within a room are preserved across disconnects for the life of the server process.

**Leaderboard is name-based, no passwords** — Players are identified by their display name. If the same name is entered again in a future game, the server assumes it's the same person and accumulates their stats. Two players cannot share a name in the same room. This is intentionally simple — password auth is planned for a future milestone.

**Dynamic pools with persistent cache** — On room creation the server fetches fresh top tracks/artists for the genre from the Last.fm API. Results are saved to `server/song-cache.json`. If the API is unreachable, the last saved list is used. If no cache exists yet, the hardcoded static pool in `songs.js` is the final fallback.

**Solo mode skips the waiting screen** — When the host starts a solo game, the server sets a `soloMode` flag on the room. After the host confirms picks, the server immediately calls `startCountdown` and emits `game:playing`, bypassing the waiting-for-players phase entirely.

**Back button interception** — The app uses the browser History API (`pushState`) to push an entry on every screen transition. A `popstate` listener intercepts the back button and handles navigation internally. During an active game, back button presses are blocked and replaced with a styled confirmation modal. This prevents accidental exits while still allowing deliberate navigation within the app.

**Mobile socket reconnection** — Mobile browsers (especially Safari) suspend WebSocket connections when a tab goes to background. Socket.io is configured with infinite reconnection retries. On every `connect` event (including reconnects), the client re-emits `player:rejoin` with the stored session, putting the socket back into the server-side room broadcast channel automatically.

**Newlywed guesses are server-only secrets** — Secret guess picks are stored on the server but never broadcast to other clients. Only the guessing player sees their own guesses on their card. Hits are computed server-side when a song plays.

**Wildcard randomness is server-side** — The server selects a random unplayed song from the pool that the earner hasn't already picked. This keeps the assignment fair and consistent across all clients.

**Backup debt is additive but capped** — Each successful guess hit by any player adds one unit of debt to affected players. Once all of a player's backups and wildcards are exhausted, no further debt can accumulate, preventing runaway penalties.

**Gong picks are server-only secrets** — Gong song selections are stored server-side and never sent to other clients. The client only receives gong outcomes (fired, cancelled, backfire) after the fact via the `game:gong_events` event.

**Gong backfire is intentional game design** — Duplicate gonging is a risk, not a bug. Players must guess what others will gong, adding a meta-strategy layer. The penalty keeps gong picks meaningful rather than purely upside.

**Blind mode is a room-level toggle, changeable mid-game** — The host can flip blind mode on or off from the Host Controls tab at any time during the game. This allows the host to reveal everyone's remaining hidden picks at a dramatic moment if desired.

**localStorage for reconnection** — Player ID and room code are stored in localStorage on join. This survives tab close, browser restart, and accidental navigation — not just page reloads. On return, the client automatically emits a rejoin event and the server restores state from the existing player slot.

**Spotify redirect preserves setup state** — Before redirecting to Spotify OAuth, the host's in-progress room settings are saved to session storage. On return from Spotify, the settings are restored and the user lands back on the host setup screen with everything pre-filled.

**Dynamic Spotify redirect URI** — The server derives the OAuth callback URL from the incoming request host (`x-forwarded-host` → `host`). This means the same codebase works locally, on Tailscale, on Replit, and on Railway without any code changes — only the registered Spotify redirect URI needs to match the deployment.

**Single-port production mode** — In production, Express serves the Vite-built frontend as static files from `client/dist`. The Socket.io path and all API routes share the same origin, eliminating CORS entirely. Local dev still uses the Vite dev server on 5174 for HMR.

**Static pool as fallback** — The static `songs.js` genre pools are still used in manual-mode rooms and as the default browsable grid when no search query is active in Spotify rooms. This keeps the game fully playable without Spotify and provides familiar picks to browse while players think.

## Project Structure
```
pandora-bingo/
  server/
    index.js           Express + Socket.io entry point; serves client/dist in production;
                       includes /api/spotify/search proxy endpoint
    game.js            Room state, player management, scoring logic, all game modes;
                       ID-first match detection with string fallback
    songs.js           Static song and artist pools by genre (50 each; final fallback)
    dynamic-songs.js   Last.fm API fetch with disk cache; falls back to cache then static
    leaderboard.js     Persistent player stats (JSON file); name-based identity; win tracking
    spotify.js         Spotify OAuth, now-playing polling, searchTracks, searchArtists
    song-cache.json    Auto-generated; Last.fm pool cache per genre (not committed)
    leaderboard.json   Auto-generated; persistent player stats (not committed)
    .env               Spotify credentials for local dev (not committed to git)
  client/
    src/
      App.jsx               Screen routing, history API back button handling,
                            socket reconnect handler, in-game leave modal
      socket.js             Socket.io client with aggressive reconnection settings
      index.css             Base styles
      components/
        HomeScreen.jsx        Name entry, host setup, game mode + source selection;
                              leaderboard link; artist mode default
        LobbyScreen.jsx       Room code, player list, start + solo start buttons
        LeaderboardScreen.jsx All-time player stats: matches, wins, games played
        PickScreen.jsx        Pick flows for all 3 modes; SearchPicker with live Spotify
                              search + static pool fallback; SelectedChips; ProgressDots
        GameScreen.jsx        Timer, card, scoreboard, host controls, event toasts;
                              ID-first client-side match display
        EndScreen.jsx         Winner, final scores, play again with settings;
                              artist mode default
        SpotifyCallback.jsx   OAuth callback handler
    dist/                   Built frontend (generated by npm run build; not committed)
  .replit         Replit run/build config
  replit.nix      Replit Nix environment (Node 20)
  REPLIT.md       Replit deployment guide
  railway.json    Railway build and start commands
  package.json    Root scripts: install:all, build, start, dev
  start.sh        Local one-command launcher (Vite + Express)
  .gitignore      Excludes .env, node_modules, client/dist
  README.md       This file
```

## Roadmap

**Completed**
- v1-foundation — Core multiplayer, room codes, song mode
- v2-artist-mode — Artist picks with separate 50-item pool
- v3-spotify — Spotify OAuth, auto-detection, now-playing polling
- v4-played-history — Played songs list visible to all players in real time
- v5-newlywed — Newlywed Bingo game mode with mains, backups, secret guesses, backup debt, wildcards
- v6-gongshow — Gong Show Bingo game mode with mains, gong picks, backfire logic, blind mode
- v7-bugfixes-and-persistence — Spotify redirect fix, play again in same room, mid-game join, player reconnection with session persistence
- v8-replit — Production build mode, Replit deployment, dynamic Spotify redirect URI, single-port Express serving, public URL with no Tailscale required
- v9-live-search — Live Spotify search in pick phase: search-as-you-type against full Spotify catalog; picks store track/artist IDs; server match detection ID-first with string fallback; artist matching uses Spotify artist IDs from now-playing payload; album art thumbnails in search results and pick chips; static genre pool retained as fallback for manual-mode rooms
- v9.1-ui-overhaul — Retro TV game show visual theme (muted neons, CRT scanline, stage curtains, Orbitron font, neon glow animations); Web Audio API synthesized sound effects (hit chime, gong hit, backfire buzz, wildcard sweep, penalty thud, win fanfare); room code corner badge on all in-game screens; localStorage reconnection (survives tab close/browser restart)
- v10.0-platform — Solo mode (host plays alone, waiting screen skipped); dynamic song/artist pools fetched from Last.fm API with persistent disk cache and static fallback; persistent leaderboard tracking matches, wins, and games played per player (name-based, no passwords); name uniqueness enforced per room; host can force-start from the waiting screen after confirming their own picks
- v10.1-spotify-ios — Manual song fallback added to Spotify host tab (collapsible, clearly labeled as iOS workaround); Spotify access token auto-refreshes before expiry during polling; removed strict `isPlaying` gate that blocked detection during brief Spotify state gaps
- v10.2-railway — Migrated primary deployment from Replit to Railway; always-on hosting with no sleep timeouts; auto-deploy on git push; `railway.json` added with build and start commands; `NODE_ENV=production` triggers production mode; Spotify redirect URI updated to Railway domain; confirmed working on Pop!_OS, Android, and iPhone
- v10.3-mobile-ux — Mobile socket reconnect fix (infinite retry + rejoin on reconnect event so updates resume after browser suspension without manual refresh); back button interception via History API with popstate handler; in-game leave modal (styled, host-specific warning, shows room code to guests); artist mode set as default pick mode

**Upcoming**

**Mobile music source detection (major)**
Allow the host to play music from any app on their phone and have the game detect what's playing. Approaches under consideration:
- **Spotify on mobile** — The existing Spotify OAuth + now-playing polling already works when the host's phone is the active Spotify device. No code changes needed.
- **Last.fm scrobbling** — Any music app that scrobbles to Last.fm can feed the now-playing endpoint. Planned as a source option alongside Spotify.
- **AudD / ACRCloud audio fingerprinting** — The host's browser captures a short audio sample from the device microphone and sends it to a fingerprinting API for identification. Works with any music source. Requires mic permission and an API key.
- **Manual fallback** — Manual mode already supports any source.

- Newlywed targeted guesses — assign a guess to a specific player rather than the field
- Spotify playback control (play/pause/skip from within the game)
- Pre-game countdown timer
- Last.fm scrobbling as alternative music source
- Mobile-optimized UI improvements
- Password auth for leaderboard (replace name-based identity)
