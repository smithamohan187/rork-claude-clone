import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '@/api/socket';

// Keeps the shared socket connected to whichever access token AuthContext
// currently holds — reconnects transparently after a silent token refresh
// (accessToken changes in AuthContext), and disconnects on logout.
export function useSocket(): Socket | null {
  const { accessToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnectSocket();
      return;
    }
    connectSocket(accessToken);
  }, [accessToken, isAuthenticated]);

  return getSocket();
}
