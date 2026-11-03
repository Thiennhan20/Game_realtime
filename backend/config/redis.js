const { Redis } = require('@upstash/redis');

const REDIS_KEY_PREFIX = 'game:room:';
const ROOM_TTL_SECONDS = 30 * 60; // 30 minutes

// --- Redis Cache Layer (Leaderboard & GameProfile) ---
const LEADERBOARD_CACHE_PREFIX = 'game:cache:leaderboard:';
const PROFILE_CACHE_PREFIX = 'game:cache:profile:';
const LEADERBOARD_CACHE_TTL = 60; // 60 seconds
const PROFILE_CACHE_TTL = 120; // 120 seconds

let redis = null;
const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (isRedisConfigured) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function getCachedJson(key) {
  try {
    if (!redis) return null;
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
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (err) {
    console.error(`[Redis Cache SET Error] ${key}:`, err.message);
  }
}

async function invalidateUserAndLeaderboardCache(userId) {
  try {
    if (!redis) return;
    const limits = [3, 4, 50, 100];
    const periods = ['all', 'month', 'week'];
    const deletePromises = [];
    for (const lim of limits) {
      deletePromises.push(redis.del(`${LEADERBOARD_CACHE_PREFIX}${lim}`));
      for (const period of periods) {
        deletePromises.push(redis.del(`${LEADERBOARD_CACHE_PREFIX}${period}:${lim}`));
      }
    }
    if (userId) {
      deletePromises.push(redis.del(`${PROFILE_CACHE_PREFIX}${userId}`));
    }
    await Promise.all(deletePromises);
  } catch (err) {
    console.error(`[Redis Cache Invalidate Error]`, err.message);
  }
}

async function checkRedisHealth() {
  if (!isRedisConfigured) {
    return { status: 'disabled', configured: false, latencyMs: null };
  }
  const start = Date.now();
  try {
    // Ping Upstash Redis via a lightweight ping or read
    await redis.get('health:ping');
    return {
      status: 'connected',
      configured: true,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    return {
      status: 'error',
      configured: true,
      error: err.message,
      latencyMs: Date.now() - start
    };
  }
}

module.exports = {
  redis,
  isRedisConfigured,
  REDIS_KEY_PREFIX,
  ROOM_TTL_SECONDS,
  LEADERBOARD_CACHE_PREFIX,
  PROFILE_CACHE_PREFIX,
  LEADERBOARD_CACHE_TTL,
  PROFILE_CACHE_TTL,
  getCachedJson,
  setCachedJson,
  invalidateUserAndLeaderboardCache,
  checkRedisHealth
};
