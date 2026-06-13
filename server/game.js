const { v4: uuidv4 } = require('uuid');
// getSongPool / getArtistPool retained for reference but no longer used at room creation.
// Pool is now generated from playlist name via dynamic-songs.js (artist-only).
// const { getSongPool, getArtistPool } = require('./songs');

const rooms = new Map();

function makePlayer(id, name) {
  return {
    id, name,
    picks: [], confirmed: false, score: 0,
    connected: true, lateJoin: false,
    // Newlywed
    backups: [], guesses: [], backupDebt: 0, guessHits: 0, wildcards: [],
    // Gong Show
    gongs: [], revealedPicks: [], revealedGongs: [],
    // DJ Battle (host only uses hostScore; players use score)
  };
}

function createRoom({ hostId, hostName, matchTarget, timeLimit, musicSource, gameMode, blindMode, djPickCount, playlistName, playlistHint, djHostTarget, djPenaltyEnabled, djPenaltyAmount }) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const room = {
    code, hostId, matchTarget, timeLimit,
    pickMode: 'artists', // Song mode retired — artist-only across all game modes
    musicSource: musicSource || 'manual',
    gameMode: gameMode || 'standard',
    blindMode: blindMode || false,
    // Playlist name used by all modes (replaces genre for pool generation)
    playlistName: playlistName || '',
    // DJ Battle fields
    djPickCount: djPickCount || 5,
    playlistHint: playlistHint || '',
    djHostTarget: djHostTarget || 10,       // DJ's separate score target
    djPenaltyEnabled: djPenaltyEnabled || false, // penalise DJ when a song is matched
    djPenaltyAmount: djPenaltyAmount != null ? djPenaltyAmount : 1.0, // points deducted per matched song
    hostScore: 0, // DJ Battle: host points (songs nobody guessed)
    spotifyJamLink: null, // Spotify Group Session (Jam) link shared by host
    phase: 'lobby',
    players: [makePlayer(hostId, hostName)],
    songPool: [],   // Retained for compatibility; not populated at creation
    artistPool: [], // Populated async by index.js after room creation
    playedSongs: [],
    startedAt: null, endsAt: null, winner: null,
    coinFlip: false, tiedPlayers: null,
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) { return rooms.get(code) || null; }

function joinRoom(code, { playerId, playerName }) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 10) return { error: 'Room is full' };

  const existing = room.players.find(p => p.id === playerId);
  if (existing) {
    existing.connected = true;
    return { room, rejoined: true };
  }

  const player = makePlayer(playerId, playerName);
  if (room.phase === 'playing') player.lateJoin = true;
  room.players.push(player);
  return { room, rejoined: false };
}

function rejoinRoom(code, playerId) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found in room' };
  player.connected = true;
  return { room };
}

function playerDisconnect(code, playerId) {
  const room = getRoom(code);
  if (!room) return;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.connected = false;
}

function resetRoom(code, { matchTarget, timeLimit, musicSource, gameMode, blindMode, djPickCount, playlistName, playlistHint, djHostTarget, djPenaltyEnabled, djPenaltyAmount }) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.matchTarget = matchTarget;
  room.timeLimit = timeLimit;
  room.pickMode = 'artists'; // Song mode retired
  room.musicSource = musicSource || 'manual';
  room.gameMode = gameMode || 'standard';
  room.blindMode = blindMode || false;
  room.djPickCount = djPickCount || 5;
  room.playlistName = playlistName || '';
  room.playlistHint = playlistHint || '';
  room.djHostTarget = djHostTarget || 10;
  room.djPenaltyEnabled = djPenaltyEnabled || false;
  room.djPenaltyAmount = djPenaltyAmount != null ? djPenaltyAmount : 1.0;
  room.hostScore = 0;
  room.spotifyJamLink = null;
  room.phase = 'lobby';
  room.songPool = [];
  room.artistPool = []; // Repopulated async by index.js after reset
  room.playedSongs = [];
  room.startedAt = null;
  room.endsAt = null;
  room.winner = null;
  room.coinFlip = false;
  room.tiedPlayers = null;
  room.players.forEach(p => {
    p.picks = []; p.confirmed = false; p.score = 0;
    p.backups = []; p.guesses = []; p.backupDebt = 0; p.guessHits = 0; p.wildcards = [];
    p.gongs = []; p.revealedPicks = []; p.revealedGongs = []; p.lateJoin = false;
  });
  return { room };
}

