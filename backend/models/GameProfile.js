const mongoose = require('mongoose');

const gameProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalXp: { type: Number, default: 0, min: 0 },
  wins: { type: Number, default: 0, min: 0 },
  losses: { type: Number, default: 0, min: 0 },
  currentWinStreak: { type: Number, default: 0, min: 0 },
  bestWinStreak: { type: Number, default: 0, min: 0 },
  rating: { type: Number, default: 1000, min: 0 },
  highestRating: { type: Number, default: 1000, min: 0 },

  // Dedicated AI stats
  aiStats: {
    easy: {
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 }
    },
    medium: {
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 }
    },
    hard: {
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 }
    }
  },

  // Daily AI XP tracking for anti-farming cap
  lastAiXpDate: { type: String, default: null },
  dailyAiXpEarned: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

const GameProfile = mongoose.model('GameProfile', gameProfileSchema);

module.exports = GameProfile;
