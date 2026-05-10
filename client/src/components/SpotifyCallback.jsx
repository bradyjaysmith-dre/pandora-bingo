import React, { useEffect, useState } from 'react';

export default function SpotifyCallback({ onConnected }) {
  const [status, setStatus] = useState('Connecting to Spotify...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');

    if (!accessToken) {
      setError('No access token received from Spotify');
      return;
    }

    setStatus('Spotify connected! Returning to game...');
    setTimeout(() => {
      onConnected({ accessToken, refreshToken, expiresIn: parseInt(expiresIn) });
    }, 1500);
  }, []);

  const s = {
    wrap: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' },
    card: { background:'#1e293b', borderRadius:12, padding:32, textAlign:'center', maxWidth:360, width:'100%' },
    icon: { fontSize:48, marginBottom:16 },
    title: { fontSize:20, fontWeight:700, color:'#f1f5f9', marginBottom:8 },
    sub: { fontSize:14, color:'#64748b' },
    error: { color:'#f87171', fontSize:14, marginTop:8 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.icon}>{error ? 'X' : 'music'}</div>
        <div style={s.title}>{error ? 'Connection failed' : status}</div>
        {error && <div style={s.error}>{error}</div>}
        {!error && <div style={s.sub}>Please wait...</div>}
      </div>
    </div>
  );
}
