const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const { Redis } = require('@upstash/redis');
const User = require('./models/User');
const GameHistory = require('./models/GameHistory');
const GameProfile = require('./models/GameProfile');
const {
  getGameProfileSummary,
  settlePvpMatch
} = require('./services/matchSettlement');
const {
  settleAbandonedPvpMatch
} = require('./services/abandonedMatchSettlement');
const { getRank } = require('./services/rating');
const { settleAiMatch } = require('./services/aiMatchSettlement');
const { calculateUserAchievements } = require('./services/achievements');
const { getNextAiGuess } = require('./aiSolver');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3002", 
      "http://localhost:3000",
      "https://ntngame.fly.dev",
      "https://ntngame.fly.dev/",
      "https://moviesaw.vercel.app",
      "https://moviesaw.vercel.app/",
      "https://www.enterntn.duckdns.org",
      "https://www.enterntn.duckdns.org/",
      "https://enterntn.duckdns.org",
      "https://enterntn.duckdns.org/"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const GAME_SECRET_KEY = process.env.GAME_SECRET_KEY;
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.FLY_APP_NAME;
const MOVIE_API_URL = process.env.MOVIE_API_URL || (isProduction ? 'https://server-nextjs-firm.onrender.com/api' : 'http://localhost:3001/api');
let progressionReady = false;

// --- Cryptography Utils (AES-256-GCM) ---
function encryptSecret(text) {
  const key = Buffer.from(GAME_SECRET_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

function decryptSecret(encryptedData) {
  try {
    const key = Buffer.from(GAME_SECRET_KEY, 'hex');
    const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

// --- Cows & Bulls (Guess checking logic) ---
function checkGuess(secret, guess) {
  let correctPosition = 0;
  let correctNumbers = 0;
  
  // Calculate correct positions (Bulls)
  for (let i = 0; i < 4; i++) {
    if (secret[i] === guess[i]) {
      correctPosition++;
    }
  }
  
  // Calculate correct numbers in total (Cows + Bulls)
  const secretSet = new Set(secret);
  for (let char of guess) {
    if (secretSet.has(char)) {
      correctNumbers++;
    }
  }
  
  return { correctNumbers, correctPosition };
}

// Helper to validate unique 4 digit numbers
function isValidSecret(num) {
  if (!/^\d{4}$/.test(num)) return false;
  const set = new Set(num);
  return set.size === 4;
}

// --- Upstash Redis Client ---
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const REDIS_KEY_PREFIX = 'game:room:';
const ROOM_TTL_SECONDS = 30 * 60; // 30 minutes

// --- Redis Cache Layer (Leaderboard & GameProfile) ---
const LEADERBOARD_CACHE_PREFIX = 'game:cache:leaderboard:';
const PROFILE_CACHE_PREFIX = 'game:cache:profile:';
const LEADERBOARD_CACHE_TTL = 60; // 60 seconds
const PROFILE_CACHE_TTL = 120; // 120 seconds

async function getCachedJson(key) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error(`[Redis Cache GET Error] ${key}:`, err.message);
    return null;
  }
}

async function setCachedJson(key, value, ttlSeconds) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return;
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (err) {
    console.error(`[Redis Cache SET Error] ${key}:`, err.message);
  }
}

async function invalidateUserAndLeaderboardCache(userId) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return;
    const deletePromises = [
      redis.del(`${LEADERBOARD_CACHE_PREFIX}3`),
      redis.del(`${LEADERBOARD_CACHE_PREFIX}4`),
      redis.del(`${LEADERBOARD_CACHE_PREFIX}50`),
      redis.del(`${LEADERBOARD_CACHE_PREFIX}100`),
    ];
    if (userId) {
      deletePromises.push(redis.del(`${PROFILE_CACHE_PREFIX}${userId}`));
    }
    await Promise.all(deletePromises);
  } catch (err) {
    console.error(`[Redis Cache Invalidate Error]`, err.message);
  }
}

// --- Game Rooms State (Hybrid: RAM + Redis) ---
// roomId -> RoomObject (in-memory for speed)
const rooms = new Map();
const roomPersistenceQueues = new Map();
const abandonedSettlementPromises = new Map();

function enqueueRoomPersistence(roomId, operation) {
  const previous = roomPersistenceQueues.get(roomId) || Promise.resolve();
  const queued = previous
    .catch(() => undefined)
    .then(operation);

  roomPersistenceQueues.set(roomId, queued);
  const cleanup = () => {
    if (roomPersistenceQueues.get(roomId) === queued) {
      roomPersistenceQueues.delete(roomId);
    }
  };
  queued.then(cleanup, cleanup);
  return queued;
}

// Sync room data to Redis (background, non-blocking)
function syncRoomToRedis(roomId, room) {
  const snapshot = JSON.stringify(room);
  enqueueRoomPersistence(
    roomId,
    () => redis.set(`${REDIS_KEY_PREFIX}${roomId}`, snapshot, { ex: ROOM_TTL_SECONDS })
  )
    .then(() => console.log(`[Redis] Synced room ${roomId}`))
    .catch(err => console.error(`[Redis] Failed to sync room ${roomId}:`, err.message));
}

function persistRoomToRedis(roomId, room) {
  const snapshot = JSON.stringify(room);
  return enqueueRoomPersistence(
    roomId,
    () => redis.set(`${REDIS_KEY_PREFIX}${roomId}`, snapshot, { ex: ROOM_TTL_SECONDS })
  );
}

// Delete room from Redis
function deleteRoomFromRedis(roomId) {
  enqueueRoomPersistence(
    roomId,
    () => redis.del(`${REDIS_KEY_PREFIX}${roomId}`)
  )
    .then(() => console.log(`[Redis] Deleted room ${roomId}`))
    .catch(err => console.error(`[Redis] Failed to delete room ${roomId}:`, err.message));
}

// Refresh TTL for active rooms (reset 30-min timer)
function refreshRoomTTL(roomId) {
  enqueueRoomPersistence(
    roomId,
    () => redis.expire(`${REDIS_KEY_PREFIX}${roomId}`, ROOM_TTL_SECONDS)
  )
    .catch(err => console.error(`[Redis] Failed to refresh TTL for ${roomId}:`, err.message));
}

// Load all rooms from Redis into RAM on server startup
function getAbandonedHistoryReason(room) {
  return room.abandonReason || 'both_players_disconnect_timeout';
}

async function settleAbandonedRoomHistory(room) {
  if (!room?.matchId) {
    throw new Error('Abandoned PvP history requires a stable matchId.');
  }

  const matchId = room.matchId;
  const existingPromise = abandonedSettlementPromises.get(matchId);
  if (existingPromise) return existingPromise;

  const settlementPromise = settleAbandonedPvpMatch(room, {
    status: 'abandoned',
    endReason: getAbandonedHistoryReason(room)
  }).finally(() => {
    if (abandonedSettlementPromises.get(matchId) === settlementPromise) {
      abandonedSettlementPromises.delete(matchId);
    }
  });

  abandonedSettlementPromises.set(matchId, settlementPromise);
  return settlementPromise;
}

function scheduleAbandonedSettlementRetry(room, attempt = 1) {
  const delayMs = Math.min(5000 * (2 ** (attempt - 1)), 60 * 1000);
  const retryTimer = setTimeout(async () => {
    try {
      await settleAbandonedRoomHistory(room);
      deleteRoomFromRedis(room.roomId);
      console.log(`[XP] Archived abandoned match ${room.matchId} after retry ${attempt}.`);
    } catch (error) {
      console.error(
        `[XP] Abandoned match ${room.matchId} retry ${attempt} failed:`,
        error.message
      );
      syncRoomToRedis(room.roomId, room);
      if (attempt < 5) {
        scheduleAbandonedSettlementRetry(room, attempt + 1);
      }
    }
  }, delayMs);
  if (typeof retryTimer.unref === 'function') {
    retryTimer.unref();
  }
}

