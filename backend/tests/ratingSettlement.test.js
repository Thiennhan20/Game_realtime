const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateEloDelta,
  calculatePvpRating,
  getRank,
  getRatingToNextRank,
  DEFAULT_RATING
} = require('../services/rating');
const {
  createMatchSettlementService
} = require('../services/matchSettlement');

const PLAYER_ONE_ID = '000000000000000000000001';
const PLAYER_TWO_ID = '000000000000000000000002';

function cloneValue(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (typeof value !== 'object') return value;
  if (typeof value.toHexString === 'function') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, nestedValue]) => [key, cloneValue(nestedValue)])
  );
}

function createFakeDependencies({ initialProfiles = {} } = {}) {
  const histories = new Map();
  const profiles = new Map();

  const profileDefaults = {
    totalXp: 0,
    wins: 0,
    losses: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    rating: DEFAULT_RATING,
    highestRating: DEFAULT_RATING
  };

  Object.entries(initialProfiles).forEach(([userId, profile]) => {
    profiles.set(userId, {
      userId,
      ...profileDefaults,
      ...cloneValue(profile)
    });
  });

  class FakeHistoryDocument {
    constructor(value) {
      Object.assign(this, cloneValue(value));
    }

    async save() {
      histories.set(this.matchId, this.toObject());
      return this;
    }

    toObject() {
      return cloneValue(this);
    }
  }

  const FakeHistoryModel = {
    async findOne(query) {
      const matchId = query?.matchId;
      const history = matchId ? histories.get(matchId) : null;
      if (!history) return null;
      if (query?.settlementStatus && history.settlementStatus !== query.settlementStatus) {
        return null;
      }
      return {
        ...cloneValue(history),
        lean() {
          return cloneValue(history);
        },
        session() {
          return this;
        },
        toObject() {
          return cloneValue(history);
        }
      };
    },

    async create(docs) {
      return docs.map(doc => {
        const historyDoc = new FakeHistoryDocument(doc);
        histories.set(doc.matchId, historyDoc.toObject());
        return historyDoc;
      });
    }
  };

  const FakeGameProfileModel = {
    async findOne(query) {
      const userId = String(query?.userId);
      const profile = profiles.get(userId);
      const result = profile ? cloneValue(profile) : null;
      return {
        ...result,
        lean() {
          return cloneValue(result);
        },
        session() {
          return this;
        }
      };
    },

    async findOneAndUpdate(query, update, options = {}) {
      const userId = String(query?.userId);
      const existing = profiles.get(userId) || (options.upsert ? {
        userId,
        ...profileDefaults
      } : null);

      if (!existing) return null;

      const next = cloneValue(existing);

      if (update.$setOnInsert && !profiles.has(userId)) {
        Object.assign(next, update.$setOnInsert);
      }
      if (update.$inc) {
        Object.entries(update.$inc).forEach(([key, amount]) => {
          next[key] = (next[key] || 0) + amount;
        });
      }
      if (update.$set) {
        Object.assign(next, update.$set);
      }
      if (update.$max) {
        Object.entries(update.$max).forEach(([key, maxVal]) => {
          next[key] = Math.max(next[key] || 0, maxVal);
        });
      }

      profiles.set(userId, next);
      return cloneValue(next);
    }
  };

  const mongooseClient = {
    async startSession() {
      return {
        async withTransaction(handler) {
          await handler();
        },
        async endSession() {}
      };
    }
  };

  return {
    mongooseClient,
    GameHistoryModel: FakeHistoryModel,
    GameProfileModel: FakeGameProfileModel,
    profiles,
    histories
  };
}

function buildRoom(overrides = {}) {
  return {
    matchId: 'match-pvp-test-001',
    roomId: 'G-100100',
    roundNumber: 1,
    isAiRoom: false,
    startedAt: new Date(Date.now() - 120000).toISOString(),
    finishedAt: new Date().toISOString(),
    winnerIndex: 0,
    rpsWinnerIndex: 0,
    players: [
      { userId: PLAYER_ONE_ID, username: 'Player1', avatar: '' },
      { userId: PLAYER_TWO_ID, username: 'Player2', avatar: '' }
    ],
    guesses: [
      { playerIndex: 0, guess: '1234' },
      { playerIndex: 0, guess: '5678' },
      { playerIndex: 0, guess: '9012' },
      { playerIndex: 1, guess: '4321' },
      { playerIndex: 1, guess: '8765' },
      { playerIndex: 1, guess: '2109' }
    ],
    ...overrides
  };
}

