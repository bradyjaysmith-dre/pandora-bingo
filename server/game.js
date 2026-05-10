const { v4: uuidv4 } = require('uuid');
const { getSongPool, getArtistPool } = require('./songs');

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
  };
}

function createRoom({ hostId, hostName, genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode }) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const room = {
    code, hostId, genre, matchTarget, timeLimit,
    pickMode: pickMode || 'songs',
    musicSource: musicSource || 'manual',
    gameMode: gameMode || 'standard',
    blindMode: blindMode || false,
    phase: 'lobby',
    players: [makePlayer(hostId, hostName)],
    songPool: getSongPool(genre),
    artistPool: getArtistPool(genre),
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

function resetRoom(code, { genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode }) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.genre = genre;
  room.matchTarget = matchTarget;
  room.timeLimit = timeLimit;
  room.pickMode = pickMode || 'songs';
  room.musicSource = musicSource || 'manual';
  room.gameMode = gameMode || 'standard';
  room.blindMode = blindMode || false;
  room.phase = 'lobby';
  room.songPool = getSongPool(genre);
  room.artistPool = getArtistPool(genre);
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

function recalcScores(room) {
  room.players.forEach(p => {
    if (!p.confirmed) return;
    if (room.pickMode === 'artists') {
      p.score = p.picks.filter(pick =>
        room.playedSongs.some(played => {
          const pa = played.artist.toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
          return pa.some(a => a === pick.name.toLowerCase().trim());
        })
      ).length;
    } else {
      p.score = p.picks.filter(pick =>
        room.playedSongs.some(played => played.title === pick.title)
      ).length;
    }
  });
}

function songMatchesPick(song, pick, pickMode) {
  if (pickMode === 'artists') {
    const pa = song.artist.toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
    return pa.some(a => a === pick.name.toLowerCase().trim());
  }
  return song.title === pick.title;
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

function playSong(code, songTitle, songArtist) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.playedSongs.find(s => s.title === songTitle)) return { room, alreadyPlayed: true };

  let song = room.songPool.find(s => s.title === songTitle);
  if (!song) {
    if (songArtist) song = { title: songTitle, artist: songArtist };
    else return { error: 'Song not found' };
  }
  room.playedSongs.push(song);

  if (room.gameMode === 'newlywed') return playSongNewlywed(room, song);
  if (room.gameMode === 'gongshow') return playSongGongShow(room, song);

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

function deleteRoom(code) { rooms.delete(code); }

module.exports = {
  createRoom, getRoom, joinRoom, rejoinRoom, playerDisconnect, resetRoom,
  submitPicks, submitNewlywedPicks, submitGongShowPicks,
  toggleBlindMode, startGame, startCountdown,
  playSong, addTime, endGame, deleteRoom,
};
