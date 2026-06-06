require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getGenres, getSongPool, getArtistPool } = require('./songs');
const game = require('./game');
const spotify = require('./spotify');
const audd = require('./audd');
const lb = require('./leaderboard');
const { getDynamicPool } = require('./dynamic-songs');

const app = express();
const PORT = process.env.PORT || 3002;

// ── Origin resolution ────────────────────────────────────────────────────────
// On Replit, REPLIT_DEV_DOMAIN or REPLIT_DOMAINS is set.
// Locally, we allow the Vite dev server origins.
function getAllowedOrigins() {
  const origins = [];
  // Replit: single public URL
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(',').forEach(d => origins.push(`https://${d.trim()}`));
  }
  // Local dev origins
  origins.push(
    'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176',
    'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176',
    'http://100.70.143.100:5174', 'http://100.70.143.100:5175', 'http://100.70.143.100:5176',
  );
  return origins;
}

// In production (Replit), the frontend is served from the same origin as the
// server, so CORS is only needed for local dev. We allow all origins in that
// mode to keep Replit previews working without knowing the exact subdomain.
const isProduction = !!(process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS || process.env.NODE_ENV === 'production');

// SPOTIFY_ENABLED controls whether the Spotify source option is shown in the UI.
// Set to 'false' in Railway env vars to hide it from non-whitelisted guests.
// Defaults to true so local dev keeps working without extra config.
const SPOTIFY_ENABLED = process.env.SPOTIFY_ENABLED !== 'false';

app.use(cors({
  origin: isProduction ? true : getAllowedOrigins(),
  credentials: true,
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: isProduction ? true : getAllowedOrigins(),
    methods: ['GET', 'POST'],
  },
});

const spotifyTokens = new Map();
const nowPlayingIntervals = new Map();
const auddIntervals = new Map();

// ── Helper: derive the public base URL for Spotify redirects ─────────────────
function getPublicBaseUrl(req) {
  // Replit sets this
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  // Fall back to the request origin/host
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// ── REST routes ──────────────────────────────────────────────────────────────

app.get('/api/genres', (req, res) => res.json(getGenres()));

// ── App config — tells the client which sources are available ────────────────
// spotifyAvailable is driven by SPOTIFY_ENABLED env var (default: true).
// Set SPOTIFY_ENABLED=false on Railway to hide Spotify from all users.
app.get('/api/config', (req, res) => {
  res.json({ spotifyAvailable: SPOTIFY_ENABLED });
});

// ── AudD audio fingerprinting proxy ─────────────────────────────────────────
// Accepts a raw audio blob (WebM/Opus from the host's MediaRecorder),
// forwards it to AudD, and returns { title, artist } or { result: null }.
// The API key never leaves the server.
app.post('/api/audd/identify', async (req, res) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const audioBuffer = Buffer.concat(chunks);
      if (!audioBuffer.length) return res.status(400).json({ error: 'Empty audio body' });
      const result = await audd.identify(audioBuffer);
      res.json({ result }); // result is { title, artist } or null
    } catch (err) {
      console.error('AudD identify error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(lb.getLeaderboard());
});

app.get('/api/songs/:genre', (req, res) => {
  const pool = getSongPool(req.params.genre);
  if (!pool.length) return res.status(404).json({ error: 'Genre not found' });
  res.json(pool);
});

app.get('/api/artists/:genre', (req, res) => {
  const pool = getArtistPool(req.params.genre);
  if (!pool.length) return res.status(404).json({ error: 'Genre not found' });
  res.json(pool);
});

app.get('/auth/spotify', (req, res) => {
  res.redirect(spotify.getAuthUrl());
});

app.get('/auth/spotify/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokens = await spotify.handleCallback(code);
    const base = getPublicBaseUrl(req);
    res.redirect(
      `${base}/spotify-callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&expires_in=${tokens.expiresIn}`
    );
  } catch (err) {
    console.error('Spotify auth error:', err);
    res.status(500).send('Spotify authentication failed');
  }
});

