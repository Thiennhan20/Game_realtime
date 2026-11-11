const express = require('express');
const jwt = require('jsonwebtoken');
const GameHistory = require('../models/GameHistory');
const GameProfile = require('../models/GameProfile');
const User = require('../models/User');
const DailyChallenge = require('../models/DailyChallenge');
const DailySubmission = require('../models/DailySubmission');
const { getGameProfileSummary } = require('../services/matchSettlement');
const { calculateUserAchievements, resolveEquippedTitle, ACHIEVEMENTS_DEFINITIONS } = require('../services/achievements');
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

  // GET /api/profile/:userId - Public Game Profile (Supports :userId or 'me')
  router.get('/profile/:userId', async (req, res) => {
    try {
      const rawUserId = req.params.userId;
      let targetUserId = rawUserId;

      if (rawUserId === 'me') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET);
          targetUserId = String(decoded.userId);
        } catch {
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
      }

      if (!targetUserId || !/^[a-f\d]{24}$/i.test(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const cacheKey = `${PROFILE_CACHE_PREFIX}full:${targetUserId}`;
      const cached = await getCachedJson(cacheKey);
      if (cached) {
        return res.json({ profile: cached, cached: true });
      }

      const [userDoc, profileDoc, recentMatches] = await Promise.all([
        User.findById(targetUserId).select('name email avatar createdAt').lean(),
        GameProfile.findOne({ userId: targetUserId }).lean(),
        GameHistory.find({ 'players.userId': targetUserId })
          .sort({ finishedAt: -1, _id: -1 })
          .limit(5)
          .lean()
      ]);

      if (!userDoc) {
        return res.status(404).json({ error: 'Người chơi không tồn tại.' });
      }

      const summary = await getGameProfileSummary(targetUserId);
      const totalPvpMatches = summary.wins + summary.losses;
      const pvpWinRate = totalPvpMatches > 0 ? Math.round((summary.wins / totalPvpMatches) * 100) : 0;

      const easyWins = profileDoc?.aiStats?.easy?.wins || 0;
      const easyLosses = profileDoc?.aiStats?.easy?.losses || 0;
      const mediumWins = profileDoc?.aiStats?.medium?.wins || 0;
      const mediumLosses = profileDoc?.aiStats?.medium?.losses || 0;
      const hardWins = profileDoc?.aiStats?.hard?.wins || 0;
      const hardLosses = profileDoc?.aiStats?.hard?.losses || 0;
      const totalAiWins = easyWins + mediumWins + hardWins;
      const totalAiLosses = easyLosses + mediumLosses + hardLosses;
      const totalAiMatches = totalAiWins + totalAiLosses;
      const aiWinRate = totalAiMatches > 0 ? Math.round((totalAiWins / totalAiMatches) * 100) : 0;

      let unlockedAchievementsCount = 0;
      if (Array.isArray(profileDoc?.unlockedAchievementIds) && profileDoc?.achievementsInitialized) {
        unlockedAchievementsCount = profileDoc.unlockedAchievementIds.length;
      } else {
        const allHistories = await GameHistory.find({ 'players.userId': targetUserId })
          .sort({ finishedAt: -1 })
          .limit(250)
          .lean();
        const calc = calculateUserAchievements(profileDoc, allHistories);
        unlockedAchievementsCount = calc.summary?.unlockedCount || 0;
      }

      const recentForm = recentMatches.map((match) => {
        const isWinner = String(match.winnerId) === String(targetUserId);
        const isAbandoned = match.status === 'abandoned' || match.status === 'cancelled';
        const myPlayer = match.players?.find((p) => String(p.userId) === String(targetUserId));
        const oppPlayer = match.players?.find((p) => String(p.userId) !== String(targetUserId));

        return {
          matchId: match.matchId,
          isAiRoom: Boolean(match.isAiRoom),
          status: match.status,
          result: isAbandoned ? 'abandoned' : isWinner ? 'win' : 'loss',
          opponentName: match.isAiRoom ? 'AI Bot' : (oppPlayer?.username || 'Đối thủ'),
          opponentAvatar: oppPlayer?.avatar || '',
          ratingDelta: myPlayer?.ratingDelta || 0,
          guessCount: myPlayer?.guessCount || 0,
          finishedAt: match.finishedAt || match.createdAt
        };
      });

      const fullProfile = {
        user: {
          userId: String(userDoc._id),
          name: userDoc.name,
          avatar: userDoc.avatar || '',
          createdAt: userDoc.createdAt
        },
        stats: {
          ...summary,
          totalPvpMatches,
          pvpWinRate,
          aiStats: {
            easy: { wins: easyWins, losses: easyLosses },
            medium: { wins: mediumWins, losses: mediumLosses },
            hard: { wins: hardWins, losses: hardLosses },
            totalAiWins,
            totalAiLosses,
            totalAiMatches,
            aiWinRate
          },
          unlockedAchievementsCount,
          totalAchievementsCount: Array.isArray(ACHIEVEMENTS_DEFINITIONS) ? ACHIEVEMENTS_DEFINITIONS.length : 51,
          recentForm
        }
      };

      void setCachedJson(cacheKey, fullProfile, 60);

      return res.json({ profile: fullProfile });
    } catch (err) {
      console.error('[API Profile Error]:', err.message);
      return res.status(500).json({ error: 'Failed to load user profile' });
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
        { upsert: true, returnDocument: 'after' }
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

  // --- DAILY CHALLENGE ROUTES ---
  function getTodayVnDateString() {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const vnTime = new Date(utc + (3600000 * 7));
    const year = vnTime.getFullYear();
    const month = String(vnTime.getMonth() + 1).padStart(2, '0');
    const day = String(vnTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateDailySecret(dateStr) {
    let seed = 0;
    const fullKey = `${dateStr}_entn_daily_challenge`;
    for (let i = 0; i < fullKey.length; i++) {
      seed = (seed * 31 + fullKey.charCodeAt(i)) >>> 0;
    }
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const result = [];
    while (result.length < 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const idx = seed % digits.length;
      result.push(digits.splice(idx, 1)[0]);
    }
    return result.join('');
  }

  async function getTodayChallenge() {
    const date = getTodayVnDateString();
    let challenge = await DailyChallenge.findOne({ date });
    if (!challenge) {
      const secret = generateDailySecret(date);
      try {
        challenge = await DailyChallenge.create({ date, secret });
      } catch {
        challenge = await DailyChallenge.findOne({ date });
      }
    }
    return { date, secret: challenge?.secret || generateDailySecret(date), challenge };
  }

  // GET /api/daily-challenge
  router.get('/daily-challenge', async (req, res) => {
    try {
      const { date, secret, challenge } = await getTodayChallenge();

      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id || decoded.userId || decoded._id;
        } catch {}
      }

      let submission = null;
      if (userId) {
        submission = await DailySubmission.findOne({ userId, date });
      }

      const totalParticipants = challenge?.totalParticipants || (await DailySubmission.countDocuments({ date }));
      const totalSolved = challenge?.totalSolved || (await DailySubmission.countDocuments({ date, isSolved: true }));

      return res.json({
        date,
        maxGuesses: 8,
        totalParticipants,
        totalSolved,
        isPlayed: Boolean(submission && submission.guessCount > 0),
        isFinished: Boolean(submission?.isFinished),
        isSolved: Boolean(submission?.isSolved),
        guessCount: submission?.guessCount || 0,
        guesses: submission?.guesses || [],
        durationSeconds: submission?.durationSeconds || 0,
        xpAwarded: submission?.xpAwarded || 0,
        revealedSecret: submission?.isFinished ? secret : null
      });
    } catch (err) {
      console.error('[DailyChallenge] Failed to fetch:', err.message);
      res.status(500).json({ error: 'Failed to fetch daily challenge' });
    }
  });

  // POST /api/daily-challenge/guess
  router.post('/daily-challenge/guess', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập để tham gia Thử Thách Hàng Ngày.' });
      }
      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
      }
      const userId = decoded.id || decoded.userId || decoded._id;

      const { guess, durationSeconds = 0 } = req.body || {};
      const cleanGuess = String(guess || '').trim();

      // Validate 4 unique digits
      if (!/^\d{4}$/.test(cleanGuess) || new Set(cleanGuess).size !== 4) {
        return res.status(400).json({ error: 'Lượt đoán phải gồm đúng 4 chữ số khác nhau.' });
      }

      const { date, secret } = await getTodayChallenge();

      let userDoc = await User.findById(userId);
      const username = userDoc?.name || decoded.name || decoded.username || 'Player';
      const avatar = userDoc?.avatar || '';

      let submission = await DailySubmission.findOne({ userId, date });
      if (!submission) {
        submission = new DailySubmission({
          userId,
          username,
          avatar,
          date,
          guesses: [],
          guessCount: 0,
          maxGuesses: 8,
          isSolved: false,
          isFinished: false,
          durationSeconds: 0
        });
        await DailyChallenge.updateOne({ date }, { $inc: { totalParticipants: 1 } });
      }

      if (submission.isFinished) {
        return res.status(400).json({
          error: 'Bạn đã hoàn thành thử thách hôm nay rồi.',
          isFinished: true,
          revealedSecret: secret
        });
      }

      // Check duplicate guess in this session
      if (submission.guesses.some(g => g.guess === cleanGuess)) {
        return res.status(400).json({ error: 'Bạn đã thử mã số này trong hôm nay rồi.' });
      }

      // Calculate Bulls & Cows
      let correctPosition = 0;
      let correctNumbers = 0;
      for (let i = 0; i < 4; i++) {
        if (cleanGuess[i] === secret[i]) {
          correctPosition++;
        } else if (secret.includes(cleanGuess[i])) {
          correctNumbers++;
        }
      }

      submission.guesses.push({
        guess: cleanGuess,
        correctNumbers,
        correctPosition,
        createdAt: new Date()
      });
      submission.guessCount = submission.guesses.length;
      submission.durationSeconds = Math.max(submission.durationSeconds, Math.floor(durationSeconds));

      let xpAwarded = 0;
      if (correctPosition === 4) {
        submission.isSolved = true;
        submission.isFinished = true;
        submission.completedAt = new Date();
        xpAwarded = 50; // Award 50 XP for daily solve
        submission.xpAwarded = xpAwarded;

        await DailyChallenge.updateOne({ date }, { $inc: { totalSolved: 1 } });

        // Reward player profile with XP
        await GameProfile.findOneAndUpdate(
          { userId },
          { $inc: { totalXp: xpAwarded } },
          { upsert: true, returnDocument: 'after' }
        );
      } else if (submission.guessCount >= 8) {
        submission.isSolved = false;
        submission.isFinished = true;
        submission.completedAt = new Date();
      }

      await submission.save();

      return res.json({
        date,
        guessResult: {
          guess: cleanGuess,
          correctPosition,
          correctNumbers
        },
        guessCount: submission.guessCount,
        maxGuesses: 8,
        isSolved: submission.isSolved,
        isFinished: submission.isFinished,
        xpAwarded,
        durationSeconds: submission.durationSeconds,
        revealedSecret: submission.isFinished ? secret : null,
        guesses: submission.guesses
      });
    } catch (err) {
      console.error('[DailyChallenge] Guess failed:', err.message);
      res.status(500).json({ error: 'Failed to process guess' });
    }
  });

  // GET /api/daily-challenge/leaderboard
  router.get('/daily-challenge/leaderboard', async (req, res) => {
    try {
      const { date } = await getTodayChallenge();
      const topSolvers = await DailySubmission.find({ date, isSolved: true })
        .sort({ guessCount: 1, durationSeconds: 1, completedAt: 1 })
        .limit(20)
        .lean();

      const leaderboard = topSolvers.map((item, index) => ({
        rank: index + 1,
        userId: item.userId,
        username: item.username,
        avatar: item.avatar,
        guessCount: item.guessCount,
        durationSeconds: item.durationSeconds,
        completedAt: item.completedAt
      }));

      return res.json({ date, leaderboard });
    } catch (err) {
      console.error('[DailyChallenge] Leaderboard failed:', err.message);
      res.status(500).json({ error: 'Failed to fetch daily leaderboard' });
    }
  });

  return router;
}

module.exports = {
  createApiRouter,
  normalizePeriod,
  getPeriodStartDate
};
