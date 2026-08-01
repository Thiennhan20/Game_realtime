const test = require('node:test');
const assert = require('node:assert/strict');
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

  // BSON ObjectIds are immutable for these tests and must retain toString().
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
  const counters = {
    sessionsStarted: 0,
    sessionsEnded: 0,
    historyCreates: 0,
    profileUpdates: 0
  };

  const profileDefaults = {
    totalXp: 0,
    wins: 0,
    losses: 0,
    currentWinStreak: 0,
    bestWinStreak: 0
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

  const findHistory = (query) => {
    const history = histories.get(query.matchId);
    if (!history) return null;
    if (
      query.settlementStatus
      && history.settlementStatus !== query.settlementStatus
    ) {
      return null;
    }
    return history;
  };

  const GameHistoryModel = {
    findOne(query) {
      return {
        async lean() {
          const history = findHistory(query);
          return history ? cloneValue(history) : null;
        },
        async session() {
          const history = findHistory(query);
          return history ? new FakeHistoryDocument(history) : null;
        }
      };
    },

    async create([snapshot]) {
      if (histories.has(snapshot.matchId)) {
        const duplicateError = new Error('duplicate matchId');
        duplicateError.code = 11000;
        throw duplicateError;
      }

      counters.historyCreates += 1;
      const document = new FakeHistoryDocument(snapshot);
      histories.set(snapshot.matchId, document.toObject());
      return [document];
    }
  };

  const GameProfileModel = {
    findOne(query) {
      return {
        async lean() {
          const profile = profiles.get(String(query.userId));
          return profile ? cloneValue(profile) : null;
        }
      };
    },

    async findOneAndUpdate(query, update) {
      counters.profileUpdates += 1;
      const userId = String(query.userId);
      const exists = profiles.has(userId);
      const profile = exists
        ? cloneValue(profiles.get(userId))
        : {
            userId: query.userId,
            ...profileDefaults
          };

      if (!exists && update.$setOnInsert) {
        Object.assign(profile, cloneValue(update.$setOnInsert));
      }

      Object.entries(update.$inc || {}).forEach(([field, amount]) => {
        profile[field] = (profile[field] || 0) + amount;
      });
      Object.assign(profile, cloneValue(update.$set || {}));
      Object.entries(update.$max || {}).forEach(([field, candidate]) => {
        profile[field] = Math.max(profile[field] || 0, candidate);
      });

      profiles.set(userId, cloneValue(profile));
      return cloneValue(profile);
    }
  };

  const mongooseClient = {
    async startSession() {
      counters.sessionsStarted += 1;
      return {
        async withTransaction(work) {
          return work();
        },
        async endSession() {
          counters.sessionsEnded += 1;
        }
      };
    }
  };

  return {
    mongooseClient,
    GameHistoryModel,
    GameProfileModel,
    inspect: {
      counters,
      histories,
      profiles
    }
  };
}

function guessesFor(...counts) {
  return counts.flatMap((count, playerIndex) => (
    Array.from({ length: count }, (_, guessIndex) => ({
      playerIndex,
      guess: `${playerIndex}${guessIndex}23`
    }))
  ));
}

function createRoom({
  matchId,
  winnerIndex = 1,
  guessCounts = [3, 3]
}) {
  return {
    roomId: 'G-TEST01',
    matchId,
    roundNumber: 2,
    isAiRoom: false,
    players: [
      {
        userId: PLAYER_ONE_ID,
        username: 'Player One',
        avatar: '/one.png'
      },
      {
        userId: PLAYER_TWO_ID,
        username: 'Player Two',
        avatar: '/two.png'
      }
    ],
    guesses: guessesFor(...guessCounts),
    winnerIndex,
    rpsWinnerIndex: 0,
    startedAt: '2026-07-31T10:00:00.000Z',
    finishedAt: '2026-07-31T10:01:30.000Z'
  };
}

