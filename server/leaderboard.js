/**
 * leaderboard.js — persistent player stats for Pandora Bingo
 *
 * No passwords — name matching only (case-insensitive).
 * Data is persisted to leaderboard.json in the server directory.
 */

const fs = require('fs');
const path = require('path');

const LB_FILE = path.join(__dirname, 'leaderboard.json');

function load() {
  try {
    if (fs.existsSync(LB_FILE)) return JSON.parse(fs.readFileSync(LB_FILE, 'utf8'));
  } catch {}
  return { players: [] };
}

function save(data) {
  try { fs.writeFileSync(LB_FILE, JSON.stringify(data, null, 2)); } catch (e) {
    console.error('leaderboard save error:', e.message);
  }
}

/** Register a name if new; returns the player record either way. */
function getOrCreate(name) {
  const db = load();
  let player = db.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!player) {
    player = { name, gamesPlayed: 0, songMatches: 0, artistMatches: 0, wins: 0 };
    db.players.push(player);
    save(db);
  }
  return player;
}

/**
 * Record results for one player after a game ends.
 * @param {string} name
 * @param {{ matches: number, won: boolean, pickMode: 'songs'|'artists' }} opts
 */
function recordGameResult(name, { matches, won, pickMode }) {
  const db = load();
  let player = db.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!player) {
    player = { name, gamesPlayed: 0, songMatches: 0, artistMatches: 0, wins: 0 };
    db.players.push(player);
  }
  player.gamesPlayed += 1;
  if (pickMode === 'artists') player.artistMatches += matches || 0;
  else player.songMatches += matches || 0;
  if (won) player.wins += 1;
  save(db);
  return player;
}

/** Returns all players sorted by total matches desc, wins desc. */
function getLeaderboard() {
  const db = load();
  return db.players
    .map(p => ({
      ...p,
      totalMatches: (p.songMatches || 0) + (p.artistMatches || 0),
    }))
    .sort((a, b) => b.totalMatches - a.totalMatches || b.wins - a.wins);
}

/** True if a player with this name already exists. */
function nameExists(name) {
  const db = load();
  return db.players.some(p => p.name.toLowerCase() === name.toLowerCase());
}

module.exports = { getOrCreate, recordGameResult, getLeaderboard, nameExists };
