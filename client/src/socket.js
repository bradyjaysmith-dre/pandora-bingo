import { io } from 'socket.io-client';

// In development, Vite's proxy forwards /socket.io to localhost:3002.
// In production (Replit), the server and client are on the same origin,
// so connecting to '/' works automatically.
const socket = io('/', { autoConnect: false });

export default socket;
