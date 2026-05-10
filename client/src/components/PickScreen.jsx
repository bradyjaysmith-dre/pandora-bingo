import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket.js';

// ─── Search hook ──────────────────────────────────────────────────────────────

function useSpotifySearch(roomCode, pickMode, isSpotifyRoom) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    if (!q.trim() || !isSpotifyRoom) { setResults([]); return; }
    setSearching(true);
    setSearchError(null);
    const type = pickMode === 'artists' ? 'artist' : 'track';
    fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&type=${type}&room=${roomCode}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setResults(data);
        else { setResults([]); setSearchError(data.error || 'Search failed'); }
      })
      .catch(() => setSearchError('Search failed'))
      .finally(() => setSearching(false));
  }, [roomCode, pickMode, isSpotifyRoom]);

  const handleQueryChange = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  return { query, handleQueryChange, results, searching, searchError, setResults, setQuery };
}

// ─── Shared search input + results ───────────────────────────────────────────

function SearchPicker({ roomCode, pickMode, isSpotifyRoom, pool, selected, onToggle, limit, accentColor = '#6366f1', accentBg = '#312e81', disabledKeys = new Set() }) {
  const { query, handleQueryChange, results, searching, searchError, setResults, setQuery } = useSpotifySearch(roomCode, pickMode, isSpotifyRoom);
  const isArtistMode = pickMode === 'artists';
  const getKey = (item) => isArtistMode ? (item.id || item.name) : (item.id || item.title);
  const getLabel = (item) => isArtistMode ? item.name : item.title;
  const getSub = (item) => isArtistMode ? null : item.artist;
  const isSelected = (item) => selected.some(s => getKey(s) === getKey(item));
  const showResults = isSpotifyRoom && query.trim().length > 0;
  const displayList = showResults ? results : pool;

  const s = {
    searchWrap: { position: 'relative', marginBottom: 12 },
    searchInput: { width: '100%', padding: '10px 14px 10px 36px', borderRadius: 8, background: '#0f172a', color: '#e2e8f0', border: `1px solid ${accentColor}55`, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
    searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#64748b', pointerEvents: 'none' },
    clearBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 },
    hint: { fontSize: 12, color: '#475569', marginBottom: 10, textAlign: 'center' },
    searching: { fontSize: 12, color: '#64748b', textAlign: 'center', padding: '12px 0' },
    error: { fontSize: 12, color: '#f87171', textAlign: 'center', padding: '8px 0' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 16, maxHeight: 420, overflowY: 'auto' },
    item: (sel, disabled) => ({
      padding: '10px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      background: sel ? accentBg : (disabled ? '#111827' : '#1e293b'),
      border: sel ? `2px solid ${accentColor}` : '1px solid #334155',
      opacity: disabled ? 0.35 : 1,
      display: 'flex', alignItems: 'center', gap: 8,
    }),
    thumb: { width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: '#334155' },
    textWrap: { minWidth: 0 },
    itemTitle: (sel) => ({ fontSize: 13, fontWeight: 600, color: sel ? accentColor : '#e2e8f0', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
    itemSub: { fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    noResults: { fontSize: 13, color: '#475569', textAlign: 'center', padding: '20px 0' },
  };

  return (
    <div>
      {isSpotifyRoom && (
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder={`Search ${isArtistMode ? 'artists' : 'songs'}...`}
            autoComplete="off"
          />
          {query && <button style={s.clearBtn} onClick={() => { setQuery(''); setResults([]); }}>✕</button>}
        </div>
      )}
      {!isSpotifyRoom && <div style={s.hint}>Pick from the genre pool below</div>}
      {isSpotifyRoom && !query && <div style={s.hint}>Type to search the Spotify catalog, or scroll below for genre picks</div>}

      {searching && <div style={s.searching}>Searching...</div>}
      {searchError && <div style={s.error}>{searchError}</div>}

      {!searching && (
        <div style={s.grid}>
          {displayList.length === 0 && query && !searching
            ? <div style={s.noResults}>No results for "{query}"</div>
            : displayList.map((item, i) => {
                const key = getKey(item);
                const sel = isSelected(item);
                const disabled = disabledKeys.has(key) && !sel;
                const thumb = item.albumArt || item.image || null;
                return (
                  <div key={item.id || i} style={s.item(sel, disabled)} onClick={() => !disabled && onToggle(item)}>
                    {thumb && <img src={thumb} style={s.thumb} alt="" />}
                    <div style={s.textWrap}>
                      <div style={s.itemTitle(sel)}>{sel ? '✓ ' : ''}{getLabel(item)}</div>
                      {getSub(item) && <div style={s.itemSub}>{getSub(item)}</div>}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

// ─── Selected chips strip ─────────────────────────────────────────────────────

function SelectedChips({ picks, pickMode, onRemove, accentColor, limit }) {
  const isArtistMode = pickMode === 'artists';
  const s = {
    wrap: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 32 },
    chip: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px', borderRadius: 16, background: accentColor + '22', border: `1px solid ${accentColor}66`, fontSize: 12, color: accentColor, fontWeight: 600 },
    chipThumb: { width: 18, height: 18, borderRadius: 3, objectFit: 'cover' },
    removeBtn: { background: 'none', border: 'none', color: accentColor, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, marginLeft: 2 },
    empty: { fontSize: 12, color: '#334155', fontStyle: 'italic' },
  };
  return (
    <div style={s.wrap}>
      {picks.length === 0
        ? <span style={s.empty}>None selected yet ({limit} needed)</span>
        : picks.map((pick, i) => {
            const label = isArtistMode ? pick.name : pick.title;
            const thumb = pick.albumArt || pick.image || null;
            return (
              <span key={pick.id || i} style={s.chip}>
                {thumb && <img src={thumb} style={s.chipThumb} alt="" />}
                {label}
                <button style={s.removeBtn} onClick={() => onRemove(pick)}>✕</button>
              </span>
            );
          })
      }
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ count, limit, color }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {Array.from({ length: limit }).map((_, i) => (
        <div key={i} style={{ width: 28, height: 8, borderRadius: 4, background: i < count ? color : '#1e293b', border: '1px solid #334155' }} />
      ))}
    </div>
  );
}

// ─── Standard ────────────────────────────────────────────────────────────────

function StandardPickScreen({ room }) {
  const [picks, setPicks] = useState([]);
  const isArtistMode = room.pickMode === 'artists';
  const isSpotifyRoom = room.musicSource === 'spotify';
  const pool = isArtistMode ? (room.artistPool || []) : (room.songPool || []);
  const getKey = (item) => isArtistMode ? (item.id || item.name) : (item.id || item.title);
  const LIMIT = 5;

  const toggle = (item) => {
    const key = getKey(item);
    if (picks.some(p => getKey(p) === key)) {
      setPicks(picks.filter(p => getKey(p) !== key));
    } else {
      if (picks.length >= LIMIT) return;
      setPicks([...picks, item]);
    }
  };

  const confirm = () => {
    if (picks.length < LIMIT) return;
    socket.emit('player:picks', { picks });
  };

  const s = sharedStyles();

  return (
    <div style={s.wrap}>
      <div style={s.title}>Pick your {LIMIT} {isArtistMode ? 'artists' : 'songs'}</div>
      <div style={s.sub}>Genre: {room.genre} · {isArtistMode ? 'Artist' : 'Song'} mode{isSpotifyRoom ? ' · Spotify search enabled' : ''}</div>

      <ProgressDots count={picks.length} limit={LIMIT} color="#6366f1" />
      <SelectedChips picks={picks} pickMode={room.pickMode} onRemove={(item) => toggle(item)} accentColor="#6366f1" limit={LIMIT} />

      <SearchPicker
        roomCode={room.code}
        pickMode={room.pickMode}
        isSpotifyRoom={isSpotifyRoom}
        pool={pool}
        selected={picks}
        onToggle={toggle}
        limit={LIMIT}
        accentColor="#6366f1"
        accentBg="#312e81"
      />

      <button style={s.btn(picks.length === LIMIT, '#6366f1')} onClick={confirm} disabled={picks.length < LIMIT}>
        {picks.length === LIMIT ? 'Confirm picks' : `Select ${LIMIT - picks.length} more`}
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
  const isSpotifyRoom = room.musicSource === 'spotify';
  const pool = isArtistMode ? (room.artistPool || []) : (room.songPool || []);
  const getKey = (item) => isArtistMode ? (item.id || item.name) : (item.id || item.title);

  const allCommitted = (currentPhase) => {
    const all = [];
    if (currentPhase !== 'mains') all.push(...mains);
    if (currentPhase !== 'backups') all.push(...backups);
    if (currentPhase !== 'guesses') all.push(...guesses);
    return new Set(all.map(getKey));
  };

  const makePhasePicker = (selected, setSelected, limit) => {
    const committedKeys = allCommitted(phase);
    return {
      toggle: (item) => {
        const key = getKey(item);
        if (committedKeys.has(key)) return;
        if (selected.some(p => getKey(p) === key)) {
          setSelected(selected.filter(p => getKey(p) !== key));
        } else {
          if (selected.length >= limit) return;
          setSelected([...selected, item]);
        }
      },
      disabledKeys: committedKeys,
    };
  };

  const phases = {
    mains:   { label: 'Main picks',      step: 1, limit: 5,  color: '#6366f1', bg: '#312e81',  selected: mains,   setSelected: setMains,   nextLabel: 'Next: Backups →',        nextPhase: 'backups'  },
    backups: { label: 'Backup picks',     step: 2, limit: 3,  color: '#f59e0b', bg: '#1c1505',  selected: backups, setSelected: setBackups, nextLabel: 'Next: Secret guesses →', nextPhase: 'guesses' },
    guesses: { label: 'Secret guesses',   step: 3, limit: 3,  color: '#ec4899', bg: '#1f0617',  selected: guesses, setSelected: setGuesses, nextLabel: 'Confirm all picks',      nextPhase: null      },
  };
  const cfg = phases[phase];
  const { toggle, disabledKeys } = makePhasePicker(cfg.selected, cfg.setSelected, cfg.limit);
  const s = sharedStyles();

  const handleNext = () => {
    if (cfg.nextPhase) {
      setPhase(cfg.nextPhase);
    } else {
      socket.emit('player:newlywed_picks', { mains, backups, guesses });
    }
  };

  const stepColors = ['#6366f1', '#f59e0b', '#ec4899'];

  return (
    <div style={s.wrap}>
      <div style={s.title}>Newlywed Bingo — {isArtistMode ? 'Artist' : 'Song'} mode</div>
      <div style={s.sub}>Genre: {room.genre}{isSpotifyRoom ? ' · Spotify search enabled' : ''}</div>

      {/* Step bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, border: '1px solid #334155', background: cfg.step > i + 1 ? '#475569' : (cfg.step === i + 1 ? stepColors[i] : '#1e293b') }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Step {cfg.step} of 3</span>
      </div>

      {phase === 'guesses' && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#1f0617', border: '1px solid #701a4e', marginBottom: 10 }}>
          <span>🔒</span>
          <span style={{ fontSize: 12, color: '#f9a8d4', lineHeight: 1.4 }}>Hidden from all other players until the end. Predict songs someone else picked.</span>
        </div>
      )}

      {/* Summary of previous phases */}
      {phase !== 'mains' && mains.length > 0 && (
        <div style={s.summaryBox}>
          <div style={s.summaryLabel}>Your mains</div>
          {mains.map((item, i) => <span key={i} style={s.chip('#6366f1')}>{isArtistMode ? item.name : item.title}</span>)}
        </div>
      )}
      {phase === 'guesses' && backups.length > 0 && (
        <div style={s.summaryBox}>
          <div style={s.summaryLabel}>Your backups</div>
          {backups.map((item, i) => <span key={i} style={s.chip('#f59e0b')}>{isArtistMode ? item.name : item.title}</span>)}
        </div>
      )}

      <ProgressDots count={cfg.selected.length} limit={cfg.limit} color={cfg.color} />
      <SelectedChips picks={cfg.selected} pickMode={room.pickMode} onRemove={toggle} accentColor={cfg.color} limit={cfg.limit} />

      <SearchPicker
        roomCode={room.code}
        pickMode={room.pickMode}
        isSpotifyRoom={isSpotifyRoom}
        pool={pool}
        selected={cfg.selected}
        onToggle={toggle}
        limit={cfg.limit}
        accentColor={cfg.color}
        accentBg={cfg.bg}
        disabledKeys={disabledKeys}
      />

      <button
        style={s.btn(cfg.selected.length === cfg.limit, cfg.color)}
        onClick={handleNext}
        disabled={cfg.selected.length < cfg.limit}
      >
        {cfg.selected.length === cfg.limit ? cfg.nextLabel : `Select ${cfg.limit - cfg.selected.length} more`}
      </button>
    </div>
  );
}

// ─── Gong Show ────────────────────────────────────────────────────────────────

function GongShowPickScreen({ room }) {
  const [phase, setPhase] = useState('mains');
  const [mains, setMains] = useState([]);
  const [gongs, setGongs] = useState([]);
  const isArtistMode = room.pickMode === 'artists';
  const isSpotifyRoom = room.musicSource === 'spotify';
  const pool = isArtistMode ? (room.artistPool || []) : (room.songPool || []);
  const getKey = (item) => isArtistMode ? (item.id || item.name) : (item.id || item.title);

  const mainKeys = new Set(mains.map(getKey));
  const gongKeys = new Set(gongs.map(getKey));

  const toggleMain = (item) => {
    const key = getKey(item);
    if (gongKeys.has(key)) return;
    if (mainKeys.has(key)) { setMains(mains.filter(p => getKey(p) !== key)); }
    else { if (mains.length >= 10) return; setMains([...mains, item]); }
  };

  const toggleGong = (item) => {
    const key = getKey(item);
    if (mainKeys.has(key)) return;
    if (gongKeys.has(key)) { setGongs(gongs.filter(p => getKey(p) !== key)); }
    else { if (gongs.length >= 5) return; setGongs([...gongs, item]); }
  };

  const confirm = () => socket.emit('player:gongshow_picks', { mains, gongs });
  const s = sharedStyles();
  const isMains = phase === 'mains';
  const accentColor = isMains ? '#6366f1' : '#ef4444';
  const accentBg = isMains ? '#312e81' : '#1f0a0a';
  const currentPicks = isMains ? mains : gongs;
  const currentToggle = isMains ? toggleMain : toggleGong;
  const currentLimit = isMains ? 10 : 5;
  const disabledKeys = isMains ? gongKeys : mainKeys;
  const readyToConfirm = mains.length === 10 && gongs.length === 5;

  return (
    <div style={s.wrap}>
      <div style={s.title}>Gong Show Bingo — {isArtistMode ? 'Artist' : 'Song'} mode</div>
      <div style={s.sub}>Genre: {room.genre}{isSpotifyRoom ? ' · Spotify search enabled' : ''}</div>

      {/* Phase tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { id: 'mains', label: `🎵 Mains (${mains.length}/10)`, color: '#6366f1' },
          { id: 'gongs', label: `🔔 Gongs (${gongs.length}/5)`,  color: '#ef4444' },
        ].map(tab => (
          <div
            key={tab.id}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${phase === tab.id ? tab.color : '#334155'}`, background: phase === tab.id ? tab.color + '22' : '#0f172a', color: phase === tab.id ? tab.color : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
            onClick={() => setPhase(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {phase === 'gongs' && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, background: '#1f0a0a', border: '1px solid #7f1d1d', marginBottom: 10 }}>
          <span>⚠️</span>
          <span style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.4 }}>You can't gong your own main picks. Two gongers on the same song cancel each other and both lose a point.</span>
        </div>
      )}

      {phase === 'gongs' && mains.length > 0 && (
        <div style={s.summaryBox}>
          <div style={s.summaryLabel}>Your mains</div>
          {mains.map((item, i) => <span key={i} style={s.chip('#6366f1')}>{isArtistMode ? item.name : item.title}</span>)}
        </div>
      )}

      <ProgressDots count={currentPicks.length} limit={currentLimit} color={accentColor} />
      <SelectedChips picks={currentPicks} pickMode={room.pickMode} onRemove={currentToggle} accentColor={accentColor} limit={currentLimit} />

      <SearchPicker
        roomCode={room.code}
        pickMode={room.pickMode}
        isSpotifyRoom={isSpotifyRoom}
        pool={pool}
        selected={currentPicks}
        onToggle={currentToggle}
        limit={currentLimit}
        accentColor={accentColor}
        accentBg={accentBg}
        disabledKeys={disabledKeys}
      />

      {phase === 'mains' && mains.length === 10 && (
        <button style={{ ...s.btn(true, '#6366f1'), marginBottom: 8 }} onClick={() => setPhase('gongs')}>
          Next: Pick gong songs →
        </button>
      )}
      {phase === 'gongs' && (
        <button style={s.btn(readyToConfirm, '#ef4444')} onClick={confirm} disabled={!readyToConfirm}>
          {readyToConfirm ? 'Confirm all picks' : `Select ${5 - gongs.length} more gong${5 - gongs.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

function sharedStyles() {
  return {
    wrap: { maxWidth: 700, margin: '0 auto', padding: 16, paddingTop: 20 },
    title: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 },
    sub: { fontSize: 13, color: '#64748b', marginBottom: 14 },
    btn: (ready, color) => ({
      width: '100%', padding: '12px 20px', borderRadius: 8, border: 'none',
      cursor: ready ? 'pointer' : 'not-allowed',
      background: ready ? color : '#334155',
      color: ready ? '#fff' : '#64748b',
      fontWeight: 700, fontSize: 15,
    }),
    summaryBox: { background: '#0f172a', borderRadius: 8, padding: '10px 14px', marginBottom: 10, border: '1px solid #334155' },
    summaryLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
    chip: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, background: color + '22', color, border: `1px solid ${color}66`, margin: '2px 3px' }),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function PickScreen({ room, playerId }) {
  if (!room) return null;
  if (room.gameMode === 'newlywed') return <NewlywedPickScreen room={room} playerId={playerId} />;
  if (room.gameMode === 'gongshow') return <GongShowPickScreen room={room} playerId={playerId} />;
  return <StandardPickScreen room={room} playerId={playerId} />;
}