test('1. Elo formula 1000 vs 1000 yields approximately +16 and -16', () => {
  const winnerDelta = calculateEloDelta(1000, 1000, 1);
  const loserDelta = calculateEloDelta(1000, 1000, 0);

  assert.equal(winnerDelta, 16);
  assert.equal(loserDelta, -16);
});

test('2. Underdog (low rating) beating favorite (high rating) receives more points', () => {
  const underdogWinDelta = calculateEloDelta(1000, 1200, 1);
  const favoriteWinDelta = calculateEloDelta(1200, 1000, 1);

  assert.equal(underdogWinDelta, 24);
  assert.equal(favoriteWinDelta, 8);
  assert.ok(underdogWinDelta > favoriteWinDelta);
});

test('3. Rating floor is capped at 0', () => {
  const outcome = calculatePvpRating({
    playerProfiles: [{ rating: 0 }, { rating: 1500 }],
    status: 'completed',
    winnerIndex: 1, // Player 0 loses
    guessCounts: [3, 3]
  });

  const p0RatingAfter = outcome.playerRatings[0].ratingAfter;
  const p0RatingDelta = outcome.playerRatings[0].ratingDelta;

  assert.equal(p0RatingAfter, 0);
  assert.equal(p0RatingDelta, 0);
});

test('4. highestRating only increases, never decreases on loss', async () => {
  const deps = createFakeDependencies({
    initialProfiles: {
      [PLAYER_ONE_ID]: { rating: 1200, highestRating: 1250 },
      [PLAYER_TWO_ID]: { rating: 1200, highestRating: 1200 }
    }
  });
  const service = createMatchSettlementService(deps);
  const room = buildRoom({ winnerIndex: 1 }); // Player 1 loses

  const result = await service.settlePvpMatch(room, { endReason: 'correct_guess' });
  const p1Result = result.xpResults.find(r => r.userId === PLAYER_ONE_ID);

  assert.ok(p1Result.ratingAfter < 1200);
  assert.equal(p1Result.highestRating, 1250); // Kept highest rating
});

test('5. Correct guess updates Rating even if XP is 0 (< 3 guesses)', async () => {
  const deps = createFakeDependencies();
  const service = createMatchSettlementService(deps);
  // Match ends on 1 guess each (< 3 minimum for XP)
  const room = buildRoom({
    guesses: [
      { playerIndex: 0, guess: '1234' },
      { playerIndex: 1, guess: '5678' }
    ]
  });

  const result = await service.settlePvpMatch(room, { endReason: 'correct_guess' });
  const p0 = result.xpResults.find(r => r.userId === PLAYER_ONE_ID);
  const p1 = result.xpResults.find(r => r.userId === PLAYER_TWO_ID);

  assert.equal(result.xpEligible, false);
  assert.equal(p0.xpEarned, 0);
  assert.equal(p1.xpEarned, 0);

  assert.equal(p0.ratingDelta, 16);
  assert.equal(p0.ratingAfter, 1016);
  assert.equal(p1.ratingDelta, -16);
  assert.equal(p1.ratingAfter, 984);
});

test('6. Forfeit with >= 3 guesses: winner gains Rating, quitter loses Rating', async () => {
  const deps = createFakeDependencies();
  const service = createMatchSettlementService(deps);
  const room = buildRoom(); // 3 guesses each

  const result = await service.settlePvpMatch(room, {
    endReason: 'intentional_leave',
    forfeitedPlayerId: PLAYER_TWO_ID
  });

  const p0 = result.xpResults.find(r => r.userId === PLAYER_ONE_ID);
  const p1 = result.xpResults.find(r => r.userId === PLAYER_TWO_ID);

  assert.equal(p0.ratingDelta, 16);
  assert.equal(p1.ratingDelta, -16);
  assert.equal(result.ratingReason, 'forfeited');
});

