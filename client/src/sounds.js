// sounds.js — Web Audio API synthesized sound engine for Pandora Bingo

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx.state === 'running' ? _ctx : null;
}

function noteFreq(note) {
  // note: e.g. 'C5', 'E5', 'G5', 'G4', 'E4', 'C4'
  const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;
  const [, n, oct] = match;
  const semitone = notes[n[0]] + (n[1] === '#' ? 1 : 0);
  return 440 * Math.pow(2, (semitone - 9 + (parseInt(oct) - 4) * 12) / 12);
}

function playTone(ctx, freq, startTime, duration, type = 'sine', gain = 0.4, attack = 0.01, decay = 0.1) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay + duration);
  osc.start(startTime);
  osc.stop(startTime + attack + decay + duration + 0.05);
}

/**
 * playHit — song/artist match: bright ascending 3-note chime arpeggio (C5→E5→G5)
 */
export function playHit() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = ['C5', 'E5', 'G5'];
  notes.forEach((note, i) => {
    playTone(ctx, noteFreq(note), now + i * 0.12, 0.25, 'sine', 0.35, 0.005, 0.4);
  });
}

/**
 * playGong — gong fires: descending brass-like hit (G4→E4→C4), heavy
 */
export function playGong() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = ['G4', 'E4', 'C4'];
  notes.forEach((note, i) => {
    // Use sawtooth for brass-like quality
    playTone(ctx, noteFreq(note), now + i * 0.14, 0.35, 'sawtooth', 0.3, 0.01, 0.55);
    // Add sub octave for weight
    playTone(ctx, noteFreq(note) / 2, now + i * 0.14, 0.35, 'triangle', 0.2, 0.01, 0.55);
  });
}

/**
 * playBackfire — gong backfires: dissonant buzz/thud, low and wrong-feeling
 */
export function playBackfire() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Low dissonant buzz
  playTone(ctx, 80, now, 0.5, 'sawtooth', 0.4, 0.01, 0.7);
  // Dissonant second above
  playTone(ctx, 85, now + 0.05, 0.4, 'square', 0.25, 0.01, 0.6);
  // Short thud at bottom
  playTone(ctx, 55, now, 0.1, 'triangle', 0.5, 0.005, 0.15);
}

/**
 * playWildcard — wildcard earned: glittery upward sweep, sparkle feel
 */
export function playWildcard() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Sparkle: rapid ascending notes
  const sparkNotes = ['C5', 'E5', 'G5', 'C6', 'E6'];
  sparkNotes.forEach((note, i) => {
    playTone(ctx, noteFreq(note), now + i * 0.08, 0.18, 'sine', 0.28, 0.003, 0.3);
  });
  // Shimmer: slightly detuned layer
  sparkNotes.forEach((note, i) => {
    playTone(ctx, noteFreq(note) * 1.008, now + i * 0.08 + 0.02, 0.15, 'sine', 0.15, 0.003, 0.25);
  });
}

/**
 * playPenalty — backup debt added: low warning thud, ominous
 */
export function playPenalty() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, 110, now, 0.4, 'triangle', 0.45, 0.005, 0.6);
  playTone(ctx, 92, now + 0.15, 0.35, 'sawtooth', 0.25, 0.01, 0.5);
}

/**
 * playWin — game over / someone wins: short fanfare arpeggio, triumphant
 */
export function playWin() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const fanfare = ['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C6'];
  fanfare.forEach((note, i) => {
    const delay = i * 0.13;
    playTone(ctx, noteFreq(note), now + delay, 0.3, 'sine', 0.38, 0.008, 0.4);
    // Harmony layer
    playTone(ctx, noteFreq(note) * 1.5, now + delay, 0.2, 'triangle', 0.12, 0.008, 0.35);
  });
}
