const crypto = require('crypto');
const GameProfile = require('../models/GameProfile');
const { socketAuthMiddleware } = require('./socketAuth');
const { encryptSecret, decryptSecret } = require('../utils/crypto');
const {
  checkGuess,
  isValidSecret,
  generateRoomId,
  generate4DigitCode,
  sanitizeRoomForSpectator
} = require('../utils/gameLogic');
const { handleAiTurn } = require('../services/aiTurnHandler');
const { settleAiMatch } = require('../services/aiMatchSettlement');
const { resolveEquippedTitle, syncAndDetectNewAchievements } = require('../services/achievements');
const { invalidateUserAndLeaderboardCache } = require('../config/redis');

async function getPlayerProfileMeta(userId) {
  let currentWinStreak = 0;
  let equippedTitle = null;
  try {
    const profile = await GameProfile.findOne({ userId }).lean();
    currentWinStreak = profile?.currentWinStreak || 0;
    equippedTitle = resolveEquippedTitle(profile?.equippedTitleId);
  } catch {
    // Ignore profile lookup error
  }
  return { currentWinStreak, equippedTitle };
}

function setupSocket(io, roomManager, getIsProgressionReady) {
  const {
    rooms,
    disconnectTimers,
    settlementPromises,
    userRoomCooldowns,
    syncRoomToRedis,
    persistRoomToRedis,
    deleteRoomFromRedis,
    refreshRoomTTL,
    archiveAbandonedPvpRoom,
    finalizePendingTerminalRoom,
    emitFinishedPvpRoom,
    finishPvpByForfeit,
    findActiveRoomForUser,
    getJoinableRooms,
    settleRoomProgress
  } = roomManager;

  // Mount JWT auth middleware
  io.use(socketAuthMiddleware);

  // Debounced lobby broadcast helper: batches rapid changes into a single broadcast to 'lobby' room only
  let lobbyBroadcastTimer = null;
  function broadcastLobbyRooms(immediate = false) {
    if (immediate) {
      if (lobbyBroadcastTimer) {
        clearTimeout(lobbyBroadcastTimer);
        lobbyBroadcastTimer = null;
      }
      io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
      return;
    }
    if (lobbyBroadcastTimer) return;
    lobbyBroadcastTimer = setTimeout(() => {
      lobbyBroadcastTimer = null;
      io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
    }, 300);
  }

  function cleanupSoloWaitingRoomsForUser(userId, exceptRoomId = null) {
    if (!userId) return;
    const targetUid = String(userId);
    rooms.forEach((candidateRoom, candidateId) => {
      if (exceptRoomId && candidateId === exceptRoomId) return;
      const isUserInRoom = candidateRoom.players?.some(p => String(p.userId) === targetUid);
      if (
        isUserInRoom &&
        (candidateRoom.state === 'WAITING_FOR_PLAYERS' || candidateRoom.state === 'FINISHED') &&
        candidateRoom.players.length <= 1
      ) {
        const timerKey = `${candidateId}:${userId}`;
        const timerId = disconnectTimers.get(timerKey);
        if (timerId) {
          clearTimeout(timerId);
          disconnectTimers.delete(timerKey);
        }
        rooms.delete(candidateId);
        deleteRoomFromRedis(candidateId);
      }
    });
  }

  function convertRoomToWaiting(room, leavingUserId = null) {
    if (!room) return null;
    if (leavingUserId) {
      room.players = (room.players || []).filter(
        p => !p.hasLeft && String(p.userId) !== String(leavingUserId)
      );
    } else {
      room.players = (room.players || []).filter(p => !p.hasLeft);
    }

    if (!room.players || room.players.length === 0) {
      rooms.delete(room.roomId);
      deleteRoomFromRedis(room.roomId);
      return null;
    }

    const remainingPlayer = room.players[0];
    if (remainingPlayer?.disconnectedAt && Date.now() - remainingPlayer.disconnectedAt > 60000) {
      rooms.delete(room.roomId);
      deleteRoomFromRedis(room.roomId);
      return null;
    }

    room.state = 'WAITING_FOR_PLAYERS';
    room.guesses = [];
    room.rpsWinnerIndex = -1;
    room.activeTurnIndex = -1;
    room.winnerIndex = -1;
    room.startedAt = null;
    room.finishedAt = null;
    room.saved = false;
    room.matchId = null;
    room.endReason = null;
    room.forfeitReason = null;
    room.forfeitedPlayerId = null;
    room.xpSettlement = null;
    room.resultFinalized = false;
    room.roundNumber = 1;
    room.createdAt = Date.now();

    (room.players || []).forEach(p => {
      p.secretNumber = null;
      p.rpsChoice = null;
      p.ready = false;
      p.disconnectedAt = null;
      p.hasLeft = false;
    });

    syncRoomToRedis(room.roomId, room);
    return room;
  }

  function reconnectPlayerToRoom(socket, room) {
    if (!room || room.state === 'FINISHED') return false;
    const player = room.players?.find(
      p => String(p.userId) === String(socket.userId) && !p.hasLeft
    );
    if (!player) return false;

    const roomId = room.roomId;
    const timerKeyPrimary = `${roomId}:${player.userId}`;
    const timerKeySocket = `${roomId}:${socket.userId}`;
    const timerId = disconnectTimers.get(timerKeyPrimary) || disconnectTimers.get(timerKeySocket);
    if (timerId) {
      clearTimeout(timerId);
      disconnectTimers.delete(timerKeyPrimary);
      disconnectTimers.delete(timerKeySocket);
    }

    const wasDisconnected = Boolean(player.disconnectedAt);
    player.disconnectedAt = null;
    player.socketId = socket.id;
    socket.leave('lobby');
    socket.join(roomId);
    socket.currentRoomId = roomId;
    socket.isSpectator = false;

    syncRoomToRedis(roomId, room);
    socket.emit('RECONNECTED_TO_ROOM', room);
    if (wasDisconnected) {
      socket.to(roomId).emit('OPPONENT_RECONNECTED', {
        username: socket.username,
        roomState: room
      });
    }
    console.log(`[Game] User ${socket.username} reconnected to room ${roomId} (state: ${room.state})`);
    return true;
  }

  io.on('connection', (socket) => {
    console.log(`[Game] User connected: ${socket.username} (${socket.userId})`);

    // --- RECONNECT DETECTION & FINISHED ROOM CLEANUP ---
    rooms.forEach((room, roomId) => {
      const player = room.players?.find(p => String(p.userId) === String(socket.userId));
      if (!player || player.hasLeft) return;

      const timerKeyPrimary = `${roomId}:${player.userId}`;
      const timerKeySocket = `${roomId}:${socket.userId}`;
      const timerId = disconnectTimers.get(timerKeyPrimary) || disconnectTimers.get(timerKeySocket);
      if (timerId) {
        clearTimeout(timerId);
        disconnectTimers.delete(timerKeyPrimary);
        disconnectTimers.delete(timerKeySocket);
      }

      if (room.state === 'FINISHED') {
        if (!room.isAiRoom && (!room.saved || !room.resultFinalized) && room.players?.length === 2) {
          void finalizePendingTerminalRoom(room, socket)
            .catch(error => {
              console.error(
                `[XP] Could not finalize reconnected room ${roomId}:`,
                error.message
              );
            });
        }
        player.socketId = socket.id;
        player.disconnectedAt = null;
        socket.currentRoomId = roomId;
        socket.join(roomId);
        syncRoomToRedis(roomId, room);
        return;
      }

      reconnectPlayerToRoom(socket, room);
    });

    // Join lobby channel by default if not in an active room and send initial joinable rooms
    if (!socket.currentRoomId) {
      socket.join('lobby');
    }
    socket.emit('LOBBY_ROOMS', getJoinableRooms());

    socket.on('GET_LOBBY_ROOMS', () => {
      socket.emit('LOBBY_ROOMS', getJoinableRooms());
    });

    socket.on('JOIN_LOBBY', () => {
      socket.join('lobby');
      socket.emit('LOBBY_ROOMS', getJoinableRooms());
    });

    socket.on('LEAVE_LOBBY', () => {
      socket.leave('lobby');
    });

    socket.on('CHECK_ACTIVE_ROOM', () => {
      const activeRoom = findActiveRoomForUser(socket.userId);
      if (activeRoom) {
        reconnectPlayerToRoom(socket, activeRoom);
      }
    });

    // --- CREATE ROOM ---
    socket.on('CREATE_ROOM', async () => {
      const isReady = typeof getIsProgressionReady === 'function' ? getIsProgressionReady() : true;
      if (!isReady) {
        socket.emit('GAME_ERROR', 'PvP progression is temporarily unavailable.');
        return;
      }
      const activeRoom = findActiveRoomForUser(socket.userId);
      if (activeRoom) {
        if (activeRoom.state === 'WAITING_FOR_PLAYERS' && activeRoom.players?.length === 1) {
          reconnectPlayerToRoom(socket, activeRoom);
          return;
        }
        if (activeRoom.state !== 'FINISHED') {
          reconnectPlayerToRoom(socket, activeRoom);
          return;
        }
      }

      cleanupSoloWaitingRoomsForUser(socket.userId);

      const now = Date.now();
      const lastCreated = userRoomCooldowns.get(socket.userId);
      if (lastCreated && now - lastCreated < 8000) {
        const waitSec = Math.ceil((8000 - (now - lastCreated)) / 1000);
        socket.emit('GAME_ERROR', `Vui lòng chờ ${waitSec} giây trước khi tạo phòng mới.`);
        return;
      }
      userRoomCooldowns.set(socket.userId, now);

      const { currentWinStreak, equippedTitle } = await getPlayerProfileMeta(socket.userId);

      const roomId = generateRoomId(rooms);
      const room = {
        roomId,
        players: [
          {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.avatar || '',
            currentWinStreak,
            equippedTitle,
            socketId: socket.id,
            secretNumber: null,
            rpsChoice: null,
            ready: false
          }
        ],
        spectators: [],
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
      socket.leave('lobby');
      socket.join(roomId);
      socket.currentRoomId = roomId;

      syncRoomToRedis(roomId, room);
      socket.emit('ROOM_CREATED', room);
      broadcastLobbyRooms();
      console.log(`[Game] Room created: ${roomId} by ${socket.username} (Win streak: ${currentWinStreak})`);
    });

    // --- QUICK MATCH (Search Open Room Only) ---
    socket.on('QUICK_MATCH', async () => {
      const isReady = typeof getIsProgressionReady === 'function' ? getIsProgressionReady() : true;
      if (!isReady) {
        socket.emit('GAME_ERROR', 'PvP progression is temporarily unavailable.');
        return;
      }
      const activeRoom = findActiveRoomForUser(socket.userId);
      if (activeRoom) {
        reconnectPlayerToRoom(socket, activeRoom);
        return;
      }

      // Find the oldest waiting public PvP room with 1 active connected host
      let targetRoom = null;
      rooms.forEach((candidate) => {
        if (
          !candidate.isAiRoom &&
          candidate.state === 'WAITING_FOR_PLAYERS' &&
          Array.isArray(candidate.players) &&
          candidate.players.length === 1 &&
          candidate.players[0] &&
          !candidate.players[0].hasLeft &&
          !candidate.players[0].disconnectedAt &&
          String(candidate.players[0].userId) !== String(socket.userId)
        ) {
          if (!targetRoom || (candidate.createdAt || 0) < (targetRoom.createdAt || 0)) {
            targetRoom = candidate;
          }
        }
      });

      if (!targetRoom) {
        socket.emit('QUICK_MATCH_WAITING');
        return;
      }

      const { currentWinStreak, equippedTitle } = await getPlayerProfileMeta(socket.userId);

      // Re-verify targetRoom is still available after async profile lookup
      if (
        rooms.get(targetRoom.roomId) !== targetRoom ||
        targetRoom.state !== 'WAITING_FOR_PLAYERS' ||
        targetRoom.players.length !== 1 ||
        targetRoom.players[0]?.hasLeft ||
        targetRoom.players[0]?.disconnectedAt
      ) {
        socket.emit('QUICK_MATCH_WAITING');
        return;
      }

      const roomId = targetRoom.roomId;
      targetRoom.players.push({
        userId: socket.userId,
        username: socket.username,
        avatar: socket.avatar || '',
        currentWinStreak,
        equippedTitle,
        socketId: socket.id,
        secretNumber: null,
        rpsChoice: null,
        ready: false
      });

      targetRoom.spectators = targetRoom.spectators || [];
      socket.leave('lobby');
      socket.join(roomId);
      socket.currentRoomId = roomId;
      targetRoom.state = 'SETTING_SECRET';
      targetRoom.roundNumber = 1;
      targetRoom.createdAt = Date.now();
      targetRoom.startedAt = null;
      targetRoom.finishedAt = null;
      targetRoom.endReason = null;
      targetRoom.forfeitReason = null;
      targetRoom.forfeitedPlayerId = null;
      targetRoom.xpSettlement = null;
      targetRoom.resultFinalized = false;
      targetRoom.matchId = `pvp-${roomId}-${Date.now()}`;
      targetRoom.saved = false;
      syncRoomToRedis(roomId, targetRoom);

      socket.emit('QUICK_MATCH_FOUND', {
        roomId,
        hostName: targetRoom.players[0]?.username || 'Player',
        room: targetRoom
      });
      socket.to(roomId).emit('GAME_START', targetRoom);
      broadcastLobbyRooms();
      console.log(`[QuickMatch] ${socket.username} matched into room ${roomId}. Moving to SETTING_SECRET.`);
    });

    // --- CREATE AI ROOM ---
    socket.on('CREATE_AI_ROOM', async (data) => {
      const activeRoom = findActiveRoomForUser(socket.userId);
      if (activeRoom) {
        // Allow seamless 1-click switch from a solo waiting room directly into an AI match
        if (activeRoom.state === 'WAITING_FOR_PLAYERS' && activeRoom.players.length === 1) {
          const timerKey = `${activeRoom.roomId}:${socket.userId}`;
          const timerId = disconnectTimers.get(timerKey);
          if (timerId) {
            clearTimeout(timerId);
            disconnectTimers.delete(timerKey);
          }
          rooms.delete(activeRoom.roomId);
          deleteRoomFromRedis(activeRoom.roomId);
          socket.leave(activeRoom.roomId);
          broadcastLobbyRooms();
        } else {
          reconnectPlayerToRoom(socket, activeRoom);
          return;
        }
      }

      const { currentWinStreak, equippedTitle } = await getPlayerProfileMeta(socket.userId);
      const difficulty = (data && data.difficulty) ? data.difficulty : 'medium';
      const roomId = generateRoomId(rooms);
      const aiSecret = generate4DigitCode();
      const encryptedAiSecret = encryptSecret(aiSecret);

      const room = {
        roomId,
        isAiRoom: true,
        aiDifficulty: difficulty,
        players: [
          {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.avatar || '',
            currentWinStreak,
            equippedTitle,
            socketId: socket.id,
            secretNumber: null,
            rpsChoice: null,
            ready: false
          },
          {
            userId: 'ai_bot_' + roomId,
            username: `🤖 Bot (${difficulty.toUpperCase()})`,
            avatar: '',
            socketId: 'ai_bot_socket',
            secretNumber: encryptedAiSecret,
            rpsChoice: ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)],
            ready: true
          }
        ],
        spectators: [],
        state: 'SETTING_SECRET',
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
      socket.leave('lobby');
      socket.join(roomId);
      socket.currentRoomId = roomId;

      syncRoomToRedis(roomId, room);
      socket.emit('GAME_START', room);
      console.log(`[Game] AI Room created: ${roomId} (${difficulty}) for ${socket.username}.`);
    });

    // --- JOIN ROOM ---
    socket.on('JOIN_ROOM', async (roomId) => {
      const isReady = typeof getIsProgressionReady === 'function' ? getIsProgressionReady() : true;
      if (!isReady) {
        socket.emit('GAME_ERROR', 'PvP progression is temporarily unavailable.');
        return;
      }
      const activeRoom = findActiveRoomForUser(socket.userId);
      if (activeRoom) {
        reconnectPlayerToRoom(socket, activeRoom);
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('GAME_ERROR', 'Room not found.');
        return;
      }

      if (room.players.length >= 2) {
        socket.emit('GAME_ERROR', 'Room is full.');
        return;
      }

      if (room.players.some(p => p.userId === socket.userId)) {
        socket.emit('GAME_ERROR', 'You are already in this room.');
        return;
      }

      cleanupSoloWaitingRoomsForUser(socket.userId, roomId);

      const { currentWinStreak, equippedTitle } = await getPlayerProfileMeta(socket.userId);

      room.players.push({
        userId: socket.userId,
        username: socket.username,
        avatar: socket.avatar || '',
        currentWinStreak,
        equippedTitle,
        socketId: socket.id,
        secretNumber: null,
        rpsChoice: null,
        ready: false
      });

      room.spectators = room.spectators || [];
      socket.leave('lobby');
      socket.join(roomId);
      socket.currentRoomId = roomId;
      room.state = 'SETTING_SECRET';
      room.roundNumber = 1;
      room.createdAt = Date.now();
      room.startedAt = null;
      room.finishedAt = null;
      room.endReason = null;
      room.forfeitReason = null;
      room.forfeitedPlayerId = null;
      room.xpSettlement = null;
      room.resultFinalized = false;
      room.matchId = `pvp-${roomId}-${Date.now()}`;
      room.saved = false;
      syncRoomToRedis(roomId, room);

      io.to(roomId).emit('GAME_START', room);
      broadcastLobbyRooms();
      console.log(`[Game] ${socket.username} joined room ${roomId} (Win streak: ${currentWinStreak}). Game moves to SETTING_SECRET.`);
    });

    // --- JOIN SPECTATOR ---
    socket.on('JOIN_SPECTATOR', (roomId) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('GAME_ERROR', 'Room not found.');
        return;
      }

      const isPlayer = room.players?.some(p => p.userId === socket.userId && !p.hasLeft);
      if (isPlayer) {
        socket.join(roomId);
        socket.currentRoomId = roomId;
        socket.emit('ROOM_CREATED', room);
        return;
      }

      room.spectators = room.spectators || [];
      const existingIdx = room.spectators.findIndex(s => s.userId === socket.userId);

      const MAX_SPECTATORS_PER_ROOM = 10;
      if (existingIdx === -1 && room.spectators.length >= MAX_SPECTATORS_PER_ROOM) {
        socket.emit('GAME_ERROR', `Phòng đã đạt giới hạn tối đa ${MAX_SPECTATORS_PER_ROOM} khán giả.`);
        return;
      }

      const spectatorInfo = {
        userId: socket.userId,
        username: socket.username,
        avatar: socket.avatar || '',
        socketId: socket.id,
        joinedAt: Date.now()
      };
      if (existingIdx !== -1) {
        room.spectators[existingIdx] = spectatorInfo;
      } else {
        room.spectators.push(spectatorInfo);
      }

      socket.leave('lobby');
      socket.join(roomId);
      socket.currentRoomId = roomId;
      socket.isSpectator = true;

      const sanitizedRoom = sanitizeRoomForSpectator(room);
      socket.emit('SPECTATOR_JOINED', {
        room: sanitizedRoom,
        spectatorCount: room.spectators.length
      });

      io.to(roomId).emit('SPECTATOR_COUNT_CHANGED', {
        count: room.spectators.length
      });
      broadcastLobbyRooms();

      console.log(`[Spectator] User ${socket.username} joined room ${roomId} as spectator. Total: ${room.spectators.length}`);
    });

    // --- LEAVE SPECTATOR ---
    socket.on('LEAVE_SPECTATOR', (roomId) => {
      const targetRoomId = roomId || socket.currentRoomId;
      if (!targetRoomId) return;
      const room = rooms.get(targetRoomId);
      if (room && room.spectators) {
        room.spectators = room.spectators.filter(s => s.userId !== socket.userId && s.socketId !== socket.id);
        io.to(targetRoomId).emit('SPECTATOR_COUNT_CHANGED', {
          count: room.spectators.length
        });
      }
      socket.leave(targetRoomId);
      socket.join('lobby');
      socket.currentRoomId = null;
      socket.isSpectator = false;
      socket.emit('SPECTATOR_LEFT');
      broadcastLobbyRooms();
    });

    // --- SET SECRET NUMBER ---
    socket.on('SET_SECRET', ({ roomId, secret }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.state !== 'SETTING_SECRET') return;

      if (!isValidSecret(secret)) {
        socket.emit('GAME_ERROR', 'Secret must be 4 unique digits.');
        return;
      }

      const player = room.players.find(p => String(p.userId) === String(socket.userId));
      if (!player) return;

      player.secretNumber = encryptSecret(secret);
      player.ready = true;
      syncRoomToRedis(roomId, room);

      const allSet = room.players.every(p => p.ready);
      if (allSet) {
        room.state = 'RPS_DECISION';
        room.players.forEach(p => {
          if (!room.isAiRoom || p.userId !== room.players[1].userId) {
            p.ready = false;
          }
        });
        syncRoomToRedis(roomId, room);
        io.to(roomId).emit('START_RPS', room);
        io.to(roomId).emit('RPS_PHASE', room);
        console.log(`[Game] Both players set secrets in ${roomId}. Moving to RPS.`);
      } else {
        socket.emit('SECRET_ACCEPTED');
        socket.to(roomId).emit('OPPONENT_SECRET_SET');
        io.to(roomId).emit('PLAYER_READY', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // --- SUBMIT RPS ---
    socket.on('SUBMIT_RPS', ({ roomId, choice }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.state !== 'RPS_DECISION') return;

      const validChoices = ['rock', 'paper', 'scissors'];
      if (!validChoices.includes(choice)) {
        socket.emit('GAME_ERROR', 'Invalid RPS choice.');
        return;
      }

      const player = room.players.find(p => String(p.userId) === String(socket.userId));
      if (!player) return;

      player.rpsChoice = choice;
      player.ready = true;
      syncRoomToRedis(roomId, room);

      const allReady = room.players.every(p => p.ready);
      if (!allReady) {
        socket.to(roomId).emit('OPPONENT_RPS_READY', { userId: socket.userId });
        socket.to(roomId).emit('OPPONENT_RPS_SUBMITTED', { userId: socket.userId });
        return;
      }

      // Determine RPS Winner
      const p1 = room.players[0];
      const p2 = room.players[1];
      let winnerIdx = -1;

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
        room.rpsWinnerIndex = winnerIdx;
        room.activeTurnIndex = winnerIdx;
        room.state = 'PLAYING';
        room.startedAt = room.startedAt || new Date().toISOString();
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
          handleAiTurn(room, io);
        }
      }
    });

    // --- SUBMIT GUESS ---
    socket.on('SUBMIT_GUESS', async ({ roomId, guess }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.state !== 'PLAYING') return;

      const playerIdx = room.players.findIndex(p => String(p.userId) === String(socket.userId));
      if (playerIdx === -1) return;

      if (room.activeTurnIndex !== playerIdx) {
        socket.emit('GAME_ERROR', 'It is not your turn.');
        return;
      }

      // Rate limiting: 1s base cooldown with 5x escalation on rapid spam
      const now = Date.now();
      const cooldownMs = socket.guessCooldownMs || 1000;
      if (socket.lastGuessAt && now - socket.lastGuessAt < cooldownMs) {
        socket.guessSpamCount = (socket.guessSpamCount || 0) + 1;
        if (socket.guessSpamCount >= 2) {
          socket.guessCooldownMs = Math.min(25000, cooldownMs * 5);
        }
        const waitSec = Math.ceil((socket.guessCooldownMs - (now - socket.lastGuessAt)) / 1000);
        socket.emit('GAME_ERROR', `Thao tác quá nhanh! Vui lòng chờ ${waitSec} giây.`);
        return;
      }

      if (!isValidSecret(guess)) {
        socket.emit('GAME_ERROR', 'Guess must be 4 unique digits.');
        return;
      }

      const hasDuplicateGuess = (room.guesses || []).some(
        g => g.playerIndex === playerIdx && g.guess === guess
      );
      if (hasDuplicateGuess) {
        socket.emit('GAME_ERROR', 'Bạn đã từng đoán dãy số này trong trận rồi!');
        return;
      }

      socket.guessSpamCount = 0;
      socket.guessCooldownMs = 1000;
      socket.lastGuessAt = now;

      const opponentIdx = playerIdx === 0 ? 1 : 0;
      const opponent = room.players[opponentIdx];

      const opponentSecret = decryptSecret(opponent.secretNumber);
      if (!opponentSecret) {
        socket.emit('GAME_ERROR', 'Failed to read opponent secret.');
        return;
      }

      const { correctNumbers, correctPosition } = checkGuess(opponentSecret, guess);

      const guessRecord = {
        playerIndex: playerIdx,
        guess,
        correctNumbers,
        correctPosition,
        timestamp: new Date().toISOString()
      };
      room.guesses = room.guesses || [];
      room.guesses.push(guessRecord);
      refreshRoomTTL(roomId);

      if (correctPosition === 4) {
        room.state = 'FINISHED';
        room.winnerIndex = playerIdx;
        room.finishedAt = new Date().toISOString();
        room.endReason = 'COMPLETED';

        syncRoomToRedis(roomId, room);

        const winnerSecretDecrypted = decryptSecret(room.players[playerIdx]?.secretNumber);
        const loserSecretDecrypted = decryptSecret(room.players[opponentIdx]?.secretNumber);

        const winnerGuesses = room.guesses.filter(g => g.playerIndex === playerIdx);
        const loserGuesses = room.guesses.filter(g => g.playerIndex === opponentIdx);
        const durationMs = room.startedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;
        const durationSec = Math.floor(durationMs / 1000);

        const initialMatchStats = {
          duration: durationSec,
          totalGuesses: room.guesses.length,
          winnerGuessCount: winnerGuesses.length,
          loserGuessCount: loserGuesses.length,
          rpsWinnerIndex: room.rpsWinnerIndex,
          winnerSecret: winnerSecretDecrypted,
          loserSecret: loserSecretDecrypted,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt,
          xpResults: null,
          newlyUnlockedByUser: {}
        };

        // 1. Instantly notify players of victory/defeat without waiting for DB writes (< 30ms)
        io.to(roomId).emit('GAME_OVER', {
          winnerIndex: playerIdx,
          winningGuess: guessRecord,
          roomState: room,
          opponentSecret: loserSecretDecrypted,
          matchStats: initialMatchStats
        });
        console.log(`[Game] Player ${playerIdx} (${socket.username}) won in ${roomId} by guessing ${guess}! Emitted instant GAME_OVER.`);

        // 2. Perform settlement, DB writes, and achievement checks asynchronously in the background
        const currentMatchId = room.matchId;
        const settleAsync = async () => {
          let pvpSettlement = null;
          if (!room.isAiRoom) {
            try {
              pvpSettlement = await settleRoomProgress(room, {
                endReason: 'correct_guess',
                forfeitedPlayerId: null
              });
            } catch (err) {
              console.error(`[XP] Failed to settle PvP room ${room.roomId}:`, err.message);
            }
          } else {
            try {
              const settlementResult = await settleAiMatch({
                userId: socket.userId,
                aiDifficulty: room.aiDifficulty || 'medium',
                isUserWinner: true,
                room
              });
              const unlocked = await syncAndDetectNewAchievements(socket.userId);
              settlementResult.newlyUnlockedAchievements = unlocked || [];
              const newlyUnlockedByUser = Array.isArray(unlocked) && unlocked.length > 0
                ? { [String(socket.userId)]: unlocked }
                : {};
              pvpSettlement = { xpResults: [settlementResult], newlyUnlockedByUser };
              room.xpSettlement = pvpSettlement;
              void invalidateUserAndLeaderboardCache(socket.userId);
            } catch (err) {
              console.error(`[AI Settlement] Failed to settle AI win for user ${socket.userId}:`, err.message);
            }
          }

          if (pvpSettlement) {
            syncRoomToRedis(roomId, room);
            io.to(roomId).emit('MATCH_SETTLED', {
              roomId,
              matchId: currentMatchId,
              xpResults: pvpSettlement.xpResults || null,
              newlyUnlockedByUser: pvpSettlement.newlyUnlockedByUser || {}
            });
          }
        };

        void settleAsync();
      } else {
        room.activeTurnIndex = opponentIdx;
        syncRoomToRedis(roomId, room);

        io.to(roomId).emit('GUESS_RESULT', {
          lastGuess: guessRecord,
          roomState: room
        });
        console.log(`[Game] Player ${playerIdx} guessed ${guess} in ${roomId}. Bulls: ${correctPosition}, Cows: ${correctNumbers - correctPosition}.`);

        if (room.isAiRoom && opponentIdx === 1) {
          handleAiTurn(room, io);
        }
      }
    });

    // --- PLAY AGAIN (Rematch) ---
    socket.on('PLAY_AGAIN', async (roomId) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.state !== 'FINISHED') return;

      const player = room.players.find(p => String(p.userId) === String(socket.userId));
      if (!player) return;

      player.ready = true;

      if (room.isAiRoom) {
        room.state = 'SETTING_SECRET';
        room.guesses = [];
        room.rpsWinnerIndex = -1;
        room.activeTurnIndex = -1;
        room.winnerIndex = -1;
        room.startedAt = null;
        room.finishedAt = null;
        room.saved = false;
        room.roundNumber = (room.roundNumber || 1) + 1;

        const aiSecret = generate4DigitCode();
        room.players[1].secretNumber = encryptSecret(aiSecret);
        room.players[1].ready = true;
        room.players[1].rpsChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];

        room.players[0].secretNumber = null;
        room.players[0].ready = false;
        room.players[0].rpsChoice = null;

        syncRoomToRedis(roomId, room);
        io.to(roomId).emit('GAME_RESET', room);
        console.log(`[Game] AI Room ${roomId} reset for new match.`);
        return;
      }

      // If opponent has left or only 1 player remains, reopen room for new challengers
      const opponent = room.players.find(p => String(p.userId) !== String(socket.userId));
      const opponentHasLeft = !opponent || opponent.hasLeft || room.players.length === 1;

      if (opponentHasLeft) {
        convertRoomToWaiting(room);
        io.to(roomId).emit('ROOM_RESET_TO_WAITING', room);
        io.to(roomId).emit('PLAYER_LEFT', { username: opponent?.username || 'opponent', roomState: room });
        broadcastLobbyRooms(true);
        console.log(`[Game] Room ${roomId} reopened for new players by ${socket.username}.`);
        return;
      }

      const allWantRematch = room.players.every(p => p.ready);
      if (allWantRematch) {
        room.state = 'SETTING_SECRET';
        room.guesses = [];
        room.rpsWinnerIndex = -1;
        room.activeTurnIndex = -1;
        room.winnerIndex = -1;
        room.startedAt = null;
        room.finishedAt = null;
        room.saved = false;
        room.matchId = `pvp-${roomId}-${Date.now()}`;
        room.endReason = null;
        room.forfeitReason = null;
        room.forfeitedPlayerId = null;
        room.xpSettlement = null;
        room.resultFinalized = false;
        room.roundNumber = (room.roundNumber || 1) + 1;

        room.players.forEach(p => {
          p.secretNumber = null;
          p.rpsChoice = null;
          p.ready = false;
        });

        syncRoomToRedis(roomId, room);
        io.to(roomId).emit('GAME_RESET', room);
        console.log(`[Game] Room ${roomId} reset for Rematch.`);
      } else {
        socket.to(roomId).emit('OPPONENT_WANTS_PLAY_AGAIN', {
          username: socket.username
        });
      }
    });

    // --- RESET ROOM TO WAITING (Wait for new opponent) ---
    socket.on('RESET_TO_WAITING', async (roomId) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => String(p.userId) === String(socket.userId));
      if (!player) return;

      convertRoomToWaiting(room);
      io.to(roomId).emit('ROOM_RESET_TO_WAITING', room);
      io.to(roomId).emit('PLAYER_LEFT', { username: 'opponent', roomState: room });
      broadcastLobbyRooms(true);
      console.log(`[Game] Room ${roomId} reset to WAITING_FOR_PLAYERS by ${socket.username}.`);
    });

    // --- CHAT MESSAGES ---
    socket.on('SEND_MESSAGE', ({ roomId, message }) => {
      if (!message || typeof message !== 'string' || message.trim().length === 0) return;
      const room = rooms.get(roomId);
      if (!room) return;

      const isPlayer = room.players?.some(p => p.userId === socket.userId && !p.hasLeft);
      const isSpectator = room.spectators?.some(s => s.userId === socket.userId);
      if (!isPlayer && !isSpectator) {
        socket.emit('GAME_ERROR', 'Bạn không có quyền gửi tin nhắn trong phòng này.');
        return;
      }

      const now = Date.now();
      if (socket.lastChatAt && now - socket.lastChatAt < 1000) {
        socket.emit('GAME_ERROR', 'Bạn đang chat quá nhanh. Vui lòng chờ 1 giây.');
        return;
      }
      socket.lastChatAt = now;

      io.to(roomId).emit('CHAT_MESSAGE', {
        userId: socket.userId,
        username: socket.username,
        avatar: socket.avatar || '',
        isSpectator: Boolean(isSpectator),
        content: message.trim().substring(0, 300),
        timestamp: new Date().toISOString()
      });
    });

    // --- QUICK EMOTE REACTION ---
    const VALID_EMOTES = [
      '😎', '🔥', '😱', '🤔', '💀', '👏',
      '😂', '🥳', '🤫', '🥶', '🧠', '🎯',
      '💣', '🤡', '🤝', '💔'
    ];
    socket.on('SEND_REACTION', ({ roomId, emoji }) => {
      if (!roomId || !emoji || !VALID_EMOTES.includes(emoji)) return;
      const room = rooms.get(roomId);
      if (!room) return;

      const isPlayer = room.players?.some(p => p.userId === socket.userId && !p.hasLeft);
      const isSpectator = room.spectators?.some(s => s.userId === socket.userId);
      if (!isPlayer && !isSpectator) return;

      const now = Date.now();
      if (socket.lastReactionAt && now - socket.lastReactionAt < 400) {
        return; // debounce / anti-spam (max 2-3 per second)
      }
      socket.lastReactionAt = now;

      const reactionPayload = {
        id: `${socket.userId}_${now}_${Math.random().toString(36).substring(2, 7)}`,
        userId: socket.userId,
        username: socket.username,
        emoji,
        isSpectator: Boolean(isSpectator),
        timestamp: now
      };

      io.to(roomId).emit('EMOTE_REACTION', reactionPayload);

      // Playful AI Bot reaction in solo mode
      if (room.isAiRoom) {
        const aiBot = room.players?.find(p => p.userId.startsWith('ai_bot_'));
        if (aiBot) {
          const aiDelay = 750 + Math.floor(Math.random() * 850);
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            if (!currentRoom || currentRoom.state === 'FINISHED') return;
            const botResponses = {
              '😎': ['🔥', '🧠', '🎯', '👏'],
              '🔥': ['😎', '😱', '💣', '🥳'],
              '😱': ['😂', '🥶', '💀', '🤡'],
              '🤔': ['🧠', '🤫', '😎', '🎯'],
              '💀': ['😂', '🤡', '💔', '👏'],
              '👏': ['🤝', '🥳', '🔥', '😎'],
              '😂': ['🤡', '💀', '😂', '😎'],
              '🥳': ['🔥', '👏', '🤝', '🥳'],
              '🤫': ['🤔', '🧠', '😎', '🤫'],
              '🥶': ['😱', '💀', '💔', '🥶'],
              '🧠': ['🤔', '🎯', '😎', '🔥'],
              '🎯': ['👏', '🔥', '🧠', '😎'],
              '💣': ['😱', '🔥', '💀', '🥳'],
              '🤡': ['😂', '💀', '🤡', '👏'],
              '🤝': ['👏', '😎', '🤝', '🥳'],
              '💔': ['😂', '💀', '🤡', '🤝'],
            };
            const pool = botResponses[emoji] || VALID_EMOTES;
            const botEmoji = pool[Math.floor(Math.random() * pool.length)] || '😎';

            io.to(roomId).emit('EMOTE_REACTION', {
              id: `${aiBot.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              userId: aiBot.userId,
              username: aiBot.username,
              emoji: botEmoji,
              isSpectator: false,
              timestamp: Date.now()
            });
          }, aiDelay);
        }
      }
    });

    // --- LEAVE ROOM (Intentional) ---
    const handleIntentionalLeave = async (sock) => {
      if (sock.isSpectator) {
        const room = sock.currentRoomId ? rooms.get(sock.currentRoomId) : null;
        if (room && room.spectators) {
          room.spectators = room.spectators.filter(s => s.userId !== sock.userId && s.socketId !== sock.id);
          io.to(sock.currentRoomId).emit('SPECTATOR_COUNT_CHANGED', { count: room.spectators.length });
        }
        sock.leave(sock.currentRoomId);
        sock.currentRoomId = null;
        sock.isSpectator = false;
        sock.emit('SPECTATOR_LEFT');
        return;
      }

      const targetEntries = [...rooms.entries()].filter(([roomId, candidateRoom]) =>
        (sock.currentRoomId && roomId === sock.currentRoomId) ||
        candidateRoom.players?.some(p => String(p.userId) === String(sock.userId) && !p.hasLeft)
      );

      for (const [roomId, room] of targetEntries) {
        const player = room.players.find(p => String(p.userId) === String(sock.userId));
        if (!player) continue;

        const timerKeyPrimary = `${roomId}:${player.userId}`;
        const timerKeySocket = `${roomId}:${sock.userId}`;
        const timerId = disconnectTimers.get(timerKeyPrimary) || disconnectTimers.get(timerKeySocket);
        if (timerId) {
          clearTimeout(timerId);
          disconnectTimers.delete(timerKeyPrimary);
          disconnectTimers.delete(timerKeySocket);
        }

        if (room.isAiRoom) {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          sock.leave(roomId);
          sock.join('lobby');
          sock.currentRoomId = null;
          sock.emit('ROOM_DELETED');
          sock.emit('ROOM_LEFT');
          sock.emit('LOBBY_ROOMS', getJoinableRooms());
          console.log(`[Game] AI Room ${roomId} deleted because user ${sock.username} left.`);
          broadcastLobbyRooms();
          return;
        }

        if (room.state === 'WAITING_FOR_PLAYERS') {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          sock.leave(roomId);
          sock.join('lobby');
          sock.currentRoomId = null;
          sock.emit('ROOM_DELETED');
          sock.emit('ROOM_LEFT');
          sock.emit('LOBBY_ROOMS', getJoinableRooms());
          console.log(`[Game] Room ${roomId} deleted because host left before game started.`);
          broadcastLobbyRooms();
          return;
        }

        if (room.state === 'FINISHED') {
          sock.leave(roomId);
          sock.join('lobby');
          sock.currentRoomId = null;

          const pIdx = room.players.findIndex(p => String(p.userId) === String(sock.userId));
          if (pIdx !== -1) room.players.splice(pIdx, 1);

          // Clean up any other players that previously left
          room.players = room.players.filter(p => !p.hasLeft);

          if (room.players.length === 0) {
            rooms.delete(roomId);
            deleteRoomFromRedis(roomId);
            console.log(`[Game] Room ${roomId} deleted after all players left finished game.`);
          } else {
            convertRoomToWaiting(room);
            io.to(roomId).emit('ROOM_RESET_TO_WAITING', room);
            io.to(roomId).emit('PLAYER_LEFT', { username: sock.username, roomState: room });
            io.to(roomId).emit('OPPONENT_LEFT', { username: sock.username, roomState: room });
          }
          sock.emit('ROOM_LEFT');
          sock.emit('LOBBY_ROOMS', getJoinableRooms());
          broadcastLobbyRooms(true);
          return;
        }

        const didForfeit = await finishPvpByForfeit(
          room,
          sock.userId,
          'intentional_leave',
          io.to(roomId)
        );
        if (didForfeit) {
          sock.leave(roomId);
          sock.join('lobby');
          sock.currentRoomId = null;
          sock.emit('ROOM_LEFT');

          // Auto-reopen room to WAITING_FOR_PLAYERS for the remaining player:
          convertRoomToWaiting(room, sock.userId);
          io.to(roomId).emit('ROOM_RESET_TO_WAITING', room);
          io.to(roomId).emit('OPPONENT_FORFEITED', {
            username: sock.username,
            roomState: room
          });

          sock.emit('LOBBY_ROOMS', getJoinableRooms());
          broadcastLobbyRooms(true);
          return;
        }

        const pIdx = room.players.findIndex(p => p.userId === sock.userId);
        if (pIdx !== -1) room.players.splice(pIdx, 1);

        sock.leave(roomId);
        sock.join('lobby');
        sock.currentRoomId = null;
        sock.emit('ROOM_LEFT');

        if (room.players.length === 0) {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          console.log(`[Game] Room ${roomId} deleted (all players left).`);
        } else {
          convertRoomToWaiting(room);
          io.to(roomId).emit('ROOM_RESET_TO_WAITING', room);
          io.to(roomId).emit('PLAYER_LEFT', { username: sock.username, roomState: room });
          io.to(roomId).emit('OPPONENT_LEFT', { username: sock.username, roomState: room });
        }
        sock.emit('LOBBY_ROOMS', getJoinableRooms());
        broadcastLobbyRooms(true);
        return;
      }
    };

    socket.on('LEAVE_ROOM', async (acknowledge) => {
      await handleIntentionalLeave(socket);
      if (typeof acknowledge === 'function') {
        acknowledge();
      }
    });

    // --- DISCONNECT (Unintentional) ---
    socket.on('disconnect', () => {
      console.log(`[Game] User disconnected: ${socket.username} (${socket.userId})`);

      if (socket.isSpectator) {
        rooms.forEach((room, roomId) => {
          if (room.spectators) {
            const initLen = room.spectators.length;
            room.spectators = room.spectators.filter(s => s.userId !== socket.userId && s.socketId !== socket.id);
            if (room.spectators.length !== initLen) {
              io.to(roomId).emit('SPECTATOR_COUNT_CHANGED', { count: room.spectators.length });
            }
          }
        });
        return;
      }

      rooms.forEach((room, roomId) => {
        if (socket.currentRoomId && roomId !== socket.currentRoomId) return;
        const player = room.players?.find(
          p => p.userId === socket.userId && p.socketId === socket.id && !p.hasLeft
        );
        if (player) {
          if (room.isAiRoom) {
            rooms.delete(roomId);
            deleteRoomFromRedis(roomId);
            console.log(`[Game] AI Room ${roomId} destroyed immediately on user disconnect.`);
            broadcastLobbyRooms();
            return;
          }

          player.disconnectedAt = Date.now();
          syncRoomToRedis(roomId, room);

          io.to(roomId).emit('PLAYER_TEMPORARILY_DISCONNECTED', {
            username: socket.username,
            roomState: room
          });
          console.log(`[Game] User ${socket.username} temporarily disconnected from room ${roomId}. 60s grace period started.`);

          const timerKey = `${roomId}:${socket.userId}`;
          const previousTimer = disconnectTimers.get(timerKey);
          if (previousTimer) {
            clearTimeout(previousTimer);
            disconnectTimers.delete(timerKey);
          }

          const handleDisconnectTimeout = async () => {
            disconnectTimers.delete(timerKey);

            const currentRoom = rooms.get(roomId);
            if (!currentRoom) return;
            const currentPlayer = currentRoom.players?.find(p => p.userId === socket.userId);
            if (
              !currentPlayer
              || !currentPlayer.disconnectedAt
              || currentPlayer.socketId !== socket.id
            ) {
              return;
            }

            const disconnectedOpponent = currentRoom.players?.find(
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
              broadcastLobbyRooms();
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
              convertRoomToWaiting(currentRoom, socket.userId);
              io.to(roomId).emit('ROOM_RESET_TO_WAITING', currentRoom);
              io.to(roomId).emit('OPPONENT_FORFEITED', {
                username: socket.username,
                roomState: currentRoom
              });
              broadcastLobbyRooms(true);
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
              broadcastLobbyRooms();
              return;
            }

            console.log(`[Game] User ${socket.username} did not reconnect within 60s. Removing from room ${roomId}.`);

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

            broadcastLobbyRooms();
          };

          const timerId = setTimeout(handleDisconnectTimeout, 60 * 1000);
          disconnectTimers.set(timerKey, timerId);
        }
      });
    });
  });
}

module.exports = {
  setupSocket
};
