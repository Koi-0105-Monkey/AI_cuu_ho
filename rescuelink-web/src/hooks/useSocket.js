import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Custom hook for managing a shared Socket.io connection.
 * @param {Object} handlers - Map of event names to handler functions
 * @example useSocket({ 'incident:new': (inc) => console.log(inc) })
 */
export const useSocket = (handlers = {}) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Create singleton socket synchronously
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('disconnect', () => console.log('Socket disconnected'));
  }

  useEffect(() => {
    if (!socket) return;

    // Register this hook's handlers
    const registeredEvents = Object.keys(handlersRef.current);
    const wrappedHandlers = {};

    registeredEvents.forEach((event) => {
      wrappedHandlers[event] = (...args) => {
        handlersRef.current[event]?.(...args);
      };
      socket.on(event, wrappedHandlers[event]);
    });

    // Cleanup on unmount
    return () => {
      registeredEvents.forEach((event) => {
        socket.off(event, wrappedHandlers[event]);
      });
    };
  }, []); // Only run once

  const emit = useCallback((event, data) => {
    socket?.emit(event, data);
  }, []);

  return { emit, socket };
};
