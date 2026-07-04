import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket.js';
import { playHit, playGong, playBackfire, playWildcard, playPenalty, playWin } from '../sounds.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { useNotificationPermission, useAuddBackgroundReminder } from '../hooks/useAuddBackgroundReminder.js';

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
    debtBanner: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:14, background: debtRemaining > 0 ? GC.redDim : GC.greenDim, border:`1px solid ${debtRemaining > 0 ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}` },
    debtText: { fontSize:13, fontWeight:600, color: debtRemaining > 0 ? GC.red : GC.green, lineHeight:1.3 },
    wildcardBanner: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:14, background:GC.amberDim, border:'1px solid rgba(255,179,71,0.3)' },
    sectionHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:8 },
    sectionLabel: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' },
    guessRow: (hit) => ({ padding:'10px 12px', borderRadius:8, marginBottom:6, background: hit ? GC.greenDim : GC.alt, border:`1px solid ${hit ? 'rgba(74,222,128,0.3)' : GC.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }),
    guessBadge: (hit) => ({ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background: hit ? GC.greenDim : GC.panel, color: hit ? GC.green : GC.muted }),
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
    blindBanner: { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:14, background:GC.alt, border:`1px solid ${GC.indigo}55` },
    blindText: { fontSize:13, color:GC.indigo, fontWeight:600 },
    sectionHeader: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8, color:GC.muted },
    unrevealed: { fontSize:13, color:GC.muted, fontStyle:'italic', marginBottom:8 },
    gongItem: (fired) => ({ padding:'10px 12px', borderRadius:8, marginBottom:6, background: fired ? GC.redDim : GC.alt, border:`1px solid ${fired ? 'rgba(248,113,113,0.3)' : GC.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }),
    gongBadge: (fired) => ({ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background: fired ? GC.redDim : GC.panel, color: fired ? GC.red : GC.muted }),
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

// ─── DJ Battle card ───────────────────────────────────────────────────────────

function DJBattleCard({ me, room, playerId, isHost }) {
  const s = cardStyles();
  const purple = '#a855f7';
  const purpleDim = 'rgba(168,85,247,0.12)';

  const isMatched = (pick) => room.playedSongs.some(song => {
    // Artist mode matching (DJ Battle is always artist mode)
    if (pick.id && song.artistIds && song.artistIds.length) return song.artistIds.includes(pick.id);
    const pa = (song.artist || '').toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
    return pa.some(a => a === (pick.name || '').toLowerCase().trim());
  });

  const djS = {
    playlistBox: {
      padding: '12px 14px', borderRadius: 8, marginBottom: 14,
      background: purpleDim, border: '1px solid rgba(168,85,247,0.3)',
    },
    playlistLabel: { fontSize: 11, fontWeight: 700, color: purple, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 },
    playlistName: { fontSize: 15, fontWeight: 700, color: GC.text, marginBottom: 4 },
    playlistHint: { fontSize: 13, color: GC.muted },
    hostScoreBox: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 8, marginBottom: 14,
      background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)',
    },
    hostScoreLabel: { fontSize: 12, color: purple, fontWeight: 600 },
    hostScoreVal: { fontSize: 22, fontWeight: 800, color: purple, fontFamily: "'Orbitron', monospace" },
  };

  if (isHost) {
    // Host sees the scoreboard from their perspective — who's guessing what
    return (
      <div>
        {(room.playlistName || room.playlistHint) && (
          <div style={djS.playlistBox}>
            <div style={djS.playlistLabel}>Your playlist</div>
            {room.playlistName && <div style={djS.playlistName}>{room.playlistName}</div>}
            {room.playlistHint && <div style={djS.playlistHint}>{room.playlistHint}</div>}
          </div>
        )}
        <div style={djS.hostScoreBox}>
          <div>
            <div style={djS.hostScoreLabel}>🎧 Your score (DJ)</div>
            <div style={{ fontSize: 11, color: GC.muted, marginTop: 2 }}>Songs nobody guessed</div>
          </div>
          <div style={djS.hostScoreVal}>{room.hostScore || 0}<span style={{ fontSize: 14, opacity: 0.6 }}> / {room.djHostTarget || 10}</span></div>
        </div>
        {room.djPenaltyEnabled && (
          <div style={{ fontSize: 11, color: '#a855f7', marginTop: 4, marginBottom: 8, opacity: 0.8 }}>⚡ Penalty mode on — −{room.djPenaltyAmount} per player match</div>
        )}
        <PlayedList room={room} />
      </div>
    );
  }

  // Player view — show their picks and match status
  const matchedCount = (me.picks || []).filter(isMatched).length;
  return (
    <div>
      {(room.playlistName || room.playlistHint) && (
        <div style={djS.playlistBox}>
          <div style={djS.playlistLabel}>The playlist</div>
          {room.playlistName && <div style={djS.playlistName}>{room.playlistName}</div>}
          {room.playlistHint && <div style={djS.playlistHint}>{room.playlistHint}</div>}
        </div>
      )}

      {/* Host score indicator */}
      <div style={djS.hostScoreBox}>
        <div>
          <div style={djS.hostScoreLabel}>🎧 DJ score</div>
          <div style={{ fontSize: 11, color: GC.muted, marginTop: 2 }}>
            {room.djPenaltyEnabled ? `Unguessed · −${room.djPenaltyAmount} per match` : 'Unguessed artists'}
          </div>
        </div>
        <div style={djS.hostScoreVal}>{room.hostScore || 0}<span style={{ fontSize: 14, opacity: 0.6 }}> / {room.djHostTarget || 10}</span></div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: purple, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Your picks — {matchedCount} / {room.matchTarget} matched
      </div>
      <div style={s.grid}>
        {(me.picks || []).map((pick, i) => {
          const matched = isMatched(pick);
          const matchedSongs = matched
            ? room.playedSongs.filter(song => {
                if (pick.id && song.artistIds && song.artistIds.length) return song.artistIds.includes(pick.id);
                const pa = (song.artist || '').toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
                return pa.some(a => a === (pick.name || '').toLowerCase().trim());
              })
            : [];
          return (
            <div key={i} style={s.song(matched)}>
              <div style={s.songTitle(matched)}>{matched ? '✓ ' : ''}{pick.name}</div>
              {matched && <div style={s.songArtist(matched)}>{matchedSongs.map(s => s.title).join(', ')}</div>}
            </div>
          );
        })}
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

// ─── Retro TV colour tokens (game screen) ────────────────────────────────────
const GC = {
  bg:      '#1a1a2e',
  panel:   '#12122a',
  alt:     '#0e0e1e',
  border:  '#2a2a4a',
  cyan:    '#00d4ff',
  cyanDim: 'rgba(0,212,255,0.12)',
  amber:   '#ffb347',
  amberDim:'rgba(255,179,71,0.12)',
  magenta: '#ff6b9d',
  gold:    'rgba(255,215,0,0.75)',
  green:   '#4ade80',
  greenDim:'rgba(74,222,128,0.12)',
  red:     '#f87171',
  redDim:  'rgba(248,113,113,0.12)',
  text:    '#e2e8f0',
  muted:   '#6b7280',
  indigo:  '#818cf8',
};

function cardStyles() {
  return {
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8, marginBottom:8 },
    song: (matched) => ({
      padding:'10px 12px', borderRadius:8,
      background: matched ? GC.greenDim : GC.alt,
      border: matched ? `1px solid rgba(74,222,128,0.35)` : `1px solid ${GC.border}`,
      boxShadow: matched ? '0 0 10px rgba(74,222,128,0.15)' : 'none',
      animation: matched ? 'pickHitPulse 0.7s ease-out' : 'none',
    }),
    songTitle: (matched) => ({ fontSize:13, fontWeight:600, color: matched ? GC.green : GC.text, marginBottom:2 }),
    songArtist: (matched) => ({ fontSize:12, color: matched ? GC.green : GC.muted }),
    playedLabel: { fontSize:11, color:GC.muted, textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, marginBottom:8 },
    playedChip: { padding:'5px 11px', borderRadius:20, fontSize:12, background:GC.cyanDim, color:GC.cyan, border:'1px solid rgba(0,212,255,0.25)' },
  };
}

