const express = require('express');
const jwt = require('jsonwebtoken');
const GameHistory = require('../models/GameHistory');
const GameProfile = require('../models/GameProfile');
const User = require('../models/User');
const { getGameProfileSummary } = require('../services/matchSettlement');
const { calculateUserAchievements, resolveEquippedTitle } = require('../services/achievements');
const { getRank } = require('../services/rating');
const {
  getCachedJson,
  setCachedJson,
  invalidateUserAndLeaderboardCache,
  PROFILE_CACHE_PREFIX,
  PROFILE_CACHE_TTL,
  LEADERBOARD_CACHE_PREFIX,
  LEADERBOARD_CACHE_TTL
} = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET;
const VN_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

function normalizePeriod(rawPeriod) {
  const value = String(rawPeriod || 'all').trim().toLowerCase();
  if (value === 'month' || value === 'monthly') return 'month';
  if (value === 'week' || value === 'weekly') return 'week';
  return 'all';
}

function getPeriodStartDate(period, now = new Date()) {
  const vnNow = new Date(now.getTime() + VN_TIMEZONE_OFFSET_MS);
  if (period === 'month') {
    const startOfMonthVn = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), 1, 0, 0, 0, 0);
    return new Date(startOfMonthVn - VN_TIMEZONE_OFFSET_MS);
  }
  if (period === 'week') {
    const dayOfWeek = vnNow.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeekVn = Date.UTC(
      vnNow.getUTCFullYear(),
      vnNow.getUTCMonth(),
      vnNow.getUTCDate() - diffToMonday,
      0, 0, 0, 0
    );
    return new Date(startOfWeekVn - VN_TIMEZONE_OFFSET_MS);
  }
  return null;
}

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
        GameHistory.find({ 'players.userId': userId }).sort({ finishedAt: -1 }).limit(250).lean()
      ]);

      const result = calculateUserAchievements(profile, historyList);

      // Baseline sync for existing users who haven't initialized unlockedAchievementIds yet
      if (profile && !profile.achievementsInitialized) {
        const unlockedIds = result.achievements.filter(a => a.isUnlocked).map(a => a.id);
        void GameProfile.updateOne(
          { userId },
          { $set: { unlockedAchievementIds: unlockedIds, achievementsInitialized: true } }
        ).catch(() => {});
      }

      return res.json(result);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      return res.status(500).json({ error: error.message });
    }
  });

  // POST /api/achievements/equip
  router.post('/achievements/equip', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;

      const rawId = req.body?.achievementId;
      const targetId = typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : null;

      const [profile, historyList] = await Promise.all([
        GameProfile.findOne({ userId }).lean(),
        GameHistory.find({ 'players.userId': userId }).sort({ finishedAt: -1 }).limit(250).lean()
      ]);

      const calc = calculateUserAchievements(profile, historyList);
      const unlockedIds = calc.achievements.filter(a => a.isUnlocked).map(a => a.id);

      if (targetId) {
        const targetBadge = calc.achievements.find(a => a.id === targetId);
        if (!targetBadge) {
          return res.status(404).json({ error: 'Danh hiệu không tồn tại.' });
        }
        if (!targetBadge.isUnlocked) {
          return res.status(400).json({ error: 'Bạn cần mở khóa thành tích này trước khi trang bị.' });
        }
      }

      const equippedTitle = resolveEquippedTitle(targetId);

      await GameProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            equippedTitleId: equippedTitle ? equippedTitle.id : null,
            unlockedAchievementIds: unlockedIds,
            achievementsInitialized: true
          }
        },
        { upsert: true, new: true }
      );

      // Update active room player object if the user is currently in a room
      if (roomManager?.rooms) {
        roomManager.rooms.forEach((room) => {
          const player = room.players?.find(p => String(p.userId) === String(userId));
          if (player) {
            player.equippedTitle = equippedTitle;
          }
        });
      }

      await invalidateUserAndLeaderboardCache(userId);

      return res.json({
        equippedTitleId: equippedTitle ? equippedTitle.id : null,
        equippedTitle
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      console.error('[MongoDB] Failed to equip achievement title:', error.message);
      return res.status(500).json({ error: 'Failed to equip achievement title' });
    }
  });

  // GET /api/leaderboard - Supports period = all | month | week
  router.get('/leaderboard', async (req, res) => {
    try {
      const requestedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 50;
      const period = normalizePeriod(req.query.period);

      const cacheKey = `${LEADERBOARD_CACHE_PREFIX}${period}:${limit}`;
      const cachedData = await getCachedJson(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }

      if (period === 'all') {
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
            bestWinStreak: profile.bestWinStreak || 0,
            equippedTitle: resolveEquippedTitle(profile.equippedTitleId)
          };
        });

        const responsePayload = { leaderboard, period };
        void setCachedJson(cacheKey, responsePayload, LEADERBOARD_CACHE_TTL);
        return res.json(responsePayload);
      }

      // Period-based leaderboard ('month' or 'week') aggregated from PvP GameHistory
      const startDate = getPeriodStartDate(period);
      const matches = await GameHistory.find({
        isAiRoom: { $ne: true },
        status: { $in: ['completed', 'forfeited'] },
        finishedAt: { $gte: startDate }
      })
        .sort({ finishedAt: 1, _id: 1 })
        .lean();

      if (!matches.length) {
        const emptyPayload = { leaderboard: [], period, startDate };
        void setCachedJson(cacheKey, emptyPayload, LEADERBOARD_CACHE_TTL);
        return res.json(emptyPayload);
      }

      const playerMap = new Map();

      for (const match of matches) {
        if (!Array.isArray(match.players)) continue;
        const winnerIdStr = match.winnerId ? String(match.winnerId) : null;

        for (const p of match.players) {
          if (!p || !p.userId) continue;
          const uid = String(p.userId);

          let entry = playerMap.get(uid);
          if (!entry) {
            const initialRating = typeof p.ratingAfter === 'number' && Number.isFinite(p.ratingAfter)
              ? p.ratingAfter
              : 1000;
            entry = {
              userId: uid,
              username: p.username || 'Player',
              avatar: p.avatar || '',
              wins: 0,
              losses: 0,
              currentWinStreak: 0,
              bestWinStreak: 0,
              rating: initialRating,
              highestRating: initialRating
            };
            playerMap.set(uid, entry);
          }

          if (p.username && p.username.toLowerCase() !== 'player') {
            entry.username = p.username;
          }
          if (p.avatar) {
            entry.avatar = p.avatar;
          }

          const isWinner = (winnerIdStr && winnerIdStr === uid) ||
            (typeof match.winnerIndex === 'number' && p.playerIndex === match.winnerIndex);

          if (isWinner) {
            entry.wins += 1;
            entry.currentWinStreak += 1;
            if (entry.currentWinStreak > entry.bestWinStreak) {
              entry.bestWinStreak = entry.currentWinStreak;
            }
          } else {
            entry.losses += 1;
            entry.currentWinStreak = 0;
          }

          if (typeof p.ratingAfter === 'number' && Number.isFinite(p.ratingAfter)) {
            entry.rating = p.ratingAfter;
            if (p.ratingAfter > entry.highestRating) {
              entry.highestRating = p.ratingAfter;
            }
          }
          if (typeof p.highestRatingAfter === 'number' && Number.isFinite(p.highestRatingAfter)) {
            if (p.highestRatingAfter > entry.highestRating) {
              entry.highestRating = p.highestRatingAfter;
            }
          }
        }
      }

      const activeUserIds = Array.from(playerMap.keys());
      const [users, profiles] = await Promise.all([
        User.find({ _id: { $in: activeUserIds } }).select('name avatar').lean(),
        GameProfile.find({ userId: { $in: activeUserIds } }).select('userId rating highestRating equippedTitleId').lean()
      ]);

      for (const u of users) {
        const entry = playerMap.get(String(u._id));
        if (entry) {
          if (u.name) entry.username = u.name;
          if (u.avatar) entry.avatar = u.avatar;
        }
      }

      for (const prof of profiles) {
        const entry = playerMap.get(String(prof.userId));
        if (entry) {
          if (typeof prof.rating === 'number' && Number.isFinite(prof.rating)) {
            entry.rating = prof.rating;
          }
          const peak = Math.max(entry.rating, entry.highestRating, prof.highestRating ?? entry.rating);
          entry.highestRating = peak;
          entry.equippedTitle = resolveEquippedTitle(prof.equippedTitleId);
        }
      }

      const sortedEntries = Array.from(playerMap.values())
        .sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.losses - b.losses;
        })
        .slice(0, limit);

      const leaderboard = sortedEntries.map((item, index) => {
        const totalMatches = item.wins + item.losses;
        const winRate = totalMatches > 0 ? Number(((item.wins / totalMatches) * 100).toFixed(1)) : 0;
        const rankInfo = getRank(item.rating);

        return {
          rank: index + 1,
          userId: item.userId,
          username: item.username || 'Player',
          avatar: item.avatar || '',
          rating: item.rating,
          highestRating: item.highestRating,
          rankTier: rankInfo.key,
          rankNameVi: rankInfo.nameVi,
          rankNameEn: rankInfo.nameEn,
          wins: item.wins,
          losses: item.losses,
          totalMatches,
          winRate,
          currentWinStreak: item.currentWinStreak,
          bestWinStreak: item.bestWinStreak,
          equippedTitle: item.equippedTitle || null
        };
      });

      const responsePayload = { leaderboard, period, startDate };
      void setCachedJson(cacheKey, responsePayload, LEADERBOARD_CACHE_TTL);
      return res.json(responsePayload);
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
  createApiRouter,
  normalizePeriod,
  getPeriodStartDate
};
