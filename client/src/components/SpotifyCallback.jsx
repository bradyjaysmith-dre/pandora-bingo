import React, { useEffect, useState } from 'react';

export default function SpotifyCallback({ onConnected }) {
  const [status, setStatus] = useState('Connecting to Spotify...');
  const [error, setError] = useState(null);
  const [isWhitelistError, setIsWhitelistError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn    = params.get('expires_in');
    const errorParam   = params.get('error');
    const notWhitelisted = params.get('not_whitelisted') === '1';

    // ── Error path ────────────────────────────────────────────────────────
    if (errorParam) {
      const isWL = notWhitelisted;
      setIsWhitelistError(isWL);
      setError(isWL
        ? 'Your Spotify account is not on the whitelist for this app. Spotify source has been disabled — mic detection will be used instead.'
        : 'Spotify connection failed. You can still play using mic detection or manual mode.'
      );

      // Write a flag so HomeScreen can pick it up after redirect
      sessionStorage.setItem('pandora_spotify_error', JSON.stringify({
        notWhitelisted: isWL,
        error: errorParam,
      }));

      // Restore any pre-OAuth host settings and force musicSource to audd
      const saved = sessionStorage.getItem('pandora_pre_spotify');
      if (saved) {
        try {
          const s = JSON.parse(saved);
          s.musicSource = 'audd'; // downgrade to mic
          sessionStorage.setItem('pandora_pre_spotify', JSON.stringify(s));
        } catch {}
      }

      // Redirect home after a short pause so user can read the message
      setTimeout(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate', { state: { screen: 'home' } }));
      }, 3000);
      return;
    }

    // ── Success path ──────────────────────────────────────────────────────
    if (!accessToken) {
      setError('No access token received from Spotify.');
      return;
    }

    setStatus('Spotify connected! Returning to game...');
    setTimeout(() => {
      onConnected({ accessToken, refreshToken, expiresIn: parseInt(expiresIn) });
    }, 1500);
  }, []);

  const s = {
    wrap: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#1a1a2e' },
    card: { background:'#1e293b', borderRadius:12, padding:32, textAlign:'center', maxWidth:380, width:'100%', margin:16 },
    icon: { fontSize:48, marginBottom:16 },
    title: { fontSize:20, fontWeight:700, color:'#f1f5f9', marginBottom:8 },
    sub: { fontSize:14, color:'#64748b' },
    errorBox: {
      marginTop:12, padding:'12px 14px', borderRadius:8,
      background: isWhitelistError ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
      border: `1px solid ${isWhitelistError ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`,
      color: isWhitelistError ? '#fca5a5' : '#fde68a',
      fontSize:13, lineHeight:1.5, textAlign:'left',
    },
    redirect: { fontSize:12, color:'#475569', marginTop:12 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.icon}>{error ? '🚫' : '🎵'}</div>
        <div style={s.title}>{error ? (isWhitelistError ? 'Not whitelisted' : 'Connection failed') : status}</div>
        {error
          ? <>
              <div style={s.errorBox}>{error}</div>
              <div style={s.redirect}>Returning to setup in a moment…</div>
            </>
          : <div style={s.sub}>Please wait...</div>
        }
      </div>
    </div>
  );
}
