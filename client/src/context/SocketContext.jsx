import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getServerUrl } from '../services/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // Map of userId -> { status: 'available' | 'busy' | 'ringing' }
  const [presenceMap, setPresenceMap] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to WebSocket server (using base server URL if on mobile/native)
    const targetUrl = getServerUrl() || window.location.origin;
    const s = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('user:join', { user });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle full initial presence list
    s.on('presence:list', (list) => {
      const map = {};
      list.forEach(item => {
        map[item.userId] = item;
      });
      setPresenceMap(map);
    });

    // Handle presence updates
    s.on('presence:update', (list) => {
      const map = {};
      list.forEach(item => {
        map[item.userId] = item;
      });
      setPresenceMap(map);
    });

    s.on('presence:user-online', ({ userId, status }) => {
      setPresenceMap(prev => ({
        ...prev,
        [userId]: { userId, status }
      }));
    });

    s.on('presence:user-offline', ({ userId }) => {
      setPresenceMap(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        presenceMap,
        isUserOnline: (userId) => !!presenceMap[userId],
        getUserStatus: (userId) => presenceMap[userId]?.status || 'offline'
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}
