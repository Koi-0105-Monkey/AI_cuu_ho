import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useSocket } from '../hooks/useSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: 'mock-socket-id',
  };
  return {
    io: vi.fn(() => mockSocket),
  };
});

describe('useSocket Hook', () => {
  let mockSocketInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketInstance = io();
  });

  test('should establish socket connection once as a singleton', () => {
    const handlers = {
      'incident:new': vi.fn(),
    };
    
    const { result } = renderHook(() => useSocket(handlers));
    
    expect(io).toHaveBeenCalled();
    expect(result.current.socket).toBe(mockSocketInstance);
  });

  test('should register event handlers on mount', () => {
    const testHandler = vi.fn();
    const handlers = {
      'incident:new': testHandler,
      'gps:update': vi.fn(),
    };

    renderHook(() => useSocket(handlers));

    expect(mockSocketInstance.on).toHaveBeenCalledWith('incident:new', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('gps:update', expect.any(Function));
  });

  test('should clean up event handlers on unmount', () => {
    const handlers = {
      'incident:new': vi.fn(),
    };

    const { unmount } = renderHook(() => useSocket(handlers));

    unmount();

    expect(mockSocketInstance.off).toHaveBeenCalledWith('incident:new', expect.any(Function));
  });

  test('should emit event with correct payload', () => {
    const { result } = renderHook(() => useSocket());
    
    result.current.emit('incident:assign', { incidentId: '123' });
    
    expect(mockSocketInstance.emit).toHaveBeenCalledWith('incident:assign', { incidentId: '123' });
  });
});