function submitPicks(code, playerId, picks) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  player.picks = picks;
  player.confirmed = true;
  player.lateJoin = false;
  return { room };
}

function submitNewlywedPicks(code, playerId, { mains, backups, guesses }) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  player.picks = mains;
  player.backups = backups;
  player.guesses = guesses;
  player.confirmed = true;
  player.lateJoin = false;
  return { room };
}

function submitGongShowPicks(code, playerId, { mains, gongs }) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  player.picks = mains;
  player.gongs = gongs;
  player.confirmed = true;
  player.lateJoin = false;
  return { room };
}

function toggleBlindMode(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.blindMode = !room.blindMode;
  return { room };
}

function startGame(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.phase = 'picking';
  return { room };
}

function startCountdown(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.phase = 'playing';
  room.startedAt = Date.now();
  room.endsAt = Date.now() + room.timeLimit * 60 * 1000;
  return { room };
}

// Match a played song against a pick.
// All rooms now use artist mode — song mode is retained in comments for future re-enablement.
// ID-based matching is preferred (Spotify IDs are exact and unambiguous).
// Falls back to artist string matching.
function songMatchesPick(song, pick, pickMode) {
  // pickMode is always 'artists' — song mode retired
  // if (pickMode === 'songs') {
  //   if (pick.id && song.id) return pick.id === song.id;
  //   return song.title === pick.title;
  // }

  // Artist mode: ID match first, then string fallback
  if (pick.id && song.artistIds && song.artistIds.length) {
    return song.artistIds.includes(pick.id);
  }
  const pa = (song.artist || '').toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
  return pa.some(a => a === (pick.name || '').toLowerCase().trim());
}

function recalcScores(room) {
  room.players.forEach(p => {
    if (!p.confirmed) return;
    p.score = p.picks.filter(pick =>
      room.playedSongs.some(played => songMatchesPick(played, pick, room.pickMode))
    ).length;
  });
}

function songInPlayerEight(song, player, pickMode) {
  return [...(player.picks || []), ...(player.backups || [])].some(pick => songMatchesPick(song, pick, pickMode));
}

function assignWildcard(room, player) {
  const pool = room.pickMode === 'artists' ? room.artistPool : room.songPool;
  const playedTitles = new Set(room.playedSongs.map(s => s.title));
  const allPicked = new Set([
    ...player.picks.map(p => room.pickMode === 'artists' ? p.name : p.title),
    ...player.backups.map(p => room.pickMode === 'artists' ? p.name : p.title),
    ...player.wildcards.map(p => room.pickMode === 'artists' ? p.name : p.title),
  ]);
  const eligible = pool.filter(item => {
    const key = room.pickMode === 'artists' ? item.name : item.title;
    return !playedTitles.has(item.title) && !allPicked.has(key);
  });
  if (!eligible.length) return null;
  const wildcard = eligible[Math.floor(Math.random() * eligible.length)];
  player.wildcards.push(wildcard);
  return wildcard;
}

function calcNewlywedBackupDebtCleared(player, room) {
  const allInsurance = [...(player.backups || []), ...(player.wildcards || [])];
  return allInsurance.filter(pick =>
    room.playedSongs.some(p => songMatchesPick(p, pick, room.pickMode))
  ).length >= player.backupDebt;
}

// songData can be a full track object { id, title, artist, artistIds } from Spotify,
// or just { title, artist } for manual mode / static pool fallback.
function playSong(code, songTitle, songArtist, songData) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };

  // Deduplicate: if we have an ID, check by ID; otherwise by title
  const trackId = songData && songData.id;
  if (trackId && room.playedSongs.find(s => s.id === trackId)) return { room, alreadyPlayed: true };
  if (!trackId && room.playedSongs.find(s => s.title === songTitle)) return { room, alreadyPlayed: true };

  let song;
  if (songData && songData.id) {
    // Full Spotify track object — use directly
    song = songData;
  } else {
    // Try static pool first, then construct from args
    song = room.songPool.find(s => s.title === songTitle);
    if (!song) {
      if (songArtist) song = { title: songTitle, artist: songArtist };
      else return { error: 'Song not found' };
    }
  }
  room.playedSongs.push(song);

  if (room.gameMode === 'newlywed') return playSongNewlywed(room, song);
  if (room.gameMode === 'gongshow') return playSongGongShow(room, song);
  if (room.gameMode === 'djbattle') return playSongDJBattle(room, song);

  recalcScores(room);
  const winner = room.players.find(p => p.confirmed && p.score >= room.matchTarget);
  if (winner) { room.winner = winner; room.phase = 'ended'; }
  return { room, winner: winner || null };
}

