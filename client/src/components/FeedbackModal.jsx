import React, { useState } from 'react';

const GC = {
  panel: '#12122a', border: '#2a2a4a',
  cyan: '#00d4ff', amber: '#ffb347', red: '#f87171', green: '#4ade80',
  text: '#e2e8f0', muted: '#6b7280',
};

// Reachable from every screen (including Home) so a bug can be reported
// wherever it happens — DEV_PLAN Session 6: beta testers won't be sitting
// next to the host to narrate problems live.
export default function FeedbackModal({ room, playerId, isHost, onClose }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error

  const submit = async () => {
    if (!message.trim() || status === 'submitting') return;
    setStatus('submitting');
    try {
      const me = room && room.players ? room.players.find(p => p.id === playerId) : null;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          playerName: me ? me.name : null,
          roomCode: room ? room.code : null,
          gameMode: room ? room.gameMode : null,
          phase: room ? room.phase : null,
          isHost: !!isHost,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('done');
      setTimeout(onClose, 1600);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2100,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: GC.panel, border: `1px solid ${GC.border}`,
        borderRadius: 14, padding: 28, maxWidth: 420, width: '100%',
        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
      }}>
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, color: GC.green, fontWeight: 700 }}>Thanks — Dre will see this.</div>
          </div>
        ) : (
          <>
            <div style={{
              fontFamily: "'Orbitron', monospace", fontSize: 17, fontWeight: 800,
              color: GC.amber, marginBottom: 10,
              textShadow: '0 0 10px rgba(255,179,71,0.5)',
            }}>
              🐛 Report a bug
            </div>
            <div style={{ fontSize: 13, color: GC.muted, marginBottom: 12, lineHeight: 1.5 }}>
              Describe what happened. Your room code, device, and current screen are attached automatically.
            </div>
            <textarea
              autoFocus
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Confirm picks button didn't respond when I tapped it"
              style={{
                width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 8,
                background: '#0f172a', border: `1px solid ${GC.border}`, color: GC.text,
                fontSize: 14, lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10,
              }}
            />
            {status === 'error' && (
              <div style={{ fontSize: 12, color: GC.red, marginBottom: 10 }}>Couldn't send that — check your connection and try again.</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8,
                  border: `1px solid ${GC.border}`, background: 'transparent',
                  color: GC.muted, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!message.trim() || status === 'submitting'}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8,
                  border: `1px solid ${GC.cyan}`,
                  background: message.trim() ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: message.trim() ? GC.cyan : GC.muted,
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 14,
                }}
              >
                {status === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
