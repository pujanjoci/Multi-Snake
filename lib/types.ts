export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export type PowerUpType = 'SPEED' | 'GHOST' | 'MAGNET' | 'GOLDEN' | 'SHRINK';

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  type: 'REGULAR' | PowerUpType;
  value: number;
  expiresAt?: number;
}

export interface PlayerSkin {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: 'solid' | 'stripes' | 'dots' | 'scales';
}

export interface SnakePlayer {
  id: string;
  name: string;
  color: string;
  skin: PlayerSkin;
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  score: number;
  kills: number;
  isAlive: boolean;
  isBot: boolean;
  isHost: boolean;
  isBoosting: boolean;
  boostFuel: number; // 0 - 100
  activePowerUp: {
    type: PowerUpType;
    duration: number; // remaining ticks/ms
  } | null;
  emote?: {
    symbol: string;
    expiresAt: number;
  };
  deathTime?: number;
}

export interface RoomConfig {
  roomCode: string;
  hostId: string;
  maxPlayers: number;
  gridSize: {
    width: number;
    height: number;
  };
  sessionDuration: number; // in seconds, e.g. 180, 300, 600, 900
  powerUpsEnabled: boolean;
  fillWithBots: boolean;
  botCount: number;
  speed: 'slow' | 'normal' | 'fast';
}

export type GameStatus = 'LOBBY' | 'STARTING' | 'PLAYING' | 'PAUSED' | 'ENDED';

export interface GameState {
  status: GameStatus;
  config: RoomConfig;
  players: Record<string, SnakePlayer>;
  foods: FoodItem[];
  timeRemaining: number; // in seconds
  elapsedTime: number; // in seconds
  winner: SnakePlayer | null;
  killFeed: {
    id: string;
    killerName?: string;
    victimName: string;
    killerColor?: string;
    victimColor: string;
    timestamp: number;
  }[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SessionNotification {
  id: string;
  type: 'info' | 'warning' | 'critical' | 'rush';
  title: string;
  message: string;
  timestamp: number;
  durationMs: number;
}

export const AVAILABLE_SKINS: PlayerSkin[] = [
  {
    id: 'emerald',
    name: 'Emerald Viper',
    primaryColor: '#10b981',
    secondaryColor: '#047857',
    accentColor: '#34d399',
    pattern: 'scales',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Shadow',
    primaryColor: '#64748b',
    secondaryColor: '#334155',
    accentColor: '#94a3b8',
    pattern: 'solid',
  },
  {
    id: 'ruby',
    name: 'Ruby Cobra',
    primaryColor: '#ef4444',
    secondaryColor: '#b91c1c',
    accentColor: '#f87171',
    pattern: 'stripes',
  },
  {
    id: 'sapphire',
    name: 'Sapphire Python',
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    accentColor: '#60a5fa',
    pattern: 'dots',
  },
  {
    id: 'amber',
    name: 'Amber Rattler',
    primaryColor: '#f59e0b',
    secondaryColor: '#b45309',
    accentColor: '#fbbf24',
    pattern: 'scales',
  },
  {
    id: 'amethyst',
    name: 'Amethyst Boa',
    primaryColor: '#a855f7',
    secondaryColor: '#7e22ce',
    accentColor: '#c084fc',
    pattern: 'stripes',
  },
  {
    id: 'coral',
    name: 'Coral Mamba',
    primaryColor: '#f43f5e',
    secondaryColor: '#be123c',
    accentColor: '#fb7185',
    pattern: 'dots',
  },
  {
    id: 'mint',
    name: 'Mint Constrictor',
    primaryColor: '#14b8a6',
    secondaryColor: '#0f766e',
    accentColor: '#2dd4bf',
    pattern: 'scales',
  },
];
