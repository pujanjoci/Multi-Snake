import { GameState, Direction, ChatMessage, RoomConfig, SnakePlayer } from './types';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export type NetworkEvent =
  | { type: 'JOIN_LOBBY'; player: { id: string; name: string; skinId: string } }
  | { type: 'LOBBY_STATE'; players: SnakePlayer[]; config: RoomConfig }
  | { type: 'UPDATE_SKIN'; playerId: string; skinId: string }
  | { type: 'UPDATE_CONFIG'; config: Partial<RoomConfig> }
  | { type: 'START_GAME' }
  | { type: 'GAME_STATE'; state: GameState }
  | { type: 'PLAYER_INPUT'; playerId: string; direction: Direction; isBoosting: boolean }
  | { type: 'PLAYER_EMOTE'; playerId: string; symbol: string }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'SESSION_ALERT'; title: string; message: string; alertType: 'warning' | 'critical' | 'rush' };

export class NetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isHost: boolean = false;
  private myPlayerId: string = '';
  private roomCode: string = '';

  private onEventCallbacks: ((event: NetworkEvent) => void)[] = [];

  constructor(playerId: string) {
    this.myPlayerId = playerId;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('multiplayer_snake_channel');
      this.broadcastChannel.onmessage = (msg) => {
        if (msg.data?.roomCode === this.roomCode && msg.data?.senderId !== this.myPlayerId) {
          this.notifyHandlers(msg.data.event);
        }
      };
    }
  }

  public onEvent(callback: (event: NetworkEvent) => void) {
    this.onEventCallbacks.push(callback);
    return () => {
      this.onEventCallbacks = this.onEventCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyHandlers(event: NetworkEvent) {
    this.onEventCallbacks.forEach(cb => cb(event));
  }

  // Initialize as Host
  public async initHost(roomCode: string): Promise<string> {
    this.isHost = true;
    this.roomCode = roomCode;

    if (typeof window === 'undefined') return roomCode;

    try {
      const { default: PeerClass } = await import('peerjs');
      // Format a clean peer id
      const peerId = `snk-${roomCode.toLowerCase()}`;
      
      this.peer = new PeerClass(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.connections.set(conn.peer, conn);
        });

        conn.on('data', (data) => {
          const event = data as NetworkEvent;
          this.notifyHandlers(event);
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
        });
      });

      return roomCode;
    } catch (err) {
      console.warn('PeerJS host init fallback to local BroadcastChannel:', err);
      return roomCode;
    }
  }

  // Initialize as Client joining a room
  public async joinRoom(roomCode: string, playerName: string, skinId: string): Promise<boolean> {
    this.isHost = false;
    this.roomCode = roomCode;

    if (typeof window === 'undefined') return false;

    // First broadcast locally
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        roomCode,
        senderId: this.myPlayerId,
        event: {
          type: 'JOIN_LOBBY',
          player: { id: this.myPlayerId, name: playerName, skinId },
        },
      });
    }

    try {
      const { default: PeerClass } = await import('peerjs');
      this.peer = new PeerClass({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      return new Promise((resolve) => {
        if (!this.peer) return resolve(true);

        this.peer.on('open', () => {
          const targetHostId = `snk-${roomCode.toLowerCase()}`;
          const conn = this.peer!.connect(targetHostId, { reliable: true });

          conn.on('open', () => {
            this.hostConnection = conn;
            conn.send({
              type: 'JOIN_LOBBY',
              player: { id: this.myPlayerId, name: playerName, skinId },
            });
            resolve(true);
          });

          conn.on('data', (data) => {
            const event = data as NetworkEvent;
            this.notifyHandlers(event);
          });

          conn.on('error', () => {
            // If PeerJS fails, broadcast fallback will still work for local tabs
            resolve(true);
          });

          setTimeout(() => resolve(true), 3000);
        });

        this.peer.on('error', () => {
          resolve(true);
        });
      });
    } catch {
      return true;
    }
  }

  // Broadcast event to everyone
  public broadcast(event: NetworkEvent) {
    // 1. Send via BroadcastChannel for local tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        roomCode: this.roomCode,
        senderId: this.myPlayerId,
        event,
      });
    }

    // 2. If Host, broadcast to all connected WebRTC peers
    if (this.isHost) {
      this.connections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(event);
          } catch {
            // Ignore send error
          }
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      // 3. If Client, send to Host
      try {
        this.hostConnection.send(event);
      } catch {
        // Ignore send error
      }
    }
  }

  public sendToHost(event: NetworkEvent) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        roomCode: this.roomCode,
        senderId: this.myPlayerId,
        event,
      });
    }

    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(event);
      } catch {
        // Ignore error
      }
    }
  }

  public cleanup() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.hostConnection = null;
    this.onEventCallbacks = [];
  }
}
