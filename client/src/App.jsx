import React, { useState, useEffect } from 'react';
import socket from './socket.js';
import HomeScreen from './components/HomeScreen.jsx';
import LobbyScreen from './components/LobbyScreen.jsx';
import PickScreen from './components/PickScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import EndScreen from './components/EndScreen.jsx';
import SpotifyCallback from './components/SpotifyCallback.jsx';
import RoomCodeBadge from './components/RoomCodeBadge.jsx';

const SESSION_KEY = 'pandora_session';

function saveSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

export default function App() {
  const [screen, setScreen] = useState('home');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);
  const [spotifyTokens, setSpotifyTokens] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  const isSpotifyCallback = window.location.pathname === '/spotify-callback';

  useEffect(() => {
    if (isSpotifyCallback) return;
    socket.connect();

    // ── Try to rejoin from saved session ──────────────────────────────────
    const session = loadSession();
    if (session && session.roomCode && session.playerId) {
      socket.emit('player:rejoin', { roomCode: session.roomCode, playerId: session.playerId });
    }

    socket.on('room:rejoined', ({ room, playerId }) => {
      setRoom(room); setPlayerId(playerId);
      setIsHost(room.hostId === playerId);
      // Restore to the right screen based on room phase
      if (room.phase === 'lobby') setScreen('lobby');
      else if (room.phase === 'picking') {
        const me = room.players.find(p => p.id === playerId);
        setScreen(me && me.confirmed ? 'waiting' : 'pick');
      }
      else if (room.phase === 'playing') setScreen('game');
      else if (room.phase === 'ended') setScreen('end');
    });

    socket.on('room:created', ({ room, playerId }) => {
      setRoom(room); setPlayerId(playerId); setIsHost(true); setScreen('lobby');
      saveSession({ roomCode: room.code, playerId, playerName: room.players[0].name });
    });

    socket.on('room:joined', ({ room, playerId }) => {
      setRoom(room); setPlayerId(playerId); setIsHost(false); setScreen('lobby');
      const me = room.players.find(p => p.id === playerId);
      saveSession({ roomCode: room.code, playerId, playerName: me ? me.name : '' });
    });

    // Host reset — everyone goes back to lobby with new settings
    socket.on('room:reset', ({ room }) => {
      setRoom({ ...room });
      setNowPlaying(null);
      setScreen('lobby');
    });

    socket.on('lobby:updated', ({ room }) => setRoom({ ...room }));

    socket.on('game:picking', ({ room }) => {
      setRoom({ ...room });
      setScreen('pick');
    });

    socket.on('picks:confirmed', () => setScreen('waiting'));

    socket.on('game:playing', ({ room }) => {
      setRoom({ ...room });
      setScreen('game');
    });

    socket.on('game:updated', ({ room }) => setRoom({ ...room }));

    socket.on('game:tick', ({ secondsLeft }) => {
      setRoom(prev => prev ? { ...prev, secondsLeft } : prev);
    });

    socket.on('spotify:connected', () => console.log('Spotify connected to server'));
    socket.on('spotify:now_playing', ({ track }) => setNowPlaying(track));

    socket.on('game:over', ({ room }) => {
      setRoom({ ...room }); setNowPlaying(null); setScreen('end');
    });

    socket.on('error', ({ message }) => {
      setError(message); setTimeout(() => setError(null), 4000);
    });

    return () => socket.removeAllListeners();
  }, [isSpotifyCallback]);

  const handleSpotifyConnected = (tokens) => {
    setSpotifyTokens(tokens);
    // Socket wasn't connected during the OAuth callback page — connect now,
    // then emit once the connection is established.
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', () => socket.emit('host:spotify_connect', tokens));
    } else {
      socket.emit('host:spotify_connect', tokens);
    }
    window.history.pushState({}, '', '/');
    setScreen('home');
  };

  // Host resets the room for a new game with updated settings
  const handlePlayAgain = (settings) => {
    if (isHost) {
      socket.emit('host:reset', settings);
      // room:reset event will move everyone to lobby
    }
    // Non-hosts just wait for the room:reset event
  };

  const goHome = () => {
    clearSession();
    setScreen('home'); setRoom(null); setPlayerId(null);
    setIsHost(false); setNowPlaying(null); setSpotifyTokens(null);
  };

  if (isSpotifyCallback) {
    return <SpotifyCallback onConnected={handleSpotifyConnected} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e' }}>
      {error && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'rgba(26,26,46,0.95)', color:'#f87171', padding:'10px 20px', borderRadius:8, zIndex:1000, fontSize:14, border:'1px solid rgba(248,113,113,0.4)', boxShadow:'0 0 12px rgba(248,113,113,0.2)' }}>
          {error}
        </div>
      )}
      {screen === 'home' && <HomeScreen spotifyConnected={!!spotifyTokens} />}
      {screen === 'lobby' && <LobbyScreen room={room} playerId={playerId} isHost={isHost} />}
      {screen === 'pick' && <PickScreen room={room} playerId={playerId} />}
      {screen === 'waiting' && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Orbitron', monospace", fontSize:22, fontWeight:800, color:'#ffb347', textShadow:'0 0 12px rgba(255,179,71,0.6)', marginBottom:10 }}>Picks confirmed!</div>
            <div style={{ color:'rgba(0,212,255,0.7)', fontSize:14 }}>Waiting for other players...</div>
          </div>
        </div>
      )}
      {screen === 'game' && <GameScreen room={room} playerId={playerId} isHost={isHost} spotifyTokens={spotifyTokens} nowPlaying={nowPlaying} />}
      {screen === 'end' && <EndScreen room={room} playerId={playerId} isHost={isHost} onPlayAgain={handlePlayAgain} onLeave={goHome} />}
      {room && screen !== 'home' && screen !== 'end' && <RoomCodeBadge code={room.code} />}
    </div>
  );
}