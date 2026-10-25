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
const { invalidateUserAndLeaderboardCache } = require('../config/redis');

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
  function broadcastLobbyRooms() {
    if (lobbyBroadcastTimer) return;
    lobbyBroadcastTimer = setTimeout(() => {
      lobbyBroadcastTimer = null;
      io.to('lobby').emit('LOBBY_ROOMS', getJoinableRooms());
    }, 300);
  }

  io.on('connection', (socket) => {
    console.log(`[Game] User connected: ${socket.username} (${socket.userId})`);

    // --- RECONNECT DETECTION ---
    rooms.forEach((room, roomId) => {
      const player = room.players?.find(p => p.userId === socket.userId);
      if (player && !player.hasLeft) {
        const timerKey = `${roomId}:${socket.userId}`;
        const timerId = disconnectTimers.get(timerKey);
        if (timerId) {
          clearTimeout(timerId);
          disconnectTimers.delete(timerKey);
        }

        player.disconnectedAt = null;
        player.socketId = socket.id;
        socket.leave('lobby');
        socket.join(roomId);
        socket.currentRoomId = roomId;

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

    // Join lobby channel by default and send initial joinable rooms
    socket.join('lobby');
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
        socket.emit('RECONNECTED_TO_ROOM', activeRoom);
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
        socket.emit('GAME_ERROR', 'You are already in an active room.');
        return;
      }

      const now = Date.now();
      const lastCreated = userRoomCooldowns.get(socket.userId);
      if (lastCreated && now - lastCreated < 8000) {
        const waitSec = Math.ceil((8000 - (now - lastCreated)) / 1000);
        socket.emit('GAME_ERROR', `Vui lòng chờ ${waitSec} giây trước khi tạo phòng mới.`);
        return;
      }
      userRoomCooldowns.set(socket.userId, now);

      let currentWinStreak = 0;
      try {
        const profile = await GameProfile.findOne({ userId: socket.userId }).lean();
        currentWinStreak = profile?.currentWinStreak || 0;
      } catch {
        // Ignore profile lookup error
      }

      const roomId = generateRoomId(rooms);
      const room = {
        roomId,
        players: [
          {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.avatar || '',
            currentWinStreak,
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

    // --- CREATE AI ROOM ---
    socket.on('CREATE_AI_ROOM', (data) => {
      const activeRoom = findActiveRoomForUser(socket.userId);
      if (activeRoom) {
        socket.emit('GAME_ERROR', 'You are already in an active room.');
        return;
      }

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
        if (activeRoom.roomId === roomId) {
          socket.join(roomId);
          socket.currentRoomId = roomId;
          socket.emit('RECONNECTED_TO_ROOM', activeRoom);
          return;
        }
        socket.emit('GAME_ERROR', 'You are already in an active room.');
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

      let currentWinStreak = 0;
      try {
        const profile = await GameProfile.findOne({ userId: socket.userId }).lean();
        currentWinStreak = profile?.currentWinStreak || 0;
      } catch {
        // Ignore profile lookup error
      }

      room.players.push({
        userId: socket.userId,
        username: socket.username,
        avatar: socket.avatar || '',
        currentWinStreak,
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

      const player = room.players.find(p => p.userId === socket.userId);
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
        console.log(`[Game] Both players set secrets in ${roomId}. Moving to RPS.`);
      } else {
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

      const player = room.players.find(p => p.userId === socket.userId);
      if (!player) return;

      player.rpsChoice = choice;
      player.ready = true;
      syncRoomToRedis(roomId, room);

      const allReady = room.players.every(p => p.ready);
      if (!allReady) {
        socket.to(roomId).emit('OPPONENT_RPS_READY', { userId: socket.userId });
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

      const playerIdx = room.players.findIndex(p => p.userId === socket.userId);
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
            pvpSettlement = { xpResults: [settlementResult] };
            room.xpSettlement = pvpSettlement;
            void invalidateUserAndLeaderboardCache(socket.userId);
          } catch (err) {
            console.error(`[AI Settlement] Failed to settle AI win for user ${socket.userId}:`, err.message);
          }
        }

        syncRoomToRedis(roomId, room);

        const winnerSecretDecrypted = decryptSecret(room.players[playerIdx]?.secretNumber);
        const loserSecretDecrypted = decryptSecret(room.players[opponentIdx]?.secretNumber);

        const winnerGuesses = room.guesses.filter(g => g.playerIndex === playerIdx);
        const loserGuesses = room.guesses.filter(g => g.playerIndex === opponentIdx);
        const durationMs = room.startedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;
        const durationSec = Math.floor(durationMs / 1000);

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
          xpResults: pvpSettlement?.xpResults || null
        };

        io.to(roomId).emit('GAME_OVER', {
          winnerIndex: playerIdx,
          winningGuess: guessRecord,
          roomState: room,
          opponentSecret: loserSecretDecrypted,
          matchStats: matchStats
        });
        console.log(`[Game] Player ${playerIdx} (${socket.username}) won in ${roomId} by guessing ${guess}!`);
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

      const player = room.players.find(p => p.userId === socket.userId);
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

      const targetEntries = sock.currentRoomId && rooms.has(sock.currentRoomId)
        ? [[sock.currentRoomId, rooms.get(sock.currentRoomId)]]
        : [...rooms.entries()].filter(([, candidateRoom]) =>
          candidateRoom.players.some(p => p.userId === sock.userId)
        );

      for (const [roomId, room] of targetEntries) {
        const player = room.players.find(p => p.userId === sock.userId);
        if (!player) continue;

        if (room.isAiRoom) {
          rooms.delete(roomId);
          deleteRoomFromRedis(roomId);
          sock.leave(roomId);
          sock.join('lobby');
          sock.currentRoomId = null;
          sock.emit('ROOM_DELETED');
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
          console.log(`[Game] Room ${roomId} deleted because host left before game started.`);
          broadcastLobbyRooms();
          return;
        }

        if (room.state === 'FINISHED') {
          player.hasLeft = true;
          player.socketId = null;
          sock.leave(roomId);
          sock.join('lobby');
          sock.currentRoomId = null;
          syncRoomToRedis(roomId, room);

          const allLeft = room.players.every(p => p.hasLeft);
          if (allLeft) {
            rooms.delete(roomId);
            deleteRoomFromRedis(roomId);
            console.log(`[Game] Room ${roomId} deleted after both players left finished game.`);
          } else {
            sock.to(roomId).emit('OPPONENT_LEFT');
          }
          sock.emit('ROOM_LEFT');
          broadcastLobbyRooms();
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
          broadcastLobbyRooms();
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
          room.players.forEach(remainingPlayer => {
            remainingPlayer.secretNumber = null;
            remainingPlayer.rpsChoice = null;
            remainingPlayer.ready = false;
            remainingPlayer.disconnectedAt = null;
            remainingPlayer.hasLeft = false;
          });
          syncRoomToRedis(roomId, room);
          io.to(roomId).emit('PLAYER_LEFT', {
            username: sock.username,
            roomState: room
          });
        }

        broadcastLobbyRooms();
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
              broadcastLobbyRooms();
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
