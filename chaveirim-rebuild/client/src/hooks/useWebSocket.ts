/**
 * useWebSocket Hook
 * 
 * Real-time connection to the server for live updates.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketMessage {
  type: string;
  data: any;
  room?: string;
}

interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    onMessage,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    setStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Authenticate if user is logged in
        if (user) {
          ws.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            memberId: user.memberId,
          }));
        }

        // Subscribe to global updates
        ws.send(JSON.stringify({ type: 'subscribe', room: 'calls' }));
        ws.send(JSON.stringify({ type: 'subscribe', room: 'queue' }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle message
          handleMessage(message);
          
          // Call custom handler
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt to reconnect
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [enabled, user, onMessage, reconnectInterval, maxReconnectAttempts]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'call:created':
      case 'call:updated':
      case 'call:closed':
      case 'call:reopened':
      case 'call:assigned':
      case 'call:unassigned':
        // Invalidate calls queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['calls'] });
        queryClient.invalidateQueries({ queryKey: ['call', message.data?.id] });
        break;

      case 'queue:login':
      case 'queue:logout':
      case 'queue:updated':
        // Invalidate queue queries
        queryClient.invalidateQueries({ queryKey: ['queue-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['queue-members'] });
        queryClient.invalidateQueries({ queryKey: ['dispatcher-status'] });
        break;

      case 'notification':
        // Handle notifications (could show toast)
        console.log('Notification:', message.data);
        break;

      case 'connected':
      case 'subscribed':
      case 'unsubscribed':
      case 'pong':
        // Ignore internal messages
        break;

      default:
        console.log('Unhandled WebSocket message:', message.type);
    }
  }, [queryClient]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  // Send message
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Subscribe to a room
  const subscribe = useCallback((room: string) => {
    return send({ type: 'subscribe', room, data: {} });
  }, [send]);

  // Unsubscribe from a room
  const unsubscribe = useCallback((room: string) => {
    return send({ type: 'unsubscribe', room, data: {} });
  }, [send]);

  // Connect on mount
  useEffect(() => {
    if (enabled && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, user, connect, disconnect]);

  // Ping to keep connection alive
  useEffect(() => {
    if (status !== 'connected') return;

    const pingInterval = setInterval(() => {
      send({ type: 'ping', data: {} });
    }, 25000);

    return () => clearInterval(pingInterval);
  }, [status, send]);

  return {
    status,
    isConnected: status === 'connected',
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook for subscribing to specific call updates
 */
export function useCallSubscription(callId: string | undefined) {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (!callId || !isConnected) return;

    subscribe(`call:${callId}`);

    return () => {
      unsubscribe(`call:${callId}`);
    };
  }, [callId, isConnected, subscribe, unsubscribe]);
}

/**
 * Hook for real-time connection status indicator
 */
export function useConnectionStatus() {
  const { status, isConnected } = useWebSocket();
  
  return {
    status,
    isConnected,
    statusColor: isConnected ? 'green' : status === 'connecting' ? 'yellow' : 'red',
    statusText: isConnected ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected',
  };
}

export default useWebSocket;
