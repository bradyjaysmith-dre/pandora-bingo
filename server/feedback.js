/**
 * feedback.js — in-app bug reports for Pandora Bingo
 *
 * No accounts, no auth — anyone can submit. Data is persisted to
 * feedback.json on the Railway volume (falls back to the server directory
 * in local dev, where no volume is mounted).
 */

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dataPath, migrateIfNeeded } = require('./dataDir');

const FEEDBACK_FILE = dataPath('feedback.json');
migrateIfNeeded('feedback.json');

function load() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
  } catch {}
  return { reports: [] };
}

function save(data) {
  try { fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2)); } catch (e) {
    console.error('feedback save error:', e.message);
  }
}

function record({ message, playerName, roomCode, gameMode, phase, isHost, userAgent, url }) {
  const db = load();
  const report = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    message,
    playerName: playerName || null,
    roomCode: roomCode || null,
    gameMode: gameMode || null,
    phase: phase || null,
    isHost: !!isHost,
    userAgent: userAgent || null,
    url: url || null,
  };
  db.reports.unshift(report); // newest first
  save(db);
  return report;
}

function getAll() {
  return load().reports;
}

module.exports = { record, getAll };
