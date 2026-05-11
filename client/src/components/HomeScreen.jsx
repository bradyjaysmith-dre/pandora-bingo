import React, { useState, useEffect } from 'react';
import socket from '../socket.js';

const GENRES = ['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Country', 'Electronic'];

// ─── Retro TV colour tokens ──────────────────────────────────────────────────
const C = {
  bg:        '#1a1a2e',
  panel:     '#12122a',
  panelAlt:  '#0e0e1e',
  border:    '#2a2a4a',
  cyan:      '#00d4ff',
  cyanDim:   'rgba(0,212,255,0.15)',
  amber:     '#ffb347',
  amberDim:  'rgba(255,179,71,0.15)',
  magenta:   '#ff6b9d',
  gold:      'rgba(255,215,0,0.75)',
  text:      '#e2e8f0',
  muted:     '#6b7280',
  indigo:    '#818cf8',
  curtain:   '#5c1a1a',
};

function StageCurtains() {
  const curtainStyle = (side) => ({
    position: 'fixed',
    top: 0,
    [side]: 0,
    width: 48,
    height: '100vh',
    background: `linear-gradient(${side === 'left' ? 'to right' : 'to left'}, ${C.curtain}, rgba(92,26,26,0.6), transparent)`,
    zIndex: 0,
    pointerEvents: 'none',
  });
  return (
    <>
      <div style={curtainStyle('left')} />
      <div style={curtainStyle('right')} />
    </>
  );
}

