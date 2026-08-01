const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateUserAchievements } = require('../services/achievements');

test('calculateUserAchievements handles null profile cleanly', () => {
  const result = calculateUserAchievements(null, []);
  assert.equal(result.summary.unlockedCount, 0);
  assert.equal(result.summary.totalCount, 7);
  assert.equal(result.summary.overallPercentage, 0);
});

test('calculateUserAchievements calculates AI and PvP badges correctly', () => {
  const mockProfile = {
    userId: '000000000000000000000001',
    aiStats: {
      easy: { wins: 5 },
      medium: { wins: 10 },
      hard: { wins: 2 }
    },
    wins: 12,
    rating: 1350,
    currentWinStreak: 4
  };

  const mockHistory = [
    {
      winnerId: '000000000000000000000001',
      players: [{ userId: '000000000000000000000001', guessCount: 3 }]
    }
  ];

  const result = calculateUserAchievements(mockProfile, mockHistory);
  
  const easyBadge = result.achievements.find(a => a.id === 'ai_easy_5');
  assert.equal(easyBadge.isUnlocked, true);

  const mediumBadge = result.achievements.find(a => a.id === 'ai_medium_10');
  assert.equal(mediumBadge.isUnlocked, true);

  const hardBadge = result.achievements.find(a => a.id === 'ai_hard_5');
  assert.equal(hardBadge.isUnlocked, false);
  assert.equal(hardBadge.progress, 2);

  const proBadge = result.achievements.find(a => a.id === 'pro_guesser');
  assert.equal(proBadge.isUnlocked, true);

  const streakBadge = result.achievements.find(a => a.id === 'streak_3');
  assert.equal(streakBadge.isUnlocked, true);

  const pvpBadge = result.achievements.find(a => a.id === 'pvp_wins_10');
  assert.equal(pvpBadge.isUnlocked, true);

  const rankBadge = result.achievements.find(a => a.id === 'rank_gold');
  assert.equal(rankBadge.isUnlocked, true);

  assert.equal(result.summary.unlockedCount, 6);
});
