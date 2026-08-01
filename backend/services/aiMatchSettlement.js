const mongoose = require('mongoose');
const GameProfile = require('../models/GameProfile');
const GameHistory = require('../models/GameHistory');
const { calculateLevelProgress } = require('./progression');
const { getRank } = require('./rating');

const AI_XP_REWARDS = Object.freeze({
  easy: 5,
  medium: 10,
  hard: 20
});

const DAILY_AI_XP_CAP = 150;
const BOT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000000');

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Settles an AI (PvE) match for a human user and persists a GameHistory snapshot.
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {'easy'|'medium'|'hard'} params.aiDifficulty
 * @param {boolean} params.isUserWinner
 * @param {Object} [params.room]
 * @param {Object} [deps]
 * @param {Object} [deps.GameProfileModel]
 * @param {Object} [deps.GameHistoryModel]
 */
async function settleAiMatch(
  { userId, aiDifficulty = 'medium', isUserWinner = false, room = null },
  { GameProfileModel = GameProfile, GameHistoryModel = GameHistory } = {}
) {
  if (!userId) {
    throw new TypeError('userId is required for AI match settlement.');
  }

  const difficultyKey = String(aiDifficulty).toLowerCase();
  const baseReward = AI_XP_REWARDS[difficultyKey] ?? AI_XP_REWARDS.medium;

  // 1. Fetch or create GameProfile for user
  let profile = await GameProfileModel.findOne({ userId });
  if (!profile) {
    profile = new GameProfileModel({ userId, totalXp: 0, rating: 1000, highestRating: 1000 });
  }

  // Ensure aiStats sub-object structure exists
  if (!profile.aiStats) profile.aiStats = {};
  if (!profile.aiStats[difficultyKey]) {
    profile.aiStats[difficultyKey] = { wins: 0, losses: 0 };
  }

  const today = getTodayString();
  let currentDailyEarned = profile.lastAiXpDate === today ? (profile.dailyAiXpEarned || 0) : 0;

  // 2. Calculate XP earned
  let xpEarned = 0;
  if (isUserWinner) {
    profile.aiStats[difficultyKey].wins = (profile.aiStats[difficultyKey].wins || 0) + 1;
    
    // Check daily cap
    const remainingCap = Math.max(0, DAILY_AI_XP_CAP - currentDailyEarned);
    xpEarned = Math.min(baseReward, remainingCap);
  } else {
    profile.aiStats[difficultyKey].losses = (profile.aiStats[difficultyKey].losses || 0) + 1;
  }

  const totalXpBefore = profile.totalXp || 0;
  const levelProgressBefore = calculateLevelProgress(totalXpBefore);

  // 3. Update profile
  profile.totalXp = totalXpBefore + xpEarned;
  profile.lastAiXpDate = today;
  profile.dailyAiXpEarned = currentDailyEarned + xpEarned;

  if (typeof profile.markModified === 'function') {
    profile.markModified('aiStats');
  }

  await profile.save();

  const levelProgressAfter = calculateLevelProgress(profile.totalXp);
  const currentRank = getRank(profile.rating);

  // 4. Save AI GameHistory record if room provided
  if (room && typeof GameHistoryModel?.create === 'function') {
    try {
      const matchId = room.matchId || `ai_${room.roomId}_${Date.now()}`;
      const humanPlayer = room.players?.[0] || {};
      const diffLabel = difficultyKey === 'easy' ? 'Dễ' : difficultyKey === 'medium' ? 'Trung Bình' : 'Cực Khó';
      const aiPlayer = room.players?.[1] || { username: `AI Bot (${diffLabel})` };
      
      const humanGuessCount = Array.isArray(room.guesses) ? room.guesses.filter(g => g.playerIndex === 0).length : 0;
      const aiGuessCount = Array.isArray(room.guesses) ? room.guesses.filter(g => g.playerIndex === 1).length : 0;
      const durationMs = room.startedAt && room.finishedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;

      await GameHistoryModel.create([{
        matchId,
        roomId: room.roomId || 'AI_ROOM',
        isAiRoom: true,
        aiDifficulty: difficultyKey,
        players: [
          {
            playerIndex: 0,
            userId,
            username: humanPlayer.username || 'Player',
            avatar: humanPlayer.avatar || '',
            guessCount: humanGuessCount,
            xpEarned,
            totalXpBefore,
            totalXpAfter: profile.totalXp,
            ratingBefore: profile.rating,
            ratingDelta: 0,
            ratingAfter: profile.rating,
            rankBefore: currentRank.nameVi,
            rankAfter: currentRank.nameVi
          },
          {
            playerIndex: 1,
            userId: BOT_USER_ID,
            username: aiPlayer.username || `AI Bot (${diffLabel})`,
            avatar: aiPlayer.avatar || '',
            guessCount: aiGuessCount,
            xpEarned: 0,
            ratingBefore: 1000,
            ratingDelta: 0,
            ratingAfter: 1000
          }
        ],
        winnerId: isUserWinner ? userId : null,
        winnerIndex: isUserWinner ? 0 : 1,
        status: 'completed',
        endReason: 'correct_guess',
        xpEligible: true,
        xpEligibilityReason: 'eligible',
        totalGuesses: Array.isArray(room.guesses) ? room.guesses.length : 0,
        winnerGuessCount: isUserWinner ? humanGuessCount : aiGuessCount,
        loserGuessCount: isUserWinner ? aiGuessCount : humanGuessCount,
        rpsWinnerIndex: typeof room.rpsWinnerIndex === 'number' ? room.rpsWinnerIndex : -1,
        duration: Math.max(0, Math.floor(durationMs / 1000)),
        startedAt: room.startedAt ? new Date(room.startedAt) : new Date(),
        finishedAt: room.finishedAt ? new Date(room.finishedAt) : new Date()
      }]);
    } catch (histErr) {
      console.error('[AI Settlement] Failed to save AI GameHistory doc:', histErr.message);
    }
  }

  return {
    userId: String(userId),
    xpEarned,
    totalXp: profile.totalXp,
    level: levelProgressAfter.level,
    currentXp: levelProgressAfter.currentXp,
    xpForNextLevel: levelProgressAfter.xpForNextLevel,
    isLevelUp: levelProgressAfter.level > levelProgressBefore.level,
    ratingBefore: profile.rating,
    ratingDelta: 0,
    ratingAfter: profile.rating,
    rankBefore: currentRank.nameVi,
    rankAfter: currentRank.nameVi,
    rankKey: currentRank.key,
    aiDifficulty: difficultyKey
  };
}

module.exports = {
  AI_XP_REWARDS,
  DAILY_AI_XP_CAP,
  settleAiMatch
};
