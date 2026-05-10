import React from 'react';
import socket from '../socket.js';

// ─── Retro TV colour tokens ──────────────────────────────────────────────────
const C = {
  bg:       '#1a1a2e',
  panel:    '#12122a',
  panelAlt: '#0e0e1e',
  border:   '#2a2a4a',
  cyan:     '#00d4ff',
  cyanDim:  'rgba(0,212,255,0.12)',
  amber:    '#ffb347',
  amberDim: 'rgba(255,179,71,0.12)',
  gold:     'rgba(255,215,0,0.75)',
  magenta:  '#ff6b9d',
  text:     '#e2e8f0',
  muted:    '#6b7280',
  indigo:   '#818cf8',
};

export default function LobbyScreen({ room, playerId, isHost }) {
  if (!room) return null;

  const canStart = room.players.length >= 2;

  const s = {
    wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 },
    card: {
      background: C.panel,
      borderRadius: 14,
      padding: 28,
      width: '100%',
      maxWidth: 500,
      border: `1px solid ${C.border}`,
      boxShadow: `0 0 32px rgba(0,212,255,0.06), 0 8px 32px rgba(0,0,0,0.6)`,
    },
    heading: {
      fontFamily: "'Orbitron', monospace",
      fontSize: 16,
      fontWeight: 800,
      color: C.indigo,
      textTransform: 'uppercase',
      letterSpacing: 3,
      textAlign: 'center',
      marginBottom: 16,
      textShadow: `0 0 8px rgba(129,140,248,0.4)`,
    },
    // Room code display
    codeBox: {
      background: C.panelAlt,
      borderRadius: 12,
      padding: '20px 24px',
      textAlign: 'center',
      marginBottom: 20,
      border: `1px solid rgba(255,179,71,0.3)`,
      boxShadow: `0 0 20px rgba(255,179,71,0.08)`,
    },
    codeSub: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
    code: {
      fontFamily: "'Orbitron', monospace",
      fontSize: 44,
      fontWeight: 900,
      letterSpacing: 12,
      color: C.amber,
      textShadow: `0 0 16px rgba(255,179,71,0.7), 0 0 32px rgba(255,179,71,0.35)`,
    },
    codeShareHint: { fontSize: 12, color: C.muted, marginTop: 6 },
    // Meta info
    meta: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' },
    metaBadge: {
      padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: C.cyanDim, color: C.cyan,
      border: `1px solid rgba(0,212,255,0.25)`,
    },
    // Players
    sectionLabel: {
      fontSize: 11, fontWeight: 700, color: C.indigo,
      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10,
    },
    playerList: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: (isYou) => ({
      padding: '8px 16px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      background: isYou ? C.amberDim : C.cyanDim,
      color: isYou ? C.amber : C.cyan,
      border: `1px solid ${isYou ? 'rgba(255,179,71,0.3)' : 'rgba(0,212,255,0.25)'}`,
      boxShadow: isYou ? `0 0 8px rgba(255,179,71,0.15)` : 'none',
    }),
    // Buttons
    btn: {
      width: '100%', padding: '13px 20px', borderRadius: 8,
      border: `1px solid ${C.cyan}`,
      cursor: 'pointer',
      background: C.cyanDim,
      color: C.cyan,
      fontWeight: 700, fontSize: 15,
      fontFamily: "'Orbitron', monospace",
      letterSpacing: 1,
      boxShadow: `0 0 10px rgba(0,212,255,0.2)`,
    },
    btnDisabled: {
      width: '100%', padding: '13px 20px', borderRadius: 8,
      border: `1px solid ${C.border}`,
      background: C.panelAlt,
      color: C.muted,
      fontWeight: 700, fontSize: 15,
      cursor: 'not-allowed',
    },
    waiting: { textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 8 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.heading}>Game Lobby</div>

        <div style={s.codeBox}>
          <div style={s.codeSub}>Room Code</div>
          <div style={s.code}>{room.code}</div>
          <div style={s.codeShareHint}>Share this code with friends to join</div>
        </div>

        <div style={s.meta}>
          <span style={s.metaBadge}>{room.genre}</span>
          <span style={s.metaBadge}>{room.matchTarget} {room.gameMode === 'gongshow' ? 'pts' : 'matches'} to win</span>
          <span style={s.metaBadge}>{room.timeLimit} min</span>
          {room.pickMode === 'artists' && <span style={s.metaBadge}>Artist mode</span>}
          {room.gameMode === 'newlywed' && <span style={{ ...s.metaBadge, color: C.amber, borderColor: 'rgba(255,179,71,0.3)', background: C.amberDim }}>🎯 Newlywed</span>}
          {room.gameMode === 'gongshow' && <span style={{ ...s.metaBadge, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}>🔔 Gong Show</span>}
        </div>

        <div style={s.sectionLabel}>Players ({room.players.length})</div>
        <div style={s.playerList}>
          {room.players.map(p => (
            <span key={p.id} style={s.chip(p.id === playerId)}>
              {p.name}{p.id === playerId ? ' (you)' : ''}
            </span>
          ))}
        </div>

        {isHost ? (
          <button
            style={canStart ? s.btn : s.btnDisabled}
            onClick={() => socket.emit('host:start')}
            disabled={!canStart}
          >
            {canStart ? 'Start Game' : 'Waiting for Players...'}
          </button>
        ) : (
          <div style={s.waiting}>Waiting for host to start the game...</div>
        )}
      </div>
    </div>
  );
}