async function archiveAbandonedPvpRoom(
  room,
  abandonReason = 'both_players_disconnect_timeout'
) {
  if (
    !room
    || room.isAiRoom
    || room.state !== 'PLAYING'
    || room.players?.length !== 2
    || !room.matchId
  ) {
    return false;
  }

  const roomId = room.roomId;
  rooms.delete(roomId);
  room.state = 'FINISHED';
  room.winnerIndex = -1;
  room.finishedAt = new Date().toISOString();
  room.endReason = 'ABANDONED';
  room.abandonReason = abandonReason;
  room.forfeitReason = null;
  room.forfeitedPlayerId = null;
  room.xpSettlement = null;
  room.resultFinalized = false;
  room.saved = false;

  try {
    await persistRoomToRedis(roomId, room);
  } catch (error) {
    console.error(
      `[Redis] Failed to persist abandoned room ${roomId}:`,
      error.message
    );
  }

  try {
    room.xpSettlement = await settleAbandonedRoomHistory(room);
    room.saved = true;
    room.resultFinalized = true;
    deleteRoomFromRedis(roomId);
    console.log(`[Game] Archived abandoned room ${roomId}; both players receive 0 XP.`);
    return true;
  } catch (error) {
    console.error(`[XP] Failed to archive abandoned match ${room.matchId}:`, error.message);
    syncRoomToRedis(roomId, room);
    scheduleAbandonedSettlementRetry(room);
    return false;
  }
}

async function loadRoomsFromRedis() {
  try {
    // Scan for all game room keys
    let cursor = '0';
    let allKeys = [];
    do {
      const result = await redis.scan(cursor, { match: `${REDIS_KEY_PREFIX}*`, count: 100 });
      cursor = String(result[0]);
      allKeys = allKeys.concat(result[1]);
    } while (cursor !== '0');

    if (allKeys.length === 0) {
      console.log('[Redis] No rooms to restore.');
      return;
    }

    let restored = 0;
    for (const key of allKeys) {
      const data = await redis.get(key);
      if (data) {
        const room = typeof data === 'string' ? JSON.parse(data) : data;
        if (room.isAiRoom) {
          deleteRoomFromRedis(room.roomId);
        } else {
          if (!room.matchId && room.state !== 'WAITING_FOR_PLAYERS') {
            room.matchId = buildStableRestoredMatchId(room);
            try {
              await persistRoomToRedis(room.roomId, room);
              console.log(`[XP] Assigned stable matchId ${room.matchId} to restored room.`);
            } catch (error) {
              console.error(
                `[Redis] Could not persist restored matchId for ${room.roomId}:`,
                error.message
              );
            }
          }

          if (
            room.state === 'FINISHED'
            && room.endReason === 'ABANDONED'
            && room.players?.length === 2
          ) {
            try {
              await settleAbandonedRoomHistory(room);
              deleteRoomFromRedis(room.roomId);
              console.log(`[XP] Restored abandoned match ${room.matchId} was archived.`);
            } catch (error) {
              console.error(
                `[XP] Could not archive restored abandoned room ${room.roomId}:`,
                error.message
              );
              syncRoomToRedis(room.roomId, room);
              scheduleAbandonedSettlementRetry(room);
            }
            continue;
          }

          rooms.set(room.roomId, room);
          prepareRestoredRoomForReconnect(room);
          if (
            room.state === 'FINISHED'
            && room.players?.length === 2
            && (!room.saved || !room.resultFinalized)
          ) {
            try {
              await finalizePendingTerminalRoom(room);
              console.log(`[XP] Restored and settled match ${room.matchId}.`);
            } catch (error) {
              console.error(
                `[XP] Could not settle restored room ${room.roomId}:`,
                error.message
              );
            }
          }
          restored++;
        }
      }
    }
    console.log(`[Redis] Restored ${restored} room(s) from Redis.`);
  } catch (err) {
    console.error('[Redis] Failed to load rooms from Redis:', err.message);
  }
}

function buildStableRestoredMatchId(room) {
  const stableIdentity = JSON.stringify({
    roomId: room.roomId || '',
    startedAt: room.startedAt || room.createdAt || '',
    roundNumber: room.roundNumber || 1,
    players: (room.players || []).map(player => String(player.userId || ''))
  });
  const digest = crypto
    .createHash('sha256')
    .update(stableIdentity)
    .digest('hex');
  return `restored-${digest}`;
}

// Generate random 6-digit room ID
function generateRoomId() {
  let rid;
  do {
    rid = 'G-' + Math.floor(100000 + Math.random() * 900000);
  } while (rooms.has(rid));
  return rid;
}

function generate4DigitCode() {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 4).join('');
}

function handleAiTurn(room) {
  if (!room || room.state !== 'PLAYING' || room.activeTurnIndex !== 1) return;

  setTimeout(async () => {
    try {
      if (!room || room.state !== 'PLAYING' || room.activeTurnIndex !== 1) return;

      // Collect past AI guesses in this match
      const pastAiGuesses = room.guesses
        .filter(g => g.playerIndex === 1)
        .map(g => ({
          guess: g.guess,
          correctNumbers: g.correctNumbers,
          correctPosition: g.correctPosition
        }));

      console.log(`[AI] Turn ${pastAiGuesses.length + 1}, difficulty=${room.aiDifficulty || 'medium'}, pastGuesses:`, JSON.stringify(pastAiGuesses));

      // Generate smart guess using AI Solver according to room's difficulty
      const aiGuess = getNextAiGuess(pastAiGuesses, room.aiDifficulty || 'medium');

      if (!aiGuess || typeof aiGuess !== 'string' || aiGuess.length !== 4) {
        console.error(`[AI] Invalid guess returned: "${aiGuess}". Using fallback.`);
        // Fallback to a random valid guess
        const guessedSet = new Set(pastAiGuesses.map(p => p.guess));
        const pool = ['1234','5678','9012','3456','7890'].filter(c => !guessedSet.has(c));
        var safeGuess = pool[0] || '1234';
      } else {
        var safeGuess = aiGuess;
      }

      const decryptedUserSecret = decryptSecret(room.players[0].secretNumber);
      if (!decryptedUserSecret) return;

      const { correctNumbers, correctPosition } = checkGuess(decryptedUserSecret, safeGuess);
      const guessRecord = {
        playerIndex: 1,
        guess: safeGuess,
        correctNumbers,
        correctPosition,
        timestamp: new Date().toISOString()
      };
      room.guesses.push(guessRecord);

      if (correctPosition === 4) {
        room.state = 'FINISHED';
        room.winnerIndex = 1;
        room.finishedAt = new Date().toISOString();

        const winnerGuesses = room.guesses.filter(g => g.playerIndex === 1);
        const loserGuesses = room.guesses.filter(g => g.playerIndex === 0);
        const durationMs = room.startedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;
        const durationSec = Math.floor(durationMs / 1000);

        const winnerSecretDecrypted = decryptSecret(room.players[1].secretNumber);
        const loserSecretDecrypted = decryptSecret(room.players[0].secretNumber);

        // Settle AI match for human player (loss)
        let aiSettlement = null;
        try {
          const humanPlayer = room.players[0];
          if (humanPlayer && humanPlayer.userId) {
            const settlementResult = await settleAiMatch({
              userId: humanPlayer.userId,
              aiDifficulty: room.aiDifficulty || 'medium',
              isUserWinner: false,
              room
            });
            aiSettlement = { xpResults: [settlementResult] };
            room.xpSettlement = aiSettlement;
            void invalidateUserAndLeaderboardCache(humanPlayer.userId);
          }
        } catch (err) {
          console.error(`[AI Settlement] Failed to settle AI loss for room ${room.roomId}:`, err.message);
        }

        syncRoomToRedis(room.roomId, room);

        const matchStats = {
          duration: durationSec,
          totalGuesses: room.guesses.length,
          winnerGuessCount: winnerGuesses.length,
          loserGuessCount: loserGuesses.length,
          rpsWinnerIndex: room.rpsWinnerIndex,
          winnerSecret: winnerSecretDecrypted,
          loserSecret: loserSecretDecrypted,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt,
          xpResults: aiSettlement?.xpResults || null
        };

        io.to(room.roomId).emit('GAME_OVER', {
          winnerIndex: 1,
          roomState: room,
          opponentSecret: winnerSecretDecrypted, // AI's secret revealed to user
          matchStats: matchStats
        });
        console.log(`[Game] AI won room ${room.roomId}.`);
      } else {
        room.activeTurnIndex = 0; // Turn back to human!
        syncRoomToRedis(room.roomId, room);
        io.to(room.roomId).emit('GUESS_RESULT', {
          lastGuess: guessRecord,
          roomState: room
        });
        console.log(`[Game] AI guessed ${safeGuess} in ${room.roomId}. Next turn: Human.`);
      }
    } catch (err) {
      console.error(`[AI ERROR] handleAiTurn crashed:`, err);
      // Emergency fallback: make a random guess so the game doesn't freeze
      try {
        const pastGuessed = new Set(room.guesses.filter(g => g.playerIndex === 1).map(g => g.guess));
        const fallbacks = ['1234','5678','9012','3456','7890','2468','1357','0246','3579','4680'];
        const fallbackGuess = fallbacks.find(g => !pastGuessed.has(g)) || '1234';
        
        const decryptedUserSecret = decryptSecret(room.players[0].secretNumber);
        if (!decryptedUserSecret) return;
        
        const { correctNumbers, correctPosition } = checkGuess(decryptedUserSecret, fallbackGuess);
        const guessRecord = {
          playerIndex: 1,
          guess: fallbackGuess,
          correctNumbers,
          correctPosition,
          timestamp: new Date().toISOString()
        };
        room.guesses.push(guessRecord);
        
        if (correctPosition === 4) {
          room.state = 'FINISHED';
          room.winnerIndex = 1;
          room.finishedAt = new Date().toISOString();
          syncRoomToRedis(room.roomId, room);
          const aiSecret = decryptSecret(room.players[1].secretNumber);
          io.to(room.roomId).emit('GAME_OVER', { winnerIndex: 1, roomState: room, opponentSecret: aiSecret, matchStats: {} });
        } else {
          room.activeTurnIndex = 0;
          syncRoomToRedis(room.roomId, room);
          io.to(room.roomId).emit('GUESS_RESULT', { lastGuess: guessRecord, roomState: room });
        }
        console.log(`[AI] Emergency fallback guess: ${fallbackGuess}`);
      } catch (e2) {
        console.error(`[AI CRITICAL] Even fallback failed:`, e2);
      }
    }
  }, 1200);
}

