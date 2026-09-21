import React, { useState } from 'react';

export default function RoomCodeBadge({ code }) {
  const [expanded, setExpanded] = useState(false);
  if (!code) return null;

  const base = {
    position: 'fixed',
    bottom: 'calc(16px + env(safe-area-inset-bottom))',
    left: 16,
    zIndex: 999,
    background: 'rgba(26, 26, 46, 0.85)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: 8,
    backdropFilter: 'blur(4px)',
    cursor: 'pointer',
  };

  if (!expanded) {
    return (
      <div
        role="button"
        aria-label="Show room code"
        onClick={() => setExpanded(true)}
        style={{
          ...base,
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'rgba(0, 212, 255, 0.6)',
        }}
      >
        🔑 ROOM
      </div>
    );
  }

  return (
    <div
      role="button"
      aria-label="Hide room code"
      onClick={() => setExpanded(false)}
      style={{ ...base, padding: '6px 12px' }}
    >
      <div style={{ fontSize: 10, color: 'rgba(0, 212, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Room</div>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        fontFamily: 'monospace',
        color: 'rgba(255, 179, 71, 0.7)',
        letterSpacing: 3,
      }}>{code}</div>
    </div>
  );
}
