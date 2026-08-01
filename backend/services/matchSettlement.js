const mongoose = require('mongoose');
const GameHistory = require('../models/GameHistory');
const GameProfile = require('../models/GameProfile');
const {
  XP_PER_MATCH,
  MIN_GUESSES_PER_PLAYER,
  calculateLevelProgress,
  calculatePvpRewards
} = require('./progression');
const {
  DEFAULT_RATING,
  getRank,
  getRatingToNextRank,
  calculatePvpRating
} = require('./rating');

const SCORING_VERSION = 'pvp-xp-v1';
const RATING_VERSION = 'pvp-rating-v1';
const MAX_TRANSACTION_ATTEMPTS = 3;

function normalizeObjectId(userId, fieldName = 'userId') {
  const value = String(userId || '');
  if (!/^[a-f\d]{24}$/i.test(value)) {
    throw new TypeError(`${fieldName} must be a valid MongoDB ObjectId.`);
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizeDate(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function toPlainObject(document) {
  if (!document) return null;
  return typeof document.toObject === 'function'
    ? document.toObject()
    : document;
}

async function findProfileDoc(GameProfileModel, userId, session) {
  let query = GameProfileModel.findOne({ userId });
  if (session && typeof query?.session === 'function') {
    query = query.session(session);
  } else if (typeof query?.lean === 'function') {
    query = query.lean();
  }
  const result = await query;
  return toPlainObject(result);
}

async function findHistoryDoc(GameHistoryModel, queryFilter, session) {
  let query = GameHistoryModel.findOne(queryFilter);
  if (session && typeof query?.session === 'function') {
    query = query.session(session);
  } else if (typeof query?.lean === 'function') {
    query = query.lean();
  }
  const result = await query;
  return toPlainObject(result);
}

function buildProfileSummary(userId, profile = null) {
  const totalXp = profile?.totalXp || 0;
  const progress = calculateLevelProgress(totalXp);
  const rating = profile?.rating ?? DEFAULT_RATING;
  const highestRating = profile?.highestRating ?? rating;
  const rank = getRank(rating);
  const ratingToNextRank = getRatingToNextRank(rating);

  return {
    userId: String(userId),
    totalXp,
    level: progress.level,
    currentXp: progress.currentXp,
    xpForNextLevel: progress.xpForNextLevel,
    wins: profile?.wins || 0,
    losses: profile?.losses || 0,
    currentWinStreak: profile?.currentWinStreak || 0,
    bestWinStreak: profile?.bestWinStreak || 0,
    rating,
    highestRating,
    rank: rank.nameVi,
    rankEn: rank.nameEn,
    rankKey: rank.key,
    ratingToNextRank
  };
}

function buildMatchSnapshot(room, { endReason, forfeitedPlayerId = null }) {
  if (!room || typeof room !== 'object') {
    throw new TypeError('room is required.');
  }
  if (room.isAiRoom) {
    throw new TypeError('settlePvpMatch only supports human-vs-human rooms.');
  }
  if (typeof room.matchId !== 'string' || room.matchId.trim().length === 0) {
    throw new TypeError('room.matchId is required for idempotent settlement.');
  }
  if (typeof room.roomId !== 'string' || room.roomId.trim().length === 0) {
    throw new TypeError('room.roomId is required.');
  }
  if (!Array.isArray(room.players) || room.players.length !== 2) {
    throw new TypeError('A PvP settlement requires exactly two players.');
  }
  if (typeof endReason !== 'string' || endReason.trim().length === 0) {
    throw new TypeError('endReason is required.');
  }

  const players = room.players.map((player, playerIndex) => ({
    playerIndex,
    userId: normalizeObjectId(player.userId, `players[${playerIndex}].userId`),
    username: player.username || 'Player',
    avatar: player.avatar || ''
  }));

  if (String(players[0].userId) === String(players[1].userId)) {
    throw new TypeError('A PvP match requires two distinct users.');
  }

  const guesses = Array.isArray(room.guesses) ? room.guesses : [];
  const guessCounts = players.map((_, playerIndex) => (
    guesses.filter(guess => guess?.playerIndex === playerIndex).length
  ));

  let forfeitedPlayerIndex = null;
  if (forfeitedPlayerId !== null && forfeitedPlayerId !== undefined) {
    const normalizedForfeitedId = String(
      normalizeObjectId(forfeitedPlayerId, 'forfeitedPlayerId')
    );
    forfeitedPlayerIndex = players.findIndex(
      player => String(player.userId) === normalizedForfeitedId
    );
    if (forfeitedPlayerIndex === -1) {
      throw new TypeError('forfeitedPlayerId is not a participant in this match.');
    }
  }

  const status = forfeitedPlayerIndex === null ? 'completed' : 'forfeited';
  const winnerIndex = forfeitedPlayerIndex === null
    ? room.winnerIndex
    : (forfeitedPlayerIndex === 0 ? 1 : 0);

  if (winnerIndex !== 0 && winnerIndex !== 1) {
    throw new TypeError('room.winnerIndex must identify a player for a completed match.');
  }

  const {
    xpEligible,
    xpEligibilityReason,
    xpRewards
  } = calculatePvpRewards({
    guessCounts,
    endReason,
    forfeitedPlayerIndex
  });

  const finishedAt = normalizeDate(room.finishedAt, new Date());
  const startedAt = normalizeDate(room.startedAt);
  const duration = startedAt
    ? Math.max(0, Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000))
    : 0;
  const loserIndex = winnerIndex === 0 ? 1 : 0;
  const roundNumber = Number.isSafeInteger(room.roundNumber) && room.roundNumber > 0
    ? room.roundNumber
    : 1;

  return {
    matchId: room.matchId.trim(),
    roomId: room.roomId.trim(),
    roundNumber,
    players: players.map((player, playerIndex) => ({
      ...player,
      guessCount: guessCounts[playerIndex],
      xpEarned: xpRewards[playerIndex],
      totalXpBefore: 0,
      totalXpAfter: 0,
      winsAfter: 0,
      lossesAfter: 0,
      currentWinStreakAfter: 0,
      bestWinStreakAfter: 0,
      ratingBefore: DEFAULT_RATING,
      ratingDelta: 0,
      ratingAfter: DEFAULT_RATING,
      highestRatingAfter: DEFAULT_RATING,
      rankBefore: 'Đồng',
      rankAfter: 'Đồng'
    })),
    winnerId: players[winnerIndex].userId,
    winnerIndex,
    forfeitedPlayerId: forfeitedPlayerIndex === null
      ? null
      : players[forfeitedPlayerIndex].userId,
    forfeitedPlayerIndex,
    status,
    endReason: endReason.trim(),
    xpEligible,
    xpEligibilityReason,
    minGuessesPerPlayer: MIN_GUESSES_PER_PLAYER,
    xpPerMatch: XP_PER_MATCH,
    scoringVersion: SCORING_VERSION,
    ratingVersion: RATING_VERSION,
    ratingApplied: false,
    ratingReason: 'not_applicable',
    totalGuesses: guessCounts[0] + guessCounts[1],
    winnerGuessCount: guessCounts[winnerIndex],
    loserGuessCount: guessCounts[loserIndex],
    rpsWinnerIndex: room.rpsWinnerIndex === 0 || room.rpsWinnerIndex === 1
      ? room.rpsWinnerIndex
      : -1,
    duration,
    startedAt,
    finishedAt,
    settlementStatus: 'processing',
    settledAt: null
  };
}

async function updateProfile({
  player,
  xpEarned,
  didWin,
  ratingDelta = 0,
  session,
  GameProfileModel
}) {
  const existingProfile = await findProfileDoc(GameProfileModel, player.userId, session);
  const currentRating = existingProfile?.rating ?? DEFAULT_RATING;
  const currentHighest = existingProfile?.highestRating ?? currentRating;

  const newRating = Math.max(0, currentRating + ratingDelta);
  const newHighest = Math.max(currentHighest, newRating);

  const update = {
    $setOnInsert: { userId: player.userId },
    $inc: {
      totalXp: xpEarned,
      wins: didWin ? 1 : 0,
      losses: didWin ? 0 : 1
    },
    $set: {
      rating: newRating,
      highestRating: newHighest
    }
  };

  if (didWin) {
    update.$inc.currentWinStreak = 1;
  } else {
    update.$set.currentWinStreak = 0;
  }

  let profile = await GameProfileModel.findOneAndUpdate(
    { userId: player.userId },
    update,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session
    }
  );

  if (didWin && profile.currentWinStreak > profile.bestWinStreak) {
    profile = await GameProfileModel.findOneAndUpdate(
      { userId: player.userId },
      { $max: { bestWinStreak: profile.currentWinStreak } },
      { new: true, session }
    );
  }

  return profile;
}

function buildSettlementResult(historyValue) {
  const history = toPlainObject(historyValue);
  const orderedPlayers = [...(history.players || [])].sort(
    (left, right) => left.playerIndex - right.playerIndex
  );

  const xpResults = orderedPlayers.map(player => {
    const progress = calculateLevelProgress(player.totalXpAfter || 0);
    const rating = player.ratingAfter ?? DEFAULT_RATING;
    const highestRating = player.highestRatingAfter ?? rating;
    const rank = getRank(rating);
    const ratingToNextRank = getRatingToNextRank(rating);

    return {
      userId: String(player.userId),
      xpEarned: player.xpEarned || 0,
      totalXp: player.totalXpAfter || 0,
      level: progress.level,
      currentXp: progress.currentXp,
      xpForNextLevel: progress.xpForNextLevel,
      wins: player.winsAfter || 0,
      losses: player.lossesAfter || 0,
      currentWinStreak: player.currentWinStreakAfter || 0,
      bestWinStreak: player.bestWinStreakAfter || 0,
      ratingBefore: player.ratingBefore ?? DEFAULT_RATING,
      ratingDelta: player.ratingDelta ?? 0,
      ratingAfter: rating,
      highestRating,
      rankBefore: player.rankBefore || 'Đồng',
      rankAfter: player.rankAfter || rank.nameVi,
      rankBeforeEn: player.rankBeforeEn || 'Bronze',
      rankAfterEn: player.rankAfterEn || rank.nameEn,
      rankKeyBefore: player.rankKeyBefore || 'bronze',
      rankKeyAfter: player.rankKeyAfter || rank.key,
      rank: rank.nameVi,
      rankEn: rank.nameEn,
      rankKey: rank.key,
      ratingToNextRank
    };
  });

  return {
    history,
    status: history.status,
    xpEligible: Boolean(history.xpEligible),
    xpEligibilityReason: history.xpEligibilityReason,
    ratingApplied: Boolean(history.ratingApplied),
    ratingReason: history.ratingReason || 'not_applicable',
    xpResults
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || error?.cause?.code === 11000;
}

async function settlePvpMatchWithDependencies(
  room,
  { endReason, forfeitedPlayerId = null },
  {
    mongooseClient,
    GameHistoryModel,
    GameProfileModel
  }
) {
  const snapshot = buildMatchSnapshot(room, {
    endReason,
    forfeitedPlayerId
  });

  const alreadySettled = await findHistoryDoc(GameHistoryModel, {
    matchId: snapshot.matchId,
    settlementStatus: 'settled'
  });

  if (alreadySettled) {
    return buildSettlementResult(alreadySettled);
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const session = await mongooseClient.startSession();
    let settledHistory = null;

    try {
      await session.withTransaction(async () => {
        const existingHistory = await findHistoryDoc(GameHistoryModel, {
          matchId: snapshot.matchId
        }, session);

        if (existingHistory) {
          if (existingHistory.settlementStatus !== 'settled') {
            throw new Error(`Match ${snapshot.matchId} has an incomplete settlement.`);
          }
          settledHistory = existingHistory;
          return;
        }

        // Fetch current player profile stats for Elo calculations
        const p0Profile = await findProfileDoc(GameProfileModel, snapshot.players[0].userId, session);
        const p1Profile = await findProfileDoc(GameProfileModel, snapshot.players[1].userId, session);

        const ratingOutcome = calculatePvpRating({
          playerProfiles: [p0Profile, p1Profile],
          status: snapshot.status,
          endReason: snapshot.endReason,
          winnerIndex: snapshot.winnerIndex,
          forfeitedPlayerIndex: snapshot.forfeitedPlayerIndex,
          guessCounts: [snapshot.players[0].guessCount, snapshot.players[1].guessCount],
          isAiRoom: false
        });

        snapshot.ratingApplied = ratingOutcome.ratingApplied;
        snapshot.ratingReason = ratingOutcome.ratingReason;

        const [history] = await GameHistoryModel.create([snapshot], { session });
        const updateOrder = [...snapshot.players].sort((left, right) => (
          String(left.userId).localeCompare(String(right.userId))
        ));

        for (const player of updateOrder) {
          const didWin = player.playerIndex === snapshot.winnerIndex;
          const playerRatingCalc = ratingOutcome.playerRatings[player.playerIndex];

          const profile = await updateProfile({
            player,
            xpEarned: player.xpEarned,
            didWin,
            ratingDelta: playerRatingCalc.ratingDelta,
            session,
            GameProfileModel
          });

          const historyPlayer = history.players.find(
            item => item.playerIndex === player.playerIndex
          );

          historyPlayer.totalXpBefore = profile.totalXp - player.xpEarned;
          historyPlayer.totalXpAfter = profile.totalXp;
          historyPlayer.winsAfter = profile.wins;
          historyPlayer.lossesAfter = profile.losses;
          historyPlayer.currentWinStreakAfter = profile.currentWinStreak;
          historyPlayer.bestWinStreakAfter = profile.bestWinStreak;

          historyPlayer.ratingBefore = playerRatingCalc.ratingBefore;
          historyPlayer.ratingDelta = playerRatingCalc.ratingDelta;
          historyPlayer.ratingAfter = profile.rating;
          historyPlayer.highestRatingAfter = profile.highestRating;
          historyPlayer.rankBefore = playerRatingCalc.rankBefore;
          historyPlayer.rankAfter = playerRatingCalc.rankAfter;
          historyPlayer.rankBeforeEn = playerRatingCalc.rankBeforeEn || 'Bronze';
          historyPlayer.rankAfterEn = playerRatingCalc.rankAfterEn || 'Bronze';
          historyPlayer.rankKeyBefore = playerRatingCalc.rankKeyBefore || 'bronze';
          historyPlayer.rankKeyAfter = playerRatingCalc.rankKeyAfter || 'bronze';
        }

        history.settlementStatus = 'settled';
        history.settledAt = new Date();
        await history.save({ session });
        settledHistory = history.toObject();
      }, {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });

      if (!settledHistory) {
        settledHistory = await findHistoryDoc(GameHistoryModel, {
          matchId: snapshot.matchId,
          settlementStatus: 'settled'
        });
      }

      if (!settledHistory) {
        throw new Error(`Match ${snapshot.matchId} was not settled.`);
      }

      return buildSettlementResult(settledHistory);
    } catch (error) {
      lastError = error;

      if (isDuplicateKeyError(error)) {
        const concurrentSettlement = await findHistoryDoc(GameHistoryModel, {
          matchId: snapshot.matchId,
          settlementStatus: 'settled'
        });

        if (concurrentSettlement) {
          return buildSettlementResult(concurrentSettlement);
        }
      }

      if (!isDuplicateKeyError(error) || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
}

async function getGameProfileSummaryWithDependencies(
  userId,
  { GameProfileModel }
) {
  const normalizedUserId = normalizeObjectId(userId);
  const profile = await findProfileDoc(GameProfileModel, normalizedUserId);

  return buildProfileSummary(normalizedUserId, profile);
}

function createMatchSettlementService({
  mongooseClient = mongoose,
  GameHistoryModel = GameHistory,
  GameProfileModel = GameProfile
} = {}) {
  return {
    settlePvpMatch(room, options) {
      return settlePvpMatchWithDependencies(room, options, {
        mongooseClient,
        GameHistoryModel,
        GameProfileModel
      });
    },
    getGameProfileSummary(userId) {
      return getGameProfileSummaryWithDependencies(userId, {
        GameProfileModel
      });
    }
  };
}

const defaultMatchSettlementService = createMatchSettlementService();

function settlePvpMatch(room, options) {
  return defaultMatchSettlementService.settlePvpMatch(room, options);
}

function getGameProfileSummary(userId) {
  return defaultMatchSettlementService.getGameProfileSummary(userId);
}

module.exports = {
  settlePvpMatch,
  getGameProfileSummary,
  createMatchSettlementService
};