test('settlePvpMatch persists an eligible result once per matchId', async () => {
  const dependencies = createFakeDependencies();
  const service = createMatchSettlementService(dependencies);
  const room = createRoom({ matchId: 'match-completed-once' });

  const firstResult = await service.settlePvpMatch(room, {
    endReason: 'correct_guess'
  });

  assert.equal(firstResult.xpEligible, true);
  assert.equal(firstResult.history.status, 'completed');
  assert.equal(firstResult.history.totalGuesses, 6);
  assert.equal(firstResult.history.winnerGuessCount, 3);
  assert.equal(firstResult.history.loserGuessCount, 3);
  assert.equal(firstResult.history.duration, 90);
  assert.deepEqual(firstResult.xpResults, [
    {
      userId: PLAYER_ONE_ID,
      xpEarned: 20,
      totalXp: 20,
      level: 0,
      currentXp: 20,
      xpForNextLevel: 50,
      wins: 0,
      losses: 1,
      currentWinStreak: 0,
      bestWinStreak: 0,
      ratingBefore: 1000,
      ratingDelta: -16,
      ratingAfter: 984,
      highestRating: 1000,
      rankBefore: 'Đồng',
      rankAfter: 'Đồng',
      rankBeforeEn: 'Bronze',
      rankAfterEn: 'Bronze',
      rankKeyBefore: 'bronze',
      rankKeyAfter: 'bronze',
      rank: 'Đồng',
      rankEn: 'Bronze',
      rankKey: 'bronze',
      ratingToNextRank: 116
    },
    {
      userId: PLAYER_TWO_ID,
      xpEarned: 20,
      totalXp: 20,
      level: 0,
      currentXp: 20,
      xpForNextLevel: 50,
      wins: 1,
      losses: 0,
      currentWinStreak: 1,
      bestWinStreak: 1,
      ratingBefore: 1000,
      ratingDelta: 16,
      ratingAfter: 1016,
      highestRating: 1016,
      rankBefore: 'Đồng',
      rankAfter: 'Đồng',
      rankBeforeEn: 'Bronze',
      rankAfterEn: 'Bronze',
      rankKeyBefore: 'bronze',
      rankKeyAfter: 'bronze',
      rank: 'Đồng',
      rankEn: 'Bronze',
      rankKey: 'bronze',
      ratingToNextRank: 84
    }
  ]);

  const countersAfterFirstSettlement = {
    ...dependencies.inspect.counters
  };
  const profilesAfterFirstSettlement = cloneValue(
    Object.fromEntries(dependencies.inspect.profiles)
  );

  const repeatedResult = await service.settlePvpMatch(room, {
    endReason: 'correct_guess'
  });

  assert.deepEqual(repeatedResult.xpResults, firstResult.xpResults);
  assert.deepEqual(dependencies.inspect.counters, countersAfterFirstSettlement);
  assert.deepEqual(
    cloneValue(Object.fromEntries(dependencies.inspect.profiles)),
    profilesAfterFirstSettlement
  );
  assert.equal(dependencies.inspect.histories.size, 1);
  assert.equal(dependencies.inspect.counters.historyCreates, 1);
  assert.equal(dependencies.inspect.counters.sessionsStarted, 1);
  assert.equal(dependencies.inspect.counters.sessionsEnded, 1);
});

