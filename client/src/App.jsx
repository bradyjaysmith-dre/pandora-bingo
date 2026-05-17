import React, { useState, useEffect } from 'react';
import socket from './socket.js';
import HomeScreen from './components/HomeScreen.jsx';
import LobbyScreen from './components/LobbyScreen.jsx';
import PickScreen from './components/PickScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import EndScreen from './components/EndScreen.jsx';
import SpotifyCallback from './components/SpotifyCallback.jsx';
import RoomCodeBadge from './components/RoomCodeBadge.jsx';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';

const SESSION_KEY = 'pandora_session';

function saveSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// Screens that get a history entry pushed when navigated to.
// The value is what screen to go back to when back is pressed.
const BACK_MAP = {
  leaderboard: 'home',
  lobby:       'home',
  pick:        'lobby',
  waiting:     'lobby',
  // 'game' and 'end' are handled specially (modal / home)
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);
  const [spotifyTokens, setSpotifyTokens] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(null);
  const [leaveModal, setLeaveModal] = useState(false); // shown when back pressed in-game

  const isSpotifyCallback = window.location.pathname === '/spotify-callback';

  // Push a history entry whenever we navigate to a new screen so the browser
  // back button has something to intercept.
  const navigateTo = (newScreen) => {
    if (newScreen === 'home') {
      // Replace so we don't accumulate home entries
      window.history.replaceState({ screen: 'home' }, '');
    } else {
      window.history.pushState({ screen: newScreen }, '');
    }
    setScreen(newScreen);
  };

  // Intercept browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      const target = e.state?.screen ?? 'home';

      // In-game: show modal instead of navigating away
      if (screen === 'game') {
        // Push the state back so the browser history isn't consumed
        window.history.pushState({ screen: 'game' }, '');
        setLeaveModal(true);
        return;
      }

      // End screen: just go home
      if (screen === 'end') {
        goHome();
        return;
      }

      // All other screens: navigate to the target from BACK_MAP
      const backScreen = BACK_MAP[screen] ?? 'home';
      if (backScreen === 'home') {
        goHome();
      } else {
        setScreen(backScreen);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen]);

  // Seed the initial history state so popstate has a state object to read
  useEffect(() => {
    if (!isSpotifyCallback) {
      window.history.replaceState({ screen: 'home' }, '');
    }
  }, []);

  useEffect(() => {
    if (isSpotifyCallback) return;
    socket.connect();

    // ── Reconnect handler ─────────────────────────────────────────────────
    socket.on('connect', () => {
      const session = loadSession();
      if (session && session.roomCode && session.playerId) {
        console.log('Socket reconnected — rejoining room', session.roomCode);
        socket.emit('player:rejoin', { roomCode: session.roomCode, playerId: session.playerId });
      }
    });

    // ── Try to rejoin from saved session on first load ────────────────────
    const session = loadSession();
    if (session && session.roomCode && session.playerId) {
      socket.emit('player:rejoin', { roomCode: session.roomCode, playerId: session.playerId });
    }

    socket.on('room:rejoined', ({ room, playerId }) => {
      setRoom(room); setPlayerId(playerId);
      setIsHost(room.hostId === playerId);
      if (room.phase === 'lobby') navigateTo('lobby');
      else if (room.phase === 'picking') {
        const me = room.players.find(p => p.id === playerId);
        navigateTo(me && me.confirmed ? 'waiting' : 'pick');
      }
      else if (room.phase === 'playing') navigateTo('game');
      else if (room.phase === 'ended') navigateTo('end');
    });

    socket.on('room:created', ({ room, playerId }) => {
      setRoom(room); setPlayerId(playerId); setIsHost(true);
      navigateTo('lobby');
      saveSession({ roomCode: room.code, playerId, playerName: room.players[0].name });
    });

    socket.on('room:joined', ({ room, playerId }) => {
      setRoom(room); setPlayerId(playerId); setIsHost(false);
      navigateTo('lobby');
      const me = room.players.find(p => p.id === playerId);
      saveSession({ roomCode: room.code, playerId, playerName: me ? me.name : '' });
    });

    socket.on('room:reset', ({ room }) => {
      setRoom({ ...room });
      setNowPlaying(null);
      navigateTo('lobby');
    });

    socket.on('lobby:updated', ({ room }) => setRoom({ ...room }));

    socket.on('game:picking', ({ room }) => {
      setRoom({ ...room });
      navigateTo('pick');
    });

    socket.on('room:pool_updated', ({ songPool, artistPool }) => {
      setRoom(prev => prev ? { ...prev, songPool, artistPool } : prev);
    });

    socket.on('picks:confirmed', () => navigateTo('waiting'));

    socket.on('game:playing', ({ room }) => {
      setRoom({ ...room });
      navigateTo('game');
    });

    socket.on('game:updated', ({ room }) => setRoom({ ...room }));

    socket.on('game:tick', ({ secondsLeft }) => {
      setRoom(prev => prev ? { ...prev, secondsLeft } : prev);
    });

    socket.on('spotify:connected', () => console.log('Spotify connected to server'));
    socket.on('spotify:now_playing', ({ track }) => setNowPlaying(track));

    socket.on('game:grace_period', ({ seconds }) => {
      setGraceSecondsLeft(seconds);
      const interval = setInterval(() => {
        setGraceSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(interval); return null; }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('game:over', ({ room }) => {
      setRoom({ ...room }); setNowPlaying(null);
      navigateTo('end');
    });

    socket.on('error', ({ message }) => {
      setError(message); setTimeout(() => setError(null), 4000);
    });

    return () => socket.removeAllListeners();
  }, [isSpotifyCallback]);

  const handleSpotifyConnected = (tokens) => {
    setSpotifyTokens(tokens);
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', () => socket.emit('host:spotify_connect', tokens));
    } else {
      socket.emit('host:spotify_connect', tokens);
    }
    window.history.pushState({}, '', '/');
    setScreen('home');
  };

  const handlePlayAgain = (settings) => {
    if (isHost) socket.emit('host:reset', settings);
  };

  const goHome = () => {
    clearSession();
    setScreen('home'); setRoom(null); setPlayerId(null);
    setIsHost(false); setNowPlaying(null); setSpotifyTokens(null);
    window.history.replaceState({ screen: 'home' }, '');
  };

  // Leave game confirmed from modal
  const confirmLeave = () => {
    setLeaveModal(false);
    goHome();
  };

  if (isSpotifyCallback) {
    return <SpotifyCallback onConnected={handleSpotifyConnected} />;
  }

  // ── In-game leave modal ────────────────────────────────────────────────────
  const LeaveModal = () => {
    const GC = {
      bg: '#1a1a2e', panel: '#12122a', border: '#2a2a4a',
      cyan: '#00d4ff', amber: '#ffb347', red: '#f87171',
      text: '#e2e8f0', muted: '#6b7280',
    };
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: GC.panel, border: `1px solid ${GC.border}`,
          borderRadius: 14, padding: 28, maxWidth: 380, width: '100%',
          boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        }}>
          <div style={{
            fontFamily: "'Orbitron', monospace", fontSize: 17, fontWeight: 800,
            color: GC.amber, marginBottom: 12,
            textShadow: '0 0 10px rgba(255,179,71,0.5)',
          }}>
            {isHost ? '⚠️ You are the host' : '⚠️ Leave game?'}
          </div>
          <div style={{ fontSize: 14, color: GC.text, marginBottom: 8, lineHeight: 1.6 }}>
            {isHost
              ? 'Leaving as the host will end the game for all players. Are you sure?'
              : 'Are you sure you want to leave? You can rejoin anytime using the same room code.'}
          </div>
          {!isHost && room && (
            <div style={{
              fontSize: 13, color: GC.cyan, marginBottom: 16,
              fontFamily: "'Orbitron', monospace", letterSpacing: 2,
            }}>
              Room code: {room.code}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={() => setLeaveModal(false)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8,
                border: `1px solid ${GC.border}`, background: 'transparent',
                color: GC.muted, cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}
            >
              Stay in game
            </button>
            <button
              onClick={confirmLeave}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8,
                border: `1px solid rgba(248,113,113,0.4)`,
                background: 'rgba(248,113,113,0.1)',
                color: GC.red, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                boxShadow: '0 0 8px rgba(248,113,113,0.15)',
              }}
            >
              {isHost ? 'End game & leave' : 'Leave game'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e' }}>
      {leaveModal && <LeaveModal />}

      {error && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'rgba(26,26,46,0.95)', color:'#f87171', padding:'10px 20px', borderRadius:8, zIndex:1000, fontSize:14, border:'1px solid rgba(248,113,113,0.4)', boxShadow:'0 0 12px rgba(248,113,113,0.2)' }}>
          {error}
        </div>
      )}
      {screen === 'home' && <HomeScreen spotifyConnected={!!spotifyTokens} onLeaderboard={() => navigateTo('leaderboard')} />}
      {screen === 'leaderboard' && <LeaderboardScreen onBack={() => navigateTo('home')} />}
      {screen === 'lobby' && <LobbyScreen room={room} playerId={playerId} isHost={isHost} />}
      {screen === 'pick' && <PickScreen room={room} playerId={playerId} isHost={isHost} graceSecondsLeft={graceSecondsLeft} />}
      {screen === 'waiting' && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Orbitron', monospace", fontSize:22, fontWeight:800, color:'#ffb347', textShadow:'0 0 12px rgba(255,179,71,0.6)', marginBottom:10 }}>Picks confirmed!</div>
            <div style={{ color:'rgba(0,212,255,0.7)', fontSize:14 }}>Waiting for other players...</div>
            {isHost && (
              <button
                onClick={() => socket.emit('host:force_start')}
                style={{ marginTop:28, padding:'12px 28px', borderRadius:8, border:'1px solid #ffb347',
                  cursor:'pointer', background:'#2a1f0a', color:'#ffb347', fontWeight:700, fontSize:15,
                  fontFamily:"'Orbitron', monospace", letterSpacing:'0.05em',
                  boxShadow:'0 0 16px rgba(255,179,71,0.3)' }}>
                &#9654; Start game now
              </button>
            )}
          </div>
        </div>
      )}
      {screen === 'game' && <GameScreen room={room} playerId={playerId} isHost={isHost} spotifyTokens={spotifyTokens} nowPlaying={nowPlaying} />}
      {screen === 'end' && <EndScreen room={room} playerId={playerId} isHost={isHost} onPlayAgain={handlePlayAgain} onLeave={goHome} />}
      {room && screen !== 'home' && screen !== 'end' && <RoomCodeBadge code={room.code} />}
    </div>
  );
}
