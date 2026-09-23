import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/api/client';

let socket: Socket | null = null;
let connectedToken: string | null = null;

// Connects (or reconnects with a fresh token) the single shared socket. A no-op
// if already connected with this exact token — AuthContext's accessToken effect
// fires on every render where the token reference is stable, not just on change.
export function connectSocket(accessToken: string): Socket {
  if (socket && connectedToken === accessToken) {
    return socket;
  }
  if (socket) {
    socket.disconnect();
  }
  connectedToken = accessToken;
  socket = io(API_BASE_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectedToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
