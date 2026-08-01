const test = require('node:test');
const assert = require('node:assert/strict');
const {
  XP_PER_MATCH,
  MIN_GUESSES_PER_PLAYER,
  calculateLevelProgress,
  calculatePvpRewards
} = require('../services/progression');

test('XP constants match the PvP v1 rules', () => {
  assert.equal(XP_PER_MATCH, 20);
  assert.equal(MIN_GUESSES_PER_PLAYER, 3);
});

test('level 0 starts at 0/50 XP', () => {
  assert.deepEqual(calculateLevelProgress(0), {
    level: 0,
    currentXp: 0,
    xpForNextLevel: 50
  });
});

test('level requirements grow by 50 XP and carry overflow forward', () => {
  assert.deepEqual(calculateLevelProgress(49), {
    level: 0,
    currentXp: 49,
    xpForNextLevel: 50
  });
  assert.deepEqual(calculateLevelProgress(50), {
    level: 1,
    currentXp: 0,
    xpForNextLevel: 100
  });
  assert.deepEqual(calculateLevelProgress(60), {
    level: 1,
    currentXp: 10,
    xpForNextLevel: 100
  });
  assert.deepEqual(calculateLevelProgress(150), {
    level: 2,
    currentXp: 0,
    xpForNextLevel: 150
  });
  assert.deepEqual(calculateLevelProgress(1000), {
    level: 5,
    currentXp: 250,
    xpForNextLevel: 300
  });
});

test('level calculation rejects invalid XP values', () => {
  assert.throws(() => calculateLevelProgress(-1), RangeError);
  assert.throws(() => calculateLevelProgress(1.5), RangeError);
  assert.throws(() => calculateLevelProgress(Number.MAX_SAFE_INTEGER + 1), RangeError);
});

test('completed eligible match awards both players 20 XP', () => {
  assert.deepEqual(calculatePvpRewards({
    guessCounts: [3, 3],
    endReason: 'correct_guess'
  }), {
    xpEligible: true,
    xpEligibilityReason: 'eligible',
    xpRewards: [20, 20]
  });
});

test('3-2 match is not eligible and has no special exception', () => {
  assert.deepEqual(calculatePvpRewards({
    guessCounts: [3, 2],
    endReason: 'correct_guess'
  }), {
    xpEligible: false,
    xpEligibilityReason: 'minimum_guesses_not_met',
    xpRewards: [0, 0]
  });
});

test('any completed match below the minimum awards neither player XP', () => {
  assert.deepEqual(calculatePvpRewards({
    guessCounts: [2, 2],
    endReason: 'correct_guess'
  }), {
    xpEligible: false,
    xpEligibilityReason: 'minimum_guesses_not_met',
    xpRewards: [0, 0]
  });
});

test('eligible forfeit awards only the player who stayed', () => {
  assert.deepEqual(calculatePvpRewards({
    guessCounts: [4, 3],
    endReason: 'intentional_leave',
    forfeitedPlayerIndex: 0
  }), {
    xpEligible: true,
    xpEligibilityReason: 'eligible',
    xpRewards: [0, 20]
  });

  assert.deepEqual(calculatePvpRewards({
    guessCounts: [3, 5],
    endReason: 'disconnect_timeout',
    forfeitedPlayerIndex: 1
  }), {
    xpEligible: true,
    xpEligibilityReason: 'eligible',
    xpRewards: [20, 0]
  });
});

test('ineligible forfeit awards neither player XP', () => {
  assert.deepEqual(calculatePvpRewards({
    guessCounts: [3, 2],
    endReason: 'intentional_leave',
    forfeitedPlayerIndex: 1
  }), {
    xpEligible: false,
    xpEligibilityReason: 'minimum_guesses_not_met',
    xpRewards: [0, 0]
  });
});

test('reward calculation validates its input', () => {
  assert.throws(() => calculatePvpRewards({
    guessCounts: [3],
    endReason: 'correct_guess'
  }), TypeError);

  assert.throws(() => calculatePvpRewards({
    guessCounts: [3, -1],
    endReason: 'correct_guess'
  }), RangeError);

  assert.throws(() => calculatePvpRewards({
    guessCounts: [3, 3],
    endReason: 'intentional_leave',
    forfeitedPlayerIndex: 2
  }), RangeError);

  assert.throws(() => calculatePvpRewards({
    guessCounts: [3, 3],
    endReason: 'intentional_leave'
  }), TypeError);

  assert.throws(() => calculatePvpRewards({
    guessCounts: [3, 3],
    endReason: 'correct_guess',
    forfeitedPlayerIndex: 0
  }), TypeError);

  assert.throws(() => calculatePvpRewards({
    guessCounts: [3, 3],
    endReason: 'cancelled'
  }), TypeError);
});
