const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

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

// --- Game Rooms State ---
// roomId -> RoomObject
const rooms = new Map();

// Generate random 6-digit room ID
function generateRoomId() {
  let rid;
  do {
    rid = 'G-' + Math.floor(100000 + Math.random() * 900000);
  } while (rooms.has(rid));
  return rid;
}

// --- Socket.IO Connection Handler ---
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('AUTH_ERROR: Token not provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.name || decoded.username || 'Player';
    
    // Fetch fresh user avatar/details from movie server database
    try {
      const profileRes = await axios.get(`${MOVIE_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.data && profileRes.data.user) {
        socket.username = profileRes.data.user.name || socket.username;
        socket.avatar = profileRes.data.user.avatar || '';
      }
    } catch (err) {
      console.warn('Could not fetch fresh user details in game ws auth, falling back to jwt payload:', err.message);
    }
    next();
  } catch (error) {
    console.error('Game socket auth failed:', error.message);
    return next(new Error('AUTH_ERROR: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Game] User connected: ${socket.username} (${socket.userId})`);
  
  // Send list of joinable rooms
  socket.emit('LOBBY_ROOMS', getJoinableRooms());

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
      winnerIndex: -1
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    
    socket.emit('ROOM_CREATED', room);
    io.emit('LOBBY_ROOMS', getJoinableRooms());
    console.log(`[Game] Room created: ${roomId} by ${socket.username}`);
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
      room.state = 'RPS_DECISION';
      io.to(roomId).emit('RPS_PHASE', room);
      console.log(`[Game] Both secrets set in ${roomId}. Moving to RPS_DECISION.`);
    } else {
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
        
        io.to(roomId).emit('RPS_RESULT', {
          winnerIndex: winnerIdx,
          p1Choice: p1.rpsChoice,
          p2Choice: p2.rpsChoice,
          roomState: room
        });
        console.log(`[Game] RPS winner in ${roomId}: Player ${winnerIdx} (${room.players[winnerIdx].username}).`);
      }
    } else {
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
      io.to(roomId).emit('GAME_OVER', {
        winnerIndex: playerIdx,
        winningGuess: guessRecord,
        roomState: room,
        opponentSecret: decryptedSecret // Reveal code to opponent
      });
      console.log(`[Game] Room ${roomId} finished. Winner: ${room.players[playerIdx].username}.`);
    } else {
      // Toggle active turn
      room.activeTurnIndex = opponentIdx;
      io.to(roomId).emit('GUESS_RESULT', {
        lastGuess: guessRecord,
        roomState: room
      });
      console.log(`[Game] Guess in ${roomId}: Player ${playerIdx} guessed ${guess}. Result: ${correctNumbers} nums, ${correctPosition} pos. Next turn: Player ${opponentIdx}.`);
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
    if (bothReady) {
      // Reset state for new round
      room.players.forEach(p => {
        p.secretNumber = null;
        p.rpsChoice = null;
        p.ready = false;
      });
      room.guesses = [];
      room.state = 'SETTING_SECRET';
      room.rpsWinnerIndex = -1;
      room.activeTurnIndex = -1;
      room.winnerIndex = -1;

      io.to(roomId).emit('GAME_START', room);
      console.log(`[Game] Room ${roomId} play again started.`);
    } else {
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

  // --- DISCONNECT / LEAVE ROOM ---
  const handleLeaveOrDisconnect = (socket) => {
    rooms.forEach((room, roomId) => {
      const pIdx = room.players.findIndex(p => p.userId === socket.userId);
      if (pIdx !== -1) {
        console.log(`[Game] User ${socket.username} left/disconnected from room ${roomId}`);
        
        // Remove player from room
        room.players.splice(pIdx, 1);
        
        if (room.players.length === 0) {
          // Close room if empty
          rooms.delete(roomId);
          console.log(`[Game] Room ${roomId} deleted as it became empty.`);
        } else {
          // Notify the remaining player
          room.state = 'WAITING_FOR_PLAYERS';
          room.guesses = [];
          room.players.forEach(p => {
            p.secretNumber = null;
            p.rpsChoice = null;
            p.ready = false;
          });
          io.to(roomId).emit('PLAYER_DISCONNECTED', {
            username: socket.username,
            roomState: room
          });
        }
        
        io.emit('LOBBY_ROOMS', getJoinableRooms());
      }
    });
  };

  socket.on('LEAVE_ROOM', () => {
    handleLeaveOrDisconnect(socket);
  });

  socket.on('disconnect', () => {
    handleLeaveOrDisconnect(socket);
    console.log(`[Game] User disconnected: ${socket.username}`);
  });
});

// Helper to get rooms waiting for players (Lobby view)
function getJoinableRooms() {
  const list = [];
  rooms.forEach((room) => {
    if (room.state === 'WAITING_FOR_PLAYERS') {
      list.push({
        roomId: room.roomId,
        hostName: room.players[0].username,
        playerCount: room.players.length
      });
    }
  });
  return list;
}

app.get('/', (req, res) => {
  res.send('Game Backend is running.');
});

server.listen(PORT, () => {
  console.log(`[Game Backend] Server running on port ${PORT}`);
});
