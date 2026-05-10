import React, { useState } from 'react';
import socket from '../socket.js';

// ─── Standard ────────────────────────────────────────────────────────────────

function StandardPickScreen({ room }) {
  const [picks, setPicks] = useState([]);
  const isArtistMode = room.pickMode === 'artists';
  const pool = isArtistMode ? (room.artistPool || []) : (room.songPool || []);
  const getKey = (item) => isArtistMode ? item.name : item.title;
  const isSelected = (item) => picks.some(p => getKey(p) === getKey(item));
  const toggle = (item) => {
    if (isSelected(item)) { setPicks(picks.filter(p => getKey(p) !== getKey(item))); }
    else { if (picks.length >= 5) return; setPicks([...picks, item]); }
  };
  const confirm = () => { if (picks.length < 5) return; socket.emit('player:picks', { picks }); };
  const s = standardStyles();
  return (
    <div style={s.wrap}>
      <div style={s.title}>Pick your 5 {isArtistMode ? 'artists' : 'songs'}</div>
      <div style={s.sub}>Genre: {room.genre}</div>
      <div style={s.modeBadge}>{isArtistMode ? 'Artist mode' : 'Song mode'}</div>
      <div style={s.progress}>{[0,1,2,3,4].map(i => <div key={i} style={s.dot(i < picks.length)} />)}</div>
      <div style={s.grid}>
        {pool.map((item, i) => {
          const sel = isSelected(item);
          return (
            <div key={i} style={s.item(sel)} onClick={() => toggle(item)}>
              <div style={s.itemTitle(sel)}>{sel ? '✓ ' : ''}{isArtistMode ? item.name : item.title}</div>
              {!isArtistMode && <div style={s.itemSub(sel)}>{item.artist}</div>}
            </div>
          );
        })}
      </div>
      <button style={s.btn(picks.length === 5, '#6366f1')} onClick={confirm} disabled={picks.length < 5}>
        {picks.length === 5 ? 'Confirm picks' : `Select ${5 - picks.length} more`}
      </button>
    </div>
  );
}

// ─── Newlywed ─────────────────────────────────────────────────────────────────

