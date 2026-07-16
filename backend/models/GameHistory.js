const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    avatar: { type: String, default: '' }
  }],
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winnerIndex: { type: Number, required: true },
  totalGuesses: { type: Number, default: 0 },
  winnerGuessCount: { type: Number, default: 0 },
  loserGuessCount: { type: Number, default: 0 },
  rpsWinnerIndex: { type: Number, default: -1 },
  duration: { type: Number, default: 0 }, // seconds
  finishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

gameHistorySchema.index({ 'players.userId': 1, finishedAt: -1 });
gameHistorySchema.index({ winnerId: 1 });
gameHistorySchema.index({ roomId: 1 });

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);
module.exports = GameHistory;
