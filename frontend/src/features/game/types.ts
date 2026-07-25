export type Locale = 'en' | 'vi';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type RoomState =
  | 'WAITING_FOR_PLAYERS'
  | 'SETTING_SECRET'
  | 'RPS_DECISION'
  | 'PLAYING'
  | 'FINISHED';

export interface AuthUser {
  id: string;
  name: string;
  avatar: string;
}

export interface Player {
  userId: string;
  username: string;
  avatar: string;
  socketId: string;
  secretNumber: string | null;
  rpsChoice: RpsChoice | null;
  ready: boolean;
  disconnectedAt?: number | null;
}

export interface Guess {
  playerIndex: number;
  guess: string;
  correctNumbers: number;
  correctPosition: number;
  timestamp: string;
}

export interface MatchStats {
  duration: number;
  totalGuesses: number;
  winnerGuessCount: number;
  loserGuessCount: number;
  rpsWinnerIndex: number;
  winnerSecret: string;
  loserSecret: string;
  startedAt: string;
  finishedAt: string;
}

export interface Room {
  roomId: string;
  players: Player[];
  state: RoomState;
  guesses: Guess[];
  rpsWinnerIndex: number;
  activeTurnIndex: number;
  winnerIndex: number;
  isAiRoom?: boolean;
  aiDifficulty?: AiDifficulty;
}

export interface LobbyRoom {
  roomId: string;
  hostName: string;
  hostAvatar?: string;
  playerCount: number;
  maxPlayers?: number;
  state?: string;
  createdAt?: number;
}

export interface ChatMessage {
  username: string;
  content: string;
  timestamp: string;
}