// ─── Spotify Jam (Group Session) components ───────────────────────────────────

// Host panel — shown in the Spotify host tab.
// Host pastes a Spotify Jam link; it's broadcast to all players via game:updated.
function SpotifyJamHostPanel({ room }) {
  const [input, setInput] = useState(room.spotifyJamLink || '');
  const [saved, setSaved] = useState(!!room.spotifyJamLink);

  const handleSave = () => {
    socket.emit('host:set_jam_link', { link: input });
    setSaved(true);
  };
  const handleClear = () => {
    setInput('');
    setSaved(false);
    socket.emit('host:set_jam_link', { link: '' });
  };

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8, marginBottom: 12,
      background: 'rgba(29,185,84,0.07)', border: '1px solid rgba(29,185,84,0.25)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1DB954', marginBottom: 6 }}>
        🎵 Spotify Jam — sync players
      </div>
      {!saved ? (
        <>
          <div style={{ fontSize: 12, color: GC.muted, marginBottom: 8, lineHeight: 1.5 }}>
            In your Spotify app: tap the speaker icon → <strong style={{ color: GC.text }}>Start a Jam</strong> → Share → copy the link and paste it below.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 6,
                background: GC.alt, color: GC.text,
                border: '1px solid rgba(29,185,84,0.4)',
                fontSize: 13, outline: 'none',
              }}
              value={input}
              onChange={e => { setInput(e.target.value); setSaved(false); }}
              placeholder="https://spotify.com/jam/..."
            />
            <button
              onClick={handleSave}
              disabled={!input.trim()}
              style={{
                padding: '8px 14px', borderRadius: 6, border: 'none',
                background: input.trim() ? '#1DB954' : '#334155',
                color: input.trim() ? '#fff' : GC.muted,
                fontWeight: 700, fontSize: 13, cursor: input.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              Share
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#86efac', fontWeight: 600 }}>
            ✓ Jam link shared with players
          </div>
          <button
            onClick={handleClear}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'transparent', border: `1px solid ${GC.border}`,
              color: GC.muted, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// Player banner — shown above the tabs when host has shared a Jam link.
function SpotifyJamPlayerBanner({ link }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 14px', borderRadius: 8, marginBottom: 12,
      background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.35)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1DB954', marginBottom: 2 }}>
          🎵 Host started a Spotify Jam
        </div>
        <div style={{ fontSize: 12, color: GC.muted }}>Join to hear the same music in sync</div>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: '8px 14px', borderRadius: 6,
          background: '#1DB954', color: '#fff',
          fontWeight: 700, fontSize: 13,
          textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        Join Jam ↗
      </a>
    </div>
  );
}

