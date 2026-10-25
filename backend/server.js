const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const GameHistory = require('./models/GameHistory');
const GameProfile = require('./models/GameProfile');
const User = require('./models/User');
const roomManager = require('./services/roomManager');
const { setupSocket } = require('./socket/socketHandler');
const { createHealthRouter } = require('./routes/health');
const { createApiRouter } = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3002",
      "http://localhost:3000",
      "https://p01--game-app--znbny2j8c2gp.code.run",
      "https://p01--game-app--znbny2j8c2gp.code.run/",
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
let progressionReady = false;

// --- Mount Health Monitoring & API Routes ---
const { router: healthRouter, handleHealth } = createHealthRouter(io, roomManager);
app.use('/health', healthRouter);

const apiRouter = createApiRouter(roomManager, handleHealth);
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.send('Game Backend is running.');
});

// --- Register Sockets ---
setupSocket(io, roomManager, () => progressionReady);

// --- Server Lifecycle ---
async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
      });
      await Promise.all([GameHistory.init(), GameProfile.init(), User.init()]);
      progressionReady = true;
      console.log('[MongoDB] XP/history indexes are ready.');
      console.log('[MongoDB] Connected to MongoDB Atlas successfully.');
    } else {
      console.warn('[MongoDB] MONGODB_URI not found. Progression disabled.');
    }
  } catch (err) {
    progressionReady = false;
    console.error('[MongoDB] Failed to connect to MongoDB Atlas:', err.message);
    console.warn('[MongoDB] Server will start without MongoDB. Game history will NOT be saved.');
  }

  await roomManager.loadRoomsFromRedis(io);

  server.listen(PORT, () => {
    console.log(`[Game Backend] Server running on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = {
  app,
  server,
  io,
  roomManager,
  startServer
};
