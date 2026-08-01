const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  // Sparse keeps legacy history rows readable while making every new
  // settlement idempotent by matchId.
  matchId: { type: String, trim: true },
  roomId: { type: String, required: true },
  players: [{
    playerIndex: { type: Number, min: 0, max: 1 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    avatar: { type: String, default: '' },
    guessCount: { type: Number, default: 0, min: 0 },
    xpEarned: { type: Number, default: 0, min: 0 },
    totalXpBefore: { type: Number, default: 0, min: 0 },
    totalXpAfter: { type: Number, default: 0, min: 0 },
    winsAfter: { type: Number, default: 0, min: 0 },
    lossesAfter: { type: Number, default: 0, min: 0 },
    currentWinStreakAfter: { type: Number, default: 0, min: 0 },
    bestWinStreakAfter: { type: Number, default: 0, min: 0 },
    ratingBefore: { type: Number, default: 1000, min: 0 },
    ratingDelta: { type: Number, default: 0 },
    ratingAfter: { type: Number, default: 1000, min: 0 },
    highestRatingAfter: { type: Number, default: 1000, min: 0 },
    rankBefore: { type: String, default: 'Đồng' },
    rankAfter: { type: String, default: 'Đồng' },
    rankBeforeEn: { type: String, default: 'Bronze' },
    rankAfterEn: { type: String, default: 'Bronze' },
    rankKeyBefore: { type: String, default: 'bronze' },
    rankKeyAfter: { type: String, default: 'bronze' }
  }],
  isAiRoom: { type: Boolean, default: false },
  aiDifficulty: { type: String, default: null },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    required() {
      return (this.status === 'completed' || this.status === 'forfeited') && !this.isAiRoom;
    }
  },
  winnerIndex: {
    type: Number,
    default: null,
    min: 0,
    max: 1,
    required() {
      return this.status === 'completed' || this.status === 'forfeited';
    }
  },
  forfeitedPlayerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  forfeitedPlayerIndex: { type: Number, default: null, min: 0, max: 1 },
  status: {
    type: String,
    enum: ['completed', 'forfeited', 'abandoned', 'cancelled'],
    default: 'completed'
  },
  endReason: { type: String, default: 'correct_guess' },
  xpEligible: { type: Boolean, default: false },
  xpEligibilityReason: {
    type: String,
    enum: [
      'eligible',
      'minimum_guesses_not_met',
      'match_abandoned',
      'match_cancelled'
    ],
    default: 'minimum_guesses_not_met'
  },
  minGuessesPerPlayer: { type: Number, default: 3, min: 0 },
  xpPerMatch: { type: Number, default: 20, min: 0 },
  scoringVersion: { type: String, default: 'pvp-xp-v1' },
  ratingVersion: { type: String, default: 'pvp-rating-v1' },
  ratingApplied: { type: Boolean, default: false },
  ratingReason: {
    type: String,
    enum: [
      'completed',
      'forfeited',
      'early_forfeit_penalty',
      'abandoned',
      'not_applicable'
    ],
    default: 'not_applicable'
  },
  roundNumber: { type: Number, default: 1, min: 1 },
  totalGuesses: { type: Number, default: 0 },
  winnerGuessCount: { type: Number, default: 0 },
  loserGuessCount: { type: Number, default: 0 },
  rpsWinnerIndex: { type: Number, default: -1 },
  duration: { type: Number, default: 0 }, // seconds
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: Date.now },
  settlementStatus: {
    type: String,
    enum: ['processing', 'settled'],
    default: 'settled'
  },
  settledAt: { type: Date, default: null }
}, { timestamps: true });

gameHistorySchema.index({ 'players.userId': 1, finishedAt: -1 });
gameHistorySchema.index({ winnerId: 1 });
gameHistorySchema.index({ roomId: 1 });
gameHistorySchema.index({ matchId: 1 }, { unique: true, sparse: true });

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);
module.exports = GameHistory;