// --- Socket.IO Connection Handler ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('AUTH_ERROR: Token not provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = socket.handshake.auth?.username || decoded.name || decoded.username || 'Player';
    socket.avatar = socket.handshake.auth?.avatar || '';

    // Asynchronously fetch fresh user details in background without blocking handshake
    if (!socket.avatar && MOVIE_API_URL) {
      axios.get(`${MOVIE_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000
      }).then(res => {
        if (res.data && res.data.user) {
          socket.username = res.data.user.name || socket.username;
          socket.avatar = res.data.user.avatar || socket.avatar;
        }
      }).catch(err => {
        console.warn('Background profile fetch skipped/failed:', err.message);
      });
    }
    next();
  } catch (error) {
    console.error('Game socket auth failed:', error.message);
    return next(new Error('AUTH_ERROR: Invalid token'));
  }
});

// --- Disconnect grace period timers ---
const disconnectTimers = new Map(); // odisconnectTimers: odisconnectKey -> timerId
const settlementPromises = new Map(); // matchId -> in-flight MongoDB settlement
const restoredRoomTimers = new Map(); // roomId -> restart recovery timer

function getPlayerGuessCounts(room) {
  return room.players.map((_, playerIndex) =>
    room.guesses.filter(guess => guess.playerIndex === playerIndex).length
  );
}

function createFailedSettlement(room) {
  return {
    xpEligible: false,
    xpEligibilityReason: 'SETTLEMENT_FAILED',
    ratingApplied: false,
    ratingReason: 'settlement_failed',
    xpResults: room.players.map(player => ({
      userId: player.userId,
      xpEarned: 0,
      ratingBefore: 1000,
      ratingDelta: 0,
      ratingAfter: 1000,
      highestRating: 1000,
      rankBefore: 'Đồng',
      rankAfter: 'Đồng'
    }))
  };
}

async function settleRoomProgress(room, {
  endReason = 'COMPLETED',
  forfeitedPlayerId = null
} = {}) {
  if (!room || room.isAiRoom || room.players.length !== 2) return null;

  if (!room.matchId) {
    throw new Error('PvP settlement requires a persisted matchId.');
  }
  const settlingMatchId = room.matchId;
  if (room.saved && room.xpSettlement) return room.xpSettlement;

  const existingPromise = settlementPromises.get(settlingMatchId);
  if (existingPromise) return existingPromise;

  const settlementPromise = settlePvpMatch(room, {
    endReason,
    forfeitedPlayerId
  }).then(result => {
    if (rooms.get(room.roomId) === room && room.matchId === settlingMatchId) {
      room.saved = true;
      room.xpSettlement = result;
      syncRoomToRedis(room.roomId, room);
    }
    room.players?.forEach(p => {
      if (p?.userId) void invalidateUserAndLeaderboardCache(p.userId);
    });
    return result;
  }).finally(() => {
    settlementPromises.delete(settlingMatchId);
  });

  settlementPromises.set(settlingMatchId, settlementPromise);
  return settlementPromise;
}

async function finalizePendingTerminalRoom(room, broadcaster = null) {
  if (
    !room
    || room.isAiRoom
    || room.state !== 'FINISHED'
    || room.players?.length !== 2
  ) {
    return false;
  }

  const terminalMatchId = room.matchId;
  await settleRoomProgress(room, {
    endReason: room.endReason === 'FORFEIT'
      ? (room.forfeitReason || 'disconnect_timeout')
      : 'correct_guess',
    forfeitedPlayerId: room.forfeitedPlayerId || null
  });

  if (
    rooms.get(room.roomId) !== room
    || room.matchId !== terminalMatchId
    || room.state !== 'FINISHED'
  ) {
    return false;
  }

  room.resultFinalized = true;
  syncRoomToRedis(room.roomId, room);
  if (broadcaster) {
    emitFinishedPvpRoom(room, broadcaster);
  }
  return true;
}

function buildMatchStats(room, {
  winnerSecret = null,
  loserSecret = null,
  settlement = room.xpSettlement || null
} = {}) {
  const winnerIndex = room.winnerIndex;
  const loserIndex = winnerIndex === 0 ? 1 : 0;
  const guessCounts = getPlayerGuessCounts(room);
  const durationMs = room.startedAt && room.finishedAt
    ? new Date(room.finishedAt) - new Date(room.startedAt)
    : 0;

  return {
    matchId: room.matchId,
    duration: Math.max(0, Math.floor(durationMs / 1000)),
    totalGuesses: room.guesses.length,
    winnerGuessCount: guessCounts[winnerIndex] || 0,
    loserGuessCount: guessCounts[loserIndex] || 0,
    rpsWinnerIndex: room.rpsWinnerIndex,
    winnerSecret,
    loserSecret,
    startedAt: room.startedAt,
    finishedAt: room.finishedAt,
    endReason: room.endReason || 'COMPLETED',
    forfeitReason: room.forfeitReason || null,
    forfeitedPlayerId: room.forfeitedPlayerId || null,
    xpEligible: settlement?.xpEligible || false,
    xpEligibilityReason: settlement?.xpEligibilityReason || 'SETTLEMENT_FAILED',
    ratingApplied: settlement?.ratingApplied || false,
    ratingReason: settlement?.ratingReason || 'settlement_failed',
    xpResults: settlement?.xpResults || []
  };
}

function emitFinishedPvpRoom(room, broadcaster, winningGuess = null) {
  const winnerIndex = room.winnerIndex;
  const loserIndex = winnerIndex === 0 ? 1 : 0;
  const winnerSecret = decryptSecret(room.players[winnerIndex]?.secretNumber);
  const loserSecret = decryptSecret(room.players[loserIndex]?.secretNumber);

  broadcaster.emit('GAME_OVER', {
    winnerIndex,
    winningGuess,
    roomState: room,
    opponentSecret: loserSecret,
    matchStats: buildMatchStats(room, { winnerSecret, loserSecret })
  });
}

async function finishPvpByForfeit(room, forfeitedPlayerId, forfeitReason, broadcaster) {
  if (!room || room.isAiRoom || room.state !== 'PLAYING' || room.players.length !== 2) {
    return false;
  }

  const forfeitedPlayerIndex = room.players.findIndex(
    player => player.userId === forfeitedPlayerId
  );
  if (forfeitedPlayerIndex === -1) return false;

  const forfeitingMatchId = room.matchId;
  room.state = 'FINISHED';
  room.winnerIndex = forfeitedPlayerIndex === 0 ? 1 : 0;
  room.finishedAt = new Date().toISOString();
  room.endReason = 'FORFEIT';
  room.forfeitReason = forfeitReason;
  room.forfeitedPlayerId = forfeitedPlayerId;

  try {
    await persistRoomToRedis(room.roomId, room);
  } catch (error) {
    console.error(
      `[Redis] Failed to persist terminal forfeit snapshot ${room.roomId}:`,
      error.message
    );
  }

  try {
    await settleRoomProgress(room, {
      endReason: forfeitReason,
      forfeitedPlayerId
    });
  } catch (error) {
    console.error(`[XP] Failed to settle forfeited match ${room.matchId}:`, error.message);
    room.xpSettlement = createFailedSettlement(room);
  }

  if (
    rooms.get(room.roomId) !== room
    || room.matchId !== forfeitingMatchId
    || room.state !== 'FINISHED'
  ) {
    return false;
  }

  const forfeitedPlayer = room.players[forfeitedPlayerIndex];
  forfeitedPlayer.hasLeft = true;
  forfeitedPlayer.socketId = null;
  room.resultFinalized = true;
  if (rooms.get(room.roomId) === room) {
    syncRoomToRedis(room.roomId, room);
    emitFinishedPvpRoom(room, broadcaster);
  }
  console.log(
    `[Game] Room ${room.roomId} ended by forfeit. Winner: ${room.players[room.winnerIndex].username}.`
  );

  if (room.players.every(player => player.hasLeft)) {
    rooms.delete(room.roomId);
    deleteRoomFromRedis(room.roomId);
    console.log(`[Game] Room ${room.roomId} deleted because both players left.`);
  }
  return true;
}

function findActiveRoomForUser(userId) {
  for (const room of rooms.values()) {
    const player = room.players?.find(
      candidate => candidate.userId === userId && !candidate.hasLeft
    );
    if (player) return room;
  }
  return null;
}

function prepareRestoredRoomForReconnect(room) {
  const restoredAt = Date.now();
  room.players?.forEach(player => {
    if (!player.hasLeft) {
      player.socketId = null;
      player.disconnectedAt = restoredAt;
    }
  });

  const existingTimer = restoredRoomTimers.get(room.roomId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    restoredRoomTimers.delete(room.roomId);
    const currentRoom = rooms.get(room.roomId);
    if (currentRoom !== room) return;

    const stalePlayers = currentRoom.players.filter(
      player => !player.hasLeft && player.disconnectedAt === restoredAt
    );
    if (stalePlayers.length === 0) return;

    const connectedPlayers = currentRoom.players.filter(
      player => !player.hasLeft && !player.disconnectedAt
    );
    if (connectedPlayers.length === 0) {
      if (currentRoom.state === 'PLAYING' && currentRoom.players.length === 2) {
        await archiveAbandonedPvpRoom(
          currentRoom,
          'both_players_disconnect_timeout'
        );
        io.emit('LOBBY_ROOMS', getJoinableRooms());
        return;
      }

      rooms.delete(room.roomId);
      if (currentRoom.state === 'FINISHED' && !currentRoom.saved) {
        syncRoomToRedis(room.roomId, currentRoom);
        console.log(
          `[XP] Pending terminal room ${room.roomId} kept in Redis for a later settlement retry.`
        );
      } else {
        deleteRoomFromRedis(room.roomId);
        console.log(`[Game] Restored room ${room.roomId} expired without reconnects.`);
      }
      io.emit('LOBBY_ROOMS', getJoinableRooms());
      return;
    }

    if (
      currentRoom.state === 'PLAYING'
      && stalePlayers.length === 1
      && currentRoom.players.length === 2
    ) {
      await finishPvpByForfeit(
        currentRoom,
        stalePlayers[0].userId,
        'disconnect_timeout',
        io.to(room.roomId)
      );
      io.emit('LOBBY_ROOMS', getJoinableRooms());
      return;
    }

    if (currentRoom.state === 'FINISHED') {
      stalePlayers.forEach(player => {
        player.hasLeft = true;
        player.socketId = null;
      });
      if (currentRoom.players.every(player => player.hasLeft)) {
        rooms.delete(room.roomId);
        deleteRoomFromRedis(room.roomId);
      } else {
        syncRoomToRedis(room.roomId, currentRoom);
        if (currentRoom.xpSettlement) {
          emitFinishedPvpRoom(currentRoom, io.to(room.roomId));
        }
      }
      return;
    }

    currentRoom.players = connectedPlayers;
    currentRoom.state = 'WAITING_FOR_PLAYERS';
    currentRoom.guesses = [];
    currentRoom.matchId = null;
    currentRoom.rpsWinnerIndex = -1;
    currentRoom.activeTurnIndex = -1;
    currentRoom.winnerIndex = -1;
    currentRoom.startedAt = null;
    currentRoom.finishedAt = null;
    currentRoom.endReason = null;
    currentRoom.forfeitReason = null;
    currentRoom.forfeitedPlayerId = null;
    currentRoom.xpSettlement = null;
    currentRoom.saved = false;
    currentRoom.resultFinalized = false;
    connectedPlayers.forEach(player => {
      player.secretNumber = null;
      player.rpsChoice = null;
      player.ready = false;
    });
    syncRoomToRedis(room.roomId, currentRoom);
    io.to(room.roomId).emit('PLAYER_DISCONNECTED', {
      username: stalePlayers.map(player => player.username).join(', '),
      roomState: currentRoom
    });
    io.emit('LOBBY_ROOMS', getJoinableRooms());
  }, 60 * 1000);

  restoredRoomTimers.set(room.roomId, timer);
}

io.on('connection', (socket) => {
  console.log(`[Game] User connected: ${socket.username} (${socket.userId})`);
  
  // --- RECONNECT DETECTION ---
  // Check if this user belongs to any active room and reconnect them automatically
  rooms.forEach((room, roomId) => {
    const player = room.players.find(p => p.userId === socket.userId);
    if (player && !player.hasLeft) {
      // Cancel the disconnect timer
      const timerKey = `${roomId}:${socket.userId}`;
      const timerId = disconnectTimers.get(timerKey);
      if (timerId) {
        clearTimeout(timerId);
        disconnectTimers.delete(timerKey);
      }
      
      // Restore player connection
      player.disconnectedAt = null;
      player.socketId = socket.id;
      socket.join(roomId);
      socket.currentRoomId = roomId;
      
      // Sync and notify
      syncRoomToRedis(roomId, room);
      socket.emit('RECONNECTED_TO_ROOM', room);
      if (room.state === 'FINISHED' && !room.isAiRoom) {
        void finalizePendingTerminalRoom(room, socket).catch(error => {
          console.error(
            `[XP] Could not finalize reconnected room ${roomId}:`,
            error.message
          );
          socket.emit(
            'GAME_ERROR',
            'Match result could not be recorded yet. Please reconnect shortly.'
          );
        });
      }
      socket.to(roomId).emit('OPPONENT_RECONNECTED', { username: socket.username, roomState: room });
      console.log(`[Game] User ${socket.username} reconnected to room ${roomId}`);
    }
  });
  
  // Send list of joinable rooms
  socket.emit('LOBBY_ROOMS', getJoinableRooms());

  // Handle manual request for joinable rooms
  socket.on('GET_LOBBY_ROOMS', () => {
    socket.emit('LOBBY_ROOMS', getJoinableRooms());
  });

  socket.on('CHECK_ACTIVE_ROOM', () => {
    const activeRoom = findActiveRoomForUser(socket.userId);
    if (activeRoom) {
      socket.emit('RECONNECTED_TO_ROOM', activeRoom);
    }
  });

  // --- CREATE ROOM ---
  socket.on('CREATE_ROOM', () => {
    if (!progressionReady) {
      socket.emit('GAME_ERROR', 'PvP progression is temporarily unavailable.');
      return;
    }
    const activeRoom = findActiveRoomForUser(socket.userId);
    if (activeRoom) {
      socket.emit('GAME_ERROR', 'You are already in an active room.');
      return;
    }

    const roomId = generateRoomId();
    const room = {
      roomId,
      players: [
        {
          userId: socket.userId,
          username: socket.username,
          avatar: socket.avatar || '',
          socketId: socket.id,
          secretNumber: null,
          rpsChoice: null,
          ready: false
        }
      ],
      state: 'WAITING_FOR_PLAYERS',
      guesses: [],
      matchId: null,
      rpsWinnerIndex: -1,
      activeTurnIndex: -1,
      winnerIndex: -1,
      startedAt: null,
      finishedAt: null,
      endReason: null,
      forfeitedPlayerId: null,
      xpSettlement: null,
      resultFinalized: false,
      roundNumber: 0,
      createdAt: Date.now(),
      saved: false
    };
    rooms.set(roomId, room);
    syncRoomToRedis(roomId, room);
    socket.join(roomId);
    socket.currentRoomId = roomId;
    
    socket.emit('ROOM_CREATED', room);
    io.emit('LOBBY_ROOMS', getJoinableRooms());
    console.log(`[Game] Room created: ${roomId} by ${socket.username}`);
  });

  // --- CREATE AI ROOM ---
  socket.on('CREATE_AI_ROOM', (data) => {
    const activeRoom = findActiveRoomForUser(socket.userId);
    if (activeRoom) {
      socket.emit('GAME_ERROR', 'You are already in an active room.');
      return;
    }

    const difficulty = (data && data.difficulty) ? data.difficulty : 'medium';
    const roomId = generateRoomId();
    const aiSecret = generate4DigitCode();
    const aiRps = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];

    let botTitle = 'AI Bot (Trung Bình) 🤖';
    if (difficulty === 'easy') botTitle = 'AI Bot (Dễ) 🤖';
    if (difficulty === 'hard') botTitle = 'AI Bot (Cực Khó) 🤖';

    const room = {
      roomId,
      isAiRoom: true,
      aiDifficulty: difficulty,
      players: [
        {
          userId: socket.userId,
          username: socket.username,
          avatar: socket.avatar || '',
          socketId: socket.id,
          secretNumber: null,
          rpsChoice: null,
          ready: false
        },
        {
          userId: 'ai_bot_system',
          username: botTitle,
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GameAI',
          socketId: 'ai_bot_socket',
          secretNumber: encryptSecret(aiSecret),
          rpsChoice: aiRps,
          ready: true
        }
      ],
      state: 'SETTING_SECRET',
      guesses: [],
      rpsWinnerIndex: -1,
      activeTurnIndex: -1,
      winnerIndex: -1,
      startedAt: new Date().toISOString(),
      createdAt: Date.now(),
      saved: false
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.currentRoomId = roomId;
    socket.emit('ROOM_CREATED', room);
    socket.emit('GAME_START', room);
    console.log(`[Game] AI Room created (${difficulty}): ${roomId} by ${socket.username}`);
  });

  // --- JOIN ROOM ---
  socket.on('JOIN_ROOM', (roomId) => {
    if (!progressionReady) {
      socket.emit('GAME_ERROR', 'PvP progression is temporarily unavailable.');
      return;
    }
    const activeRoom = findActiveRoomForUser(socket.userId);
    if (activeRoom) {
      socket.emit('GAME_ERROR', 'You are already in an active room.');
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('GAME_ERROR', 'Room not found.');
      return;
    }
    if (room.state !== 'WAITING_FOR_PLAYERS') {
      socket.emit('GAME_ERROR', 'Room is already full or in play.');
      return;
    }
    if (room.players.some(player => player.disconnectedAt || player.hasLeft)) {
      socket.emit('GAME_ERROR', 'Room host is reconnecting. Please try again shortly.');
      return;
    }
    // Prevent duplicate joining
    if (room.players.some(p => p.userId === socket.userId)) {
      socket.emit('GAME_ERROR', 'You have already joined this room.');
      return;
    }

    room.players.push({
      userId: socket.userId,
      username: socket.username,
      avatar: socket.avatar || '',
      socketId: socket.id,
      secretNumber: null,
      rpsChoice: null,
      ready: false
    });
    
    socket.join(roomId);
    socket.currentRoomId = roomId;
    room.state = 'SETTING_SECRET'; // Advance to setting secret state
    room.startedAt = new Date().toISOString(); // Record game start time
    room.matchId = crypto.randomUUID();
    room.finishedAt = null;
    room.endReason = null;
    room.forfeitedPlayerId = null;
    room.xpSettlement = null;
    room.resultFinalized = false;
    room.roundNumber = (room.roundNumber || 0) + 1;
    room.saved = false;
    syncRoomToRedis(roomId, room);
    
    io.to(roomId).emit('GAME_START', room);
    io.emit('LOBBY_ROOMS', getJoinableRooms());
    console.log(`[Game] ${socket.username} joined room ${roomId}. Game moves to SETTING_SECRET.`);
  });

  // --- SET SECRET NUMBER ---
  socket.on('SET_SECRET', ({ roomId, secret }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'SETTING_SECRET') {
      socket.emit('GAME_ERROR', 'Invalid action or room state.');
      return;
    }
    if (!isValidSecret(secret)) {
      socket.emit('GAME_ERROR', 'Secret must be 4 unique digits.');
      return;
    }

    const player = room.players.find(p => p.userId === socket.userId);
    if (!player) return;
    
    // Encrypt and store secret key
    player.secretNumber = encryptSecret(secret);
    player.ready = true;

    // Check if both players have entered their secrets
    const allReady = room.players.every(p => p.ready);
    if (allReady) {
      // Clear ready statuses for RPS phase
      room.players.forEach(p => p.ready = false);
      if (room.isAiRoom) {
        room.players[1].ready = true; // AI is ready with its pre-selected RPS choice!
      }
      room.state = 'RPS_DECISION';
      syncRoomToRedis(roomId, room);
      io.to(roomId).emit('RPS_PHASE', room);
      console.log(`[Game] Both secrets set in ${roomId}. Moving to RPS_DECISION.`);
    } else {
      syncRoomToRedis(roomId, room);
      socket.emit('SECRET_ACCEPTED');
      socket.to(roomId).emit('OPPONENT_SECRET_SET');
    }
  });

  // --- SUBMIT ROCK PAPER SCISSORS (Tù xì) ---
  socket.on('SUBMIT_RPS', ({ roomId, choice }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'RPS_DECISION') {
      socket.emit('GAME_ERROR', 'Invalid action or room state.');
      return;
    }
    if (!['rock', 'paper', 'scissors'].includes(choice)) {
      socket.emit('GAME_ERROR', 'Invalid Rock-Paper-Scissors choice.');
      return;
    }

    const player = room.players.find(p => p.userId === socket.userId);
    if (!player) return;
    player.rpsChoice = choice;
    player.ready = true;

    const allSubmitted = room.players.every(p => p.ready);
    if (allSubmitted) {
      const p1 = room.players[0];
      const p2 = room.players[1];
      
      let winnerIdx = -1; // -1 represents a tie
      
      if (p1.rpsChoice === p2.rpsChoice) {
        winnerIdx = -1; // Tie
      } else if (
        (p1.rpsChoice === 'rock' && p2.rpsChoice === 'scissors') ||
        (p1.rpsChoice === 'paper' && p2.rpsChoice === 'rock') ||
        (p1.rpsChoice === 'scissors' && p2.rpsChoice === 'paper')
      ) {
        winnerIdx = 0;
      } else {
        winnerIdx = 1;
      }

      if (winnerIdx === -1) {
        // Reset and draw again
        room.players.forEach(p => {
          p.rpsChoice = null;
          p.ready = false;
        });
        if (room.isAiRoom) {
          room.players[1].rpsChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
          room.players[1].ready = true;
        }
        syncRoomToRedis(roomId, room);
        io.to(roomId).emit('RPS_TIE', {
          p1Choice: p1.rpsChoice,
          p2Choice: p2.rpsChoice,
          players: room.players
        });
        console.log(`[Game] RPS tie in ${roomId}. Resetting choice.`);
      } else {
        // We have a winner!
        room.rpsWinnerIndex = winnerIdx;
        room.activeTurnIndex = winnerIdx; // Winner plays first
        room.state = 'PLAYING';
        room.players.forEach(p => p.ready = false);
        syncRoomToRedis(roomId, room);
        
        io.to(roomId).emit('RPS_RESULT', {
          winnerIndex: winnerIdx,
          p1Choice: p1.rpsChoice,
          p2Choice: p2.rpsChoice,
          roomState: room
        });
        console.log(`[Game] RPS winner in ${roomId}: Player ${winnerIdx} (${room.players[winnerIdx].username}).`);

        if (room.isAiRoom && winnerIdx === 1) {
          // Wait for client's 3s countdown to finish before AI makes first guess
          setTimeout(() => handleAiTurn(room), 4000);
        }
      }
    } else {
      syncRoomToRedis(roomId, room);
      socket.emit('RPS_ACCEPTED');
      socket.to(roomId).emit('OPPONENT_RPS_SUBMITTED');
    }
  });

  // --- SUBMIT GUESS ---
  socket.on('SUBMIT_GUESS', async ({ roomId, guess }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'PLAYING') {
      socket.emit('GAME_ERROR', 'Invalid action or room state.');
      return;
    }
    const playerIdx = room.players.findIndex(p => p.userId === socket.userId);
    if (playerIdx === -1 || playerIdx !== room.activeTurnIndex) {
      socket.emit('GAME_ERROR', 'It is not your turn.');
      return;
    }
    if (!isValidSecret(guess)) {
      socket.emit('GAME_ERROR', 'Guess must be 4 unique digits.');
      return;
    }

    const opponentIdx = playerIdx === 0 ? 1 : 0;
    const opponent = room.players[opponentIdx];
    
    // Decrypt opponent's secret key
    const decryptedSecret = decryptSecret(opponent.secretNumber);
    if (!decryptedSecret) {
      socket.emit('GAME_ERROR', 'Security validation error. Failed to retrieve code.');
      return;
    }

    // Evaluate guess (cows and bulls)
    const { correctNumbers, correctPosition } = checkGuess(decryptedSecret, guess);
    
    const guessRecord = {
      playerIndex: playerIdx,
      guess,
      correctNumbers,
      correctPosition,
      timestamp: new Date().toISOString()
    };
    
    room.guesses.push(guessRecord);

    // Win condition check
    if (correctPosition === 4) {
      room.state = 'FINISHED';
      room.winnerIndex = playerIdx;
      room.finishedAt = new Date().toISOString();
      const finishingMatchId = room.matchId;
      room.endReason = 'COMPLETED';
      room.forfeitReason = null;
      room.forfeitedPlayerId = null;

      if (!room.isAiRoom) {
        try {
          await persistRoomToRedis(roomId, room);
        } catch (error) {
          console.error(
            `[Redis] Failed to persist terminal completed snapshot ${roomId}:`,
            error.message
          );
        }

        try {
          await settleRoomProgress(room, { endReason: 'correct_guess' });
        } catch (error) {
          console.error(`[XP] Failed to settle completed match ${room.matchId}:`, error.message);
          room.xpSettlement = createFailedSettlement(room);
        }

        if (
          rooms.get(roomId) !== room
          || room.matchId !== finishingMatchId
          || room.state !== 'FINISHED'
        ) {
          return;
        }

        room.resultFinalized = true;
        syncRoomToRedis(roomId, room);
        emitFinishedPvpRoom(room, io.to(roomId), guessRecord);
      } else {
        const winnerSecret = decryptSecret(room.players[playerIdx].secretNumber);
        room.resultFinalized = true;

        // Settle AI match for human player (win: +5 Easy, +10 Medium, +20 Hard)
        let aiSettlement = null;
        try {
          const humanPlayer = room.players[0];
          if (humanPlayer && humanPlayer.userId) {
            const settlementResult = await settleAiMatch({
              userId: humanPlayer.userId,
              aiDifficulty: room.aiDifficulty || 'medium',
              isUserWinner: true,
              room
            });
            aiSettlement = { xpResults: [settlementResult] };
            room.xpSettlement = aiSettlement;
            void invalidateUserAndLeaderboardCache(humanPlayer.userId);
          }
        } catch (err) {
          console.error(`[AI Settlement] Failed to settle AI win for room ${roomId}:`, err.message);
        }

        syncRoomToRedis(roomId, room);
        io.to(roomId).emit('GAME_OVER', {
          winnerIndex: playerIdx,
          winningGuess: guessRecord,
          roomState: room,
          opponentSecret: decryptedSecret,
          matchStats: buildMatchStats(room, {
            winnerSecret,
            loserSecret: decryptedSecret,
            settlement: aiSettlement
          })
        });
      }
      console.log(`[Game] Room ${roomId} finished. Winner: ${room.players[playerIdx].username}.`);
    } else {
      // Toggle active turn
      room.activeTurnIndex = opponentIdx;
      syncRoomToRedis(roomId, room);
      io.to(roomId).emit('GUESS_RESULT', {
        lastGuess: guessRecord,
        roomState: room
      });
      console.log(`[Game] Guess in ${roomId}: Player ${playerIdx} guessed ${guess}. Result: ${correctNumbers} nums, ${correctPosition} pos. Next turn: Player ${opponentIdx}.`);

      if (room.isAiRoom && room.activeTurnIndex === 1) {
        handleAiTurn(room);
      }
    }
  });

  // --- PLAY AGAIN ---
  socket.on('PLAY_AGAIN', async (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'FINISHED') {
      socket.emit('GAME_ERROR', 'Invalid action.');
      return;
    }
    if (
      !room.isAiRoom
      && (!room.saved || !room.xpSettlement || !room.resultFinalized)
    ) {
      try {
        const finalized = await finalizePendingTerminalRoom(room, socket);
        if (!finalized) return;
      } catch (error) {
        console.error(`[XP] Rematch blocked while settling ${room.matchId}:`, error.message);
        socket.emit(
          'GAME_ERROR',
          'Match settlement is still pending. Please try again shortly.'
        );
        return;
      }
    }
    if (room.endReason === 'FORFEIT') {
      socket.emit('GAME_ERROR', 'Rematch is unavailable after a player forfeits.');
      return;
    }

    const player = room.players.find(p => p.userId === socket.userId);
    if (!player) return;
    player.ready = true;

    const bothReady = room.players.every(p => p.ready);
    if (bothReady || room.isAiRoom) {
      const newAiSecret = generate4DigitCode();
      const newAiRps = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];

      // Reset state for new round
      room.players.forEach(p => {
        p.secretNumber = null;
        p.rpsChoice = null;
        p.ready = false;
      });

      if (room.isAiRoom) {
        room.players[1].secretNumber = encryptSecret(newAiSecret);
        room.players[1].rpsChoice = newAiRps;
        room.players[1].ready = true;
      }

      room.guesses = [];
      room.matchId = crypto.randomUUID();
      room.state = 'SETTING_SECRET';
      room.rpsWinnerIndex = -1;
      room.activeTurnIndex = -1;
      room.winnerIndex = -1;
      room.startedAt = new Date().toISOString();
      room.finishedAt = null;
      room.endReason = null;
      room.forfeitReason = null;
      room.forfeitedPlayerId = null;
      room.xpSettlement = null;
      room.resultFinalized = false;
      room.roundNumber = (room.roundNumber || 0) + 1;
      room.saved = false;
      syncRoomToRedis(roomId, room);

      io.to(roomId).emit('GAME_START', room);
      console.log(`[Game] Room ${roomId} play again started.`);
    } else {
      syncRoomToRedis(roomId, room);
      socket.to(roomId).emit('OPPONENT_WANTS_PLAY_AGAIN');
    }
  });

  // --- CHAT MESSAGES ---
  socket.on('SEND_MESSAGE', ({ roomId, message }) => {
    if (!message || typeof message !== 'string' || message.trim().length === 0) return;
    io.to(roomId).emit('CHAT_MESSAGE', {
      userId: socket.userId,
      username: socket.username,
      content: message.trim().substring(0, 300),
      timestamp: new Date().toISOString()
    });
  });

  // --- LEAVE ROOM (Intentional - button click) ---
  const handleIntentionalLeave = async (socket) => {
    const targetEntries = socket.currentRoomId && rooms.has(socket.currentRoomId)
      ? [[socket.currentRoomId, rooms.get(socket.currentRoomId)]]
      : [...rooms.entries()].filter(([, candidateRoom]) =>
          candidateRoom.players?.some(
            player => player.userId === socket.userId && player.socketId === socket.id
          )
        );

    for (const [roomId, room] of targetEntries) {
      const pIdx = room.players.findIndex(
        player =>
          player.userId === socket.userId
          && player.socketId === socket.id
          && !player.hasLeft
      );
      if (pIdx === -1) continue;

      console.log(`[Game] User ${socket.username} intentionally left room ${roomId}`);

      const timerKey = `${roomId}:${socket.userId}`;
      const timerId = disconnectTimers.get(timerKey);
      if (timerId) {
        clearTimeout(timerId);
        disconnectTimers.delete(timerKey);
      }

      if (room.isAiRoom) {
        rooms.delete(roomId);
        deleteRoomFromRedis(roomId);
        socket.leave(roomId);
        console.log(`[Game] AI Room ${roomId} destroyed immediately because human left.`);
      } else if (room.state === 'PLAYING' && room.players.length === 2) {
        await finishPvpByForfeit(
          room,
          socket.userId,
          'intentional_leave',
          socket.to(roomId)
        );
        socket.leave(roomId);
      } else if (room.state === 'FINISHED' && !room.saved) {
        // A result may already be settling while a client closes/leaves.
        // Keep the immutable two-player snapshot intact until settlement and
        // exclude the leaving socket from the pending GAME_OVER broadcast.
        socket.leave(roomId);
        room.players[pIdx].hasLeft = true;
        room.players[pIdx].socketId = null;
        try {
          await settleRoomProgress(room, {
            endReason: room.endReason === 'FORFEIT'
              ? (room.forfeitReason || 'disconnect_timeout')
              : 'correct_guess',
            forfeitedPlayerId: room.forfeitedPlayerId || null
          });
        } catch (error) {
          console.error(`[XP] Pending settlement failed while leaving ${roomId}:`, error.message);
        }
        if (
          room.saved
          && room.players.every(player => player.hasLeft)
          && rooms.get(roomId) === room
        ) {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          console.log(`[Game] Settled room ${roomId} deleted because both players left.`);
        }
      } else if (
        room.state === 'FINISHED'
        && (room.endReason === 'FORFEIT' || room.players.some(player => player.hasLeft))
      ) {
        rooms.delete(roomId);
        deleteRoomFromRedis(roomId);
        socket.leave(roomId);
        console.log(`[Game] Forfeited room ${roomId} closed after the remaining player left.`);
      } else {
        room.players.splice(pIdx, 1);
        socket.leave(roomId);

        if (room.players.length === 0) {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          console.log(`[Game] Room ${roomId} deleted as it became empty.`);
        } else {
          room.state = 'WAITING_FOR_PLAYERS';
          room.guesses = [];
          room.matchId = null;
          room.winnerIndex = -1;
          room.finishedAt = null;
          room.endReason = null;
          room.forfeitReason = null;
          room.forfeitedPlayerId = null;
          room.xpSettlement = null;
          room.resultFinalized = false;
          room.saved = false;
          room.players.forEach(player => {
            player.secretNumber = null;
            player.rpsChoice = null;
            player.ready = false;
            player.disconnectedAt = null;
            player.hasLeft = false;
          });
          syncRoomToRedis(roomId, room);
          io.to(roomId).emit('PLAYER_LEFT', {
            username: socket.username,
            roomState: room
          });
        }
      }

      socket.currentRoomId = null;
      io.emit('LOBBY_ROOMS', getJoinableRooms());
      return;
    }
  };

  socket.on('LEAVE_ROOM', async (acknowledge) => {
    try {
      await handleIntentionalLeave(socket);
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: true });
      }
    } catch (error) {
      console.error(`[Game] Failed to leave room for ${socket.userId}:`, error.message);
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false });
      }
    }
  });

  // --- DISCONNECT (Unintentional - lost connection, closed tab) ---
  // 60-second grace period for reconnection
  socket.on('disconnect', () => {
    console.log(`[Game] User disconnected: ${socket.username} (${socket.userId})`);
    
    rooms.forEach((room, roomId) => {
      if (socket.currentRoomId && roomId !== socket.currentRoomId) return;
      const player = room.players.find(
        p => p.userId === socket.userId && p.socketId === socket.id && !p.hasLeft
      );
      if (player) {
        if (room.isAiRoom) {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          console.log(`[Game] AI Room ${roomId} destroyed immediately on user disconnect.`);
          io.emit('LOBBY_ROOMS', getJoinableRooms());
          return;
        }

        // Mark player as temporarily disconnected
        player.disconnectedAt = Date.now();
        syncRoomToRedis(roomId, room);
        
        // Notify opponent
        io.to(roomId).emit('PLAYER_TEMPORARILY_DISCONNECTED', {
          username: socket.username,
          roomState: room
        });
        console.log(`[Game] User ${socket.username} temporarily disconnected from room ${roomId}. 60s grace period started.`);
        
        // Set 60-second timer
        const timerKey = `${roomId}:${socket.userId}`;
        const previousTimer = disconnectTimers.get(timerKey);
        if (previousTimer) {
          clearTimeout(previousTimer);
          disconnectTimers.delete(timerKey);
        }

        const handleDisconnectTimeout = async () => {
          disconnectTimers.delete(timerKey);
          
          // Check if player is still disconnected
          const currentRoom = rooms.get(roomId);
          if (!currentRoom) return;
          const currentPlayer = currentRoom.players.find(p => p.userId === socket.userId);
          if (
            !currentPlayer
            || !currentPlayer.disconnectedAt
            || currentPlayer.socketId !== socket.id
          ) {
            return;
          }

          const disconnectedOpponent = currentRoom.players.find(
            candidate =>
              candidate.userId !== socket.userId
              && !candidate.hasLeft
              && candidate.disconnectedAt
          );
          if (
            disconnectedOpponent
            && currentRoom.state !== 'FINISHED'
          ) {
            const opponentGraceRemaining = Math.max(
              0,
              (60 * 1000) - (Date.now() - disconnectedOpponent.disconnectedAt)
            );
            if (opponentGraceRemaining > 0) {
              const retryTimer = setTimeout(
                handleDisconnectTimeout,
                opponentGraceRemaining + 50
              );
              disconnectTimers.set(timerKey, retryTimer);
              return;
            }

            await archiveAbandonedPvpRoom(
              currentRoom,
              'both_players_disconnect_timeout'
            );
            io.emit('LOBBY_ROOMS', getJoinableRooms());
            return;
          }

          if (
            currentRoom.state === 'FINISHED'
            && (!currentRoom.saved || !currentRoom.resultFinalized)
          ) {
            const pendingMatchId = currentRoom.matchId;
            const pendingSettlement = pendingMatchId
              ? settlementPromises.get(pendingMatchId)
              : null;
            if (pendingSettlement) {
              try {
                await pendingSettlement;
              } catch (error) {
                console.error(
                  `[XP] Terminal match ${pendingMatchId} is still pending after disconnect:`,
                  error.message
                );
              }
            }

            if (
              rooms.get(roomId) !== currentRoom
              || currentRoom.matchId !== pendingMatchId
            ) {
              return;
            }

            if (!currentRoom.saved || !currentRoom.resultFinalized) {
              currentPlayer.hasLeft = true;
              currentPlayer.socketId = null;
              try {
                await persistRoomToRedis(roomId, currentRoom);
              } catch (error) {
                console.error(`[Redis] Failed to preserve pending terminal room ${roomId}:`, error.message);
              }
              console.log(`[XP] Room ${roomId} kept terminal for a later settlement retry.`);
              return;
            }
          }

          if (currentRoom.state === 'PLAYING' && currentRoom.players.length === 2) {
            await finishPvpByForfeit(
              currentRoom,
              socket.userId,
              'disconnect_timeout',
              io.to(roomId)
            );
            io.emit('LOBBY_ROOMS', getJoinableRooms());
            return;
          }

          if (
            currentRoom.state === 'FINISHED'
            && currentRoom.endReason === 'FORFEIT'
          ) {
            const settlingMatchId = currentRoom.matchId;
            const pendingSettlement = settlingMatchId
              ? settlementPromises.get(settlingMatchId)
              : null;
            if (pendingSettlement) {
              try {
                await pendingSettlement;
              } catch (error) {
                console.error(
                  '[XP] Pending settlement failed before room cleanup:',
                  error.message
                );
              }
            }
            if (rooms.get(roomId) !== currentRoom) return;
            rooms.delete(roomId);
            deleteRoomFromRedis(roomId);
            console.log(`[Game] Forfeited room ${roomId} deleted after disconnect timeout.`);
            io.emit('LOBBY_ROOMS', getJoinableRooms());
            return;
          }
          
          console.log(`[Game] User ${socket.username} did not reconnect within 60s. Removing from room ${roomId}.`);
          
          // Remove player permanently
          const idx = currentRoom.players.findIndex(p => p.userId === socket.userId);
          if (idx !== -1) currentRoom.players.splice(idx, 1);
          
          if (currentRoom.players.length === 0) {
            rooms.delete(roomId);
            deleteRoomFromRedis(roomId);
            console.log(`[Game] Room ${roomId} deleted (disconnect timeout, empty).`);
          } else {
            currentRoom.state = 'WAITING_FOR_PLAYERS';
            currentRoom.guesses = [];
            currentRoom.matchId = null;
            currentRoom.winnerIndex = -1;
            currentRoom.finishedAt = null;
            currentRoom.endReason = null;
            currentRoom.forfeitReason = null;
            currentRoom.forfeitedPlayerId = null;
            currentRoom.xpSettlement = null;
            currentRoom.resultFinalized = false;
            currentRoom.saved = false;
            currentRoom.players.forEach(remainingPlayer => {
              remainingPlayer.secretNumber = null;
              remainingPlayer.rpsChoice = null;
              remainingPlayer.ready = false;
              remainingPlayer.disconnectedAt = null;
              remainingPlayer.hasLeft = false;
            });
            syncRoomToRedis(roomId, currentRoom);
            io.to(roomId).emit('PLAYER_DISCONNECTED', {
              username: socket.username,
              roomState: currentRoom
            });
          }
          
          io.emit('LOBBY_ROOMS', getJoinableRooms());
        };

        const timerId = setTimeout(handleDisconnectTimeout, 60 * 1000);
        
        disconnectTimers.set(timerKey, timerId);
      }
    });
  });
});

// Helper to get rooms waiting for players (Lobby view)
function getJoinableRooms() {
  const list = [];
  rooms.forEach((room) => {
    const hasOnlyConnectedPlayers = room.players?.every(
      player => !player.disconnectedAt && !player.hasLeft
    );
    if (
      !room.isAiRoom
      && room.state !== 'FINISHED'
      && room.players
      && room.players.length > 0
      && room.players.length < 2
      && hasOnlyConnectedPlayers
    ) {
      list.push({
        roomId: room.roomId,
        hostName: room.players[0]?.username || 'Host',
        hostAvatar: room.players[0]?.avatar || '',
        playerCount: room.players.length,
        maxPlayers: 2,
        state: room.state,
        createdAt: room.createdAt || Date.now()
      });
    }
  });
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

app.get('/api/game-profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const cacheKey = `${PROFILE_CACHE_PREFIX}${decoded.userId}`;

    const cachedProfile = await getCachedJson(cacheKey);
    if (cachedProfile) {
      return res.json({ profile: cachedProfile, cached: true });
    }

    const profile = await getGameProfileSummary(decoded.userId);
    if (profile) {
      void setCachedJson(cacheKey, profile, PROFILE_CACHE_TTL);
    }
    return res.json({ profile });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    console.error('[MongoDB] Failed to load game profile:', error.message);
    return res.status(500).json({ error: 'Failed to load game profile' });
  }
});

app.get('/api/history', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 10000)
      : 1;
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 15;
    const mode = String(req.query.mode || req.query.type || 'all').toLowerCase();
    const filter = { 'players.userId': userId };
    if (mode === 'pvp') {
      filter.isAiRoom = { $ne: true };
    } else if (mode === 'ai' || mode === 'pve') {
      filter.isAiRoom = true;
    }
    const [history, total] = await Promise.all([
      GameHistory.find(filter)
        .sort({ finishedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GameHistory.countDocuments(filter)
    ]);

    res.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/achievements', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const [profile, historyList] = await Promise.all([
      GameProfile.findOne({ userId }).lean(),
      GameHistory.find({ 'players.userId': userId }).sort({ finishedAt: -1 }).limit(100).lean()
    ]);

    const result = calculateUserAchievements(profile, historyList);
    return res.json(result);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 50;

    const cacheKey = `${LEADERBOARD_CACHE_PREFIX}${limit}`;
    const cachedData = await getCachedJson(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    const rawProfiles = await GameProfile.find({})
      .populate('userId', 'name avatar')
      .lean();

    const sortedProfiles = rawProfiles
      .map(profile => ({
        ...profile,
        rating: typeof profile.rating === 'number' && Number.isFinite(profile.rating) ? profile.rating : 1000,
        wins: profile.wins || 0,
        losses: profile.losses || 0
      }))
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      })
      .slice(0, limit);

    const leaderboard = sortedProfiles.map((profile, index) => {
      const userObj = profile.userId || {};
      const wins = profile.wins;
      const losses = profile.losses;
      const totalMatches = wins + losses;
      const winRate = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(1)) : 0;
      const rating = profile.rating;
      const highestRating = Math.max(rating, profile.highestRating ?? rating);
      const rankInfo = getRank(rating);

      return {
        rank: index + 1,
        userId: String(userObj._id || profile.userId),
        username: userObj.name || 'Player',
        avatar: userObj.avatar || '',
        rating,
        highestRating,
        rankTier: rankInfo.key,
        rankNameVi: rankInfo.nameVi,
        rankNameEn: rankInfo.nameEn,
        wins,
        losses,
        totalMatches,
        winRate,
        currentWinStreak: profile.currentWinStreak || 0,
        bestWinStreak: profile.bestWinStreak || 0
      };
    });

    const responsePayload = { leaderboard };
    void setCachedJson(cacheKey, responsePayload, LEADERBOARD_CACHE_TTL);
    res.json(responsePayload);
  } catch (err) {
    console.error('[MongoDB] Failed to fetch leaderboard:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: getJoinableRooms() });
});

app.get('/', (req, res) => {
  res.send('Game Backend is running.');
});

// Connect to MongoDB and load rooms from Redis before starting the server
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    await Promise.all([GameHistory.init(), GameProfile.init()]);
    progressionReady = true;
    console.log('[MongoDB] XP/history indexes are ready.');
    console.log('[MongoDB] Connected to MongoDB Atlas successfully.');
  } catch (err) {
    progressionReady = false;
    console.error('[MongoDB] Failed to connect to MongoDB Atlas:', err.message);
    console.warn('[MongoDB] Server will start without MongoDB. Game history will NOT be saved.');
  }
  
  await loadRoomsFromRedis();
  
  server.listen(PORT, () => {
    console.log(`[Game Backend] Server running on port ${PORT}`);
  });
}

startServer();
