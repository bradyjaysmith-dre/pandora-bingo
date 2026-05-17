import { io } from 'socket.io-client';

// In development, Vite's proxy forwards /socket.io to localhost:3002.
// In production (Railway/Replit), the server and client are on the same origin,
// so connecting to '/' works automatically.
//
// Reconnection is enabled with aggressive settings to handle mobile browser
// suspension — when Safari or Chrome on mobile suspends a background tab,
// the WebSocket drops. On resume, Socket.io will reconnect automatically,
// and App.jsx listens for the 'connect' event to re-emit player:rejoin so
// the socket gets back into the room's broadcast channel.
const socket = io('/', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

export default socket;