function playSongNewlywed(room, song) {
  recalcScores(room);
  const newWildcards = [];

  room.players.forEach(guesser => {
    if (!guesser.confirmed) return;
    if (!(guesser.guesses || []).some(g => songMatchesPick(song, g, room.pickMode))) return;
    let anyHit = false;
    room.players.forEach(target => {
      if (target.id === guesser.id || !target.confirmed) return;
      if (songInPlayerEight(song, target, room.pickMode)) {
        const total = (target.backups || []).length + (target.wildcards || []).length;
        if (target.backupDebt < total) target.backupDebt += 1;
        anyHit = true;
      }
    });
    if (anyHit) {
      guesser.guessHits = (guesser.guessHits || 0) + 1;
      if (guesser.guessHits === 2) {
        const wc = assignWildcard(room, guesser);
        if (wc) newWildcards.push({ playerId: guesser.id, playerName: guesser.name, wildcard: wc });
      }
    }
  });

  const winner = room.players.find(p =>
    p.confirmed && p.score >= room.matchTarget && calcNewlywedBackupDebtCleared(p, room)
  );
  if (winner) { room.winner = winner; room.phase = 'ended'; }
  return { room, winner: winner || null, newWildcards };
}

function playSongGongShow(room, song) {
  const mainPickers = room.players.filter(p =>
    p.confirmed && (p.picks || []).some(pick => songMatchesPick(song, pick, room.pickMode))
  );
  const gongers = room.players.filter(p =>
    p.confirmed && (p.gongs || []).some(g => songMatchesPick(song, g, room.pickMode))
  );

  // Reveal picks/gongs for blind mode
  mainPickers.forEach(p => {
    const pick = p.picks.find(pk => songMatchesPick(song, pk, room.pickMode));
    if (pick) p.revealedPicks = [...(p.revealedPicks || []), pick];
  });
  gongers.forEach(p => {
    const g = p.gongs.find(gk => songMatchesPick(song, gk, room.pickMode));
    if (g) p.revealedGongs = [...(p.revealedGongs || []), g];
  });

  const events = [];

  if (gongers.length === 0) {
    mainPickers.forEach(p => {
      p.score += 1;
      events.push({ type: 'point', playerId: p.id, playerName: p.name });
    });
  } else if (gongers.length === 1) {
    mainPickers.forEach(p =>
      events.push({ type: 'gong', playerId: p.id, playerName: p.name, gongerName: gongers[0].name })
    );
    events.push({ type: 'gong_fired', playerId: gongers[0].id, playerName: gongers[0].name });
  } else {
    mainPickers.forEach(p => {
      p.score += 1;
      events.push({ type: 'point', playerId: p.id, playerName: p.name });
    });
    gongers.forEach(p => {
      p.score -= 1;
      events.push({ type: 'backfire', playerId: p.id, playerName: p.name });
    });
    events.push({ type: 'gong_cancelled', gongerNames: gongers.map(p => p.name) });
  }

  const winner = room.players.find(p => p.confirmed && p.score >= room.matchTarget);
  if (winner) { room.winner = winner; room.phase = 'ended'; }
  return { room, winner: winner || null, gongEvents: events };
}

