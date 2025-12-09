/**
 * WebSocket Server
 * 
 * Real-time updates for calls, queue status, and notifications.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';

interface Client {
  ws: WebSocket;
  userId?: string;
  memberId?: string;
  rooms: Set<string>;
  isAlive: boolean;
}

interface BroadcastMessage {
  type: string;
  data: any;
  room?: string;
}

class RealtimeServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat to detect disconnected clients
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 30000);

    console.log('🔌 WebSocket server initialized');
  }

  /**
   * Handle new connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const client: Client = {
      ws,
      rooms: new Set(['global']),
      isAlive: true,
    };

    this.clients.set(ws, client);

    // Parse session from cookie if available
    // In production, validate session token
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) {
      // TODO: Validate token and set userId/memberId
      // For now, just acknowledge
    }

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      data: { message: 'Connected to real-time server' },
    });

    // Handle messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Handle pong for heartbeat
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle close
    ws.on('close', () => {
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: WebSocket, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(ws);

      if (!client) return;

      switch (message.type) {
        case 'subscribe':
          // Subscribe to a room
          if (message.room) {
            client.rooms.add(message.room);
            this.send(ws, {
              type: 'subscribed',
              data: { room: message.room },
            });
          }
          break;

        case 'unsubscribe':
          // Unsubscribe from a room
          if (message.room) {
            client.rooms.delete(message.room);
            this.send(ws, {
              type: 'unsubscribed',
              data: { room: message.room },
            });
          }
          break;

        case 'ping':
          this.send(ws, { type: 'pong', data: {} });
          break;

        case 'auth':
          // Authenticate connection
          if (message.userId) {
            client.userId = message.userId;
            client.memberId = message.memberId;
            client.rooms.add(`user:${message.userId}`);
            if (message.memberId) {
              client.rooms.add(`member:${message.memberId}`);
            }
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send message to a specific client
   */
  private send(ws: WebSocket, message: BroadcastMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  broadcast(message: BroadcastMessage) {
    const room = message.room || 'global';

    this.clients.forEach((client) => {
      if (client.rooms.has(room) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(message: BroadcastMessage) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Send to specific user
   */
  sendToUser(userId: string, message: BroadcastMessage) {
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Heartbeat to detect disconnected clients
   */
  private heartbeat() {
    this.clients.forEach((client, ws) => {
      if (!client.isAlive) {
        ws.terminate();
        this.clients.delete(ws);
        return;
      }

      client.isAlive = false;
      ws.ping();
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Shutdown
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((_, ws) => {
      ws.close();
    });

    this.wss?.close();
  }
}

// Singleton instance
export const realtimeServer = new RealtimeServer();

// Event types for type safety
export const RealtimeEvents = {
  // Call events
  CALL_CREATED: 'call:created',
  CALL_UPDATED: 'call:updated',
  CALL_CLOSED: 'call:closed',
  CALL_REOPENED: 'call:reopened',
  CALL_ASSIGNED: 'call:assigned',
  CALL_UNASSIGNED: 'call:unassigned',
  CALL_BROADCAST: 'call:broadcast',

  // Queue events
  QUEUE_LOGIN: 'queue:login',
  QUEUE_LOGOUT: 'queue:logout',
  QUEUE_UPDATED: 'queue:updated',

  // System events
  NOTIFICATION: 'notification',
  ALERT: 'alert',
} as const;

/**
 * Helper functions for common broadcasts
 */
export function broadcastCallCreated(call: any) {
  realtimeServer.broadcastAll({
    type: RealtimeEvents.CALL_CREATED,
    data: call,
  });
}

export function broadcastCallUpdated(call: any) {
  realtimeServer.broadcastAll({
    type: RealtimeEvents.CALL_UPDATED,
    data: call,
  });
}

export function broadcastCallClosed(callId: string) {
  realtimeServer.broadcastAll({
    type: RealtimeEvents.CALL_CLOSED,
    data: { callId },
  });
}

export function broadcastQueueUpdate(queueData: any) {
  realtimeServer.broadcastAll({
    type: RealtimeEvents.QUEUE_UPDATED,
    data: queueData,
  });
}

export function sendNotification(userId: string, notification: any) {
  realtimeServer.sendToUser(userId, {
    type: RealtimeEvents.NOTIFICATION,
    data: notification,
  });
}
