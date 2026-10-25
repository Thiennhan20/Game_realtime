const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const MOVIE_API_URL = process.env.MOVIE_API_URL || (isProduction ? 'https://server-nextjs-film.onrender.com/api' : 'http://localhost:3001/api');

// --- In-Memory Profile Cache & Circuit Breaker ---
// Avoids repeated remote HTTP calls on socket reconnects and shields server if auth service is down/cold.
const profileMemoryCache = new Map();
const CACHE_TTL_SUCCESS = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_FAILURE = 2 * 60 * 1000;  // 2 minutes for failed/missing lookups
const MAX_CACHE_SIZE = 1000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_TIME = 60 * 1000; // 60s cooldown when remote API is down

function cleanCacheIfNeeded() {
  if (profileMemoryCache.size <= MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of profileMemoryCache.entries()) {
    const ttl = entry.isFailure ? CACHE_TTL_FAILURE : CACHE_TTL_SUCCESS;
    if (now - entry.timestamp > ttl) {
      profileMemoryCache.delete(key);
    }
  }
}

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('AUTH_ERROR: Token not provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = socket.handshake.auth?.username || decoded.name || decoded.username || 'Player';
    socket.avatar = socket.handshake.auth?.avatar || '';

    // Check cache first to avoid unneeded background HTTP requests
    const cached = profileMemoryCache.get(socket.userId);
    const now = Date.now();
    if (cached) {
      const ttl = cached.isFailure ? CACHE_TTL_FAILURE : CACHE_TTL_SUCCESS;
      if (now - cached.timestamp < ttl) {
        if (cached.avatar) socket.avatar = cached.avatar;
        if (cached.name) socket.username = cached.name;
        return next();
      }
    }

    // Only fetch if avatar is missing and circuit breaker is closed
    const isCircuitOpen = now < circuitOpenUntil;
    if (!socket.avatar && MOVIE_API_URL && !isCircuitOpen) {
      axios.get(`${MOVIE_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 1500 // Reduced from 3000ms to 1500ms
      }).then(res => {
        // Reset circuit breaker on successful connection
        consecutiveFailures = 0;
        circuitOpenUntil = 0;

        if (res.data && res.data.user) {
          socket.username = res.data.user.name || socket.username;
          socket.avatar = res.data.user.avatar || socket.avatar;

          cleanCacheIfNeeded();
          profileMemoryCache.set(socket.userId, {
            name: socket.username,
            avatar: socket.avatar,
            timestamp: Date.now(),
            isFailure: false
          });
        }
      }).catch(err => {
        consecutiveFailures++;
        if (consecutiveFailures >= FAILURE_THRESHOLD) {
          circuitOpenUntil = Date.now() + CIRCUIT_RESET_TIME;
          console.warn(`[socketAuth] MOVIE_API circuit breaker OPEN for 60s (${consecutiveFailures} consecutive failures: ${err.message})`);
        } else {
          console.warn('Background profile fetch skipped/failed:', err.message);
        }

        // Cache failure placeholder to prevent instant retry flooding for this user
        cleanCacheIfNeeded();
        profileMemoryCache.set(socket.userId, {
          name: socket.username,
          avatar: socket.avatar,
          timestamp: Date.now(),
          isFailure: true
        });
      });
    }

    next();
  } catch (error) {
    console.error('Game socket auth failed:', error.message);
    return next(new Error('AUTH_ERROR: Invalid token'));
  }
}

module.exports = {
  socketAuthMiddleware,
  _testProfileCache: profileMemoryCache
};