function NewlywedPickScreen({ room }) {
  const [phase, setPhase] = useState('mains');
  const [mains, setMains] = useState([]);
  const [backups, setBackups] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const isArtistMode = room.pickMode === 'artists';
  const pool = isArtistMode ? (room.artistPool || []) : (room.songPool || []);
  const getKey = (item) => isArtistMode ? item.name : item.title;

  const committed = (currentPhase) => {
    const taken = [];
    if (currentPhase !== 'mains') taken.push(...mains);
    if (currentPhase !== 'backups') taken.push(...backups);
    if (currentPhase !== 'guesses') taken.push(...guesses);
    return taken;
  };
  const isCommitted = (item, currentPhase) => committed(currentPhase).some(p => getKey(p) === getKey(item));
  const makePicker = (selected, setSelected, limit) => ({
    isSelected: (item) => selected.some(p => getKey(p) === getKey(item)),
    toggle: (item) => {
      if (isCommitted(item, phase)) return;
      if (selected.some(p => getKey(p) === getKey(item))) { setSelected(selected.filter(p => getKey(p) !== getKey(item))); }
      else { if (selected.length >= limit) return; setSelected([...selected, item]); }
    },
    count: selected.length, limit,
  });

  const phasePicker = { mains: makePicker(mains, setMains, 5), backups: makePicker(backups, setBackups, 3), guesses: makePicker(guesses, setGuesses, 3) }[phase];

  const phaseConfig = {
    mains: { label:'Main picks', step:1, instruction:`Pick 5 ${isArtistMode ? 'artists' : 'songs'} you think will play.`, accentColor:'#6366f1', accentBg:'#312e81', accentBorder:'#6366f1', nextLabel:'Next: Pick backups →', nextReady: mains.length === 5, onNext: () => setPhase('backups') },
    backups: { label:'Backup picks', step:2, instruction:`Pick 3 backup ${isArtistMode ? 'artists' : 'songs'}. These absorb penalties from opponents' successful guesses.`, accentColor:'#f59e0b', accentBg:'#1c1505', accentBorder:'#f59e0b', nextLabel:'Next: Secret guesses →', nextReady: backups.length === 3, onNext: () => setPhase('guesses') },
    guesses: { label:'Secret guesses', step:3, instruction:`Pick 3 ${isArtistMode ? 'artists' : 'songs'} you think someone else picked. Hidden from all players. Hit 2 of 3 → earn a wildcard!`, accentColor:'#ec4899', accentBg:'#1f0617', accentBorder:'#ec4899', nextLabel:'Confirm all picks', nextReady: guesses.length === 3, onNext: () => socket.emit('player:newlywed_picks', { mains, backups, guesses }) },
  };
  const cfg = phaseConfig[phase];
  const stepColors = ['#6366f1', '#f59e0b', '#ec4899'];
  const s = newlywedStyles();

  return (
    <div style={s.wrap}>
      <div style={s.title}>Newlywed Bingo — {isArtistMode ? 'Artist' : 'Song'} mode</div>
      <div style={s.sub}>Genre: {room.genre}</div>
      <div style={s.stepBar}>{[0,1,2].map(i => <div key={i} style={s.step(cfg.step === i+1, cfg.step > i+1, stepColors[i])} />)}</div>
      <div style={s.phaseLabel}><span style={{...s.phaseName, color: cfg.accentColor}}>{cfg.label}</span><span style={s.phaseStep}>Step {cfg.step} of 3</span></div>
      <div style={s.instruction}>{cfg.instruction}</div>
      {phase === 'guesses' && <div style={s.secretNote}><span>🔒</span><span style={s.secretText}>Hidden from other players until the end.</span></div>}
      {phase !== 'mains' && mains.length > 0 && <div style={s.summaryBox}><div style={s.summaryLabel}>Your mains</div>{mains.map((item, i) => <span key={i} style={s.summaryChip('#6366f1')}>{getKey(item)}</span>)}</div>}
      {phase === 'guesses' && backups.length > 0 && <div style={s.summaryBox}><div style={s.summaryLabel}>Your backups</div>{backups.map((item, i) => <span key={i} style={s.summaryChip('#f59e0b')}>{getKey(item)}</span>)}</div>}
      <div style={s.progress}>{Array.from({length: phasePicker.limit}).map((_, i) => <div key={i} style={s.dot(i < phasePicker.count, cfg.accentColor)} />)}</div>
      <div style={s.grid}>
        {pool.map((item, i) => {
          const sel = phasePicker.isSelected(item);
          const taken = isCommitted(item, phase);
          return (
            <div key={i} style={s.item(sel, taken, cfg.accentBg, cfg.accentBorder)} onClick={() => phasePicker.toggle(item)}>
              <div style={{fontSize:13, fontWeight:600, color: sel ? cfg.accentColor : (taken ? '#374151' : '#e2e8f0'), marginBottom:2}}>{sel ? '✓ ' : ''}{isArtistMode ? item.name : item.title}</div>
              {!isArtistMode && <div style={{fontSize:12, color: sel ? '#94a3b8' : '#64748b'}}>{item.artist}</div>}
            </div>
          );
        })}
      </div>
      <button style={s.btn(cfg.nextReady, cfg.accentColor)} onClick={cfg.onNext} disabled={!cfg.nextReady}>
        {cfg.nextReady ? cfg.nextLabel : `Select ${phasePicker.limit - phasePicker.count} more`}
      </button>
    </div>
  );
}

// ─── Gong Show ────────────────────────────────────────────────────────────────

