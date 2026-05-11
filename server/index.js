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

// ── Static frontend (production) ─────────────────────────────────────────────
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
  });

  // ── Reset room for new game ──────────────────────────────────────────────
  socket.on('host:reset', ({ genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode }) => {
    const { roomCode } = socket.data;
    stopSpotifyPolling(roomCode);
    const result = game.resetRoom(roomCode, { genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode });
    if (result.error) { socket.emit('error', { message: result.error }); return; }
    io.to(roomCode).emit('room:reset', { room: result.room });
    console.log('Room reset:', roomCode);
  });

  // ── Join ─────────────────────────────────────────────────────────────────
  socket.on('player:join', ({ playerName, roomCode }) => {
    const playerId = uuidv4();
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
    console.log(playerName, result.rejoined ? 'rejoined' : 'joined', roomCode);
  });

  // ── Start (move to pick phase) ───────────────────────────────────────────
  socket.on('host:start', () => {
    const { roomCode } = socket.data;
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
    const allConfirmed = room.players.every(p => p.confirmed);
    if (allConfirmed) {
      const startResult = game.startCountdown(roomCode);
      io.to(roomCode).emit('game:playing', { room: startResult.room });
      scheduleTimer(roomCode);
      if (startResult.room.musicSource === 'spotify' && spotifyTokens.has(roomCode)) {
        console.log('Auto-starting Spotify polling for room', roomCode);
        startSpotifyPolling(roomCode);
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
    spotifyTokens.set(key, { accessToken, refreshToken, connectedAt: Date.now() });
    socket.emit('spotify:connected');
    console.log('Spotify connected for', key);
  });

  socket.on('host:spotify_start_polling', () => {
    console.log('host:spotify_start_polling received for room', socket.data.roomCode);
    startSpotifyPolling(socket.data.roomCode);
  });

  socket.on('host:spotify_stop_polling', () => stopSpotifyPolling(socket.data.roomCode));

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
    const result = game.endGame(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }
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

function broadcastSongResult(roomCode, result, songTitle) {
  io.to(roomCode).emit('game:updated', { room: result.room });
  if (result.newWildcards && result.newWildcards.length > 0) {
    io.to(roomCode).emit('game:wildcards', { wildcards: result.newWildcards });
  }
  if (result.gongEvents && result.gongEvents.length > 0) {
    io.to(roomCode).emit('game:gong_events', { events: result.gongEvents, song: songTitle });
  }
  if (result.winner) {
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
      const track = await spotify.getCurrentTrack(tokens.accessToken);
      if (!track || !track.isPlaying) return;
      io.to(roomCode).emit('spotify:now_playing', { track });
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
      const result = game.endGame(roomCode);
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
