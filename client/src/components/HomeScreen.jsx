import React, { useState, useEffect } from 'react';
import socket from '../socket.js';

const GENRES = ['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Country', 'Electronic'];

export default function HomeScreen({ spotifyConnected }) {
  const [mode, setMode] = useState('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [genre, setGenre] = useState('');
  const [matchTarget, setMatchTarget] = useState(5);
  const [timeLimit, setTimeLimit] = useState(15);
  const [pickMode, setPickMode] = useState('songs');
  const [musicSource, setMusicSource] = useState('manual');
  const [gameMode, setGameMode] = useState('standard');
  const [blindMode, setBlindMode] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('pandora_pre_spotify');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.name) setName(s.name);
        if (s.genre) setGenre(s.genre);
        if (s.matchTarget) setMatchTarget(s.matchTarget);
        if (s.timeLimit) setTimeLimit(s.timeLimit);
        if (s.pickMode) setPickMode(s.pickMode);
        if (s.musicSource) setMusicSource(s.musicSource);
        if (s.gameMode) setGameMode(s.gameMode);
        if (s.blindMode !== undefined) setBlindMode(s.blindMode);
        setMode('host');
      } catch {}
      sessionStorage.removeItem('pandora_pre_spotify');
    }
  }, []);

  const s = {
    wrap: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:16 },
    card: { background:'#1e293b', borderRadius:12, padding:28, width:'100%', maxWidth:440 },
    title: { fontSize:28, fontWeight:800, color:'#f1f5f9', marginBottom:4 },
    sub: { fontSize:14, color:'#64748b', marginBottom:24 },
    label: { fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 },
    input: { width:'100%', padding:'10px 12px', borderRadius:8, background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155', fontSize:14, marginBottom:16, boxSizing:'border-box' },
    btnP: { width:'100%', padding:'11px 20px', borderRadius:8, border:'none', cursor:'pointer', background:'#6366f1', color:'#fff', fontWeight:700, fontSize:15, marginBottom:10 },
    btnS: { width:'100%', padding:'10px 20px', borderRadius:8, border:'1px solid #475569', cursor:'pointer', background:'transparent', color:'#94a3b8', fontWeight:600, fontSize:14 },
    btnSpotify: { width:'100%', padding:'11px 20px', borderRadius:8, border:'none', cursor:'pointer', background:'#1DB954', color:'#fff', fontWeight:700, fontSize:15, marginBottom:10 },
    genreGrid: { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginBottom:16 },
    genreBtn: (sel) => ({ padding:'10px 12px', borderRadius:8, border: sel ? '2px solid #6366f1' : '1px solid #334155', cursor:'pointer', background: sel ? '#312e81' : '#0f172a', color: sel ? '#a5b4fc' : '#94a3b8', fontWeight:600, fontSize:14, textAlign:'center' }),
    row: { display:'flex', gap:12, marginBottom:16 },
    numInput: { flex:1, padding:'10px 12px', borderRadius:8, background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155', fontSize:14 },
    back: { background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:13, marginBottom:16, padding:0 },
    toggle: { display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid #334155', marginBottom:16 },
    toggleBtn: (active) => ({ flex:1, padding:'10px 0', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, background: active ? '#6366f1' : '#0f172a', color: active ? '#fff' : '#64748b' }),
    desc: { fontSize:12, color:'#64748b', marginBottom:16, lineHeight:1.5 },
    divider: { borderTop:'1px solid #334155', margin:'16px 0' },
    spotifyBadge: { display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:'#14532d', border:'1px solid #166534', marginBottom:16 },
    spotifyBadgeText: { fontSize:13, color:'#86efac', fontWeight:600 },
    sourceCard: (active) => ({ padding:'12px 14px', borderRadius:8, border: active ? '2px solid #6366f1' : '1px solid #334155', cursor:'pointer', background: active ? '#312e81' : '#0f172a', marginBottom:8 }),
    sourceTitle: (active) => ({ fontSize:14, fontWeight:700, color: active ? '#a5b4fc' : '#e2e8f0', marginBottom:2 }),
    sourceSub: { fontSize:12, color:'#64748b' },
    gameModeCard: (active, accent) => ({
      padding:'14px 16px', borderRadius:8,
      border: active ? `2px solid ${accent}` : '1px solid #334155',
      cursor:'pointer',
      background: active ? (accent === '#f59e0b' ? '#1c1505' : accent === '#ef4444' ? '#1f0a0a' : '#1a1033') : '#0f172a',
      marginBottom:8,
    }),
    gameModeTitle: (active, accent) => ({ fontSize:14, fontWeight:700, color: active ? accent : '#e2e8f0', marginBottom:2 }),
    gameModeSub: { fontSize:12, color:'#64748b', lineHeight:1.4 },
    badge: (bg, color, border) => ({ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700, background:bg, color, border:`1px solid ${border}`, marginLeft:6 }),
    checkRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:8, background:'#0f172a', border:'1px solid #334155', marginBottom:8, cursor:'pointer' },
    checkLabel: { fontSize:14, color:'#e2e8f0', fontWeight:600 },
    checkSub: { fontSize:12, color:'#64748b', marginTop:2 },
    checkBox: (on) => ({ width:20, height:20, borderRadius:4, border:`2px solid ${on ? '#ef4444' : '#475569'}`, background: on ? '#ef4444' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }),
  };

  const connectSpotify = () => {
    sessionStorage.setItem('pandora_pre_spotify', JSON.stringify({
      name, genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode
    }));
    // Use relative path so this works both locally (via Vite proxy) and on Replit (same origin)
    window.location.href = '/auth/spotify';
  };

  const hostGame = () => {
    if (!name.trim()) { alert('Enter your name'); return; }
    if (!genre) { alert('Select a genre'); return; }
    if (musicSource === 'spotify' && !spotifyConnected) { alert('Connect your Spotify account first'); return; }
    socket.emit('host:create', { hostName: name.trim(), genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode });
  };

  const joinGame = () => {
    if (!name.trim()) { alert('Enter your name'); return; }
    if (!roomCode.trim()) { alert('Enter room code'); return; }
    socket.emit('player:join', { playerName: name.trim(), roomCode: roomCode.trim().toUpperCase() });
  };

  const effectiveMaxTarget = 10;

  if (mode === 'home') return (
    <div style={s.wrap}><div style={s.card}>
      <div style={s.title}>Pandora Bingo</div>
      <div style={s.sub}>Pick songs or artists you think will play. First to match wins.</div>
      <label style={s.label}>Your name</label>
      <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
      <button style={s.btnP} onClick={() => setMode('host')}>Host a game</button>
      <button style={s.btnS} onClick={() => setMode('join')}>Join a game</button>
    </div></div>
  );

  if (mode === 'join') return (
    <div style={s.wrap}><div style={s.card}>
      <button style={s.back} onClick={() => setMode('home')}>← Back</button>
      <div style={s.title}>Join game</div>
      <div style={s.sub}>Enter your name and room code</div>
      <label style={s.label}>Your name</label>
      <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
      <label style={s.label}>Room code</label>
      <input style={{...s.input, textTransform:'uppercase', letterSpacing:4, fontSize:20}} value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="XXXXXX" maxLength={6} />
      <button style={s.btnP} onClick={joinGame}>Join room</button>
    </div></div>
  );

  return (
    <div style={s.wrap}><div style={s.card}>
      <button style={s.back} onClick={() => setMode('home')}>← Back</button>
      <div style={s.title}>Game settings</div>

      <label style={s.label}>Your name</label>
      <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />

      <div style={s.divider} />

      <label style={s.label}>Game mode</label>

      <div style={s.gameModeCard(gameMode === 'standard', '#6366f1')} onClick={() => setGameMode('standard')}>
        <div style={s.gameModeTitle(gameMode === 'standard', '#a5b4fc')}>Standard</div>
        <div style={s.gameModeSub}>Pick 5 songs or artists you predict will play. First to match wins.</div>
      </div>

      <div style={s.gameModeCard(gameMode === 'newlywed', '#f59e0b')} onClick={() => setGameMode('newlywed')}>
        <div style={s.gameModeTitle(gameMode === 'newlywed', '#fbbf24')}>
          Newlywed Bingo
          <span style={s.badge('#451a03', '#fbbf24', '#92400e')}>NEW</span>
        </div>
        <div style={s.gameModeSub}>Pick 5 mains + 3 backups + 3 secret guesses. Sabotage opponents, earn wildcards.</div>
      </div>

      <div style={s.gameModeCard(gameMode === 'gongshow', '#ef4444')} onClick={() => setGameMode('gongshow')}>
        <div style={s.gameModeTitle(gameMode === 'gongshow', '#f87171')}>
          Gong Show Bingo
          <span style={s.badge('#1f0a0a', '#f87171', '#7f1d1d')}>NEW</span>
        </div>
        <div style={s.gameModeSub}>Pick 10 songs + 5 secret gong songs. Gong another player's pick to cancel their point — but duplicate gongers cancel each other and lose a point.</div>
      </div>

      {gameMode === 'gongshow' && (
        <div style={s.checkRow} onClick={() => setBlindMode(!blindMode)}>
          <div>
            <div style={s.checkLabel}>🙈 Blind mode</div>
            <div style={s.checkSub}>Your own picks are hidden from you until each song plays.</div>
          </div>
          <div style={s.checkBox(blindMode)}>
            {blindMode && <span style={{color:'#fff', fontSize:13, fontWeight:800}}>✓</span>}
          </div>
        </div>
      )}

      <div style={s.divider} />

      <label style={s.label}>Music source</label>
      <div style={s.sourceCard(musicSource === 'manual')} onClick={() => setMusicSource('manual')}>
        <div style={s.sourceTitle(musicSource === 'manual')}>Manual</div>
        <div style={s.sourceSub}>Host marks songs as they play. Works with any music source.</div>
      </div>
      <div style={s.sourceCard(musicSource === 'spotify')} onClick={() => setMusicSource('spotify')}>
        <div style={s.sourceTitle(musicSource === 'spotify')}>Spotify</div>
        <div style={s.sourceSub}>Auto-detects songs from Spotify. Requires Spotify account.</div>
      </div>

      {musicSource === 'spotify' && (
        <div style={{marginBottom:16}}>
          {spotifyConnected ? (
            <div style={s.spotifyBadge}>
              <span style={{fontSize:16}}>✓</span>
              <span style={s.spotifyBadgeText}>Spotify connected</span>
            </div>
          ) : (
            <button style={s.btnSpotify} onClick={connectSpotify}>Connect Spotify</button>
          )}
        </div>
      )}

      <div style={s.divider} />

      <label style={s.label}>Pick mode</label>
      <div style={s.toggle}>
        <button style={s.toggleBtn(pickMode === 'songs')} onClick={() => setPickMode('songs')}>Songs</button>
        <button style={s.toggleBtn(pickMode === 'artists')} onClick={() => setPickMode('artists')}>Artists</button>
      </div>
      <div style={s.desc}>
        {pickMode === 'songs' ? 'Players pick specific songs they predict will play.' : 'Players pick artists. A match occurs when any song by that artist plays.'}
        {gameMode === 'gongshow' && ' In Gong Show mode you also pick 5 secret gong songs.'}
        {gameMode === 'newlywed' && ' In Newlywed mode you also pick backups and secret guesses.'}
      </div>

      <label style={s.label}>Genre</label>
      <div style={s.genreGrid}>
        {GENRES.map(g => (
          <button key={g} style={s.genreBtn(genre === g)} onClick={() => setGenre(g)}>{g}</button>
        ))}
      </div>

      <div style={s.row}>
        <div style={{flex:1}}>
          <label style={s.label}>
            {gameMode === 'gongshow' ? 'Points to win' : 'Matches to win'}
          </label>
          <input type="number" style={s.numInput}
            min={1} max={effectiveMaxTarget}
            value={matchTarget}
            onChange={e => setMatchTarget(Math.min(effectiveMaxTarget, parseInt(e.target.value) || 1))}
          />
        </div>
        <div style={{flex:1}}>
          <label style={s.label}>Time limit (min)</label>
          <input type="number" style={s.numInput} min={5} max={60} step={5} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} />
        </div>
      </div>

      <button style={s.btnP} onClick={hostGame}>Create room</button>
    </div></div>
  );
}