function GongShowPickScreen({ room }) {
  const [phase, setPhase] = useState('mains'); // 'mains' | 'gongs'
  const [mains, setMains] = useState([]);
  const [gongs, setGongs] = useState([]);
  const isArtistMode = room.pickMode === 'artists';
  const pool = isArtistMode ? (room.artistPool || []) : (room.songPool || []);
  const getKey = (item) => isArtistMode ? item.name : item.title;

  const mainKeys = new Set(mains.map(getKey));
  const gongKeys = new Set(gongs.map(getKey));

  const toggleMain = (item) => {
    const key = getKey(item);
    if (gongKeys.has(key)) return; // can't pick as both
    if (mainKeys.has(key)) { setMains(mains.filter(p => getKey(p) !== key)); }
    else { if (mains.length >= 10) return; setMains([...mains, item]); }
  };

  const toggleGong = (item) => {
    const key = getKey(item);
    if (mainKeys.has(key)) return; // can't gong your own main
    if (gongKeys.has(key)) { setGongs(gongs.filter(p => getKey(p) !== key)); }
    else { if (gongs.length >= 5) return; setGongs([...gongs, item]); }
  };

  const confirm = () => socket.emit('player:gongshow_picks', { mains, gongs });

  const s = {
    wrap: { maxWidth:700, margin:'0 auto', padding:16, paddingTop:20 },
    title: { fontSize:22, fontWeight:700, color:'#f1f5f9', marginBottom:2 },
    sub: { fontSize:13, color:'#64748b', marginBottom:12 },
    stepBar: { display:'flex', gap:6, marginBottom:14 },
    step: (active, done, color) => ({ flex:1, height:6, borderRadius:3, background: done ? '#475569' : (active ? color : '#1e293b'), border:'1px solid #334155' }),
    phaseRow: { display:'flex', gap:8, marginBottom:14 },
    phaseTab: (active, color) => ({ flex:1, padding:'10px 0', borderRadius:8, border:`1px solid ${active ? color : '#334155'}`, background: active ? color + '22' : '#0f172a', color: active ? color : '#64748b', fontWeight:700, fontSize:13, cursor:'pointer', textAlign:'center' }),
    instruction: { fontSize:13, color:'#94a3b8', marginBottom:12, lineHeight:1.5, padding:'10px 12px', borderRadius:8, background:'#0f172a', border:'1px solid #334155' },
    gongWarning: { display:'flex', gap:8, padding:'10px 12px', borderRadius:8, background:'#1f0a0a', border:'1px solid #7f1d1d', marginBottom:12 },
    gongWarningText: { fontSize:12, color:'#fca5a5', lineHeight:1.4 },
    progress: { display:'flex', gap:6, marginBottom:12 },
    dot: (filled, color) => ({ width:24, height:8, borderRadius:4, background: filled ? color : '#1e293b', border:'1px solid #334155' }),
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8, marginBottom:16 },
    item: (sel, disabled, bg, border) => ({ padding:'10px 12px', borderRadius:8, cursor: disabled ? 'not-allowed' : 'pointer', background: sel ? bg : (disabled ? '#111827' : '#1e293b'), border: sel ? `2px solid ${border}` : '1px solid #334155', opacity: disabled ? 0.35 : 1 }),
    summaryBox: { background:'#0f172a', borderRadius:8, padding:'10px 14px', marginBottom:12, border:'1px solid #334155' },
    summaryLabel: { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:6 },
    summaryChip: (color) => ({ display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:12, background: color + '22', color, border:`1px solid ${color}66`, margin:'2px 3px' }),
    btn: (ready, color) => ({ width:'100%', padding:'12px 20px', borderRadius:8, border:'none', cursor: ready ? 'pointer' : 'not-allowed', background: ready ? color : '#334155', color: ready ? '#fff' : '#64748b', fontWeight:700, fontSize:15 }),
  };

  const stepColors = ['#6366f1', '#ef4444'];

  return (
    <div style={s.wrap}>
      <div style={s.title}>Gong Show Bingo — {isArtistMode ? 'Artist' : 'Song'} mode</div>
      <div style={s.sub}>Genre: {room.genre}</div>

      <div style={s.stepBar}>
        {[0,1].map(i => <div key={i} style={s.step(phase === (i===0?'mains':'gongs'), phase === 'gongs' && i===0, stepColors[i])} />)}
      </div>

      <div style={s.phaseRow}>
        <div style={s.phaseTab(phase === 'mains', '#6366f1')} onClick={() => setPhase('mains')}>🎵 Mains ({mains.length}/10)</div>
        <div style={s.phaseTab(phase === 'gongs', '#ef4444')} onClick={() => mains.length > 0 && setPhase('gongs')}>🔔 Gongs ({gongs.length}/5)</div>
      </div>

      {phase === 'mains' && (
        <>
          <div style={s.instruction}>Pick 10 {isArtistMode ? 'artists' : 'songs'} you think will play. These score you points when played.</div>
          <div style={s.progress}>{Array.from({length:10}).map((_,i) => <div key={i} style={s.dot(i < mains.length, '#6366f1')} />)}</div>
          <div style={s.grid}>
            {pool.map((item, i) => {
              const key = getKey(item);
              const sel = mainKeys.has(key);
              const disabled = gongKeys.has(key);
              return (
                <div key={i} style={s.item(sel, disabled, '#312e81', '#6366f1')} onClick={() => toggleMain(item)}>
                  <div style={{fontSize:13, fontWeight:600, color: sel ? '#a5b4fc' : (disabled ? '#374151' : '#e2e8f0'), marginBottom:2}}>{sel ? '✓ ' : ''}{isArtistMode ? item.name : item.title}</div>
                  {!isArtistMode && <div style={{fontSize:12, color:'#64748b'}}>{item.artist}</div>}
                </div>
              );
            })}
          </div>
          <button style={s.btn(mains.length === 10, '#6366f1')} onClick={() => setPhase('gongs')} disabled={mains.length < 10}>
            {mains.length === 10 ? 'Next: Pick gong songs →' : `Select ${10 - mains.length} more mains`}
          </button>
        </>
      )}

      {phase === 'gongs' && (
        <>
          <div style={s.instruction}>Pick 5 secret gong {isArtistMode ? 'artists' : 'songs'}. When a gonged song plays, any player who picked it as a main gets cancelled — no point. But if 2+ players gong the same song, it backfires and each gonger loses a point.</div>
          <div style={s.gongWarning}><span>⚠️</span><span style={s.gongWarningText}>You cannot gong your own main picks. Choose wisely — duplicating another player's gong will cost you.</span></div>

          {mains.length > 0 && (
            <div style={s.summaryBox}>
              <div style={s.summaryLabel}>Your mains (locked)</div>
              {mains.map((item, i) => <span key={i} style={s.summaryChip('#6366f1')}>{getKey(item)}</span>)}
            </div>
          )}

          <div style={s.progress}>{Array.from({length:5}).map((_,i) => <div key={i} style={s.dot(i < gongs.length, '#ef4444')} />)}</div>
          <div style={s.grid}>
            {pool.map((item, i) => {
              const key = getKey(item);
              const sel = gongKeys.has(key);
              const disabled = mainKeys.has(key); // can't gong your own mains
              return (
                <div key={i} style={s.item(sel, disabled, '#1f0a0a', '#ef4444')} onClick={() => toggleGong(item)}>
                  <div style={{fontSize:13, fontWeight:600, color: sel ? '#f87171' : (disabled ? '#374151' : '#e2e8f0'), marginBottom:2}}>{sel ? '🔔 ' : ''}{isArtistMode ? item.name : item.title}</div>
                  {!isArtistMode && <div style={{fontSize:12, color:'#64748b'}}>{item.artist}</div>}
                  {disabled && <div style={{fontSize:11, color:'#4b5563', marginTop:2}}>Your main pick</div>}
                </div>
              );
            })}
          </div>
          <button style={s.btn(gongs.length === 5, '#ef4444')} onClick={confirm} disabled={gongs.length < 5}>
            {gongs.length === 5 ? 'Confirm all picks' : `Select ${5 - gongs.length} more gong songs`}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function standardStyles() {
  return {
    wrap: { maxWidth:700, margin:'0 auto', padding:16, paddingTop:20 },
    title: { fontSize:22, fontWeight:700, color:'#f1f5f9', marginBottom:4 },
    sub: { fontSize:14, color:'#64748b', marginBottom:12 },
    modeBadge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700, background:'#312e81', color:'#a5b4fc', border:'1px solid #6366f1', marginBottom:12 },
    progress: { display:'flex', gap:8, margin:'12px 0' },
    dot: (filled) => ({ width:32, height:8, borderRadius:4, background: filled ? '#6366f1' : '#1e293b', border:'1px solid #334155' }),
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8, marginBottom:20 },
    item: (sel) => ({ padding:'12px 14px', borderRadius:8, cursor:'pointer', background: sel ? '#312e81' : '#1e293b', border: sel ? '2px solid #6366f1' : '1px solid #334155' }),
    itemTitle: (sel) => ({ fontSize:13, fontWeight:600, color: sel ? '#a5b4fc' : '#e2e8f0', marginBottom:2 }),
    itemSub: (sel) => ({ fontSize:12, color: sel ? '#818cf8' : '#64748b' }),
    btn: (ready) => ({ width:'100%', padding:'12px 20px', borderRadius:8, border:'none', cursor: ready ? 'pointer' : 'not-allowed', background: ready ? '#6366f1' : '#334155', color: ready ? '#fff' : '#64748b', fontWeight:700, fontSize:15 }),
  };
}

function newlywedStyles() {
  return {
    wrap: { maxWidth:700, margin:'0 auto', padding:16, paddingTop:20 },
    title: { fontSize:22, fontWeight:700, color:'#f1f5f9', marginBottom:2 },
    sub: { fontSize:13, color:'#64748b', marginBottom:12 },
    stepBar: { display:'flex', gap:6, marginBottom:16 },
    step: (active, done, color) => ({ flex:1, height:6, borderRadius:3, background: done ? '#475569' : (active ? color : '#1e293b'), border:'1px solid #334155' }),
    phaseLabel: { display:'flex', alignItems:'center', gap:8, marginBottom:6 },
    phaseName: { fontSize:16, fontWeight:700 },
    phaseStep: { fontSize:12, color:'#64748b' },
    instruction: { fontSize:13, color:'#94a3b8', marginBottom:12, lineHeight:1.5, padding:'10px 12px', borderRadius:8, background:'#0f172a', border:'1px solid #334155' },
    secretNote: { display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:8, background:'#1f0617', border:'1px solid #701a4e', marginBottom:12 },
    secretText: { fontSize:12, color:'#f9a8d4', lineHeight:1.4 },
    progress: { display:'flex', gap:6, marginBottom:12 },
    dot: (filled, color) => ({ width:28, height:8, borderRadius:4, background: filled ? color : '#1e293b', border:'1px solid #334155' }),
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8, marginBottom:20 },
    item: (sel, taken, accentBg, accentBorder) => ({ padding:'12px 14px', borderRadius:8, cursor: taken ? 'not-allowed' : 'pointer', background: sel ? accentBg : (taken ? '#111827' : '#1e293b'), border: sel ? `2px solid ${accentBorder}` : '1px solid #334155', opacity: taken ? 0.4 : 1 }),
    summaryBox: { background:'#0f172a', borderRadius:8, padding:'10px 14px', marginBottom:12, border:'1px solid #334155' },
    summaryLabel: { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:6 },
    summaryChip: (color) => ({ display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:12, background: color + '22', color, border:`1px solid ${color}66`, margin:'2px 3px' }),
    btn: (ready, color) => ({ width:'100%', padding:'12px 20px', borderRadius:8, border:'none', cursor: ready ? 'pointer' : 'not-allowed', background: ready ? color : '#334155', color: ready ? '#fff' : '#64748b', fontWeight:700, fontSize:15 }),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function PickScreen({ room, playerId }) {
  if (!room) return null;
  if (room.gameMode === 'newlywed') return <NewlywedPickScreen room={room} playerId={playerId} />;
  if (room.gameMode === 'gongshow') return <GongShowPickScreen room={room} playerId={playerId} />;
  return <StandardPickScreen room={room} playerId={playerId} />;
}
