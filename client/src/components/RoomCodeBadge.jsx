import React from 'react';

export default function RoomCodeBadge({ code }) {
  if (!code) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 999,
      background: 'rgba(26, 26, 46, 0.85)',
      border: '1px solid rgba(0, 212, 255, 0.2)',
      borderRadius: 8,
      padding: '6px 12px',
      backdropFilter: 'blur(4px)',
      pointerEvents: 'none',
    }}>
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
