const test = require('node:test');
const assert = require('node:assert/strict');

const { AI_XP_REWARDS, settleAiMatch } = require('../services/aiMatchSettlement');

function createInMemoryProfileModel() {
  const store = new Map();

  class FakeProfile {
    constructor(data) {
      Object.assign(this, data);
    }

    async save() {
      store.set(String(this.userId), this);
      return this;
    }
  }

  return {
    async findOne({ userId }) {
      return store.get(String(userId)) || null;
    },
    FakeProfile
  };
}

test('AI XP reward rules check', () => {
  assert.equal(AI_XP_REWARDS.easy, 5);
  assert.equal(AI_XP_REWARDS.medium, 10);
  assert.equal(AI_XP_REWARDS.hard, 20);
});

test('settleAiMatch rewards correct XP on Win and 0 on Loss', async () => {
  const fakeUserId = '000000000000000000000099';
  const { findOne, FakeProfile } = createInMemoryProfileModel();

  const fakeModel = {
    findOne,
    // When new FakeModel(...) is instantiated
    ...function(data) { return new FakeProfile(data); }
  };
  // Ensure constructable
  function ModelConstructor(data) {
    return new FakeProfile(data);
  }
  ModelConstructor.findOne = findOne;

  // 1. Easy Win -> +5 XP
  const winEasy = await settleAiMatch(
    { userId: fakeUserId, aiDifficulty: 'easy', isUserWinner: true },
    { GameProfileModel: ModelConstructor }
  );
  assert.equal(winEasy.xpEarned, 5);
  assert.equal(winEasy.totalXp, 5);
  assert.equal(winEasy.ratingDelta, 0);

  // 2. Medium Win -> +10 XP
  const winMedium = await settleAiMatch(
    { userId: fakeUserId, aiDifficulty: 'medium', isUserWinner: true },
    { GameProfileModel: ModelConstructor }
  );
  assert.equal(winMedium.xpEarned, 10);
  assert.equal(winMedium.totalXp, 15);
  assert.equal(winMedium.ratingDelta, 0);

  // 3. Hard Win -> +20 XP
  const winHard = await settleAiMatch(
    { userId: fakeUserId, aiDifficulty: 'hard', isUserWinner: true },
    { GameProfileModel: ModelConstructor }
  );
  assert.equal(winHard.xpEarned, 20);
  assert.equal(winHard.totalXp, 35);
  assert.equal(winHard.ratingDelta, 0);

  // 4. Loss -> 0 XP
  const lossMedium = await settleAiMatch(
    { userId: fakeUserId, aiDifficulty: 'medium', isUserWinner: false },
    { GameProfileModel: ModelConstructor }
  );
  assert.equal(lossMedium.xpEarned, 0);
  assert.equal(lossMedium.totalXp, 35);
  assert.equal(lossMedium.ratingDelta, 0);
});