app.get('/api/spotify/playlists', async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) return res.status(401).json({ error: 'No access token' });
  try {
    const playlists = await spotify.getUserPlaylists(access_token);
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search endpoint — used during pick phase so players can search the Spotify catalog.
// Requires the room code so the server can use the host's stored access token.
app.get('/api/spotify/search', async (req, res) => {
  const { q, type = 'track', room } = req.query;
  if (!q || !q.trim()) return res.json([]);
  // Get the host token for this room
  const tokens = spotifyTokens.get(room);
  if (!tokens) return res.status(401).json({ error: 'No Spotify token for this room' });
  try {
    if (type === 'artist') {
      const results = await spotify.searchArtists(tokens.accessToken, q.trim());
      res.json(results);
    } else {
      const results = await spotify.searchTracks(tokens.accessToken, q.trim());
      res.json(results);
    }
  } catch (err) {
    console.error('Spotify search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── iTunes search — used during pick phase in AudD rooms ────────────────────
// Free, no key required. Returns tracks or artists from Apple's catalog.
// type=track returns songs; type=musicArtist returns artists.
app.get('/api/itunes/search', async (req, res) => {
  const { q, type = 'track' } = req.query;
  if (!q || !q.trim()) return res.json([]);
  try {
    const entity = type === 'artist' ? 'musicArtist' : 'song';
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q.trim())}&entity=${entity}&limit=15&media=music`;
    const response = await fetch(url);
    const data = await response.json();
    if (type === 'artist') {
      const seen = new Set();
      const results = (data.results || [])
        .filter(a => { if (seen.has(a.artistName)) return false; seen.add(a.artistName); return true; })
        .map(a => ({ name: a.artistName, id: String(a.artistId) }));
      res.json(results);
    } else {
      const results = (data.results || []).map(t => ({
        title: t.trackName,
        artist: t.artistName,
        id: String(t.trackId),
        albumArt: t.artworkUrl60 || null,
      }));
      res.json(results);
    }
  } catch (err) {
    console.error('iTunes search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// Serve the Vite build from client/dist. The SPA catch-all must come AFTER
// all API routes so that /api/* and /auth/* are handled by Express first.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback — anything not matched above serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── Socket.io ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ── Rejoin existing session ──────────────────────────────────────────────
  socket.on('player:rejoin', ({ roomCode, playerId }) => {
    const result = game.rejoinRoom(roomCode, playerId);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    socket.data.isHost = result.room.hostId === playerId;
    socket.emit('room:rejoined', { room: result.room, playerId });
    io.to(roomCode).emit('lobby:updated', { room: result.room });
    console.log('Rejoined:', playerId, 'room:', roomCode, 'phase:', result.room.phase);
  });

  // ── Create room ──────────────────────────────────────────────────────────
  socket.on('host:create', ({ hostName, genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode }) => {
    const hostId = uuidv4();
    const room = game.createRoom({ hostId, hostName, genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode });
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.playerId = hostId;
    socket.data.isHost = true;
    if (spotifyTokens.has(socket.id)) {
      spotifyTokens.set(room.code, spotifyTokens.get(socket.id));
      spotifyTokens.delete(socket.id);
      console.log('Migrated Spotify token to room', room.code);
    }
    socket.emit('room:created', { room, playerId: hostId });
    console.log('Room created:', room.code, 'by', hostName, 'mode:', gameMode, 'source:', musicSource);
    if (musicSource === 'audd') startAuddPolling(room.code);
    // Register host in leaderboard
    lb.getOrCreate(hostName);
    // Kick off async dynamic pool refresh — silent fail
    getDynamicPool(genre).then(({ songs, artists }) => {
      const r = game.getRoom(room.code);
      if (r) {
        r.songPool   = songs;
        r.artistPool = artists;
        socket.emit('room:pool_updated', { songPool: songs, artistPool: artists });
      }
    }).catch(() => {});
  });

  // ── Reset room for new game ──────────────────────────────────────────────
  socket.on('host:reset', ({ genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode }) => {
    const { roomCode } = socket.data;
    stopSpotifyPolling(roomCode);
    const result = game.resetRoom(roomCode, { genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode });
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('room:reset', { room: result.room });
    console.log('Room reset:', roomCode);
    // Refresh dynamic pool for new genre
    getDynamicPool(genre).then(({ songs, artists }) => {
      const r = game.getRoom(roomCode);
      if (r) {
        r.songPool   = songs;
        r.artistPool = artists;
        socket.emit('room:pool_updated', { songPool: songs, artistPool: artists });
      }
    }).catch(() => {});
  });

  // ── Join ─────────────────────────────────────────────────────────────────
  socket.on('player:join', ({ playerName, roomCode }) => {
    const playerId = uuidv4();
    // Check for duplicate name in this room
    const existingRoom = game.getRoom(roomCode);
    if (existingRoom) {
      const nameTaken = existingRoom.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (nameTaken) {
        socket.emit('error', { message: 'That name is already taken in this room. Pick a different one!' });
        return;
      }
    }
    const result = game.joinRoom(roomCode, { playerId, playerName });
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    socket.data.isHost = false;
    const room = result.room;
    const player = room.players.find(p => p.id === playerId);
    socket.emit('room:joined', { room, playerId });
    io.to(roomCode).emit('lobby:updated', { room });
    if (room.phase === 'playing' && player && player.lateJoin) {
      socket.emit('game:picking', { room });
    }
    // Register in leaderboard (no-op if already exists)
    lb.getOrCreate(playerName);
    console.log(playerName, result.rejoined ? 'rejoined' : 'joined', roomCode);
  });

  // ── Start (move to pick phase) ───────────────────────────────────────────
  socket.on('host:start', () => {
    const { roomCode } = socket.data;
    const result = game.startGame(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('game:picking', { room: result.room });
  });

  // ── Solo start ───────────────────────────────────────────────────────────
  socket.on('host:solo_start', () => {
    const { roomCode } = socket.data;
    const room = game.getRoom(roomCode);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    room.soloMode = true;
    const result = game.startGame(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('game:picking', { room: result.room });
  });

  // ── Standard picks ───────────────────────────────────────────────────────
  socket.on('player:picks', ({ picks }) => {
    const { roomCode, playerId } = socket.data;
    const result = game.submitPicks(roomCode, playerId, picks);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    socket.emit('picks:confirmed');
    io.to(roomCode).emit('lobby:updated', { room: result.room });
    checkAllConfirmedAndStart(roomCode);
  });

  // ── Newlywed picks ───────────────────────────────────────────────────────
  socket.on('player:newlywed_picks', ({ mains, backups, guesses }) => {
    const { roomCode, playerId } = socket.data;
    const result = game.submitNewlywedPicks(roomCode, playerId, { mains, backups, guesses });
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    socket.emit('picks:confirmed');
    io.to(roomCode).emit('lobby:updated', { room: result.room });
    checkAllConfirmedAndStart(roomCode);
  });

  // ── Gong Show picks ──────────────────────────────────────────────────────
  socket.on('player:gongshow_picks', ({ mains, gongs }) => {
    const { roomCode, playerId } = socket.data;
    const result = game.submitGongShowPicks(roomCode, playerId, { mains, gongs });
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    socket.emit('picks:confirmed');
    io.to(roomCode).emit('lobby:updated', { room: result.room });
    checkAllConfirmedAndStart(roomCode);
  });

  function checkAllConfirmedAndStart(roomCode) {
    const room = game.getRoom(roomCode);
    if (!room) return;
    if (room.phase === 'playing') return;
    if (room.phase !== 'picking') return;
    // Solo mode: only one player needed; auto-start as soon as they confirm
    const allConfirmed = room.soloMode
      ? room.players.every(p => p.confirmed)
      : room.players.every(p => p.confirmed);
    if (allConfirmed) {
      const startResult = game.startCountdown(roomCode);
      io.to(roomCode).emit('game:playing', { room: startResult.room });
      scheduleTimer(roomCode);
      if (startResult.room.musicSource === 'spotify' && spotifyTokens.has(roomCode)) {
        console.log('Auto-starting Spotify polling for room', roomCode);
        startSpotifyPolling(roomCode);
      }
      if (startResult.room.musicSource === 'audd') {
        console.log('AudD source selected for room', roomCode, '— waiting for host mic clips');
      }
    }
  }

  // ── Force-start with grace period ─────────────────────────────────────────
  socket.on('host:force_start', () => {
    const { roomCode, isHost } = socket.data;
    if (!isHost) return;
    const room = game.getRoom(roomCode);
    if (!room || room.phase !== 'picking') return;

    const GRACE_SECONDS = 30;

    // Confirm all unconfirmed players with whatever picks they have so far
    // (empty picks are fine — they just won't match anything)
    room.players.forEach(p => { if (!p.confirmed) p.confirmed = true; });

    // Start the game immediately
    const startResult = game.startCountdown(roomCode);
    if (startResult.error) { socket.emit('error', { message: startResult.error }); return; }

    // Broadcast: game is live, but grace period is active for slow pickers
    io.to(roomCode).emit('game:playing', { room: startResult.room });
    io.to(roomCode).emit('game:grace_period', { seconds: GRACE_SECONDS });

    scheduleTimer(roomCode);
    if (startResult.room.musicSource === 'spotify' && spotifyTokens.has(roomCode)) {
      startSpotifyPolling(roomCode);
    }
    if (startResult.room.musicSource === 'audd') {
      console.log('AudD source selected for room', roomCode, '— waiting for host mic clips');
    }
  });

  socket.on('host:countdown_done', () => {
    const { roomCode } = socket.data;
    const result = game.startCountdown(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('game:playing', { room: result.room });
    scheduleTimer(roomCode);
    const spotifyRoom = game.getRoom(roomCode);
    if (spotifyRoom && spotifyRoom.musicSource === 'spotify' && spotifyTokens.has(roomCode)) {
      startSpotifyPolling(roomCode);
    }
    if (spotifyRoom && spotifyRoom.musicSource === 'audd') {
      console.log('AudD source selected for room', roomCode, '— waiting for host mic clips');
    }
  });

  // ── Blind mode toggle (Gong Show) ────────────────────────────────────────
  socket.on('host:toggle_blind', () => {
    const { roomCode } = socket.data;
    const result = game.toggleBlindMode(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('game:updated', { room: result.room });
  });

  // ── Spotify ──────────────────────────────────────────────────────────────
  socket.on('host:spotify_connect', async ({ accessToken, refreshToken }) => {
    const { roomCode } = socket.data;
    const key = roomCode || socket.id;
    spotifyTokens.set(key, { accessToken, refreshToken, connectedAt: Date.now(), expiresAt: Date.now() + 3600 * 1000 });
    socket.emit('spotify:connected');
    console.log('Spotify connected for', key);
  });

  socket.on('host:spotify_start_polling', () => {
    console.log('host:spotify_start_polling received for room', socket.data.roomCode);
    startSpotifyPolling(socket.data.roomCode);
  });

  socket.on('host:spotify_stop_polling', () => stopSpotifyPolling(socket.data.roomCode));

  // ── AudD identified track ─────────────────────────────────────────────────
  // The host client sends this after a successful AudD identification.
  // We treat it the same as a Spotify-detected track change.
  socket.on('host:audd_song', ({ title, artist }) => {
    const { roomCode } = socket.data;
    if (!title || !artist) return;
    const room = game.getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;
    // Deduplicate: ignore if same song as last identification for this room
    const lastKey = auddLastTrack.get(roomCode);
    const thisKey = `${title}|||${artist}`.toLowerCase();
    if (lastKey === thisKey) return;
    auddLastTrack.set(roomCode, thisKey);
    console.log('AudD identified:', title, '|', artist, 'for room', roomCode);
    const result = game.playSong(roomCode, title, artist, null);
    if (result.error || result.alreadyPlayed) return;
    broadcastSongResult(roomCode, result, title);
  });

  // ── Manual song play ─────────────────────────────────────────────────────
  socket.on('host:play_song', ({ songTitle }) => {
    const { roomCode } = socket.data;
    const result = game.playSong(roomCode, songTitle, null);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    if (result.alreadyPlayed) return;
    broadcastSongResult(roomCode, result, songTitle);
  });

  socket.on('host:add_time', () => {
    const { roomCode } = socket.data;
    const result = game.addTime(roomCode, 5);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('game:updated', { room: result.room });
  });

  socket.on('host:end_game', () => {
    const { roomCode } = socket.data;
    stopSpotifyPolling(roomCode);
    stopAuddPolling(roomCode);
    const result = game.endGame(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    recordLeaderboardResults(result.room);
    io.to(roomCode).emit('game:over', { room: result.room });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    if (roomCode && playerId) {
      game.playerDisconnect(roomCode, playerId);
      const room = game.getRoom(roomCode);
      if (room) io.to(roomCode).emit('lobby:updated', { room });
    }
    console.log('Client disconnected:', socket.id);
  });
});

function recordLeaderboardResults(room) {
  if (!room || !room.players) return;
  room.players.forEach(p => {
    if (!p.confirmed || !p.name) return;
    lb.recordGameResult(p.name, {
      matches:  p.score || 0,
      won:      !!(room.winner && room.winner.id === p.id),
      pickMode: room.pickMode || 'songs',
    });
  });
}

function broadcastSongResult(roomCode, result, songTitle) {
  io.to(roomCode).emit('game:updated', { room: result.room });
  if (result.newWildcards && result.newWildcards.length > 0) {
    io.to(roomCode).emit('game:wildcards', { wildcards: result.newWildcards });
  }
  if (result.gongEvents && result.gongEvents.length > 0) {
    io.to(roomCode).emit('game:gong_events', { events: result.gongEvents, song: songTitle });
  }
  if (result.winner) {
    recordLeaderboardResults(result.room);
    io.to(roomCode).emit('game:over', { room: result.room });
  }
}

function startSpotifyPolling(roomCode) {
  if (nowPlayingIntervals.has(roomCode)) return;
  let lastTrackTitle = null;
  const interval = setInterval(async () => {
    const room = game.getRoom(roomCode);
    if (!room || room.phase === 'ended') { stopSpotifyPolling(roomCode); return; }
    if (room.phase !== 'playing') return;
    const tokens = spotifyTokens.get(roomCode);
    if (!tokens) return;
    try {
      // Auto-refresh token if it's close to expiry (tokens last 1 hour)
      if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60000) {
        try {
          const refreshed = await spotify.refreshToken(tokens.refreshToken);
          tokens.accessToken = refreshed.accessToken;
          tokens.expiresAt = Date.now() + refreshed.expiresIn * 1000;
          spotifyTokens.set(roomCode, tokens);
          console.log('Spotify token refreshed for room', roomCode);
        } catch (refreshErr) {
          console.error('Token refresh failed:', refreshErr.message);
        }
      }
      const track = await spotify.getCurrentTrack(tokens.accessToken);
      // Accept track even if isPlaying is false — Spotify sometimes reports
      // false during brief gaps or on mobile. We still want to register the song.
      if (!track) return;
      if (track.isPlaying) {
        io.to(roomCode).emit('spotify:now_playing', { track });
      }
      console.log('Spotify track:', track.title, '|', track.artist, '| last:', lastTrackTitle);
      // Detect track change by ID (most reliable) then fall back to title
      const trackKey = track.id || track.title;
      if (trackKey !== lastTrackTitle) {
        lastTrackTitle = trackKey;
        console.log('New track detected:', track.title, '|', track.artist);
        const result = game.playSong(roomCode, track.title, track.artist, track);
        if (!result.error && !result.alreadyPlayed) {
          broadcastSongResult(roomCode, result, track.title);
        }
      }
    } catch (err) {
      console.error('Spotify polling error:', err.message);
    }
  }, 5000);
  nowPlayingIntervals.set(roomCode, interval);
  const startRoom = game.getRoom(roomCode);
  console.log('Spotify polling started for room', roomCode, 'phase:', startRoom ? startRoom.phase : 'NOT FOUND');
}

function stopSpotifyPolling(roomCode) {
  const interval = nowPlayingIntervals.get(roomCode);
  if (interval) {
    clearInterval(interval);
    nowPlayingIntervals.delete(roomCode);
    console.log('Spotify polling stopped for room', roomCode);
  }
}

// ── AudD server-side deduplication ───────────────────────────────────────────
// AudD identification is driven by the host client (mic capture + POST to
// /api/audd/identify), which then emits host:audd_song with the result.
// The server doesn't poll on its own — but we do track the last identified
// title here so the client can send clips freely without us double-counting
// the same song if two clips in a row both resolve to the same track.
const auddLastTrack = new Map(); // roomCode → last identified title

function startAuddPolling(roomCode) {
  // Nothing to set up on the server — detection is client-driven.
  // We just record that this room is in AudD mode so we can clean up on end.
  auddIntervals.set(roomCode, true);
  console.log('AudD mode active for room', roomCode);
}

function stopAuddPolling(roomCode) {
  if (auddIntervals.has(roomCode)) {
    auddIntervals.delete(roomCode);
    auddLastTrack.delete(roomCode);
    console.log('AudD mode cleared for room', roomCode);
  }
}

function scheduleTimer(roomCode) {
  const room = game.getRoom(roomCode);
  if (!room) return;
  const interval = setInterval(() => {
    const r = game.getRoom(roomCode);
    if (!r || r.phase === 'ended') { clearInterval(interval); return; }
    const now = Date.now();
    if (now >= r.endsAt) {
      clearInterval(interval);
      stopSpotifyPolling(roomCode);
      stopAuddPolling(roomCode);
      const result = game.endGame(roomCode);
      recordLeaderboardResults(result.room);
      io.to(roomCode).emit('game:over', { room: result.room });
    } else {
      io.to(roomCode).emit('game:tick', { secondsLeft: Math.ceil((r.endsAt - now) / 1000) });
    }
  }, 1000);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pandora Bingo server running on port ${PORT}`);
  if (isProduction) {
    console.log('Production mode: serving client/dist as static files');
  }
});
