const ACHIEVEMENTS_DEFINITIONS = [
  {
    id: 'ai_easy_5',
    category: 'pve',
    icon: '🥉',
    titleVi: 'Tập Sự AI',
    titleEn: 'AI Apprentice',
    descVi: 'Thắng 5 trận đấu với AI Dễ',
    descEn: 'Win 5 matches against Easy AI',
    target: 5,
    getProgress: (profile) => profile?.aiStats?.easy?.wins || 0
  },
  {
    id: 'ai_medium_10',
    category: 'pve',
    icon: '🥈',
    titleVi: 'Thợ Săn Skynet',
    titleEn: 'Skynet Hunter',
    descVi: 'Thắng 10 trận đấu với AI Trung Bình',
    descEn: 'Win 10 matches against Medium AI',
    target: 10,
    getProgress: (profile) => profile?.aiStats?.medium?.wins || 0
  },
  {
    id: 'ai_hard_5',
    category: 'pve',
    icon: '🥇',
    titleVi: 'Khắc Tinh Thuật Toán',
    titleEn: 'Algorithm Master',
    descVi: 'Thắng 5 trận đấu với AI Cực Khó',
    descEn: 'Win 5 matches against Hard AI',
    target: 5,
    getProgress: (profile) => profile?.aiStats?.hard?.wins || 0
  },
  {
    id: 'pro_guesser',
    category: 'general',
    icon: '⚡',
    titleVi: 'Thiên Tài Đoán Số',
    titleEn: 'Pro Guesser',
    descVi: 'Đoán giải mã thành công số đối thủ chỉ từ 4 lượt trở xuống',
    descEn: 'Solve opponent secret code in 4 or fewer guesses',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const hasFastWin = historyList.some(match => {
        const isWinner = match.winnerId && profile?.userId && String(match.winnerId) === String(profile.userId);
        const isWinnerIndex0 = match.winnerIndex === 0 && match.isAiRoom;
        if (isWinner || isWinnerIndex0) {
          const userPlayer = match.players?.find(p => String(p.userId) === String(profile.userId) || (match.isAiRoom && p.playerIndex === 0));
          const guessCount = userPlayer?.guessCount || match.winnerGuessCount || 99;
          return guessCount <= 4;
        }
        return false;
      });
      return hasFastWin ? 1 : 0;
    }
  },
  {
    id: 'streak_3',
    category: 'general',
    icon: '🔥',
    titleVi: 'Chuỗi Bất Bại',
    titleEn: 'Unstoppable',
    descVi: 'Đạt chuỗi thắng từ 3 trận liên tiếp trở lên',
    descEn: 'Reach a win streak of 3 or more matches',
    target: 3,
    getProgress: (profile) => Math.max(profile?.currentWinStreak || 0, profile?.bestWinStreak || 0)
  },
  {
    id: 'pvp_wins_10',
    category: 'pvp',
    icon: '🏆',
    titleVi: 'Đấu Sĩ Đấu Trường',
    titleEn: 'PvP Warrior',
    descVi: 'Thắng 10 trận đấu PvP với người chơi khác',
    descEn: 'Win 10 PvP matches against other players',
    target: 10,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'rank_gold',
    category: 'pvp',
    icon: '👑',
    titleVi: 'Bậc Thầy Xếp Hạng',
    titleEn: 'Rank Master',
    descVi: 'Đạt hạng Vàng (Rating >= 1300) trở lên',
    descEn: 'Reach Gold rank (Rating >= 1300) or higher',
    target: 1300,
    getProgress: (profile) => Math.max(profile?.rating || 0, profile?.highestRating || 0)
  }
];

function calculateUserAchievements(profile, historyList = []) {
  const achievements = ACHIEVEMENTS_DEFINITIONS.map(def => {
    const rawProgress = def.getProgress(profile, historyList);
    const progress = Math.max(0, Math.min(def.target, rawProgress));
    const isUnlocked = progress >= def.target;
    const percentage = Math.min(100, Math.floor((progress / def.target) * 100));

    return {
      id: def.id,
      category: def.category,
      icon: def.icon,
      titleVi: def.titleVi,
      titleEn: def.titleEn,
      descVi: def.descVi,
      descEn: def.descEn,
      target: def.target,
      progress,
      percentage,
      isUnlocked
    };
  });

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;
  const overallPercentage = Math.floor((unlockedCount / totalCount) * 100);

  return {
    achievements,
    summary: {
      unlockedCount,
      totalCount,
      overallPercentage
    }
  };
}

module.exports = {
  ACHIEVEMENTS_DEFINITIONS,
  calculateUserAchievements
};
