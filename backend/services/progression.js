const XP_PER_MATCH = 20;
const MIN_GUESSES_PER_PLAYER = 3;

const XP_ELIGIBILITY_REASONS = Object.freeze({
  ELIGIBLE: 'eligible',
  MIN_GUESSES_NOT_MET: 'minimum_guesses_not_met'
});

function assertNonNegativeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer.`);
  }
}

/**
 * Level 0 requires 50 XP, level 1 requires another 100 XP, and every
 * following level requires 50 XP more than the previous one.
 *
 * Only totalXp is persisted. Everything else in this return value is derived.
 */
function calculateLevelProgress(totalXp) {
  assertNonNegativeInteger(totalXp, 'totalXp');

  // XP at the start of level L is 25 * L * (L + 1).
  let level = Math.floor((Math.sqrt(1 + ((4 * totalXp) / 25)) - 1) / 2);

  // Guard exact level boundaries against floating-point rounding.
  while (level > 0 && (25 * level * (level + 1)) > totalXp) {
    level -= 1;
  }
  while ((25 * (level + 1) * (level + 2)) <= totalXp) {
    level += 1;
  }

  const xpAtLevelStart = 25 * level * (level + 1);
  const currentXp = totalXp - xpAtLevelStart;
  const xpForNextLevel = 50 * (level + 1);

  return {
    level,
    currentXp,
    xpForNextLevel
  };
}

function calculatePvpRewards({
  guessCounts,
  endReason,
  forfeitedPlayerIndex = null
}) {
  if (!Array.isArray(guessCounts) || guessCounts.length !== 2) {
    throw new TypeError('guessCounts must contain exactly two player counts.');
  }

  guessCounts.forEach((guessCount, playerIndex) => {
    assertNonNegativeInteger(guessCount, `guessCounts[${playerIndex}]`);
  });

  if (typeof endReason !== 'string' || endReason.trim().length === 0) {
    throw new TypeError('endReason must be a non-empty string.');
  }
  const normalizedEndReason = endReason.trim();

  if (
    forfeitedPlayerIndex !== null
    && forfeitedPlayerIndex !== 0
    && forfeitedPlayerIndex !== 1
  ) {
    throw new RangeError('forfeitedPlayerIndex must be 0, 1, or null.');
  }

  if (
    forfeitedPlayerIndex === null
    && normalizedEndReason !== 'correct_guess'
  ) {
    throw new TypeError(
      'A completed match must use correct_guess with no forfeited player.'
    );
  }

  if (
    forfeitedPlayerIndex !== null
    && !['intentional_leave', 'disconnect_timeout'].includes(normalizedEndReason)
  ) {
    throw new TypeError(
      'A forfeit must use intentional_leave or disconnect_timeout with a forfeited player.'
    );
  }

  const xpEligible = guessCounts.every(
    guessCount => guessCount >= MIN_GUESSES_PER_PLAYER
  );
  const xpEligibilityReason = xpEligible
    ? XP_ELIGIBILITY_REASONS.ELIGIBLE
    : XP_ELIGIBILITY_REASONS.MIN_GUESSES_NOT_MET;

  if (!xpEligible) {
    return {
      xpEligible,
      xpEligibilityReason,
      xpRewards: [0, 0]
    };
  }

  if (forfeitedPlayerIndex === null) {
    return {
      xpEligible,
      xpEligibilityReason,
      xpRewards: [XP_PER_MATCH, XP_PER_MATCH]
    };
  }

  const xpRewards = [XP_PER_MATCH, XP_PER_MATCH];
  xpRewards[forfeitedPlayerIndex] = 0;

  return {
    xpEligible,
    xpEligibilityReason,
    xpRewards
  };
}

module.exports = {
  XP_PER_MATCH,
  MIN_GUESSES_PER_PLAYER,
  XP_ELIGIBILITY_REASONS,
  calculateLevelProgress,
  calculatePvpRewards
};
