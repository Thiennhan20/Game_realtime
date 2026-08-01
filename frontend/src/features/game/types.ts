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
  socketId: string | null;
  secretNumber: string | null;
  rpsChoice: RpsChoice | null;
  ready: boolean;
  disconnectedAt?: number | null;
  hasLeft?: boolean;
}

export interface Guess {
  playerIndex: number;
  guess: string;
  correctNumbers: number;
  correctPosition: number;
  timestamp: string;
}

export interface GameProfile {
  totalXp: number;
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  wins: number;
  losses: number;
  currentWinStreak: number;
  bestWinStreak: number;
  rating: number;
  highestRating: number;
  rank: string;
  rankEn?: string;
  rankKey?: string;
  ratingToNextRank?: number | null;
}

export interface PlayerXpResult extends GameProfile {
  userId: string;
  xpEarned: number;
  ratingBefore?: number;
  ratingDelta?: number;
  ratingAfter?: number;
  rankBefore?: string;
  rankAfter?: string;
  rankBeforeEn?: string;
  rankAfterEn?: string;
  rankKeyBefore?: string;
  rankKeyAfter?: string;
}

export type PlayerXpSettlement = Pick<
  PlayerXpResult,
  'userId' | 'xpEarned'
> &
  Partial<PlayerXpResult>;

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
  status?: string;
  endReason?: string;
  forfeitReason?: string | null;
  forfeitedPlayerId?: string | null;
  xpEligible?: boolean;
  xpEligibilityReason?: string;
  ratingApplied?: boolean;
  ratingReason?: string;
  xpResults?: PlayerXpSettlement[];
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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  rating: number;
  highestRating: number;
  rankTier: string;
  rankNameVi: string;
  rankNameEn: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
}
