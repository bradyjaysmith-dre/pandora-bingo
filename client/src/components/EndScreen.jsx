import React, { useState } from 'react';

const GENRES = ['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Country', 'Electronic'];

export default function EndScreen({ room, playerId, isHost, onPlayAgain, onLeave }) {
  const [genre, setGenre] = useState(room ? room.genre : '');
  const [matchTarget, setMatchTarget] = useState(room ? room.matchTarget : 5);
  const [timeLimit, setTimeLimit] = useState(room ? room.timeLimit : 15);
  const [pickMode, setPickMode] = useState(room ? room.pickMode : 'songs');
  const [musicSource, setMusicSource] = useState(room ? room.musicSource : 'manual');
  const [gameMode, setGameMode] = useState(room ? room.gameMode : 'standard');
  const [blindMode, setBlindMode] = useState(room ? room.blindMode : false);
  const [showSettings, setShowSettings] = useState(false);

  if (!room) return null;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const isWinner = room.winner && room.winner.id === playerId;

  const s = {
    wrap: { maxWidth:500, margin:'0 auto', padding:16, paddingTop:40 },
    banner: { background:'#14532d', borderRadius:12, padding:'24px 20px', textAlign:'center', marginBottom:16 },
    winName: { fontSize:28, fontWeight:800, color:'#86efac', marginBottom:4 },
    winSub: { fontSize:14, color:'#4ade80' },
    card: { background:'#1e293b', borderRadius:12, padding:20, marginBottom:12 },
    title: { fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:12 },
    scoreRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #334155' },
    scoreName: { fontSize:14, color:'#e2e8f0' },
    scoreVal: { fontSize:16, fontWeight:700, color:'#6366f1' },
    btn: { width:'100%', padding:'12px 20px', borderRadius:8, border:'none', cursor:'pointer', background:'#6366f1', color:'#fff', fontWeight:700, fontSize:15, marginBottom:8 },
    btnSecondary: { width:'100%', padding:'11px 20px', borderRadius:8, border:'1px solid #475569', cursor:'pointer', background:'transparent', color:'#94a3b8', fontWeight:600, fontSize:14, marginBottom:8 },
    waitingNote: { textAlign:'center', color:'#64748b', fontSize:14, padding:'16px 0' },
    // Settings styles
    label: { fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6, marginTop:12 },
    toggle: { display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid #334155', marginBottom:8 },
    toggleBtn: (active) => ({ flex:1, padding:'8px 0', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, background: active?'#6366f1':'#0f172a', color: active?'#fff':'#64748b' }),
    genreGrid: { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6, marginBottom:8 },
    genreBtn: (sel) => ({ padding:'8px 10px', borderRadius:8, border: sel?'2px solid #6366f1':'1px solid #334155', cursor:'pointer', background: sel?'#312e81':'#0f172a', color: sel?'#a5b4fc':'#94a3b8', fontWeight:600, fontSize:13, textAlign:'center' }),
    row: { display:'flex', gap:10, marginBottom:8 },
    numInput: { flex:1, padding:'8px 10px', borderRadius:8, background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155', fontSize:14 },
    gameModeCard: (active, accent) => ({ padding:'10px 12px', borderRadius:8, border: active?`2px solid ${accent}`:'1px solid #334155', cursor:'pointer', background: active?(accent==='#f59e0b'?'#1c1505':accent==='#ef4444'?'#1f0a0a':'#1a1033'):'#0f172a', marginBottom:6 }),
    gameModeTitle: (active, accent) => ({ fontSize:13, fontWeight:700, color: active?accent:'#e2e8f0', marginBottom:1 }),
    gameModeSub: { fontSize:11, color:'#64748b' },
    checkRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:8, background:'#0f172a', border:'1px solid #334155', marginBottom:6, cursor:'pointer' },
    checkBox: (on) => ({ width:18, height:18, borderRadius:4, border:`2px solid ${on?'#ef4444':'#475569'}`, background: on?'#ef4444':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }),
  };

  const handlePlayAgain = () => {
    onPlayAgain({ genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode });
  };

  return (
    <div style={s.wrap}>
      <div style={s.banner}>
        {room.coinFlip && <div style={s.winSub}>Tied: {room.tiedPlayers ? room.tiedPlayers.join(' vs ') : ''} — coin flip!</div>}
        <div style={s.winName}>{room.winner ? room.winner.name : 'Nobody'} wins!</div>
        <div style={s.winSub}>{room.coinFlip ? 'Won the coin flip' : (room.winner ? `${room.winner.score} matches` : '')}</div>
        {isWinner && <div style={{ fontSize:32, marginTop:8 }}>🎉 You won!</div>}
      </div>

      <div style={s.card}>
        <div style={s.title}>Final scores</div>
        {sorted.map((p, i) => (
          <div key={p.id} style={s.scoreRow}>
            <span style={s.scoreName}>{i+1}. {p.name}{p.id === playerId ? ' (you)' : ''}</span>
            <span style={s.scoreVal}>{p.score} pts</span>
          </div>
        ))}
      </div>

      {isHost ? (
        <div style={s.card}>
          <div style={s.title}>Play again</div>

          <button style={s.btnSecondary} onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Hide settings ▲' : 'Change settings ▼'}
          </button>

          {showSettings && (
            <div>
              <label style={s.label}>Game mode</label>
              <div style={s.gameModeCard(gameMode==='standard','#6366f1')} onClick={() => setGameMode('standard')}>
                <div style={s.gameModeTitle(gameMode==='standard','#a5b4fc')}>Standard</div>
                <div style={s.gameModeSub}>Pick 5 songs or artists, first to match wins.</div>
              </div>
              <div style={s.gameModeCard(gameMode==='newlywed','#f59e0b')} onClick={() => setGameMode('newlywed')}>
                <div style={s.gameModeTitle(gameMode==='newlywed','#fbbf24')}>Newlywed Bingo</div>
                <div style={s.gameModeSub}>Mains + backups + secret guesses.</div>
              </div>
              <div style={s.gameModeCard(gameMode==='gongshow','#ef4444')} onClick={() => setGameMode('gongshow')}>
                <div style={s.gameModeTitle(gameMode==='gongshow','#f87171')}>Gong Show Bingo</div>
                <div style={s.gameModeSub}>10 mains + 5 secret gong picks.</div>
              </div>

              {gameMode === 'gongshow' && (
                <div style={s.checkRow} onClick={() => setBlindMode(!blindMode)}>
                  <div><div style={{ fontSize:13, color:'#e2e8f0', fontWeight:600 }}>🙈 Blind mode</div></div>
                  <div style={s.checkBox(blindMode)}>{blindMode && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}</div>
                </div>
              )}

              <label style={s.label}>Music source</label>
              <div style={s.toggle}>
                <button style={s.toggleBtn(musicSource==='manual')} onClick={() => setMusicSource('manual')}>Manual</button>
                <button style={s.toggleBtn(musicSource==='spotify')} onClick={() => setMusicSource('spotify')}>Spotify</button>
              </div>

              <label style={s.label}>Pick mode</label>
              <div style={s.toggle}>
                <button style={s.toggleBtn(pickMode==='songs')} onClick={() => setPickMode('songs')}>Songs</button>
                <button style={s.toggleBtn(pickMode==='artists')} onClick={() => setPickMode('artists')}>Artists</button>
              </div>

              <label style={s.label}>Genre</label>
              <div style={s.genreGrid}>
                {GENRES.map(g => <button key={g} style={s.genreBtn(genre===g)} onClick={() => setGenre(g)}>{g}</button>)}
              </div>

              <div style={s.row}>
                <div style={{ flex:1 }}>
                  <label style={s.label}>Points to win</label>
                  <input type="number" style={s.numInput} min={1} max={10} value={matchTarget} onChange={e => setMatchTarget(parseInt(e.target.value)||1)} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={s.label}>Time limit (min)</label>
                  <input type="number" style={s.numInput} min={5} max={60} step={5} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value)||15)} />
                </div>
              </div>
            </div>
          )}

          <button style={s.btn} onClick={handlePlayAgain}>Start new game →</button>
          <button style={s.btnSecondary} onClick={onLeave}>Leave room</button>
        </div>
      ) : (
        <div style={s.card}>
          <div style={s.waitingNote}>Waiting for the host to start a new game...</div>
          <button style={s.btnSecondary} onClick={onLeave}>Leave room</button>
        </div>
      )}
    </div>
  );
}