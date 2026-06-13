import React, { useState, useEffect } from 'react';

// const GENRES = ['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Country', 'Electronic']; // Genre picker retired

export default function EndScreen({ room, playerId, isHost, onPlayAgain, onLeave }) {
  const [playlistName, setPlaylistName] = useState(room ? room.playlistName || '' : '');
  const [matchTarget, setMatchTarget] = useState(room ? room.matchTarget : 5);
  const [timeLimit, setTimeLimit] = useState(room ? room.timeLimit : 60);
  // const [pickMode, setPickMode] = useState(room ? room.pickMode : 'artists'); // Song mode retired
  const [musicSource, setMusicSource] = useState(room ? room.musicSource : 'manual');
  const [gameMode, setGameMode] = useState(room ? room.gameMode : 'standard');
  const [blindMode, setBlindMode] = useState(room ? room.blindMode : false);
  const [djPickCount, setDjPickCount] = useState(room ? room.djPickCount || 5 : 5);
  const [playlistHint, setPlaylistHint] = useState(room ? room.playlistHint || '' : '');
  const [djHostTarget, setDjHostTarget] = useState(room ? room.djHostTarget || 10 : 10);
  const [djPenaltyEnabled, setDjPenaltyEnabled] = useState(room ? room.djPenaltyEnabled || false : false);
  const [djPenaltyAmount, setDjPenaltyAmount] = useState(room ? room.djPenaltyAmount != null ? room.djPenaltyAmount : 1.0 : 1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [spotifyAvailable, setSpotifyAvailable] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => setSpotifyAvailable(!!cfg.spotifyAvailable))
      .catch(() => setSpotifyAvailable(false));
  }, []);

  if (!room) return null;
  const isDJBattle = room.gameMode === 'djbattle';
  const sorted = [...room.players]
    .filter(p => isDJBattle ? p.id !== room.hostId : true)
    .sort((a, b) => b.score - a.score);
  const isWinner = room.winner && room.winner.id === playerId;
  const hostWon = room.winner && room.winner.isHostWin;
  const winnerName = hostWon ? `🎧 ${room.winner.name} (DJ)` : (room.winner ? room.winner.name : 'Nobody');
  const winnerScore = hostWon ? room.hostScore : (room.winner ? room.winner.score : 0);

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
    sourceCard: (active) => ({ padding:'10px 12px', borderRadius:8, border: active?'2px solid #6366f1':'1px solid #334155', cursor:'pointer', background: active?'#1a1033':'#0f172a', marginBottom:6, boxShadow: active?'0 0 8px rgba(99,102,241,0.15)':'none' }),
    sourceTitle: (active) => ({ fontSize:13, fontWeight:700, color: active?'#a5b4fc':'#e2e8f0', marginBottom:2 }),
    sourceSub: { fontSize:11, color:'#64748b' },
  };

  const handlePlayAgain = () => {
    onPlayAgain({ matchTarget, timeLimit, musicSource, gameMode, blindMode, djPickCount, playlistName, playlistHint, djHostTarget, djPenaltyEnabled, djPenaltyAmount });
  };

  return (
    <div style={s.wrap}>
      <div style={s.banner}>
        {room.coinFlip && <div style={s.winSub}>Tied: {room.tiedPlayers ? room.tiedPlayers.join(' vs ') : ''} — coin flip!</div>}
        <div style={s.winName}>{winnerName} wins!</div>
        <div style={s.winSub}>{room.coinFlip ? 'Won the coin flip' : (room.winner ? `${winnerScore} pts` : '')}</div>
        {isWinner && !hostWon && <div style={{ fontSize:32, marginTop:8 }}>🎉 You won!</div>}
        {hostWon && isHost && <div style={{ fontSize:32, marginTop:8 }}>🎧 You stumped them!</div>}
      </div>

      <div style={s.card}>
        <div style={s.title}>Final scores</div>
        {isDJBattle && (
          <div style={{ ...s.scoreRow, borderBottom: '1px solid rgba(168,85,247,0.3)' }}>
            <span style={{ ...s.scoreName, color: '#a855f7' }}>🎧 {room.players.find(p => p.id === room.hostId)?.name} (DJ)</span>
            <span style={{ ...s.scoreVal, color: '#a855f7' }}>{room.hostScore || 0} / {room.djHostTarget || 10} pts</span>
          </div>
        )}
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
                <div style={s.gameModeSub}>Pick 5 artists, first to match wins.</div>
              </div>
              <div style={s.gameModeCard(gameMode==='newlywed','#f59e0b')} onClick={() => setGameMode('newlywed')}>
                <div style={s.gameModeTitle(gameMode==='newlywed','#fbbf24')}>Newlywed Bingo</div>
                <div style={s.gameModeSub}>Mains + backups + secret guesses.</div>
              </div>
              <div style={s.gameModeCard(gameMode==='gongshow','#ef4444')} onClick={() => setGameMode('gongshow')}>
                <div style={s.gameModeTitle(gameMode==='gongshow','#f87171')}>Gong Show Bingo</div>
                <div style={s.gameModeSub}>10 mains + 5 secret gong picks.</div>
              </div>
              <div style={s.gameModeCard(gameMode==='djbattle','#a855f7')} onClick={() => setGameMode('djbattle')}>
                <div style={s.gameModeTitle(gameMode==='djbattle','#c084fc')}>DJ Battle</div>
                <div style={s.gameModeSub}>Host plays their playlist, players guess artists.</div>
              </div>

              {gameMode === 'gongshow' && (
                <div style={s.checkRow} onClick={() => setBlindMode(!blindMode)}>
                  <div><div style={{ fontSize:13, color:'#e2e8f0', fontWeight:600 }}>🙈 Blind mode</div></div>
                  <div style={s.checkBox(blindMode)}>{blindMode && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}</div>
                </div>
              )}

              <label style={s.label}>Playlist name</label>
              <input
                style={{ ...s.numInput, width:'100%', boxSizing:'border-box', marginBottom:8 }}
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                placeholder="e.g. 2000s Hip-Hop Throwback"
              />

              {gameMode === 'djbattle' && (
                <>
                  <label style={s.label}>Hint for players <span style={{ color:'#475569', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
                  <input
                    style={{ ...s.numInput, width:'100%', boxSizing:'border-box', marginBottom:8 }}
                    value={playlistHint}
                    onChange={e => setPlaylistHint(e.target.value)}
                    placeholder="e.g. All artists who peaked in the 2000s"
                  />
                  <label style={s.label}>Artists per player</label>
                  <input type="number"
                    style={{ ...s.numInput, width:'100%', boxSizing:'border-box', marginBottom:8 }}
                    min={1} max={15} value={djPickCount}
                    onChange={e => setDjPickCount(Math.max(1, Math.min(15, parseInt(e.target.value)||1)))}
                  />
                  <label style={s.label}>DJ score target</label>
                  <input type="number"
                    style={{ ...s.numInput, width:'100%', boxSizing:'border-box', marginBottom:8 }}
                    min={1} max={50} value={djHostTarget}
                    onChange={e => setDjHostTarget(Math.max(1, parseInt(e.target.value)||1))}
                  />
                  <div
                    style={s.checkRow}
                    onClick={() => setDjPenaltyEnabled(!djPenaltyEnabled)}
                  >
                    <div>
                      <div style={{ fontSize:13, color: djPenaltyEnabled ? '#a855f7' : '#e2e8f0', fontWeight:600 }}>⚡ DJ penalty mode</div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>DJ loses points when a player correctly guesses an artist.</div>
                    </div>
                    <div style={{ ...s.checkBox(djPenaltyEnabled), border: `2px solid ${djPenaltyEnabled ? '#a855f7' : '#475569'}`, background: djPenaltyEnabled ? '#a855f7' : 'transparent' }}>
                      {djPenaltyEnabled && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
                    </div>
                  </div>
                  {djPenaltyEnabled && (
                    <>
                      <label style={s.label}>Penalty amount</label>
                      <input type="number"
                        style={{ ...s.numInput, width:'100%', boxSizing:'border-box', marginBottom:8 }}
                        min={0.1} max={5} step={0.1} value={djPenaltyAmount}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) setDjPenaltyAmount(Math.round(Math.max(0.1, Math.min(5, v)) * 10) / 10);
                        }}
                      />
                    </>
                  )}
                </>
              )}

              <label style={s.label}>Music source</label>
              <div style={s.sourceCard(musicSource==='manual')} onClick={() => setMusicSource('manual')}>
                <div style={s.sourceTitle(musicSource==='manual')}>Manual</div>
                <div style={s.sourceSub}>Host marks songs as they play.</div>
              </div>
              <div style={s.sourceCard(musicSource==='audd')} onClick={() => setMusicSource('audd')}>
                <div style={s.sourceTitle(musicSource==='audd')}>🎙 Auto-detect (mic)</div>
                <div style={s.sourceSub}>Identifies songs via microphone.</div>
              </div>
              {spotifyAvailable && (
                <div style={s.sourceCard(musicSource==='spotify')} onClick={() => setMusicSource('spotify')}>
                  <div style={s.sourceTitle(musicSource==='spotify')}>Spotify</div>
                  <div style={s.sourceSub}>Auto-detects songs from Spotify.</div>
                </div>
              )}

              {/* Pick mode toggle retired — always artist mode */}
              {/* Genre picker retired — pool driven by playlist name */}

              <div style={s.row}>
                <div style={{ flex:1 }}>
                  <label style={s.label}>Points to win</label>
                  <input type="number" style={s.numInput} min={1} max={10} value={matchTarget} onChange={e => setMatchTarget(parseInt(e.target.value)||1)} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={s.label}>Time limit (min)</label>
                  <input type="number" style={s.numInput} min={5} max={60} step={5} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value)||60)} />
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