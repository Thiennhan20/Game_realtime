const mongoose = require('mongoose');
const GameHistory = require('../models/GameHistory');
const GameProfile = require('../models/GameProfile');
const {
  XP_PER_MATCH,
  MIN_GUESSES_PER_PLAYER,
  calculateLevelProgress
} = require('./progression');
const {
  DEFAULT_RATING,
  getRank,
  getRatingToNextRank
} = require('./rating');

const SCORING_VERSION = 'pvp-xp-v1';
const RATING_VERSION = 'pvp-rating-v1';
const MAX_TRANSACTION_ATTEMPTS = 3;
const HISTORY_ONLY_STATUSES = new Set(['abandoned', 'cancelled']);

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

function getEligibilityReason(status) {
  return status === 'cancelled' ? 'match_cancelled' : 'match_abandoned';
}

function buildAbandonedMatchSnapshot(
  room,
  {
    status = 'abandoned',
    endReason = status === 'cancelled'
      ? 'room_cancelled'
      : 'both_players_disconnected'
  } = {}
) {
  if (!room || typeof room !== 'object') {
    throw new TypeError('room is required.');
  }
  if (room.isAiRoom) {
    throw new TypeError('Only human-vs-human rooms can be recorded as abandoned.');
  }
  if (typeof room.matchId !== 'string' || room.matchId.trim().length === 0) {
    throw new TypeError('room.matchId is required for idempotent settlement.');
  }
  if (typeof room.roomId !== 'string' || room.roomId.trim().length === 0) {
    throw new TypeError('room.roomId is required.');
  }
  if (!Array.isArray(room.players) || room.players.length !== 2) {
    throw new TypeError('An abandoned PvP match requires exactly two players.');
  }
  if (!HISTORY_ONLY_STATUSES.has(status)) {
    throw new TypeError('status must be abandoned or cancelled.');
  }
  if (typeof endReason !== 'string' || endReason.trim().length === 0) {
    throw new TypeError('endReason is required.');
  }

  const startedAt = normalizeDate(room.startedAt);
  if (!startedAt) {
    throw new TypeError('room.startedAt is required for a started PvP match.');
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
  const finishedAt = normalizeDate(room.finishedAt, new Date());
  const duration = Math.max(
    0,
    Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000)
  );
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
      xpEarned: 0,
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
    winnerId: null,
    winnerIndex: null,
    forfeitedPlayerId: null,
    forfeitedPlayerIndex: null,
    status,
    endReason: endReason.trim(),
    xpEligible: false,
    xpEligibilityReason: getEligibilityReason(status),
    minGuessesPerPlayer: MIN_GUESSES_PER_PLAYER,
    xpPerMatch: XP_PER_MATCH,
    scoringVersion: SCORING_VERSION,
    ratingVersion: RATING_VERSION,
    ratingApplied: false,
    ratingReason: 'abandoned',
    totalGuesses: guessCounts[0] + guessCounts[1],
    winnerGuessCount: 0,
    loserGuessCount: 0,
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

function buildSettlementResult(historyValue) {
  const history = toPlainObject(historyValue);
  const orderedPlayers = [...(history.players || [])].sort(
    (left, right) => left.playerIndex - right.playerIndex
  );

  const xpResults = orderedPlayers.map(player => {
    const totalXp = player.totalXpAfter || 0;
    const progress = calculateLevelProgress(totalXp);
    const rating = player.ratingAfter ?? DEFAULT_RATING;
    const highestRating = player.highestRatingAfter ?? rating;
    const rank = getRank(rating);
    const ratingToNextRank = getRatingToNextRank(rating);

    return {
      userId: String(player.userId),
      xpEarned: player.xpEarned || 0,
      totalXp,
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
    ratingApplied: false,
    ratingReason: history.ratingReason || 'abandoned',
    xpResults
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || error?.cause?.code === 11000;
}

async function copyCurrentProfileStatsToHistory(history, snapshot, session) {
  const updateOrder = [...snapshot.players].sort((left, right) => (
    String(left.userId).localeCompare(String(right.userId))
  ));

  for (const player of updateOrder) {
    const profile = await GameProfile.findOne({ userId: player.userId }).session(session);
    const historyPlayer = history.players.find(
      item => item.playerIndex === player.playerIndex
    );
    const totalXp = profile?.totalXp || 0;
    const rating = profile?.rating ?? DEFAULT_RATING;
    const highestRating = profile?.highestRating ?? rating;
    const rank = getRank(rating);

    historyPlayer.totalXpBefore = totalXp;
    historyPlayer.totalXpAfter = totalXp;
    historyPlayer.winsAfter = profile?.wins || 0;
    historyPlayer.lossesAfter = profile?.losses || 0;
    historyPlayer.currentWinStreakAfter = profile?.currentWinStreak || 0;
    historyPlayer.bestWinStreakAfter = profile?.bestWinStreak || 0;

    historyPlayer.ratingBefore = rating;
    historyPlayer.ratingDelta = 0;
    historyPlayer.ratingAfter = rating;
    historyPlayer.highestRatingAfter = highestRating;
    historyPlayer.rankBefore = rank.nameVi;
    historyPlayer.rankAfter = rank.nameVi;
  }
}

async function settleAbandonedPvpMatch(
  room,
  {
    status = 'abandoned',
    endReason = status === 'cancelled'
      ? 'room_cancelled'
      : 'both_players_disconnected'
  } = {}
) {
  const snapshot = buildAbandonedMatchSnapshot(room, { status, endReason });
  const alreadySettled = await GameHistory.findOne({
    matchId: snapshot.matchId,
    settlementStatus: 'settled'
  }).lean();

  if (alreadySettled) {
    return buildSettlementResult(alreadySettled);
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const session = await mongoose.startSession();
    let settledHistory = null;

    try {
      await session.withTransaction(async () => {
        const existingHistory = await GameHistory.findOne({
          matchId: snapshot.matchId
        }).session(session);

        if (existingHistory) {
          if (existingHistory.settlementStatus !== 'settled') {
            throw new Error(`Match ${snapshot.matchId} has an incomplete settlement.`);
          }
          settledHistory = existingHistory.toObject();
          return;
        }

        const [history] = await GameHistory.create([snapshot], { session });

        // Abandoned/cancelled matches are history-only: no XP, wins, losses,
        // streak counters, or rating are mutated. We only snapshot current totals.
        await copyCurrentProfileStatsToHistory(history, snapshot, session);

        history.settlementStatus = 'settled';
        history.settledAt = new Date();
        await history.save({ session });
        settledHistory = history.toObject();
      }, {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });

      if (!settledHistory) {
        settledHistory = await GameHistory.findOne({
          matchId: snapshot.matchId,
          settlementStatus: 'settled'
        }).lean();
      }

      if (!settledHistory) {
        throw new Error(`Match ${snapshot.matchId} was not settled.`);
      }

      return buildSettlementResult(settledHistory);
    } catch (error) {
      lastError = error;

      if (isDuplicateKeyError(error)) {
        const concurrentSettlement = await GameHistory.findOne({
          matchId: snapshot.matchId,
          settlementStatus: 'settled'
        }).lean();

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

module.exports = {
  buildAbandonedMatchSnapshot,
  settleAbandonedPvpMatch
};
