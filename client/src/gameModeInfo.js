// Single source of truth for game-mode copy, shared between HomeScreen.jsx
// (host picking a mode) and LobbyScreen.jsx (players seeing what mode the
// host picked) — keeps the two descriptions from drifting out of sync.
export const GAME_MODES = {
  standard: {
    label: 'Standard',
    accent: '#00d4ff',
    description: 'Pick 5 songs or artists you predict will play. First to match wins.',
  },
  newlywed: {
    label: 'Newlywed Bingo',
    accent: '#ffb347',
    isNew: true,
    description: 'Pick 5 mains + 3 backups + 3 secret guesses. Sabotage opponents, earn wildcards.',
  },
  gongshow: {
    label: 'Gong Show Bingo',
    accent: '#ef4444',
    isNew: true,
    description: "Pick 10 songs + 5 secret gong songs. Gong another player's pick to cancel their point — but duplicate gongers cancel each other and lose a point.",
  },
  djbattle: {
    label: 'DJ Battle',
    accent: '#a855f7',
    isNew: true,
    description: 'Host plays their own playlist. Players pick artists they think will play. Score when you guess right — host scores when nobody guesses their artist.',
  },
};
