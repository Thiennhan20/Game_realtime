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
const GameHistory = require('./models/GameHistory');
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

// --- Game Rooms State (Hybrid: RAM + Redis) ---
// roomId -> RoomObject (in-memory for speed)
const rooms = new Map();

// Sync room data to Redis (background, non-blocking)
function syncRoomToRedis(roomId, room) {
  redis.set(`${REDIS_KEY_PREFIX}${roomId}`, JSON.stringify(room), { ex: ROOM_TTL_SECONDS })
    .then(() => console.log(`[Redis] Synced room ${roomId}`))
    .catch(err => console.error(`[Redis] Failed to sync room ${roomId}:`, err.message));
}

// Delete room from Redis
function deleteRoomFromRedis(roomId) {
  redis.del(`${REDIS_KEY_PREFIX}${roomId}`)
    .then(() => console.log(`[Redis] Deleted room ${roomId}`))
    .catch(err => console.error(`[Redis] Failed to delete room ${roomId}:`, err.message));
}

// Refresh TTL for active rooms (reset 30-min timer)
function refreshRoomTTL(roomId) {
  redis.expire(`${REDIS_KEY_PREFIX}${roomId}`, ROOM_TTL_SECONDS)
    .catch(err => console.error(`[Redis] Failed to refresh TTL for ${roomId}:`, err.message));
}

