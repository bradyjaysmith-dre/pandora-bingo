import React, { useState, useEffect } from 'react';
import socket from '../socket.js';

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// ─── Shared client-side match helper ──────────────────────────────────────────
// Mirrors server game.js songMatchesPick: ID-first, string fallback.
function pickMatchesSong(pick, song, isArtistMode) {
  if (isArtistMode) {
    if (pick.id && song.artistIds && song.artistIds.length) return song.artistIds.includes(pick.id);
    const pa = (song.artist || '').toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
    return pa.some(a => a === (pick.name || '').toLowerCase().trim());
  }
  if (pick.id && song.id) return pick.id === song.id;
  return song.title === pick.title;
}

// ─── Standard card ────────────────────────────────────────────────────────────

function StandardCard({ me, room, isArtistMode }) {
  const s = cardStyles();
  const isMatched = (pick) => room.playedSongs.some(s => pickMatchesSong(pick, s, isArtistMode));

  return (
    <>
      <div style={s.grid}>
        {me.picks.map((pick, i) => {
          const matched = isMatched(pick);
          const matchedSongs = isArtistMode && matched ? room.playedSongs.filter(s => pickMatchesSong(pick, s, true)) : [];
          return (
            <div key={i} style={s.song(matched)}>
              <div style={s.songTitle(matched)}>{matched ? '✓ ' : ''}{isArtistMode ? pick.name : pick.title}</div>
              {!isArtistMode && <div style={s.songArtist(matched)}>{pick.artist}</div>}
              {isArtistMode && matched && <div style={s.songArtist(matched)}>{matchedSongs.map(p => p.title).join(', ')}</div>}
            </div>
          );
        })}
      </div>
      <PlayedList room={room} />
    </>
  );
}

// ─── Newlywed card ────────────────────────────────────────────────────────────