// ─── Main GameScreen ──────────────────────────────────────────────────────────

export default function GameScreen({ room, playerId, isHost, spotifyTokens, nowPlaying }) {
  const [tab, setTab] = useState('card');
  const [toasts, setToasts] = useState([]); // { id, message, color }

  // Sound tracking refs
  const prevPlayedSongsRef = useRef([]);
  const prevWildcardsLenRef = useRef(0);
  const prevBackupDebtRef = useRef(0);
  const prevPhaseRef = useRef(null);
  const prevGongEventsCountRef = useRef(0);

  // ── AudD mic detection state ─────────────────────────────────────────────
  const [auddStatus, setAuddStatus] = useState('idle'); // idle | requesting | listening | identifying | error
  const [auddLastResult, setAuddLastResult] = useState(null); // { title, artist } | null
  const [auddError, setAuddError] = useState('');
  const [auddLog, setAuddLog] = useState([]); // array of { title, artist } — detected songs this session
  const [audioDevices, setAudioDevices] = useState([]); // available audio input devices
  const [selectedDeviceId, setSelectedDeviceId] = useState(''); // '' = browser default
  const auddStreamRef = useRef(null);
  const auddLoopRef = useRef(null);
  const auddActiveRef = useRef(false);
  const auddPausedRef = useRef(false); // true during 60s post-match cooldown

  const isAuddMode = room && room.musicSource === 'audd';

  // Enumerate audio input devices. Called on mount and again after first permission grant
  // (browser only exposes device labels after permission is granted).
  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(inputs);
      // If nothing is selected yet and we have devices, keep '' (browser default)
    } catch (e) {
      // enumerateDevices not available — no selector shown
    }
  }, []);

  // Enumerate on mount so we at least get device IDs (labels need permission first)
  useEffect(() => {
    if (isAuddMode && isHost) refreshAudioDevices();
  }, [isAuddMode, isHost, refreshAudioDevices]);

  const [auddDebugLog, setAuddDebugLog] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // ── AudD stats ───────────────────────────────────────────────────────────
  // Per-game resets when a new game starts. Cumulative persists in localStorage.
  const STATS_KEY = 'pandora_audd_stats';
  const loadCumulative = () => {
    try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { calls: 0, matches: 0, nulls: 0, retries: 0 }; }
    catch { return { calls: 0, matches: 0, nulls: 0, retries: 0 }; }
  };
  const [gameStats, setGameStats] = useState({ calls: 0, matches: 0, nulls: 0, retries: 0 });
  const [cumStats, setCumStats] = useState(loadCumulative);

  const recordStat = useCallback((type) => {
    setGameStats(prev => ({ ...prev, [type]: prev[type] + 1 }));
    setCumStats(prev => {
      const next = { ...prev, [type]: prev[type] + 1 };
      try { localStorage.setItem(STATS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Reset per-game stats when game phase changes to playing
  useEffect(() => {
    if (room && room.phase === 'playing') {
      setGameStats({ calls: 0, matches: 0, nulls: 0, retries: 0 });
    }
  }, [room && room.phase]); // eslint-disable-line

  const auddDebug = (msg) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuddDebugLog(prev => [...prev.slice(-30), `${time} ${msg}`]);
  };

  const captureAndIdentifyRef = useRef(null);

  // Capture one ~6-second clip, POST to /api/audd/identify, emit result.
  // On a null result, retries once after 3 seconds before giving up.
  const captureAndIdentify = useCallback(async (isRetry = false) => {
    if (!auddActiveRef.current) return;
    if (auddPausedRef.current && !isRetry) {
      auddDebug('⏸ Paused — waiting for cooldown');
      return;
    }
    try {
      const stream = auddStreamRef.current;
      if (!stream) { auddDebug('❌ No stream'); return; }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg;codecs=opus';

      auddDebug(`🎙 Recording 6s (${isRetry ? 'retry' : 'new'})…`);
      if (isRetry) recordStat('retries');
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      await new Promise((resolve) => {
        recorder.onstop = resolve;
        recorder.start();
        setTimeout(() => recorder.stop(), 6000);
      });

      if (!auddActiveRef.current) return;

      const blob = new Blob(chunks, { type: mimeType });
      const kb = (blob.size / 1024).toFixed(1);
      auddDebug(`📦 Blob: ${kb} KB — sending to AudD…`);
      recordStat('calls');
      setAuddStatus('identifying');

      const arrayBuf = await blob.arrayBuffer();
      const res = await fetch('/api/audd/identify', {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: arrayBuf,
      });
      const data = await res.json();

      if (!auddActiveRef.current) return;

      if (data.result && data.result.title && data.result.artist) {
        const { title, artist } = data.result;
        auddDebug(`✅ Match: ${artist} — ${title}`);
        recordStat('matches');
        setAuddLastResult({ title, artist });
        setAuddLog(prev => {
          const last = prev[prev.length - 1];
          if (last && last.title === title && last.artist === artist) return prev;
          return [...prev, { title, artist }];
        });
        socket.emit('host:audd_song', { title, artist });
        setAuddStatus('listening');
        auddPausedRef.current = true;
        auddDebug('⏸ Match found — pausing 60s before next capture');
        setTimeout(() => {
          auddPausedRef.current = false;
          auddDebug('▶ Resuming captures');
        }, 60000);
      } else {
        recordStat('nulls');
        auddDebug(`🔍 No match${!isRetry ? ' — retrying in 3s' : ' (gave up)'}`);
        if (!isRetry) {
          setAuddStatus('listening');
          setTimeout(() => captureAndIdentifyRef.current && captureAndIdentifyRef.current(true), 3000);
        } else {
          setAuddLastResult(null);
          setAuddStatus('listening');
        }
      }
    } catch (err) {
      auddDebug(`❌ Error: ${err.message}`);
      if (auddActiveRef.current) setAuddStatus('listening');
    }
  }, [recordStat]); // eslint-disable-line

  // Keep ref in sync with latest version of the function
  useEffect(() => { captureAndIdentifyRef.current = captureAndIdentify; }, [captureAndIdentify]);

  // Start mic stream + polling loop
  const startAuddListening = useCallback(async () => {
    if (auddActiveRef.current) return;
    setAuddStatus('requesting');
    setAuddError('');
    try {
      const audioConstraints = selectedDeviceId
        ? {
            deviceId: { exact: selectedDeviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          }
        : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      auddStreamRef.current = stream;
      auddActiveRef.current = true;
      setAuddStatus('listening');
      auddDebug(`✅ Mic open — capturing every 10s`);
      refreshAudioDevices();

      // Run immediately, then every 15 seconds
      captureAndIdentify();
      auddLoopRef.current = setInterval(captureAndIdentify, 15000);
    } catch (err) {
      setAuddStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setAuddError('Microphone permission denied. Please allow mic access and refresh.');
      } else if (err.name === 'OverconstrainedError') {
        setAuddError('Selected device not available. Choose a different input and try again.');
      } else {
        setAuddError('Could not access audio input: ' + err.message);
      }
    }
  }, [captureAndIdentify, refreshAudioDevices, selectedDeviceId]);

  // Stop mic stream + polling loop
  const stopAuddListening = useCallback(() => {
    auddActiveRef.current = false;
    auddPausedRef.current = false;
    if (auddLoopRef.current) { clearInterval(auddLoopRef.current); auddLoopRef.current = null; }
    if (auddStreamRef.current) {
      auddStreamRef.current.getTracks().forEach(t => t.stop());
      auddStreamRef.current = null;
    }
    setAuddStatus('idle');
  }, []);

  // Auto-start AudD when game goes to playing phase and this is the host
  useEffect(() => {
    if (!isHost || !isAuddMode) return;
    if (room && room.phase === 'playing' && auddStatus === 'idle') {
      startAuddListening();
    }
    if (room && room.phase === 'ended') {
      stopAuddListening();
    }
  }, [room && room.phase, isHost, isAuddMode]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopAuddListening(); };
  }, [stopAuddListening]);

  // Keep the host's screen awake while mic detection is running, so the
  // device isn't the reason it gets backgrounded.
  useWakeLock(isHost && isAuddMode && (auddStatus === 'listening' || auddStatus === 'identifying'));

  // Notification permission for the "return to the app" reminder.
  const { permission: notifPermission, requestPermission: requestNotifPermission } = useNotificationPermission();

  // Remind the host the moment they background the tab while mic detection
  // is active — detection itself pauses as soon as the OS suspends the page.
  useAuddBackgroundReminder({
    enabled: isHost && isAuddMode,
    isActiveRef: auddActiveRef,
  });

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

    socket.on('game:dj_events', ({ events, song }) => {
      const hostPoint = events.find(e => e.type === 'host_point');
      const hostPenalty = events.find(e => e.type === 'host_penalty');
      const playerPoints = events.filter(e => e.type === 'player_point');
      if (hostPoint) {
        addToast(`🎧 DJ scores! Nobody guessed "${song}"`, '#a855f7');
      } else if (playerPoints.length > 0) {
        const names = playerPoints.map(e => e.playerName).join(', ');
        addToast(`🎯 ${names} score! "${song}" was in the playlist`, '#4ade80');
        if (hostPenalty) {
          addToast(`⚡ DJ penalty: −${hostPenalty.amount} pt`, '#f87171');
        }
      }
    });

    return () => { socket.off('game:wildcards'); socket.off('game:gong_events'); socket.off('game:dj_events'); };
  }, []);

  // ─── Sound effects based on room state changes ───────────────────────────
  useEffect(() => {
    if (!room || !playerId) return;
    const me = room.players.find(p => p.id === playerId);
    if (!me) return;

    const isArtistMode = room.pickMode === 'artists';
    const currentPlayedCount = (room.playedSongs || []).length;
    const prevPlayedCount = prevPlayedSongsRef.current.length;

    // Check for new played songs
    if (currentPlayedCount > prevPlayedCount) {
      const newSongs = (room.playedSongs || []).slice(prevPlayedCount);
      newSongs.forEach(song => {
        const myPicks = [...(me.picks || []), ...(me.backups || []), ...(me.wildcards || [])];
        const isMyMatch = myPicks.some(pick => {
          if (isArtistMode) {
            if (pick.id && song.artistIds && song.artistIds.length) return song.artistIds.includes(pick.id);
            const pa = (song.artist || '').toLowerCase().split(/\s*[,&]\s*|\s+ft\.?\s+|\s+feat\.?\s+/).map(a => a.trim());
            return pa.some(a => a === (pick.name || '').toLowerCase().trim());
          }
          if (pick.id && song.id) return pick.id === song.id;
          return song.title === pick.title;
        });
        if (isMyMatch) {
          playHit();
        } else {
          // Not my match — check if it might be a gong event
          // (best approximation: song played but not my pick)
          playGong();
        }
      });
    }
    prevPlayedSongsRef.current = room.playedSongs || [];

    // Wildcards
    const currentWildcardsLen = (me.wildcards || []).length;
    if (currentWildcardsLen > prevWildcardsLenRef.current) {
      playWildcard();
    }
    prevWildcardsLenRef.current = currentWildcardsLen;

    // Backup debt (Newlywed mode)
    const currentDebt = me.backupDebt || 0;
    if (currentDebt > prevBackupDebtRef.current) {
      playPenalty();
    }
    prevBackupDebtRef.current = currentDebt;

    // Win
    if (room.phase === 'ended' && prevPhaseRef.current !== 'ended') {
      playWin();
    }
    prevPhaseRef.current = room.phase;
  }, [room, playerId]);

  if (!room) return null;

  const me = room.players.find(p => p.id === playerId);
  const secondsLeft = room.secondsLeft || (room.endsAt ? Math.ceil((room.endsAt - Date.now()) / 1000) : 0);
  const urgent = secondsLeft > 0 && secondsLeft < 60;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const isArtistMode = room.pickMode === 'artists';
  const isSpotifyMode = room.musicSource === 'spotify';
  const isNewlywed = room.gameMode === 'newlywed';
  const isGongShow = room.gameMode === 'gongshow';
  const isDJBattle = room.gameMode === 'djbattle';

  const s = {
    wrap: { maxWidth:700, margin:'0 auto', padding:16 },
    topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', marginBottom:8 },
    timer: {
      fontSize:36, fontWeight:800,
      color: urgent ? GC.red : GC.amber,
      fontFamily:"'Orbitron', monospace",
      textShadow: urgent ? '0 0 12px rgba(248,113,113,0.7)' : '0 0 12px rgba(255,179,71,0.6)',
    },
    timerLabel: { fontSize:11, color:GC.muted, textTransform:'uppercase', letterSpacing:'0.07em' },
    nowPlaying: {
      background:GC.alt, border:'1px solid #1DB954',
      borderRadius:10, padding:'12px 16px', marginBottom:12,
      display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 0 12px rgba(29,185,84,0.15)',
    },
    nowPlayingLabel: { fontSize:11, color:'#1DB954', textTransform:'uppercase', fontWeight:700, marginBottom:2 },
    nowPlayingTitle: { fontSize:15, fontWeight:700, color:GC.text },
    nowPlayingArtist: { fontSize:13, color:GC.muted },
    albumArt: { width:48, height:48, borderRadius:6, objectFit:'cover', flexShrink:0 },
    badge: (bg, color, border) => ({ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color, border:`1px solid ${border}`, marginBottom:8, marginRight:6 }),
    tabs: { display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${GC.border}`, paddingBottom:8 },
    tab: (active) => ({
      padding:'6px 16px', borderRadius:8, border:`1px solid ${active ? GC.cyan : 'transparent'}`,
      cursor:'pointer', fontSize:13, fontWeight:600,
      background: active ? GC.cyanDim : 'transparent',
      color: active ? GC.cyan : GC.muted,
      boxShadow: active ? '0 0 8px rgba(0,212,255,0.2)' : 'none',
    }),
    scoreCard: (winning) => ({
      padding:'12px 14px', borderRadius:8,
      background: winning ? GC.greenDim : GC.alt,
      border: winning ? '1px solid rgba(74,222,128,0.35)' : `1px solid ${GC.border}`,
      boxShadow: winning ? '0 0 12px rgba(74,222,128,0.15)' : 'none',
    }),
    scoreName: (winning) => ({ fontSize:12, color: winning ? GC.green : GC.muted, marginBottom:4 }),
    scoreVal: (winning) => ({ fontSize:22, fontWeight:700, color: winning ? GC.green : GC.text, fontFamily:"'Orbitron', monospace" }),
    scoreGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 },
    hostSong: (played) => ({
      padding:'10px 12px', borderRadius:8,
      cursor: played ? 'default' : 'pointer',
      background: played ? GC.cyanDim : GC.alt,
      border: played ? `1px solid rgba(0,212,255,0.3)` : `1px solid ${GC.border}`,
      opacity: played ? 0.55 : 1,
    }),
    hostControls: { display:'flex', gap:8, marginTop:16, flexWrap:'wrap' },
    btnAdd: {
      padding:'8px 16px', borderRadius:8,
      border:`1px solid ${GC.border}`, background:'transparent',
      color:GC.text, cursor:'pointer', fontSize:13, fontWeight:600,
    },
    btnEnd: {
      padding:'8px 16px', borderRadius:8,
      border:'1px solid rgba(239,68,68,0.4)', background:GC.redDim,
      color:GC.red, cursor:'pointer', fontSize:13, fontWeight:600,
      boxShadow:'0 0 8px rgba(239,68,68,0.1)',
    },
    btnBlind: (on) => ({
      padding:'8px 16px', borderRadius:8,
      border:`1px solid ${on ? GC.indigo : GC.border}`,
      background: on ? 'rgba(129,140,248,0.12)' : 'transparent',
      color: on ? GC.indigo : GC.text, cursor:'pointer', fontSize:13, fontWeight:600,
    }),
    playedList: { display:'flex', flexWrap:'wrap', gap:6, marginTop:12 },
    playedChip: { padding:'4px 10px', borderRadius:20, fontSize:12, background:GC.cyanDim, color:GC.cyan, border:'1px solid rgba(0,212,255,0.25)' },
    toastWrap: { position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)', zIndex:1000, display:'flex', flexDirection:'column', gap:8, alignItems:'center', pointerEvents:'none' },
    toastItem: (color) => ({
      padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600,
      color, background:GC.panel, border:`1px solid ${color}`,
      boxShadow:`0 4px 16px rgba(0,0,0,0.6), 0 0 12px ${color}44`,
    }),
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
          <div style={s.timerLabel}>{isGongShow ? 'Points to win' : isDJBattle ? 'Targets' : 'Win at'}</div>
          <div style={{fontSize:18,fontWeight:700,color:GC.text,fontFamily:"'Orbitron', monospace"}}>
            {isDJBattle
              ? <span style={{fontSize:13}}><span style={{color:'#a855f7'}}>{room.djHostTarget||10}</span> DJ · <span style={{color:'#6366f1'}}>{room.matchTarget}</span> plyr</span>
              : `${room.matchTarget} ${isGongShow ? 'pts' : 'matches'}`
            }
          </div>
        </div>
      </div>

      <div>
        {isGongShow && <span style={s.badge(GC.redDim,GC.red,'rgba(248,113,113,0.3)')}>🔔 Gong Show Bingo</span>}
        {isNewlywed && <span style={s.badge(GC.amberDim,GC.amber,'rgba(255,179,71,0.3)')}>🎯 Newlywed Bingo</span>}
        {isDJBattle && <span style={s.badge('rgba(168,85,247,0.12)','#a855f7','rgba(168,85,247,0.3)')}>🎧 DJ Battle</span>}
        <span style={s.badge('rgba(129,140,248,0.12)',GC.indigo,'rgba(129,140,248,0.3)')}>{isArtistMode ? 'Artist mode' : 'Song mode'} — {room.genre}</span>
        {isSpotifyMode && <span style={s.badge('rgba(29,185,84,0.12)','#1DB954','rgba(29,185,84,0.3)')}>Spotify</span>}
        {isAuddMode && <span style={s.badge('rgba(129,140,248,0.12)',GC.indigo,'rgba(129,140,248,0.3)')}>🎙 Auto-detect</span>}
        {isGongShow && room.blindMode && <span style={s.badge('rgba(196,181,253,0.12)',GC.indigo,'rgba(129,140,248,0.3)')}>🙈 Blind</span>}
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

      {/* ── Spotify Jam join banner (visible to all players when host sets a link) ── */}
      {isSpotifyMode && !isHost && room.spotifyJamLink && (
        <SpotifyJamPlayerBanner link={room.spotifyJamLink} />
      )}

      <div style={s.tabs}>
        <button style={s.tab(tab==='card')} onClick={() => setTab('card')}>My card</button>
        <button style={s.tab(tab==='scores')} onClick={() => setTab('scores')}>Scores</button>
        {isHost && <button style={s.tab(tab==='host')} onClick={() => setTab('host')}>{isSpotifyMode ? 'Host (Spotify)' : isAuddMode ? 'Host (Mic)' : isDJBattle ? 'Host (DJ)' : 'Host controls'}</button>}
      </div>

      {tab === 'card' && me && (
        isGongShow ? <GongShowCard me={me} room={room} isArtistMode={isArtistMode} /> :
        isNewlywed ? <NewlywedCard me={me} room={room} playerId={playerId} isArtistMode={isArtistMode} /> :
        isDJBattle ? <DJBattleCard me={me} room={room} playerId={playerId} isHost={isHost} /> :
        <StandardCard me={me} room={room} isArtistMode={isArtistMode} />
      )}

      {tab === 'scores' && (
        <div style={s.scoreGrid}>
          {isDJBattle && (
            <div style={{
              ...s.scoreCard(room.hostScore >= (room.djHostTarget || 10)),
              border: room.hostScore >= (room.djHostTarget || 10) ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(168,85,247,0.25)',
              background: room.hostScore >= (room.djHostTarget || 10) ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.06)',
            }}>
              <div style={{ fontSize:12, color:'#a855f7', marginBottom:4 }}>🎧 DJ (Host)</div>
              <div style={{ fontSize:22, fontWeight:700, color: room.hostScore >= (room.djHostTarget || 10) ? '#a855f7' : GC.text, fontFamily:"'Orbitron', monospace" }}>
                {room.hostScore || 0}<span style={{fontSize:14,opacity:0.6}}> / {room.djHostTarget || 10}</span>
              </div>
              <div style={{fontSize:11,color:GC.muted,marginTop:4}}>
                Unguessed artists{room.djPenaltyEnabled ? ` · −${room.djPenaltyAmount} per match` : ''}
              </div>
            </div>
          )}
          {sorted.filter(p => isDJBattle ? p.id !== room.hostId : true).map(p => {
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

              {/* ── Spotify Jam (Group Session) ── */}
              <SpotifyJamHostPanel room={room} />

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
              <details style={{marginTop:12}}>
                <summary style={{fontSize:12,color:'#64748b',cursor:'pointer',userSelect:'none',marginBottom:8}}>
                  ⚠️ Song not detected? Tap to mark manually
                </summary>
                <div style={{fontSize:12,color:'#475569',marginBottom:8}}>Use this if Spotify auto-detection misses a song (common on iOS).</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:6}}>
                  {(room.songPool||[]).map((song,i) => {
                    const played = room.playedSongs.some(p => p.title === song.title);
                    return (
                      <div key={i} style={s.hostSong(played)} onClick={() => !played && socket.emit('host:play_song', { songTitle: song.title })}>
                        <div style={{fontSize:12,fontWeight:600,color:played?'#93c5fd':'#e2e8f0',marginBottom:1}}>{played?'✓ ':''}{song.title}</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{song.artist}</div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </>
          ) : isAuddMode ? (
            <>
              {/* ── Audio input device selector ── */}
              {audioDevices.length > 0 && (auddStatus === 'idle' || auddStatus === 'error') && (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:GC.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
                    Audio input source
                  </div>
                  <select
                    value={selectedDeviceId}
                    onChange={e => setSelectedDeviceId(e.target.value)}
                    style={{
                      width:'100%', padding:'8px 10px', borderRadius:8,
                      background:GC.alt, color:GC.text,
                      border:`1px solid ${GC.border}`, fontSize:13,
                      cursor:'pointer', outline:'none',
                    }}
                  >
                    <option value="">Default microphone</option>
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Input device ${d.deviceId.slice(0,8)}`}
                      </option>
                    ))}
                  </select>
                  <div style={{fontSize:11,color:GC.muted,marginTop:4}}>
                    For best results, play music through a speaker near this device. The selected input just needs to hear the room.
                  </div>
                </div>
              )}
              {/* Show active device when listening */}
              {(auddStatus === 'listening' || auddStatus === 'identifying') && selectedDeviceId && audioDevices.length > 0 && (
                <div style={{fontSize:11,color:GC.muted,marginBottom:8}}>
                  Input: {audioDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Selected device'}
                </div>
              )}
              {/* ── AudD status banner ── */}
              <div style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 14px', borderRadius:8, marginBottom:12,
                background: auddStatus === 'error' ? 'rgba(248,113,113,0.1)' : auddStatus === 'listening' || auddStatus === 'identifying' ? 'rgba(129,140,248,0.1)' : 'rgba(255,179,71,0.1)',
                border: `1px solid ${auddStatus === 'error' ? 'rgba(248,113,113,0.3)' : auddStatus === 'listening' || auddStatus === 'identifying' ? 'rgba(129,140,248,0.3)' : 'rgba(255,179,71,0.3)'}`,
              }}>
                <span style={{fontSize:20}}>
                  {auddStatus === 'idle' && '🎙'}
                  {auddStatus === 'requesting' && '⏳'}
                  {auddStatus === 'listening' && '🎙'}
                  {auddStatus === 'identifying' && '🔍'}
                  {auddStatus === 'error' && '⚠️'}
                </span>
                <div>
                  <div style={{fontSize:13, fontWeight:600, color:
                    auddStatus === 'error' ? GC.red :
                    auddStatus === 'listening' ? GC.indigo :
                    auddStatus === 'identifying' ? GC.cyan :
                    GC.amber
                  }}>
                    {auddStatus === 'idle' && 'Microphone not started'}
                    {auddStatus === 'requesting' && 'Requesting mic permission…'}
                    {auddStatus === 'listening' && 'Listening — captures every 15 seconds'}
                    {auddStatus === 'identifying' && 'Identifying song…'}
                    {auddStatus === 'error' && 'Microphone error'}
                  </div>
                  {auddStatus === 'error' && auddError && (
                    <div style={{fontSize:11,color:'#f87171',marginTop:2}}>{auddError}</div>
                  )}
                  {auddLastResult && auddStatus !== 'error' && (
                    <div style={{fontSize:11,color:GC.muted,marginTop:2}}>
                      Last: {auddLastResult.title} — {auddLastResult.artist}
                    </div>
                  )}
                </div>
                {/* Manual start button if auto-start failed or was idle */}
                {(auddStatus === 'idle' || auddStatus === 'error') && (
                  <button
                    onClick={startAuddListening}
                    style={{marginLeft:'auto',padding:'6px 12px',borderRadius:6,border:`1px solid ${GC.indigo}`,background:'rgba(129,140,248,0.12)',color:GC.indigo,cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}
                  >
                    Start mic
                  </button>
                )}
                {(auddStatus === 'listening' || auddStatus === 'identifying') && (
                  <button
                    onClick={stopAuddListening}
                    style={{marginLeft:'auto',padding:'6px 12px',borderRadius:6,border:`1px solid ${GC.border}`,background:'transparent',color:GC.muted,cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}
                  >
                    Stop mic
                  </button>
                )}
              </div>

              {/* ── Return reminder toggle ── */}
              {notifPermission !== 'unsupported' && (
                <div style={{
                  display:'flex', alignItems:'center', gap:10, marginBottom:12,
                  padding:'8px 12px', borderRadius:8,
                  background:'rgba(255,179,71,0.08)', border:`1px solid rgba(255,179,71,0.25)`,
                }}>
                  <span style={{fontSize:16}}>🔔</span>
                  <div style={{flex:1, fontSize:11, color:GC.muted}}>
                    {notifPermission === 'granted'
                      ? "You'll get a notification if you leave the app while listening."
                      : 'Get notified if you switch apps while mic detection is running.'}
                  </div>
                  {notifPermission !== 'granted' && (
                    <button
                      onClick={requestNotifPermission}
                      style={{padding:'6px 10px',borderRadius:6,border:`1px solid ${GC.amber}`,background:'rgba(255,179,71,0.12)',color:GC.amber,cursor:'pointer',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}
                    >
                      Enable
                    </button>
                  )}
                </div>
              )}

              {/* ── Debug log ── */}
              <div style={{marginBottom:10}}>
                <button
                  onClick={() => setShowDebug(v => !v)}
                  style={{fontSize:11,color:GC.muted,background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}
                >
                  {showDebug ? 'Hide debug log ▲' : 'Show debug log ▼'}
                </button>
                {showDebug && (
                  <div style={{
                    marginTop:6, padding:'8px 10px', borderRadius:8,
                    background:'#0a0f1e', border:`1px solid ${GC.border}`,
                    fontFamily:'monospace', fontSize:11, color:'#94a3b8',
                    maxHeight:180, overflowY:'auto', lineHeight:1.6,
                  }}>
                    {auddDebugLog.length === 0
                      ? <span style={{color:GC.muted}}>No events yet</span>
                      : [...auddDebugLog].reverse().map((line, i) => <div key={i}>{line}</div>)
                    }
                  </div>
                )}
              </div>

              {/* ── AudD stats panel ── */}
              <div style={{marginBottom:10}}>
                <button
                  onClick={() => setShowStats(v => !v)}
                  style={{fontSize:11,color:GC.muted,background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}
                >
                  {showStats ? 'Hide stats ▲' : 'Show stats ▼'}
                </button>
                {showStats && (
                  <div style={{marginTop:6,padding:'10px 12px',borderRadius:8,background:'#0a0f1e',border:`1px solid ${GC.border}`}}>
                    {/* Per-game */}
                    <div style={{fontSize:11,fontWeight:700,color:GC.indigo,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>This game</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',marginBottom:12}}>
                      {[
                        ['API calls', gameStats.calls],
                        ['Matches', gameStats.matches],
                        ['No match', gameStats.nulls],
                        ['Retries', gameStats.retries],
                      ].map(([label, val]) => (
                        <div key={label} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                          <span style={{color:GC.muted}}>{label}</span>
                          <span style={{color:GC.text,fontWeight:700}}>{val}</span>
                        </div>
                      ))}
                    </div>
                    {/* Cumulative */}
                    <div style={{fontSize:11,fontWeight:700,color:GC.cyan,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>All time (this device)</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',marginBottom:8}}>
                      {[
                        ['API calls', cumStats.calls],
                        ['Matches', cumStats.matches],
                        ['No match', cumStats.nulls],
                        ['Retries', cumStats.retries],
                      ].map(([label, val]) => (
                        <div key={label} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                          <span style={{color:GC.muted}}>{label}</span>
                          <span style={{color:GC.text,fontWeight:700}}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const reset = { calls:0, matches:0, nulls:0, retries:0 };
                        setCumStats(reset);
                        try { localStorage.setItem(STATS_KEY, JSON.stringify(reset)); } catch {}
                      }}
                      style={{fontSize:11,color:'#f87171',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}
                    >
                      Reset all-time stats
                    </button>
                  </div>
                )}
              </div>
              {auddLog.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:6}}>Auto-detected this session:</div>
                  <div style={s.playedList}>
                    {auddLog.map((song,i) => (
                      <span key={i} style={s.playedChip}>{song.title} — {song.artist}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Manual fallback ── */}
              <details style={{marginTop:4}}>
                <summary style={{fontSize:12,color:'#64748b',cursor:'pointer',userSelect:'none',marginBottom:8}}>
                  Song not detected? Mark manually
                </summary>
                <div style={{fontSize:12,color:'#475569',marginBottom:8}}>Tap a song to mark it played without mic detection.</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:6}}>
                  {(room.songPool||[]).map((song,i) => {
                    const played = room.playedSongs.some(p => p.title === song.title);
                    return (
                      <div key={i} style={s.hostSong(played)} onClick={() => !played && socket.emit('host:play_song', { songTitle: song.title })}>
                        <div style={{fontSize:12,fontWeight:600,color:played?'#93c5fd':'#e2e8f0',marginBottom:1}}>{played?'✓ ':''}{song.title}</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{song.artist}</div>
                      </div>
                    );
                  })}
                </div>
              </details>
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
