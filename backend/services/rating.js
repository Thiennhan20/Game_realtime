const K_FACTOR = 32;
const DEFAULT_RATING = 1000;

const RANK_TIERS = [
  { key: 'bronze', nameVi: 'Đồng', nameEn: 'Bronze', minRating: 0, maxRating: 1099 },
  { key: 'silver', nameVi: 'Bạc', nameEn: 'Silver', minRating: 1100, maxRating: 1299 },
  { key: 'gold', nameVi: 'Vàng', nameEn: 'Gold', minRating: 1300, maxRating: 1499 },
  { key: 'platinum', nameVi: 'Bạch Kim', nameEn: 'Platinum', minRating: 1500, maxRating: 1699 },
  { key: 'diamond', nameVi: 'Kim Cương', nameEn: 'Diamond', minRating: 1700, maxRating: 1899 },
  { key: 'master', nameVi: 'Cao Thủ', nameEn: 'Master', minRating: 1900, maxRating: Infinity }
];

function getRank(rating) {
  const safeRating = Math.max(0, Math.floor(typeof rating === 'number' ? rating : DEFAULT_RATING));
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (safeRating >= RANK_TIERS[i].minRating) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

function getRatingToNextRank(rating) {
  const safeRating = Math.max(0, Math.floor(typeof rating === 'number' ? rating : DEFAULT_RATING));
  const currentRank = getRank(safeRating);
  const currentIndex = RANK_TIERS.findIndex(t => t.key === currentRank.key);
  
  if (currentIndex === -1 || currentIndex === RANK_TIERS.length - 1) {
    return null; // Top rank reached
  }

  const nextTier = RANK_TIERS[currentIndex + 1];
  return Math.max(0, nextTier.minRating - safeRating);
}

/**
 * Calculates raw Elo delta for player A against player B.
 * resultA: 1 for win, 0 for loss.
 */
function calculateEloDelta(ratingA, ratingB, resultA) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  let delta = Math.round(K_FACTOR * (resultA - expectedA));

  // In a decisive match with a clear win/loss, delta must be at least 1 point
  if (resultA === 1 && delta <= 0) {
    delta = 1;
  } else if (resultA === 0 && delta >= 0) {
    delta = -1;
  }

  return delta;
}

/**
 * Computes rating adjustments for a PvP match settlement between two players.
 */
