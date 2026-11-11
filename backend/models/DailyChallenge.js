const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true // 'YYYY-MM-DD' in Vietnam Time (UTC+7)
  },
  secret: {
    type: String,
    required: true
  },
  totalParticipants: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSolved: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

const DailyChallenge = mongoose.models.DailyChallenge || mongoose.model('DailyChallenge', dailyChallengeSchema);

module.exports = DailyChallenge;