export default function HomeScreen({ spotifyConnected, onLeaderboard }) {
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
    outer: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 },
    card: {
      position: 'relative', zIndex: 1,
      background: C.panel,
      borderRadius: 14,
      padding: 28,
      width: '100%',
      maxWidth: 460,
      border: `1px solid ${C.border}`,
      boxShadow: `0 0 32px rgba(0,212,255,0.07), 0 8px 32px rgba(0,0,0,0.6)`,
    },
    titleWrap: { textAlign: 'center', marginBottom: 24 },
    title: {
      fontFamily: "'Orbitron', monospace",
      fontSize: 30,
      fontWeight: 900,
      color: C.amber,
      textShadow: `0 0 12px rgba(255,179,71,0.7), 0 0 30px rgba(255,179,71,0.3)`,
      letterSpacing: 2,
      marginBottom: 6,
    },
    sub: { fontSize: 13, color: C.muted, lineHeight: 1.5 },
    label: { fontSize: 11, fontWeight: 700, color: C.indigo, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 },
    input: {
      width: '100%', padding: '10px 13px', borderRadius: 8,
      background: C.panelAlt, color: C.text, border: `1px solid ${C.border}`,
      fontSize: 14, marginBottom: 16, boxSizing: 'border-box',
    },
    btnPrimary: {
      width: '100%', padding: '12px 20px', borderRadius: 8, border: `1px solid ${C.cyan}`,
      cursor: 'pointer', background: C.cyanDim, color: C.cyan,
      fontWeight: 700, fontSize: 15, marginBottom: 10,
      boxShadow: `0 0 8px rgba(0,212,255,0.2)`,
      transition: 'box-shadow 0.2s',
      fontFamily: "'Orbitron', monospace",
      letterSpacing: 1,
    },
    btnSecondary: {
      width: '100%', padding: '11px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
      cursor: 'pointer', background: 'transparent', color: C.muted,
      fontWeight: 600, fontSize: 14, transition: 'border-color 0.2s',
    },
    btnSpotify: {
      width: '100%', padding: '11px 20px', borderRadius: 8, border: 'none',
      cursor: 'pointer', background: '#1DB954', color: '#fff',
      fontWeight: 700, fontSize: 15, marginBottom: 10,
    },
    genreGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 },
    genreBtn: (sel) => ({
      padding: '10px 12px', borderRadius: 8,
      border: sel ? `2px solid ${C.cyan}` : `1px solid ${C.border}`,
      cursor: 'pointer',
      background: sel ? C.cyanDim : C.panelAlt,
      color: sel ? C.cyan : C.muted,
      fontWeight: 700, fontSize: 14, textAlign: 'center',
      boxShadow: sel ? `0 0 8px rgba(0,212,255,0.2)` : 'none',
      transition: 'all 0.15s',
    }),
    row: { display: 'flex', gap: 12, marginBottom: 16 },
    numInput: { flex: 1, padding: '10px 12px', borderRadius: 8, background: C.panelAlt, color: C.text, border: `1px solid ${C.border}`, fontSize: 14 },
    back: { background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 },
    toggle: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 16 },
    toggleBtn: (active) => ({
      flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 700,
      background: active ? C.cyan : C.panelAlt,
      color: active ? '#0f0f1e' : C.muted,
    }),
    desc: { fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 },
    divider: { borderTop: `1px solid ${C.border}`, margin: '16px 0' },
    spotifyBadge: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 8,
      background: '#14532d', border: '1px solid #166534', marginBottom: 16,
    },
    spotifyBadgeText: { fontSize: 13, color: '#86efac', fontWeight: 600 },
    sourceCard: (active) => ({
      padding: '12px 14px', borderRadius: 8,
      border: active ? `2px solid ${C.cyan}` : `1px solid ${C.border}`,
      cursor: 'pointer',
      background: active ? C.cyanDim : C.panelAlt,
      marginBottom: 8,
      boxShadow: active ? `0 0 8px rgba(0,212,255,0.15)` : 'none',
    }),
    sourceTitle: (active) => ({ fontSize: 14, fontWeight: 700, color: active ? C.cyan : C.text, marginBottom: 2 }),
    sourceSub: { fontSize: 12, color: C.muted },
    gameModeCard: (active, accent) => ({
      padding: '14px 16px', borderRadius: 8,
      border: active ? `2px solid ${accent}` : `1px solid ${C.border}`,
      cursor: 'pointer',
      background: active
        ? (accent === '#ffb347' ? 'rgba(255,179,71,0.1)' : accent === '#ef4444' ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,255,0.1)')
        : C.panelAlt,
      marginBottom: 8,
      boxShadow: active ? `0 0 10px ${accent}33` : 'none',
    }),
    gameModeTitle: (active, accent) => ({ fontSize: 14, fontWeight: 700, color: active ? accent : C.text, marginBottom: 2 }),
    gameModeSub: { fontSize: 12, color: C.muted, lineHeight: 1.4 },
    badge: (bg, color, border) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 700, background: bg, color, border: `1px solid ${border}`, marginLeft: 6,
    }),
    checkRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', borderRadius: 8,
      background: C.panelAlt, border: `1px solid ${C.border}`,
      marginBottom: 8, cursor: 'pointer',
    },
    checkLabel: { fontSize: 14, color: C.text, fontWeight: 600 },
    checkSub: { fontSize: 12, color: C.muted, marginTop: 2 },
    checkBox: (on) => ({
      width: 20, height: 20, borderRadius: 4,
      border: `2px solid ${on ? '#ef4444' : C.border}`,
      background: on ? '#ef4444' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }),
  };

  const connectSpotify = () => {
    sessionStorage.setItem('pandora_pre_spotify', JSON.stringify({
      name, genre, matchTarget, timeLimit, pickMode, musicSource, gameMode, blindMode
    }));
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
    <div style={s.outer}>
      <StageCurtains />
      <div style={{ ...s.card, position: 'relative', zIndex: 1 }}>
        <div style={s.titleWrap}>
          <div style={s.title}>PANDORA BINGO</div>
          <div style={s.sub}>Pick songs or artists you think will play.<br />First to match wins the stage.</div>
        </div>
        <label style={s.label}>Your name</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
        <button style={s.btnPrimary} onClick={() => setMode('host')}>Host a Game</button>
        <button style={s.btnSecondary} onClick={() => setMode('join')}>Join a Game</button>
        <button
          style={{ ...s.btnSecondary, marginTop: 6, color: C.amber, borderColor: 'rgba(255,179,71,0.35)', fontSize: 13 }}
          onClick={onLeaderboard}
        >
          🏆 Leaderboard
        </button>
      </div>
    </div>
  );

  if (mode === 'join') return (
    <div style={s.outer}>
      <StageCurtains />
      <div style={s.card}>
        <button style={s.back} onClick={() => setMode('home')}>← Back</button>
        <div style={s.titleWrap}>
          <div style={s.title}>JOIN GAME</div>
          <div style={s.sub}>Enter your name and room code</div>
        </div>
        <label style={s.label}>Your name</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
        <label style={s.label}>Room code</label>
        <input
          style={{
            ...s.input,
            textTransform: 'uppercase',
            letterSpacing: 6,
            fontSize: 22,
            fontFamily: "'Orbitron', monospace",
            color: C.amber,
            textShadow: `0 0 8px rgba(255,179,71,0.5)`,
            textAlign: 'center',
          }}
          value={roomCode}
          onChange={e => setRoomCode(e.target.value)}
          placeholder="XXXXXX"
          maxLength={6}
        />
        <button style={s.btnPrimary} onClick={joinGame}>Join Room</button>
      </div>
    </div>
  );

  // Host settings
  return (
    <div style={s.outer}>
      <StageCurtains />
      <div style={s.card}>
        <button style={s.back} onClick={() => setMode('home')}>← Back</button>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, color: C.amber, marginBottom: 4, textShadow: `0 0 8px rgba(255,179,71,0.5)` }}>GAME SETTINGS</div>

        <label style={s.label}>Your name</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />

        <div style={s.divider} />
        <label style={s.label}>Game mode</label>

        <div style={s.gameModeCard(gameMode === 'standard', C.cyan)} onClick={() => setGameMode('standard')}>
          <div style={s.gameModeTitle(gameMode === 'standard', C.cyan)}>Standard</div>
          <div style={s.gameModeSub}>Pick 5 songs or artists you predict will play. First to match wins.</div>
        </div>

        <div style={s.gameModeCard(gameMode === 'newlywed', C.amber)} onClick={() => setGameMode('newlywed')}>
          <div style={s.gameModeTitle(gameMode === 'newlywed', C.amber)}>
            Newlywed Bingo
            <span style={s.badge('rgba(255,179,71,0.15)', C.amber, 'rgba(255,179,71,0.4)')}>NEW</span>
          </div>
          <div style={s.gameModeSub}>Pick 5 mains + 3 backups + 3 secret guesses. Sabotage opponents, earn wildcards.</div>
        </div>

        <div style={s.gameModeCard(gameMode === 'gongshow', '#ef4444')} onClick={() => setGameMode('gongshow')}>
          <div style={s.gameModeTitle(gameMode === 'gongshow', '#ef4444')}>
            Gong Show Bingo
            <span style={s.badge('rgba(239,68,68,0.15)', '#ef4444', 'rgba(239,68,68,0.4)')}>NEW</span>
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
              {blindMode && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
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
          <div style={{ marginBottom: 16 }}>
            {spotifyConnected ? (
              <div style={s.spotifyBadge}>
                <span style={{ fontSize: 16 }}>✓</span>
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
          <div style={{ flex: 1 }}>
            <label style={s.label}>{gameMode === 'gongshow' ? 'Points to win' : 'Matches to win'}</label>
            <input type="number" style={s.numInput}
              min={1} max={effectiveMaxTarget}
              value={matchTarget}
              onChange={e => setMatchTarget(Math.min(effectiveMaxTarget, parseInt(e.target.value) || 1))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Time limit (min)</label>
            <input type="number" style={s.numInput} min={5} max={60} step={5} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} />
          </div>
        </div>

        <button style={s.btnPrimary} onClick={hostGame}>Create Room</button>
      </div>
    </div>
  );
}