function calculatePvpRating({
  playerProfiles,
  status = 'completed',
  endReason = 'correct_guess',
  winnerIndex = null,
  forfeitedPlayerIndex = null,
  guessCounts = [0, 0],
  isAiRoom = false
}) {
  const p0Before = Math.max(0, Math.floor(playerProfiles?.[0]?.rating ?? DEFAULT_RATING));
  const p1Before = Math.max(0, Math.floor(playerProfiles?.[1]?.rating ?? DEFAULT_RATING));
  
  const p0HighestBefore = Math.max(p0Before, Math.floor(playerProfiles?.[0]?.highestRating ?? DEFAULT_RATING));
  const p1HighestBefore = Math.max(p1Before, Math.floor(playerProfiles?.[1]?.highestRating ?? DEFAULT_RATING));

  const p0RankBefore = getRank(p0Before);
  const p1RankBefore = getRank(p1Before);

  // Default output for non-applicable rating cases
  const buildNotApplicableResult = (reason = 'not_applicable') => ({
    ratingApplied: false,
    ratingReason: reason,
    playerRatings: [
      {
        ratingBefore: p0Before,
        ratingDelta: 0,
        ratingAfter: p0Before,
        highestRatingAfter: p0HighestBefore,
        rankBefore: p0RankBefore.nameVi,
        rankAfter: p0RankBefore.nameVi
      },
      {
        ratingBefore: p1Before,
        ratingDelta: 0,
        ratingAfter: p1Before,
        highestRatingAfter: p1HighestBefore,
        rankBefore: p1RankBefore.nameVi,
        rankAfter: p1RankBefore.nameVi
      }
    ]
  });

  if (isAiRoom || status === 'abandoned' || status === 'cancelled') {
    return buildNotApplicableResult(status === 'abandoned' || status === 'cancelled' ? 'abandoned' : 'not_applicable');
  }

  if (winnerIndex !== 0 && winnerIndex !== 1) {
    return buildNotApplicableResult('not_applicable');
  }

  const bothHaveThreeGuesses = (guessCounts[0] >= 3) && (guessCounts[1] >= 3);

  let p0RawDelta = 0;
  let p1RawDelta = 0;
  let ratingReason = 'completed';

  if (status === 'completed' || endReason === 'correct_guess') {
    ratingReason = 'completed';
    if (winnerIndex === 0) {
      p0RawDelta = calculateEloDelta(p0Before, p1Before, 1);
      p1RawDelta = calculateEloDelta(p1Before, p0Before, 0);
    } else {
      p0RawDelta = calculateEloDelta(p0Before, p1Before, 0);
      p1RawDelta = calculateEloDelta(p1Before, p0Before, 1);
    }
  } else if (status === 'forfeited' || forfeitedPlayerIndex !== null) {
    if (bothHaveThreeGuesses) {
      ratingReason = 'forfeited';
      if (winnerIndex === 0) {
        p0RawDelta = calculateEloDelta(p0Before, p1Before, 1);
        p1RawDelta = calculateEloDelta(p1Before, p0Before, 0);
      } else {
        p0RawDelta = calculateEloDelta(p0Before, p1Before, 0);
        p1RawDelta = calculateEloDelta(p1Before, p0Before, 1);
      }
    } else {
      ratingReason = 'early_forfeit_penalty';
      // Quitter is penalized (-Rating), remaining player gets +0 Rating
      const quitterIndex = forfeitedPlayerIndex !== null ? forfeitedPlayerIndex : (winnerIndex === 0 ? 1 : 0);
      if (quitterIndex === 0) {
        p0RawDelta = calculateEloDelta(p0Before, p1Before, 0);
        p1RawDelta = 0;
      } else {
        p0RawDelta = 0;
        p1RawDelta = calculateEloDelta(p1Before, p0Before, 0);
      }
    }
  }

  // Calculate ratingAfter with floor of 0 and actual delta
  const p0After = Math.max(0, p0Before + p0RawDelta);
  const p1After = Math.max(0, p1Before + p1RawDelta);

  const p0ActualDelta = p0After - p0Before;
  const p1ActualDelta = p1After - p1Before;

  const p0HighestAfter = Math.max(p0HighestBefore, p0After);
  const p1HighestAfter = Math.max(p1HighestBefore, p1After);

  const p0RankAfter = getRank(p0After);
  const p1RankAfter = getRank(p1After);

  return {
    ratingApplied: true,
    ratingReason,
    playerRatings: [
      {
        ratingBefore: p0Before,
        ratingDelta: p0ActualDelta,
        ratingAfter: p0After,
        highestRatingAfter: p0HighestAfter,
        rankBefore: p0RankBefore.nameVi,
        rankAfter: p0RankAfter.nameVi,
        rankBeforeEn: p0RankBefore.nameEn,
        rankAfterEn: p0RankAfter.nameEn,
        rankKeyBefore: p0RankBefore.key,
        rankKeyAfter: p0RankAfter.key
      },
      {
        ratingBefore: p1Before,
        ratingDelta: p1ActualDelta,
        ratingAfter: p1After,
        highestRatingAfter: p1HighestAfter,
        rankBefore: p1RankBefore.nameVi,
        rankAfter: p1RankAfter.nameVi,
        rankBeforeEn: p1RankBefore.nameEn,
        rankAfterEn: p1RankAfter.nameEn,
        rankKeyBefore: p1RankBefore.key,
        rankKeyAfter: p1RankAfter.key
      }
    ]
  };
}

module.exports = {
  DEFAULT_RATING,
  RANK_TIERS,
  getRank,
  getRatingToNextRank,
  calculateEloDelta,
  calculatePvpRating
};