// ─── DJ Battle scoring ────────────────────────────────────────────────────────
// Players are all non-host confirmed players.
// When a song plays:
//   - Any player who picked that artist scores +1 (independently; duplicates both score)
//   - If NO player picked that artist, the host scores +1
//   - If djPenaltyEnabled and at least one player scored, host loses djPenaltyAmount
// Host wins by reaching djHostTarget; players win by reaching matchTarget.
// Both race their own independent thresholds — first to their own target wins.
function playSongDJBattle(room, song) {
  const scoringPlayers = room.players.filter(p =>
    p.confirmed &&
    p.id !== room.hostId &&
    (p.picks || []).some(pick => songMatchesPick(song, pick, room.pickMode))
  );

  const djEvents = [];
  const hostTarget = room.djHostTarget || 10;
  const penaltyEnabled = room.djPenaltyEnabled || false;
  const penaltyAmount = room.djPenaltyAmount != null ? room.djPenaltyAmount : 1.0;

  if (scoringPlayers.length > 0) {
    // Players scored — each gets +1 independently
    scoringPlayers.forEach(p => {
      p.score += 1;
      djEvents.push({ type: 'player_point', playerId: p.id, playerName: p.name });
    });
    // Penalty: DJ loses points when any player scores
    if (penaltyEnabled) {
      room.hostScore = Math.round(((room.hostScore || 0) - penaltyAmount) * 10) / 10;
      djEvents.push({ type: 'host_penalty', amount: penaltyAmount });
    }
  } else {
    // Nobody guessed it — host scores +1
    room.hostScore = Math.round(((room.hostScore || 0) + 1) * 10) / 10;
    djEvents.push({ type: 'host_point' });
  }

  // Check for winner: each side races their own independent target
  const playerWinner = room.players.find(p =>
    p.confirmed && p.id !== room.hostId && p.score >= room.matchTarget
  );
  const hostWon = room.hostScore >= hostTarget;

  if (playerWinner) {
    room.winner = playerWinner;
    room.phase = 'ended';
  } else if (hostWon) {
    const host = room.players.find(p => p.id === room.hostId);
    room.winner = { ...host, isHostWin: true };
    room.phase = 'ended';
  }

  return { room, winner: room.winner || null, djEvents };
}

function addTime(code, minutes) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.endsAt += minutes * 60 * 1000;
  return { room };
}

function endGame(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.phase = 'ended';
  if (!room.winner) {
    if (room.gameMode === 'djbattle') {
      return endGameDJBattle(room);
    }
    const eff = p => {
      if (!p.confirmed) return -Infinity;
      if (room.gameMode !== 'newlywed') return p.score;
      return calcNewlywedBackupDebtCleared(p, room) ? p.score : p.score - 0.5;
    };
    const scores = room.players.map(eff).filter(s => s > -Infinity);
    if (!scores.length) return { room };
    const top = Math.max(...scores);
    const tied = room.players.filter(p => eff(p) === top);
    if (tied.length === 1) {
      room.winner = tied[0];
    } else {
      room.winner = tied[Math.floor(Math.random() * tied.length)];
      room.coinFlip = true;
      room.tiedPlayers = tied.map(p => p.name);
    }
  }
  return { room };
}

function endGameDJBattle(room) {
  const nonHostPlayers = room.players.filter(p => p.confirmed && p.id !== room.hostId);
  const hostScore = room.hostScore || 0;
  const hostTarget = room.djHostTarget || 10;

  // Normalise scores to their respective targets for fair comparison
  // (host racing to djHostTarget, players racing to matchTarget)
  const hostProgress = hostScore / hostTarget;
  const playerTopScore = nonHostPlayers.length ? Math.max(...nonHostPlayers.map(p => p.score)) : -Infinity;
  const playerTopProgress = playerTopScore / (room.matchTarget || 1);

  if (hostProgress > playerTopProgress) {
    const host = room.players.find(p => p.id === room.hostId);
    room.winner = { ...host, isHostWin: true };
  } else if (playerTopProgress > hostProgress) {
    const topPlayers = nonHostPlayers.filter(p => p.score === playerTopScore);
    if (topPlayers.length === 1) {
      room.winner = topPlayers[0];
    } else {
      room.winner = topPlayers[Math.floor(Math.random() * topPlayers.length)];
      room.coinFlip = true;
      room.tiedPlayers = topPlayers.map(p => p.name);
    }
  } else {
    // Tied on progress — coin flip among all tied
    const tied = nonHostPlayers.filter(p => p.score === playerTopScore);
    const host = room.players.find(p => p.id === room.hostId);
    const allTied = [{ ...host, isHostWin: true }, ...tied];
    room.winner = allTied[Math.floor(Math.random() * allTied.length)];
    room.coinFlip = true;
    room.tiedPlayers = [host.name + ' (DJ)', ...tied.map(p => p.name)];
  }

  return { room };
}

function deleteRoom(code) { rooms.delete(code); }

module.exports = {
  createRoom, getRoom, joinRoom, rejoinRoom, playerDisconnect, resetRoom,
  submitPicks, submitNewlywedPicks, submitGongShowPicks,
  toggleBlindMode, startGame, startCountdown,
  playSong, addTime, endGame, deleteRoom,
};
