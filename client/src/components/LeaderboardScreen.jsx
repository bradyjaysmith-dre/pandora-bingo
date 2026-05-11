import React, { useState, useEffect } from 'react';

const C = {
  bg:       '#1a1a2e',
  panel:    '#12122a',
  panelAlt: '#0e0e1e',
  border:   '#2a2a4a',
  cyan:     '#00d4ff',
  cyanDim:  'rgba(0,212,255,0.10)',
  amber:    '#ffb347',
  amberDim: 'rgba(255,179,71,0.10)',
  magenta:  '#ff6b9d',
  green:    '#4ade80',
  text:     '#e2e8f0',
  muted:    '#6b7280',
  indigo:   '#818cf8',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen({ onBack }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoading(false); })
      .catch(() => { setError('Could not load leaderboard.'); setLoading(false); });
  }, []);

  const s = {
    outer: {
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 16px',
    },
    card: {
      width: '100%',
      maxWidth: 700,
      background: C.panel,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      boxShadow: `0 0 32px rgba(0,212,255,0.06), 0 8px 32px rgba(0,0,0,0.6)`,
      overflow: 'hidden',
    },
    header: {
      padding: '24px 28px 16px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: "'Orbitron', monospace",
      fontSize: 22,
      fontWeight: 900,
      color: C.amber,
      textShadow: `0 0 12px rgba(255,179,71,0.6)`,
      letterSpacing: 2,
    },
    backBtn: {
      background: 'none',
      border: `1px solid ${C.border}`,
      color: C.muted,
      cursor: 'pointer',
      borderRadius: 8,
      padding: '7px 14px',
      fontSize: 13,
      fontFamily: "'Orbitron', monospace",
      letterSpacing: 1,
      transition: 'border-color 0.2s, color 0.2s',
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
      padding: '10px 16px',
      fontSize: 10,
      fontWeight: 700,
      color: C.indigo,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      textAlign: 'left',
      borderBottom: `1px solid ${C.border}`,
      background: C.panelAlt,
    },
    thRight: {
      padding: '10px 16px',
      fontSize: 10,
      fontWeight: 700,
      color: C.indigo,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      textAlign: 'right',
      borderBottom: `1px solid ${C.border}`,
      background: C.panelAlt,
    },
    tr: (i) => ({
      background: i % 2 === 0 ? C.panel : C.panelAlt,
      borderBottom: `1px solid ${C.border}`,
    }),
    td: {
      padding: '12px 16px',
      fontSize: 14,
      color: C.text,
      textAlign: 'left',
    },
    tdRight: {
      padding: '12px 16px',
      fontSize: 14,
      color: C.text,
      textAlign: 'right',
    },
    rank: {
      fontFamily: "'Orbitron', monospace",
      fontSize: 13,
      fontWeight: 700,
      color: C.muted,
    },
    name: {
      fontWeight: 700,
      color: C.text,
    },
    highlight: { color: C.amber, fontWeight: 700 },
    cyan:      { color: C.cyan,  fontWeight: 700 },
    green:     { color: C.green, fontWeight: 700 },
    empty: {
      padding: '48px 28px',
      textAlign: 'center',
      color: C.muted,
      fontSize: 14,
    },
    loading: {
      padding: '48px 28px',
      textAlign: 'center',
      color: C.muted,
      fontSize: 14,
    },
  };

  return (
    <div style={s.outer}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.title}>🏆 LEADERBOARD</div>
          <button style={s.backBtn} onClick={onBack}>← Back</button>
        </div>

        {loading && <div style={s.loading}>Loading...</div>}
        {error   && <div style={s.empty}>{error}</div>}
        {!loading && !error && players.length === 0 && (
          <div style={s.empty}>No players yet — finish a game to appear here!</div>
        )}

        {!loading && !error && players.length > 0 && (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Rank</th>
                <th style={s.th}>Name</th>
                <th style={s.thRight}>Total</th>
                <th style={s.thRight}>Songs</th>
                <th style={s.thRight}>Artists</th>
                <th style={s.thRight}>Wins</th>
                <th style={s.thRight}>Games</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.name} style={s.tr(i)}>
                  <td style={s.td}>
                    <span style={s.rank}>
                      {i < 3 ? MEDAL[i] : `#${i + 1}`}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={i === 0 ? s.highlight : s.name}>{p.name}</span>
                  </td>
                  <td style={s.tdRight}>
                    <span style={s.highlight}>{p.totalMatches}</span>
                  </td>
                  <td style={s.tdRight}>
                    <span style={s.cyan}>{p.songMatches}</span>
                  </td>
                  <td style={s.tdRight}>
                    <span style={s.cyan}>{p.artistMatches}</span>
                  </td>
                  <td style={s.tdRight}>
                    <span style={s.green}>{p.wins}</span>
                  </td>
                  <td style={{ ...s.tdRight, color: C.muted }}>{p.gamesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