function NewlywedCard({ me, room, playerId, isArtistMode }) {
  const s = cardStyles();

  const smp = (song, pick) => pickMatchesSong(pick, song, isArtistMode);

  const isMainMatched = (pick) => room.playedSongs.some(s => smp(s, pick));
  const isBackupPlayed = (pick) => room.playedSongs.some(s => smp(s, pick));
  const isWildcardPlayed = (pick) => room.playedSongs.some(s => smp(s, pick));
  const isGuessHit = (pick) => {
    if (!isMainMatched(pick)) return false;
    return room.players.some(p => {
      if (p.id === playerId) return false;
      return [...(p.picks||[]),...(p.backups||[])].some(ep => pickMatchesSong(ep, { id: pick.id, title: pick.title, artist: pick.artist, artistIds: pick.artistIds }, isArtistMode));
    });
  };

  const debt = me.backupDebt || 0;
  const backupsPlayed = (me.backups||[]).filter(p => isBackupPlayed(p)).length;
  const wildcardsPlayed = (me.wildcards||[]).filter(p => isWildcardPlayed(p)).length;
  const totalDebtCleared = backupsPlayed + wildcardsPlayed;
  const debtRemaining = Math.max(0, debt - totalDebtCleared);

  const nwS = {
    debtBanner: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:14, background: debtRemaining > 0 ? '#450a0a' : '#14532d', border:`1px solid ${debtRemaining > 0 ? '#7f1d1d' : '#166534'}` },
    debtText: { fontSize:13, fontWeight:600, color: debtRemaining > 0 ? '#fca5a5' : '#86efac', lineHeight:1.3 },
    wildcardBanner: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:14, background:'#1c1505', border:'1px solid #92400e' },
    sectionHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:8 },
    sectionLabel: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' },
    guessRow: (hit) => ({ padding:'10px 12px', borderRadius:8, marginBottom:6, background: hit?'#14532d':'#1e293b', border:`1px solid ${hit?'#166534':'#334155'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }),
    guessBadge: (hit) => ({ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background: hit?'#166534':'#334155', color: hit?'#86efac':'#64748b' }),
  };

  return (
    <div>
      {debt > 0 && (
        <div style={nwS.debtBanner}>
          <span style={{fontSize:18}}>{debtRemaining > 0 ? '⚠️' : '✓'}</span>
          <div>
            <div style={nwS.debtText}>{debtRemaining > 0 ? `${debtRemaining} backup${debtRemaining>1?'s':''} still needed` : 'All obligations cleared!'}</div>
            {debtRemaining > 0 && <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{totalDebtCleared} of {debt} cleared</div>}
          </div>
        </div>
      )}
      {(me.wildcards||[]).length > 0 && (
        <div style={nwS.wildcardBanner}>
          <span style={{fontSize:18}}>🃏</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#fbbf24'}}>Wildcard earned!</div>
            <div style={{fontSize:11,color:'#fbbf24',marginTop:2}}>{(me.wildcards||[]).map(w => isArtistMode?w.name:w.title).join(', ')}</div>
          </div>
        </div>
      )}
      <div style={{marginBottom:16}}>
        <div style={nwS.sectionHeader}><span style={{...nwS.sectionLabel,color:'#818cf8'}}>Main picks</span><span style={{fontSize:11,color:'#64748b'}}>{me.picks.filter(p=>isMainMatched(p)).length} / {room.matchTarget} matched</span></div>
        <div style={s.grid}>{(me.picks||[]).map((pick,i) => { const matched=isMainMatched(pick); return <div key={i} style={s.song(matched)}><div style={s.songTitle(matched)}>{matched?'✓ ':''}{isArtistMode?pick.name:pick.title}</div>{!isArtistMode&&<div style={s.songArtist(matched)}>{pick.artist}</div>}</div>; })}</div>
      </div>
      {(me.backups||[]).length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={nwS.sectionHeader}><span style={{...nwS.sectionLabel,color:'#fbbf24'}}>Backups</span><span style={{fontSize:11,color:'#64748b'}}>{backupsPlayed} played</span></div>
          <div style={s.grid}>{(me.backups||[]).map((pick,i) => { const played=isBackupPlayed(pick); return <div key={i} style={{...s.song(false),border:played?'1px solid #854d0e':'1px solid #334155',background:played?'#1c0a00':'#1e293b'}}><div style={{...s.songTitle(false),color:played?'#fbbf24':'#94a3b8'}}>{played?'✓ ':''}{isArtistMode?pick.name:pick.title}</div>{!isArtistMode&&<div style={s.songArtist(false)}>{pick.artist}</div>}</div>; })}</div>
        </div>
      )}
      {(me.wildcards||[]).length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={nwS.sectionHeader}><span style={{...nwS.sectionLabel,color:'#fbbf24'}}>🃏 Wildcards</span></div>
          <div style={s.grid}>{(me.wildcards||[]).map((pick,i) => { const played=isWildcardPlayed(pick); return <div key={i} style={{...s.song(false),border:'1px solid #92400e',background:played?'#1c0a00':'#1e293b'}}><div style={{...s.songTitle(false),color:played?'#fbbf24':'#d97706'}}>{played?'✓ ':''}🃏 {isArtistMode?pick.name:pick.title}</div>{!isArtistMode&&<div style={s.songArtist(false)}>{pick.artist}</div>}</div>; })}</div>
        </div>
      )}
      {(me.guesses||[]).length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={nwS.sectionHeader}><span style={{...nwS.sectionLabel,color:'#f472b6'}}>🔒 Secret guesses</span><span style={{fontSize:11,color:'#64748b'}}>{me.guessHits||0} hit</span></div>
          {(me.guesses||[]).map((pick,i) => { const hit=isGuessHit(pick); return <div key={i} style={nwS.guessRow(hit)}><span style={{fontSize:13,fontWeight:600,color:hit?'#86efac':'#e2e8f0'}}>{isArtistMode?pick.name:pick.title}</span><span style={nwS.guessBadge(hit)}>{hit?'Hit!':'Watching...'}</span></div>; })}
        </div>
      )}
      <PlayedList room={room} />
    </div>
  );
}

// ─── Gong Show card ───────────────────────────────────────────────────────────

function GongShowCard({ me, room, isArtistMode }) {
  const s = cardStyles();
  const blind = room.blindMode;

  const smp = (song, pick) => pickMatchesSong(pick, song, isArtistMode);

  // In blind mode, only show revealed picks; otherwise show all
  const visiblePicks = blind
    ? (me.picks||[]).filter(pick => (me.revealedPicks||[]).some(r => isArtistMode ? r.name===pick.name : r.title===pick.title))
    : (me.picks||[]);

  const visibleGongs = blind
    ? (me.gongs||[]).filter(gong => (me.revealedGongs||[]).some(r => isArtistMode ? r.name===gong.name : r.title===gong.title))
    : (me.gongs||[]);

  const isMatched = (pick) => room.playedSongs.some(s => smp(s, pick));
  const isGonged = (pick) => {
    // Was this main pick cancelled by a single gong?
    if (!isMatched(pick)) return false;
    // Check gong events embedded in playedSongs context — we infer from score not going up
    // We show it based on revealedGongs from other players visible in room
    return room.players.some(p => p.id !== me.id && (p.revealedGongs||[]).some(g => isArtistMode ? g.name===pick.name : g.title===pick.title));
  };

  const gsS = {
    blindBanner: { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:14, background:'#0f0f1a', border:'1px solid #4c1d95' },
    blindText: { fontSize:13, color:'#c4b5fd', fontWeight:600 },
    sectionHeader: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 },
    unrevealed: { fontSize:13, color:'#374151', fontStyle:'italic', marginBottom:8 },
    gongItem: (fired) => ({ padding:'10px 12px', borderRadius:8, marginBottom:6, background: fired?'#1f0a0a':'#1e293b', border:`1px solid ${fired?'#7f1d1d':'#334155'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }),
    gongBadge: (fired) => ({ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background: fired?'#7f1d1d':'#1e293b', color: fired?'#fca5a5':'#64748b' }),
  };

  const hiddenMainCount = blind ? (me.picks||[]).length - visiblePicks.length : 0;
  const hiddenGongCount = blind ? (me.gongs||[]).length - visibleGongs.length : 0;

  return (
    <div>
      {blind && (
        <div style={gsS.blindBanner}>
          <span style={{fontSize:18}}>🙈</span>
          <div>
            <div style={gsS.blindText}>Blind mode is on</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Your picks reveal as songs play. Stay surprised!</div>
          </div>
        </div>
      )}

      {/* Main picks */}
      <div style={{marginBottom:16}}>
        <div style={gsS.sectionHeader}>🎵 Main picks — {me.score} pts</div>
        {hiddenMainCount > 0 && <div style={gsS.unrevealed}>🙈 {hiddenMainCount} pick{hiddenMainCount>1?'s':''} still hidden...</div>}
        <div style={s.grid}>
          {visiblePicks.map((pick, i) => {
            const matched = isMatched(pick);
            const gonged = isGonged(pick);
            const bg = gonged ? '#1f0a0a' : matched ? '#14532d' : '#1e293b';
            const border = gonged ? '#7f1d1d' : matched ? '#166534' : '#334155';
            const color = gonged ? '#f87171' : matched ? '#86efac' : '#e2e8f0';
            return (
              <div key={i} style={{padding:'10px 12px',borderRadius:8,background:bg,border:`1px solid ${border}`}}>
                <div style={{fontSize:13,fontWeight:600,color,marginBottom:2}}>
                  {gonged ? '🔔 GONGED — ' : matched ? '✓ ' : ''}{isArtistMode ? pick.name : pick.title}
                </div>
                {!isArtistMode && <div style={{fontSize:12,color:'#64748b'}}>{pick.artist}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gong picks */}
      <div style={{marginBottom:16}}>
        <div style={gsS.sectionHeader}>🔔 Gong picks</div>
        {hiddenGongCount > 0 && <div style={gsS.unrevealed}>🙈 {hiddenGongCount} gong{hiddenGongCount>1?'s':''} still hidden...</div>}
        {visibleGongs.map((gong, i) => {
          const fired = room.playedSongs.some(s => smp(s, gong));
          return (
            <div key={i} style={gsS.gongItem(fired)}>
              <span style={{fontSize:13,fontWeight:600,color:fired?'#f87171':'#e2e8f0'}}>{isArtistMode?gong.name:gong.title}</span>
              <span style={gsS.gongBadge(fired)}>{fired?'Fired!':'Waiting...'}</span>
            </div>
          );
        })}
        {visibleGongs.length === 0 && hiddenGongCount === 0 && <div style={{fontSize:13,color:'#374151',fontStyle:'italic'}}>No gongs placed yet.</div>}
      </div>

      <PlayedList room={room} />
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function PlayedList({ room }) {
  const s = cardStyles();
  if (!room.playedSongs || room.playedSongs.length === 0) return null;
  return (
    <div style={{marginTop:8}}>
      <div style={s.playedLabel}>Songs played ({room.playedSongs.length})</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {room.playedSongs.map((song, i) => (
          <div key={i} style={s.playedChip}>{song.title} <span style={{opacity:0.6}}>— {song.artist}</span></div>
        ))}
      </div>
    </div>
  );
}

function cardStyles() {
  return {
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8, marginBottom:8 },
    song: (matched) => ({ padding:'10px 12px', borderRadius:8, background: matched?'#14532d':'#1e293b', border: matched?'1px solid #166534':'1px solid #334155' }),
    songTitle: (matched) => ({ fontSize:13, fontWeight:600, color: matched?'#86efac':'#e2e8f0', marginBottom:2 }),
    songArtist: (matched) => ({ fontSize:12, color: matched?'#4ade80':'#64748b' }),
    playedLabel: { fontSize:12, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, marginBottom:8 },
    playedChip: { padding:'6px 12px', borderRadius:20, fontSize:12, background:'#1e3a5f', color:'#93c5fd', border:'1px solid #1d4ed8' },
  };
}

// ─── Main GameScreen ──────────────────────────────────────────────────────────

export default function GameScreen({ room, playerId, isHost, spotifyTokens, nowPlaying }) {
  const [tab, setTab] = useState('card');
  const [toasts, setToasts] = useState([]); // { id, message, color }

  const addToast = (message, color = '#fbbf24') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, color }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  };

  useEffect(() => {
    socket.on('game:wildcards', ({ wildcards }) => {
      wildcards.forEach(({ playerName, wildcard }) => {
        addToast(`🃏 ${playerName} earned a wildcard: ${wildcard.title || wildcard.name}!`, '#fbbf24');
      });
    });

    socket.on('game:gong_events', ({ events, song }) => {
      const gongFired = events.find(e => e.type === 'gong_fired');
      const cancelled = events.find(e => e.type === 'gong_cancelled');
      const backfires = events.filter(e => e.type === 'backfire');
      const gongedPlayers = events.filter(e => e.type === 'gong');
      const scorers = events.filter(e => e.type === 'point');

      if (cancelled) {
        addToast(`🔔💥 Gong cancelled! ${cancelled.gongerNames.join(' & ')} both gonged "${song}" and each lose a point!`, '#f87171');
      } else if (gongFired) {
        const victims = gongedPlayers.map(e => e.playerName).join(', ');
        const msg = victims
          ? `🔔 ${gongFired.playerName} gonged "${song}"! ${victims} get no point.`
          : `🔔 ${gongFired.playerName} gonged "${song}"!`;
        addToast(msg, '#ef4444');
      }
      scorers.forEach(e => {
        if (!gongFired && !cancelled) return; // only toast scores when something interesting happened
        addToast(`✓ ${e.playerName} scores a point!`, '#4ade80');
      });
    });

    return () => { socket.off('game:wildcards'); socket.off('game:gong_events'); };
  }, []);

  if (!room) return null;

  const me = room.players.find(p => p.id === playerId);
  const secondsLeft = room.secondsLeft || (room.endsAt ? Math.ceil((room.endsAt - Date.now()) / 1000) : 0);
  const urgent = secondsLeft > 0 && secondsLeft < 60;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const isArtistMode = room.pickMode === 'artists';
  const isSpotifyMode = room.musicSource === 'spotify';
  const isNewlywed = room.gameMode === 'newlywed';
  const isGongShow = room.gameMode === 'gongshow';

  const s = {
    wrap: { maxWidth:700, margin:'0 auto', padding:16 },
    topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', marginBottom:8 },
    timer: { fontSize:32, fontWeight:800, color: urgent?'#f87171':'#fbbf24', fontFamily:'monospace' },
    timerLabel: { fontSize:11, color:'#64748b', textTransform:'uppercase' },
    nowPlaying: { background:'#1e293b', border:'1px solid #1DB954', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:12 },
    nowPlayingLabel: { fontSize:11, color:'#1DB954', textTransform:'uppercase', fontWeight:700, marginBottom:2 },
    nowPlayingTitle: { fontSize:15, fontWeight:700, color:'#f1f5f9' },
    nowPlayingArtist: { fontSize:13, color:'#94a3b8' },
    albumArt: { width:48, height:48, borderRadius:6, objectFit:'cover', flexShrink:0 },
    badge: (bg, color, border) => ({ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color, border:`1px solid ${border}`, marginBottom:8, marginRight:6 }),
    tabs: { display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid #1e293b', paddingBottom:8 },
    tab: (active) => ({ padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: active?'#6366f1':'transparent', color: active?'#fff':'#64748b' }),
    scoreCard: (winning) => ({ padding:'12px 14px', borderRadius:8, background: winning?'#14532d':'#1e293b', border: winning?'1px solid #166534':'1px solid #334155' }),
    scoreName: (winning) => ({ fontSize:12, color: winning?'#86efac':'#64748b', marginBottom:4 }),
    scoreVal: (winning) => ({ fontSize:22, fontWeight:700, color: winning?'#4ade80':'#e2e8f0' }),
    scoreGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 },
    hostSong: (played) => ({ padding:'10px 12px', borderRadius:8, cursor: played?'default':'pointer', background: played?'#1e3a5f':'#1e293b', border: played?'1px solid #1d4ed8':'1px solid #334155', opacity: played?0.6:1 }),
    hostControls: { display:'flex', gap:8, marginTop:16, flexWrap:'wrap' },
    btnAdd: { padding:'8px 16px', borderRadius:8, border:'1px solid #475569', background:'transparent', color:'#e2e8f0', cursor:'pointer', fontSize:13, fontWeight:600 },
    btnEnd: { padding:'8px 16px', borderRadius:8, border:'none', background:'#7f1d1d', color:'#fca5a5', cursor:'pointer', fontSize:13, fontWeight:600 },
    btnBlind: (on) => ({ padding:'8px 16px', borderRadius:8, border:`1px solid ${on?'#7c3aed':'#475569'}`, background: on?'#2e1065':'transparent', color: on?'#c4b5fd':'#e2e8f0', cursor:'pointer', fontSize:13, fontWeight:600 }),
    playedList: { display:'flex', flexWrap:'wrap', gap:6, marginTop:12 },
    playedChip: { padding:'4px 10px', borderRadius:20, fontSize:12, background:'#1e3a5f', color:'#93c5fd', border:'1px solid #1d4ed8' },
    toastWrap: { position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:1000, display:'flex', flexDirection:'column', gap:8, alignItems:'center', pointerEvents:'none' },
    toastItem: (color) => ({ padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, color, background:'#0f172a', border:`1px solid ${color}`, boxShadow:'0 4px 16px rgba(0,0,0,0.5)' }),
  };

  return (
    <div style={s.wrap}>
      {toasts.length > 0 && (
        <div style={s.toastWrap}>
          {toasts.map(t => <div key={t.id} style={s.toastItem(t.color)}>{t.message}</div>)}
        </div>
      )}

      <div style={s.topBar}>
        <div>
          <div style={s.timerLabel}>Time left</div>
          <div style={s.timer}>{formatTime(secondsLeft)}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={s.timerLabel}>{isGongShow ? 'Points to win' : 'Win at'}</div>
          <div style={{fontSize:18,fontWeight:700,color:'#e2e8f0'}}>{room.matchTarget} {isGongShow ? 'pts' : 'matches'}</div>
        </div>
      </div>

      <div>
        {isGongShow && <span style={s.badge('#1f0a0a','#f87171','#7f1d1d')}>🔔 Gong Show Bingo</span>}
        {isNewlywed && <span style={s.badge('#451a03','#fbbf24','#92400e')}>🎯 Newlywed Bingo</span>}
        <span style={s.badge('#312e81','#a5b4fc','#6366f1')}>{isArtistMode ? 'Artist mode' : 'Song mode'} — {room.genre}</span>
        {isSpotifyMode && <span style={s.badge('#14532d','#86efac','#166534')}>Spotify</span>}
        {isGongShow && room.blindMode && <span style={s.badge('#1a0533','#c4b5fd','#4c1d95')}>🙈 Blind</span>}
      </div>

      {nowPlaying && (
        <div style={s.nowPlaying}>
          {nowPlaying.albumArt && <img src={nowPlaying.albumArt} style={s.albumArt} alt="album art" />}
          <div>
            <div style={s.nowPlayingLabel}>Now playing</div>
            <div style={s.nowPlayingTitle}>{nowPlaying.title}</div>
            <div style={s.nowPlayingArtist}>{nowPlaying.artist}</div>
          </div>
        </div>
      )}

      <div style={s.tabs}>
        <button style={s.tab(tab==='card')} onClick={() => setTab('card')}>My card</button>
        <button style={s.tab(tab==='scores')} onClick={() => setTab('scores')}>Scores</button>
        {isHost && <button style={s.tab(tab==='host')} onClick={() => setTab('host')}>{isSpotifyMode ? 'Host (Spotify)' : 'Host controls'}</button>}
      </div>

      {tab === 'card' && me && (
        isGongShow ? <GongShowCard me={me} room={room} isArtistMode={isArtistMode} /> :
        isNewlywed ? <NewlywedCard me={me} room={room} playerId={playerId} isArtistMode={isArtistMode} /> :
        <StandardCard me={me} room={room} isArtistMode={isArtistMode} />
      )}

      {tab === 'scores' && (
        <div style={s.scoreGrid}>
          {sorted.map(p => {
            const winning = p.score >= room.matchTarget;
            return (
              <div key={p.id} style={s.scoreCard(winning)}>
                <div style={s.scoreName(winning)}>{p.name}{p.id===playerId?' (you)':''}</div>
                <div style={s.scoreVal(winning)}>{p.score}<span style={{fontSize:14,opacity:0.6}}> / {room.matchTarget}</span></div>
                {isNewlywed && (p.backupDebt||0) > 0 && <div style={{fontSize:11,color:'#fca5a5',marginTop:4}}>⚠ {p.backupDebt} backup{p.backupDebt>1?'s':''} owed</div>}
                {isGongShow && p.score < 0 && <div style={{fontSize:11,color:'#f87171',marginTop:4}}>🔔 Backfired!</div>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'host' && isHost && (
        <div>
          {isSpotifyMode ? (
            <>
              <div style={{fontSize:12,color:'#1DB954',marginBottom:8}}>Spotify is auto-detecting songs.</div>
              {nowPlaying && (
                <div style={{...s.nowPlaying,marginBottom:12}}>
                  {nowPlaying.albumArt && <img src={nowPlaying.albumArt} style={s.albumArt} alt="album" />}
                  <div>
                    <div style={s.nowPlayingLabel}>Currently playing</div>
                    <div style={s.nowPlayingTitle}>{nowPlaying.title}</div>
                    <div style={s.nowPlayingArtist}>{nowPlaying.artist}</div>
                  </div>
                </div>
              )}
              {room.playedSongs.length > 0 && (
                <div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:6}}>Auto-detected:</div>
                  <div style={s.playedList}>{room.playedSongs.map((song,i) => <span key={i} style={s.playedChip}>{song.title} — {song.artist}</span>)}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>Click a song to mark it as played</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:8}}>
                {(room.songPool||[]).map((song,i) => {
                  const played = room.playedSongs.some(p => p.title === song.title);
                  return (
                    <div key={i} style={s.hostSong(played)} onClick={() => !played && socket.emit('host:play_song', { songTitle: song.title })}>
                      <div style={{fontSize:13,fontWeight:600,color:played?'#93c5fd':'#e2e8f0',marginBottom:2}}>{played?'✓ ':''}{song.title}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{song.artist}</div>
                    </div>
                  );
                })}
              </div>
              {room.playedSongs.length > 0 && (
                <div>
                  <div style={{fontSize:12,color:'#64748b',marginTop:12,marginBottom:6}}>Played:</div>
                  <div style={s.playedList}>{room.playedSongs.map((song,i) => <span key={i} style={s.playedChip}>{song.title} — {song.artist}</span>)}</div>
                </div>
              )}
            </>
          )}
          <div style={s.hostControls}>
            <button style={s.btnAdd} onClick={() => socket.emit('host:add_time')}>+5 min</button>
            {isGongShow && (
              <button style={s.btnBlind(room.blindMode)} onClick={() => socket.emit('host:toggle_blind')}>
                {room.blindMode ? '🙈 Blind: ON' : '👁 Blind: OFF'}
              </button>
            )}
            <button style={s.btnEnd} onClick={() => socket.emit('host:end_game')}>End game</button>
          </div>
        </div>
      )}
    </div>
  );
}
