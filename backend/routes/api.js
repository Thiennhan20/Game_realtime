const express = require('express');
const jwt = require('jsonwebtoken');
const GameHistory = require('../models/GameHistory');
const GameProfile = require('../models/GameProfile');
const User = require('../models/User');
const { getGameProfileSummary } = require('../services/matchSettlement');
const { calculateUserAchievements } = require('../services/achievements');
const { getRank } = require('../services/rating');
const {
  getCachedJson,
  setCachedJson,
  PROFILE_CACHE_PREFIX,
  PROFILE_CACHE_TTL,
  LEADERBOARD_CACHE_PREFIX,
  LEADERBOARD_CACHE_TTL
} = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET;

function createApiRouter(roomManager, healthHandler) {
  const router = express.Router();

  // GET /api/health
  if (healthHandler) {
    router.get('/health', healthHandler);
  }

  // GET /api/game-profile
  router.get('/game-profile', async (req, res) => {
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

  // GET /api/history
  router.get('/history', async (req, res) => {
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

  // GET /api/achievements
  router.get('/achievements', async (req, res) => {
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

  // GET /api/leaderboard - Optimized with compound index sort and limit
  router.get('/leaderboard', async (req, res) => {
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

      // Query database with direct index sort and limit - avoids loading all users into memory
      const rawProfiles = await GameProfile.find({})
        .sort({ rating: -1, wins: -1, losses: 1 })
        .limit(limit)
        .populate('userId', 'name avatar')
        .lean();

      const leaderboard = rawProfiles.map((profile, index) => {
        const userObj = profile.userId || {};
        const wins = profile.wins || 0;
        const losses = profile.losses || 0;
        const totalMatches = wins + losses;
        const winRate = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(1)) : 0;
        const rating = typeof profile.rating === 'number' && Number.isFinite(profile.rating) ? profile.rating : 1000;
        const highestRating = Math.max(rating, profile.highestRating ?? rating);
        const rankInfo = getRank(rating);

        return {
          rank: index + 1,
          userId: String(userObj._id || (typeof profile.userId === 'string' ? profile.userId : '') || ''),
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

  // GET /api/rooms
  router.get('/rooms', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ rooms: roomManager.getJoinableRooms() });
  });

  return router;
}

module.exports = {
  createApiRouter
};
