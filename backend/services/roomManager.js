const crypto = require('crypto');
const {
  redis,
  REDIS_KEY_PREFIX,
  ROOM_TTL_SECONDS,
  invalidateUserAndLeaderboardCache
} = require('../config/redis');
const { decryptSecret } = require('../utils/crypto');
const {
  settlePvpMatch
} = require('./matchSettlement');
const {
  settleAbandonedPvpMatch
} = require('./abandonedMatchSettlement');

// --- Game Rooms State (Hybrid: RAM + Redis) ---
// roomId -> RoomObject (in-memory for speed)
const rooms = new Map();
const roomPersistenceQueues = new Map();
const abandonedSettlementPromises = new Map();
const settlementPromises = new Map();
const disconnectTimers = new Map(); // disconnectKey -> timerId
const restoredRoomTimers = new Map(); // roomId -> restart recovery timer
const userRoomCooldowns = new Map(); // userId -> timestamp of last room creation

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
  if (!redis) return;
  const snapshot = JSON.stringify(room);
  enqueueRoomPersistence(
    roomId,
    () => redis.set(`${REDIS_KEY_PREFIX}${roomId}`, snapshot, { ex: ROOM_TTL_SECONDS })
  )
    .then(() => console.log(`[Redis] Synced room ${roomId}`))
    .catch(err => console.error(`[Redis] Failed to sync room ${roomId}:`, err.message));
}

function persistRoomToRedis(roomId, room) {
  if (!redis) return Promise.resolve();
  const snapshot = JSON.stringify(room);
  return enqueueRoomPersistence(
    roomId,
    () => redis.set(`${REDIS_KEY_PREFIX}${roomId}`, snapshot, { ex: ROOM_TTL_SECONDS })
  );
}

// Delete room from Redis (Immediate deletion, bypass queue)
function deleteRoomFromRedis(roomId) {
  roomPersistenceQueues.delete(roomId);
  if (!redis) return;
  redis.del(`${REDIS_KEY_PREFIX}${roomId}`)
    .then(() => console.log(`[Redis] Deleted room ${roomId}`))
    .catch(err => console.error(`[Redis] Failed to delete room ${roomId}:`, err.message));
}

// Refresh TTL for active rooms (reset 30-min timer)
function refreshRoomTTL(roomId) {
  if (!redis) return;
  enqueueRoomPersistence(
    roomId,
    () => redis.expire(`${REDIS_KEY_PREFIX}${roomId}`, ROOM_TTL_SECONDS)
  )
    .catch(err => console.error(`[Redis] Failed to refresh TTL for ${roomId}:`, err.message));
}

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

async function loadRoomsFromRedis(io) {
  if (!redis) {
    console.log('[Redis] Skipped loading rooms (Redis not configured).');
    return;
  }
  try {
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
          if (io) {
            prepareRestoredRoomForReconnect(room, io);
          }
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

function getPlayerGuessCounts(room) {
  return (room.players || []).map((_, playerIndex) =>
    (room.guesses || []).filter(guess => guess.playerIndex === playerIndex).length
  );
}

function createFailedSettlement(room) {
  return {
    xpEligible: false,
    xpEligibilityReason: 'SETTLEMENT_FAILED',
    ratingApplied: false,
    ratingReason: 'settlement_failed',
    xpResults: (room.players || []).map(player => ({
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
    totalGuesses: (room.guesses || []).length,
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

function prepareRestoredRoomForReconnect(room, io) {
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
        if (io) io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
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
      if (io) io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
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
        io ? io.to(room.roomId) : { emit: () => {} }
      );
      if (io) io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
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
        if (currentRoom.xpSettlement && io) {
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
    if (io) {
      io.to(room.roomId).emit('PLAYER_DISCONNECTED', {
        username: stalePlayers.map(player => player.username).join(', '),
        roomState: currentRoom
      });
      io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
    }
  }, 60 * 1000);

  restoredRoomTimers.set(room.roomId, timer);
}

function getJoinableRooms() {
  const list = [];
  rooms.forEach((room) => {
    const hasActiveHost = room.players?.some(
      player => !player.hasLeft
    );
    if (
      !room.isAiRoom
      && room.state !== 'FINISHED'
      && room.players
      && room.players.length > 0
      && hasActiveHost
    ) {
      list.push({
        roomId: room.roomId,
        hostName: room.players[0]?.username || 'Host',
        hostAvatar: room.players[0]?.avatar || '',
        playerCount: room.players.length,
        maxPlayers: 2,
        state: room.state,
        spectatorCount: (room.spectators || []).length,
        createdAt: room.createdAt || Date.now()
      });
    }
  });
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

module.exports = {
  rooms,
  disconnectTimers,
  settlementPromises,
  restoredRoomTimers,
  userRoomCooldowns,
  enqueueRoomPersistence,
  syncRoomToRedis,
  persistRoomToRedis,
  deleteRoomFromRedis,
  refreshRoomTTL,
  getAbandonedHistoryReason,
  settleAbandonedRoomHistory,
  scheduleAbandonedSettlementRetry,
  archiveAbandonedPvpRoom,
  loadRoomsFromRedis,
  getPlayerGuessCounts,
  createFailedSettlement,
  settleRoomProgress,
  finalizePendingTerminalRoom,
  buildMatchStats,
  emitFinishedPvpRoom,
  finishPvpByForfeit,
  findActiveRoomForUser,
  prepareRestoredRoomForReconnect,
  getJoinableRooms
};