test('eligible forfeit gives XP only to the player who stayed and updates stats', async () => {
  const dependencies = createFakeDependencies({
    initialProfiles: {
      [PLAYER_ONE_ID]: {
        totalXp: 40,
        wins: 2,
        losses: 1,
        currentWinStreak: 2,
        bestWinStreak: 3
      },
      [PLAYER_TWO_ID]: {
        totalXp: 40,
        wins: 1,
        losses: 2,
        currentWinStreak: 0,
        bestWinStreak: 1
      }
    }
  });
  const service = createMatchSettlementService(dependencies);
  const room = createRoom({
    matchId: 'match-eligible-forfeit',
    winnerIndex: 0,
    guessCounts: [3, 4]
  });

  const result = await service.settlePvpMatch(room, {
    endReason: 'intentional_leave',
    forfeitedPlayerId: PLAYER_ONE_ID
  });

  assert.equal(result.history.status, 'forfeited');
  assert.equal(result.history.winnerIndex, 1);
  assert.equal(String(result.history.winnerId), PLAYER_TWO_ID);
  assert.equal(result.history.forfeitedPlayerIndex, 0);
  assert.equal(String(result.history.forfeitedPlayerId), PLAYER_ONE_ID);
  assert.equal(result.history.winnerGuessCount, 4);
  assert.equal(result.history.loserGuessCount, 3);
  assert.equal(result.xpEligible, true);
  assert.deepEqual(result.xpResults, [
    {
      userId: PLAYER_ONE_ID,
      xpEarned: 0,
      totalXp: 40,
      level: 0,
      currentXp: 40,
      xpForNextLevel: 50,
      wins: 2,
      losses: 2,
      currentWinStreak: 0,
      bestWinStreak: 3,
      ratingBefore: 1000,
      ratingDelta: -16,
      ratingAfter: 984,
      highestRating: 1000,
      rankBefore: 'Đồng',
      rankAfter: 'Đồng',
      rankBeforeEn: 'Bronze',
      rankAfterEn: 'Bronze',
      rankKeyBefore: 'bronze',
      rankKeyAfter: 'bronze',
      rank: 'Đồng',
      rankEn: 'Bronze',
      rankKey: 'bronze',
      ratingToNextRank: 116
    },
    {
      userId: PLAYER_TWO_ID,
      xpEarned: 20,
      totalXp: 60,
      level: 1,
      currentXp: 10,
      xpForNextLevel: 100,
      wins: 2,
      losses: 2,
      currentWinStreak: 1,
      bestWinStreak: 1,
      ratingBefore: 1000,
      ratingDelta: 16,
      ratingAfter: 1016,
      highestRating: 1016,
      rankBefore: 'Đồng',
      rankAfter: 'Đồng',
      rankBeforeEn: 'Bronze',
      rankAfterEn: 'Bronze',
      rankKeyBefore: 'bronze',
      rankKeyAfter: 'bronze',
      rank: 'Đồng',
      rankEn: 'Bronze',
      rankKey: 'bronze',
      ratingToNextRank: 84
    }
  ]);

  const historyPlayers = [...result.history.players].sort(
    (left, right) => left.playerIndex - right.playerIndex
  );
  assert.deepEqual(
    historyPlayers.map((player) => ({
      xpEarned: player.xpEarned,
      totalXpBefore: player.totalXpBefore,
      totalXpAfter: player.totalXpAfter,
      winsAfter: player.winsAfter,
      lossesAfter: player.lossesAfter
    })),
    [
      {
        xpEarned: 0,
        totalXpBefore: 40,
        totalXpAfter: 40,
        winsAfter: 2,
        lossesAfter: 2
      },
      {
        xpEarned: 20,
        totalXpBefore: 40,
        totalXpAfter: 60,
        winsAfter: 2,
        lossesAfter: 2
      }
    ]
  );
});

test('ineligible forfeit awards zero XP but still records the win and loss', async () => {
  const dependencies = createFakeDependencies();
  const service = createMatchSettlementService(dependencies);
  const room = createRoom({
    matchId: 'match-ineligible-forfeit',
    winnerIndex: 1,
    guessCounts: [3, 2]
  });

  const result = await service.settlePvpMatch(room, {
    endReason: 'disconnect_timeout',
    forfeitedPlayerId: PLAYER_TWO_ID
  });

  assert.equal(result.history.status, 'forfeited');
  assert.equal(result.history.winnerIndex, 0);
  assert.equal(result.xpEligible, false);
  assert.equal(result.xpEligibilityReason, 'minimum_guesses_not_met');
  assert.deepEqual(
    result.xpResults.map((player) => player.xpEarned),
    [0, 0]
  );
  assert.deepEqual(
    result.xpResults.map((player) => ({
      wins: player.wins,
      losses: player.losses
    })),
    [
      { wins: 1, losses: 0 },
      { wins: 0, losses: 1 }
    ]
  );
});
