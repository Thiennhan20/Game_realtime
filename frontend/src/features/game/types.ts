export type Locale = 'en' | 'vi';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RoomState =
  | 'WAITING_FOR_PLAYERS'
  | 'SETTING_SECRET'
  | 'RPS_DECISION'
  | 'PLAYING'
  | 'FINISHED';

export interface EquippedTitle {
  id: string;
  category?: string;
  rarity: AchievementRarity;
  icon: string;
  titleVi: string;
  titleEn: string;
}

export interface UnlockedAchievementNotice {
  id: string;
  category: string;
  rarity: AchievementRarity;
  icon: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
}

export interface AuthUser {
  id: string;
  userId?: string;
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
  currentWinStreak?: number;
  equippedTitle?: EquippedTitle | null;
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
  equippedTitleId?: string | null;
  equippedTitle?: EquippedTitle | null;
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
  newlyUnlockedAchievements?: UnlockedAchievementNotice[];
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
  newlyUnlockedByUser?: Record<string, UnlockedAchievementNotice[]>;
}

export interface Room {
  roomId: string;
  players: Player[];
  spectators?: Array<{ userId: string; username: string; avatar?: string }>;
  state: RoomState;
  guesses: Guess[];
  rpsWinnerIndex: number;
  activeTurnIndex: number;
  winnerIndex: number;
  isAiRoom?: boolean;
  isQuickMatch?: boolean;
  aiDifficulty?: AiDifficulty;
  spectatorCount?: number;
}

export interface LobbyRoom {
  roomId: string;
  hostId?: string | null;
  hostName: string;
  hostAvatar?: string;
  hostEquippedTitle?: EquippedTitle | null;
  playerCount: number;
  maxPlayers?: number;
  state?: string;
  createdAt?: number;
  spectatorCount?: number;
}

export interface RecentFormMatch {
  matchId: string;
  isAiRoom: boolean;
  status: string;
  result: 'win' | 'loss' | 'abandoned';
  opponentName: string;
  opponentAvatar?: string;
  ratingDelta: number;
  guessCount: number;
  finishedAt: string;
}

export interface PublicGameProfile {
  user: {
    userId: string;
    name: string;
    avatar: string;
    createdAt?: string;
  };
  stats: GameProfile & {
    totalPvpMatches: number;
    pvpWinRate: number;
    aiStats: {
      easy: { wins: number; losses: number };
      medium: { wins: number; losses: number };
      hard: { wins: number; losses: number };
      totalAiWins: number;
      totalAiLosses: number;
      totalAiMatches: number;
      aiWinRate: number;
    };
    unlockedAchievementsCount: number;
    totalAchievementsCount: number;
    recentForm: RecentFormMatch[];
  };
}

export interface ChatMessage {
  username: string;
  content: string;
  timestamp: string;
  isSpectator?: boolean;
  type?: 'text' | 'reaction';
  emoji?: string;
}

export type QuickEmote =
  | '😎'
  | '🔥'
  | '😱'
  | '🤔'
  | '💀'
  | '👏'
  | '😂'
  | '🥳'
  | '🤫'
  | '🥶'
  | '🧠'
  | '🎯'
  | '💣'
  | '🤡'
  | '🤝'
  | '💔';

export interface FloatingEmote {
  id: string;
  userId: string;
  username: string;
  emoji: QuickEmote | string;
  timestamp: number;
  isSpectator?: boolean;
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
  equippedTitle?: EquippedTitle | null;
}

export interface RpsClashInfo {
  winnerIndex: number;
  p1Choice: string;
  p2Choice: string;
}