// Load all rooms from Redis into RAM on server startup
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
          rooms.set(room.roomId, room);
          restored++;
        }
      }
    }
    console.log(`[Redis] Restored ${restored} room(s) from Redis.`);
  } catch (err) {
    console.error('[Redis] Failed to load rooms from Redis:', err.message);
  }
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

  setTimeout(() => {
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
        syncRoomToRedis(room.roomId, room);

        const winnerGuesses = room.guesses.filter(g => g.playerIndex === 1);
        const loserGuesses = room.guesses.filter(g => g.playerIndex === 0);
        const durationMs = room.startedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;
        const durationSec = Math.floor(durationMs / 1000);

        const winnerSecretDecrypted = decryptSecret(room.players[1].secretNumber);
        const loserSecretDecrypted = decryptSecret(room.players[0].secretNumber);

        const matchStats = {
          duration: durationSec,
          totalGuesses: room.guesses.length,
          winnerGuessCount: winnerGuesses.length,
          loserGuessCount: loserGuesses.length,
          rpsWinnerIndex: room.rpsWinnerIndex,
          winnerSecret: winnerSecretDecrypted,
          loserSecret: loserSecretDecrypted,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt
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

io.on('connection', (socket) => {
  console.log(`[Game] User connected: ${socket.username} (${socket.userId})`);
  
  // --- RECONNECT DETECTION ---
  // Check if this user was temporarily disconnected from any room
  rooms.forEach((room, roomId) => {
    const player = room.players.find(p => p.userId === socket.userId);
    if (player && player.disconnectedAt) {
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
      
      // Sync and notify
      syncRoomToRedis(roomId, room);
      socket.emit('RECONNECTED_TO_ROOM', room);
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

  // --- CREATE ROOM ---
  socket.on('CREATE_ROOM', () => {
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
      rpsWinnerIndex: -1,
      activeTurnIndex: -1,
      winnerIndex: -1,
      startedAt: null,
      createdAt: Date.now(),
      saved: false
    };
    rooms.set(roomId, room);
    syncRoomToRedis(roomId, room);
    socket.join(roomId);
    
    socket.emit('ROOM_CREATED', room);
    io.emit('LOBBY_ROOMS', getJoinableRooms());
    console.log(`[Game] Room created: ${roomId} by ${socket.username}`);
  });

  // --- CREATE AI ROOM ---
  socket.on('CREATE_AI_ROOM', (data) => {
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
    socket.emit('ROOM_CREATED', room);
    socket.emit('GAME_START', room);
    console.log(`[Game] AI Room created (${difficulty}): ${roomId} by ${socket.username}`);
  });

  // --- JOIN ROOM ---
  socket.on('JOIN_ROOM', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('GAME_ERROR', 'Room not found.');
      return;
    }
    if (room.state !== 'WAITING_FOR_PLAYERS') {
      socket.emit('GAME_ERROR', 'Room is already full or in play.');
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
    room.state = 'SETTING_SECRET'; // Advance to setting secret state
    room.startedAt = new Date().toISOString(); // Record game start time
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
  socket.on('SUBMIT_GUESS', ({ roomId, guess }) => {
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
      syncRoomToRedis(roomId, room);
      
      // Calculate match statistics
      const winnerGuesses = room.guesses.filter(g => g.playerIndex === playerIdx);
      const loserGuesses = room.guesses.filter(g => g.playerIndex === opponentIdx);
      const durationMs = room.startedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;
      const durationSec = Math.floor(durationMs / 1000);
      
      // Decrypt winner's secret for reveal
      const winnerSecret = decryptSecret(room.players[playerIdx].secretNumber);
      
      io.to(roomId).emit('GAME_OVER', {
        winnerIndex: playerIdx,
        winningGuess: guessRecord,
        roomState: room,
        opponentSecret: decryptedSecret, // Reveal loser's code to winner
        matchStats: {
          duration: durationSec,
          totalGuesses: room.guesses.length,
          winnerGuessCount: winnerGuesses.length,
          loserGuessCount: loserGuesses.length,
          rpsWinnerIndex: room.rpsWinnerIndex,
          winnerSecret: winnerSecret,
          loserSecret: decryptedSecret,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt
        }
      });
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
  socket.on('PLAY_AGAIN', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'FINISHED') {
      socket.emit('GAME_ERROR', 'Invalid action.');
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
      room.state = 'SETTING_SECRET';
      room.rpsWinnerIndex = -1;
      room.activeTurnIndex = -1;
      room.winnerIndex = -1;
      room.startedAt = new Date().toISOString();
      room.saved = false;
      syncRoomToRedis(roomId, room);

      io.to(roomId).emit('GAME_START', room);
      console.log(`[Game] Room ${roomId} play again started.`);
    } else {
      syncRoomToRedis(roomId, room);
      socket.to(roomId).emit('OPPONENT_WANTS_PLAY_AGAIN');
    }
  });

  // --- MATCH RESULT VIEWED (Client confirms they saw the end screen) ---
  socket.on('MATCH_RESULT_VIEWED', async (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'FINISHED' || room.saved) return;
    
    // Mark as saved to prevent duplicate saves
    room.saved = true;
    syncRoomToRedis(roomId, room);
    
    try {
      const winnerIdx = room.winnerIndex;
      const loserIdx = winnerIdx === 0 ? 1 : 0;
      const winnerGuesses = room.guesses.filter(g => g.playerIndex === winnerIdx);
      const loserGuesses = room.guesses.filter(g => g.playerIndex === loserIdx);
      const durationMs = room.startedAt && room.finishedAt 
        ? (new Date(room.finishedAt) - new Date(room.startedAt)) 
        : 0;
      
      const history = new GameHistory({
        roomId: room.roomId,
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar || ''
        })),
        winnerId: room.players[winnerIdx].userId,
        winnerIndex: winnerIdx,
        totalGuesses: room.guesses.length,
        winnerGuessCount: winnerGuesses.length,
        loserGuessCount: loserGuesses.length,
        rpsWinnerIndex: room.rpsWinnerIndex,
        duration: Math.floor(durationMs / 1000),
        finishedAt: room.finishedAt || new Date()
      });
      
      await history.save();
      console.log(`[MongoDB] Game history saved for room ${room.roomId}`);
    } catch (err) {
      console.error(`[MongoDB] Failed to save game history for room ${room.roomId}:`, err.message);
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
  // Immediate removal, no grace period, no save
  const handleIntentionalLeave = (socket) => {
    rooms.forEach((room, roomId) => {
      const pIdx = room.players.findIndex(p => p.userId === socket.userId);
      if (pIdx !== -1) {
        console.log(`[Game] User ${socket.username} intentionally left room ${roomId}`);
        
        // Cancel any pending disconnect timer for this user
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
        } else {
          // Remove player from room immediately
          room.players.splice(pIdx, 1);
          socket.leave(roomId);
          
          if (room.players.length === 0) {
            rooms.delete(roomId);
            deleteRoomFromRedis(roomId);
            console.log(`[Game] Room ${roomId} deleted as it became empty.`);
          } else {
            room.state = 'WAITING_FOR_PLAYERS';
            room.guesses = [];
            room.players.forEach(p => {
              p.secretNumber = null;
              p.rpsChoice = null;
              p.ready = false;
            });
            syncRoomToRedis(roomId, room);
            io.to(roomId).emit('PLAYER_LEFT', {
              username: socket.username,
              roomState: room
            });
          }
        }
        
        io.emit('LOBBY_ROOMS', getJoinableRooms());
      }
    });
  };

  socket.on('LEAVE_ROOM', () => {
    handleIntentionalLeave(socket);
  });

  // --- DISCONNECT (Unintentional - lost connection, closed tab) ---
  // 60-second grace period for reconnection
  socket.on('disconnect', () => {
    console.log(`[Game] User disconnected: ${socket.username} (${socket.userId})`);
    
    rooms.forEach((room, roomId) => {
      const player = room.players.find(p => p.userId === socket.userId);
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
        const timerId = setTimeout(() => {
          disconnectTimers.delete(timerKey);
          
          // Check if player is still disconnected
          const currentRoom = rooms.get(roomId);
          if (!currentRoom) return;
          const currentPlayer = currentRoom.players.find(p => p.userId === socket.userId);
          if (!currentPlayer || !currentPlayer.disconnectedAt) return;
          
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
            currentRoom.players.forEach(p => {
              p.secretNumber = null;
              p.rpsChoice = null;
              p.ready = false;
            });
            syncRoomToRedis(roomId, currentRoom);
            io.to(roomId).emit('PLAYER_DISCONNECTED', {
              username: socket.username,
              roomState: currentRoom
            });
          }
          
          io.emit('LOBBY_ROOMS', getJoinableRooms());
        }, 60 * 1000); // 60 seconds
        
        disconnectTimers.set(timerKey, timerId);
      }
    });
  });
});

// Helper to get rooms waiting for players (Lobby view)
function getJoinableRooms() {
  const list = [];
  rooms.forEach((room) => {
    if (!room.isAiRoom && room.state !== 'FINISHED' && room.players && room.players.length > 0 && room.players.length < 2) {
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

app.get('/api/history', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    // Find histories where players contains the user ID
    const history = await GameHistory.find({ 'players.userId': userId })
      .sort({ finishedAt: -1 })
      .limit(15);
      
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    console.log('[MongoDB] Connected to MongoDB Atlas successfully.');
  } catch (err) {
    console.error('[MongoDB] Failed to connect to MongoDB Atlas:', err.message);
    console.warn('[MongoDB] Server will start without MongoDB. Game history will NOT be saved.');
  }
  
  await loadRoomsFromRedis();
  
  server.listen(PORT, () => {
    console.log(`[Game Backend] Server running on port ${PORT}`);
  });
}

startServer();
