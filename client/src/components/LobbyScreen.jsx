import React from 'react';
import socket from '../socket.js';

export default function LobbyScreen({ room, playerId, isHost }) {
  if (!room) return null;

  const s = {
    wrap: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:16 },
    card: { background:'#1e293b', borderRadius:12, padding:28, width:'100%', maxWidth:480 },
    codeBox: { background:'#0f172a', borderRadius:10, padding:'16px 20px', textAlign:'center', marginBottom:20 },
    code: { fontSize:42, fontWeight:800, letterSpacing:10, color:'#818cf8', fontFamily:'monospace' },
    codeSub: { fontSize:12, color:'#475569', marginTop:4 },
    meta: { display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' },
    metaItem: { fontSize:13, color:'#64748b' },
    metaVal: { color:'#e2e8f0', fontWeight:600 },
    sectionLabel: { fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 },
    playerList: { display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 },
    chip: (confirmed) => ({ padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:500, background: confirmed ? '#14532d' : '#0f172a', color: confirmed ? '#86efac' : '#94a3b8', border: confirmed ? '1px solid #166534' : '1px solid #334155' }),
    btn: { width:'100%', padding:'12px 20px', borderRadius:8, border:'none', cursor:'pointer', background:'#6366f1', color:'#fff', fontWeight:700, fontSize:15 },
    btnDisabled: { width:'100%', padding:'12px 20px', borderRadius:8, border:'none', background:'#334155', color:'#64748b', fontWeight:700, fontSize:15, cursor:'not-allowed' },
    waiting: { textAlign:'center', color:'#64748b', fontSize:14, marginTop:8 },
  };

  const canStart = room.players.length >= 2;

  return (
    <div style={s.wrap}><div style={s.card}>
      <div style={s.codeBox}>
        <div style={s.code}>{room.code}</div>
        <div style={s.codeSub}>Share this code with players</div>
      </div>
      <div style={s.meta}>
        <span style={s.metaItem}>Genre: <span style={s.metaVal}>{room.genre}</span></span>
        <span style={s.metaItem}>Win at: <span style={s.metaVal}>{room.matchTarget} matches</span></span>
        <span style={s.metaItem}>Time: <span style={s.metaVal}>{room.timeLimit} min</span></span>
      </div>
      <div style={s.sectionLabel}>Players ({room.players.length})</div>
      <div style={s.playerList}>
        {room.players.map(p => (
          <span key={p.id} style={s.chip(p.confirmed)}>
            {p.name}{p.id === playerId ? ' (you)' : ''}{p.confirmed ? ' checkmark' : ''}
          </span>
        ))}
      </div>
      {isHost ? (
        <button style={canStart ? s.btn : s.btnDisabled} onClick={() => socket.emit('host:start')} disabled={!canStart}>
          {canStart ? 'Start game' : 'Waiting for players...'}
        </button>
      ) : (
        <div style={s.waiting}>Waiting for host to start the game...</div>
      )}
    </div></div>
  );
}
