const mongoose = require('mongoose');
require('./User');

const dailySubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    required: true,
    index: true // 'YYYY-MM-DD' in Vietnam Time (UTC+7)
  },
  guesses: [
    {
      guess: { type: String, required: true },
      correctNumbers: { type: Number, required: true },
      correctPosition: { type: Number, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  guessCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxGuesses: {
    type: Number,
    default: 8
  },
  isSolved: {
    type: Boolean,
    default: false
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  durationSeconds: {
    type: Number,
    default: 0,
    min: 0
  },
  xpAwarded: {
    type: Number,
    default: 0,
    min: 0
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

dailySubmissionSchema.index({ date: 1, isSolved: 1, guessCount: 1, durationSeconds: 1 });
dailySubmissionSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailySubmission = mongoose.models.DailySubmission || mongoose.model('DailySubmission', dailySubmissionSchema);

module.exports = DailySubmission;