test('7. Early forfeit (< 3 guesses): quitter penalized (-Rating), remaining player +0 Rating', async () => {
  const deps = createFakeDependencies();
  const service = createMatchSettlementService(deps);
  const room = buildRoom({
    guesses: [
      { playerIndex: 0, guess: '1234' }
    ]
  });

  const result = await service.settlePvpMatch(room, {
    endReason: 'intentional_leave',
    forfeitedPlayerId: PLAYER_TWO_ID
  });

  const p0 = result.xpResults.find(r => r.userId === PLAYER_ONE_ID); // Remaining
  const p1 = result.xpResults.find(r => r.userId === PLAYER_TWO_ID); // Quitter

  assert.equal(p0.ratingDelta, 0);
  assert.equal(p0.ratingAfter, 1000);
  assert.equal(p1.ratingDelta, -16);
  assert.equal(p1.ratingAfter, 984);
  assert.equal(result.ratingReason, 'early_forfeit_penalty');
});

test('8. Both disconnect / abandoned: both receive +0 Rating', () => {
  const outcome = calculatePvpRating({
    playerProfiles: [{ rating: 1000 }, { rating: 1000 }],
    status: 'abandoned',
    endReason: 'both_players_disconnected',
    isAiRoom: false
  });

  assert.equal(outcome.ratingApplied, false);
  assert.equal(outcome.playerRatings[0].ratingDelta, 0);
  assert.equal(outcome.playerRatings[1].ratingDelta, 0);
});

test('9. AI Room settlement does not affect Rating', () => {
  const outcome = calculatePvpRating({
    playerProfiles: [{ rating: 1000 }, { rating: 1000 }],
    status: 'completed',
    winnerIndex: 0,
    isAiRoom: true
  });

  assert.equal(outcome.ratingApplied, false);
  assert.equal(outcome.playerRatings[0].ratingDelta, 0);
});

test('10. Replay with same matchId is idempotent (no duplicate rating changes)', async () => {
  const deps = createFakeDependencies();
  const service = createMatchSettlementService(deps);
  const room = buildRoom();

  const firstCall = await service.settlePvpMatch(room, { endReason: 'correct_guess' });
  const secondCall = await service.settlePvpMatch(room, { endReason: 'correct_guess' });

  assert.deepEqual(firstCall, secondCall);
  const p0Profile = deps.profiles.get(PLAYER_ONE_ID);
  assert.equal(p0Profile.rating, 1016); // Increased exactly once
});

test('11. Legacy profile missing rating fields defaults to 1000', async () => {
  const deps = createFakeDependencies({
    initialProfiles: {
      [PLAYER_ONE_ID]: { totalXp: 50, wins: 1, losses: 0 } // No rating field
    }
  });
  const service = createMatchSettlementService(deps);
  const summary = await service.getGameProfileSummary(PLAYER_ONE_ID);

  assert.equal(summary.rating, 1000);
  assert.equal(summary.highestRating, 1000);
  assert.equal(summary.rank, 'Đồng');
});

test('12. Rematch has distinct matchId and settles rating independently', async () => {
  const deps = createFakeDependencies();
  const service = createMatchSettlementService(deps);

  const room1 = buildRoom({ matchId: 'match-1', winnerIndex: 0 });
  const room2 = buildRoom({ matchId: 'match-2', winnerIndex: 1 }); // Opponent wins round 2

  const result1 = await service.settlePvpMatch(room1, { endReason: 'correct_guess' });
  const p0After1 = result1.xpResults.find(r => r.userId === PLAYER_ONE_ID).ratingAfter;
  assert.equal(p0After1, 1016);

  const result2 = await service.settlePvpMatch(room2, { endReason: 'correct_guess' });
  const p0After2 = result2.xpResults.find(r => r.userId === PLAYER_ONE_ID).ratingAfter;
  assert.equal(p0After2, 999); // 1016 - 17 = 999 after loss to 984 rated player
});

test('13. Rank tier calculation helper', () => {
  assert.equal(getRank(500).key, 'bronze');
  assert.equal(getRank(1100).key, 'silver');
  assert.equal(getRank(1300).key, 'gold');
  assert.equal(getRank(1500).key, 'platinum');
  assert.equal(getRank(1700).key, 'diamond');
  assert.equal(getRank(2000).key, 'master');

  assert.equal(getRatingToNextRank(1000), 100);
  assert.equal(getRatingToNextRank(1950), null);
});
