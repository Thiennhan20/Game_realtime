const { calculateLevelProgress } = require('./progression');

function getUserPlayerEntry(match, profile) {
  if (!match || !Array.isArray(match.players)) return null;
  const uid = profile?.userId ? String(profile.userId) : null;
  return (
    match.players.find(
      p => (uid && String(p.userId) === uid) || (match.isAiRoom && p.playerIndex === 0)
    ) || null
  );
}

function isUserMatchWinner(match, profile) {
  if (!match) return false;
  if (match.status && match.status !== 'completed' && match.status !== 'forfeited') {
    return false;
  }
  const uid = profile?.userId ? String(profile.userId) : null;
  const isPvpWinner = Boolean(uid && match.winnerId && String(match.winnerId) === uid);
  const isAiWinner = Boolean(match.isAiRoom && match.winnerIndex === 0);
  return isPvpWinner || isAiWinner;
}

function getUserMatchGuesses(match, profile) {
  const userPlayer = getUserPlayerEntry(match, profile);
  const guessCount = userPlayer?.guessCount || match?.winnerGuessCount || 0;
  return typeof guessCount === 'number' && guessCount > 0 ? guessCount : null;
}

function getTotalAiWins(profile) {
  return (
    (profile?.aiStats?.easy?.wins || 0) +
    (profile?.aiStats?.medium?.wins || 0) +
    (profile?.aiStats?.hard?.wins || 0)
  );
}

function getTotalAiLosses(profile) {
  return (
    (profile?.aiStats?.easy?.losses || 0) +
    (profile?.aiStats?.medium?.losses || 0) +
    (profile?.aiStats?.hard?.losses || 0)
  );
}

function getTotalMatchesPlayed(profile) {
  const pvpTotal = (profile?.wins || 0) + (profile?.losses || 0);
  const aiTotal = getTotalAiWins(profile) + getTotalAiLosses(profile);
  return pvpTotal + aiTotal;
}

function getPeakRating(profile) {
  return Math.max(profile?.rating || 0, profile?.highestRating || 0);
}

function getBestStreak(profile) {
  return Math.max(profile?.currentWinStreak || 0, profile?.bestWinStreak || 0);
}

function getUserLevel(profile) {
  const safeXp = Math.max(0, Math.floor(typeof profile?.totalXp === 'number' ? profile.totalXp : 0));
  return calculateLevelProgress(safeXp).level;
}

const ACHIEVEMENTS_DEFINITIONS = [
  // ==========================================
  // 1. PVE CATEGORY (12 BADGES)
  // ==========================================
  {
    id: 'ai_first_win',
    category: 'pve',
    rarity: 'common',
    icon: '🤖',
    titleVi: 'Khởi Đầu Huấn Luyện',
    titleEn: 'Training Initiate',
    descVi: 'Giành chiến thắng đầu tiên trước AI ở bất kỳ độ khó nào',
    descEn: 'Win your first match against AI at any difficulty',
    target: 1,
    getProgress: (profile) => getTotalAiWins(profile)
  },
  {
    id: 'ai_easy_5',
    category: 'pve',
    rarity: 'common',
    icon: '🥉',
    titleVi: 'Tập Sự AI',
    titleEn: 'AI Apprentice',
    descVi: 'Thắng 5 trận đấu với AI Dễ',
    descEn: 'Win 5 matches against Easy AI',
    target: 5,
    getProgress: (profile) => profile?.aiStats?.easy?.wins || 0
  },
  {
    id: 'ai_easy_15',
    category: 'pve',
    rarity: 'rare',
    icon: '🛠️',
    titleVi: 'Chuyên Gia AI Dễ',
    titleEn: 'Easy Bot Specialist',
    descVi: 'Thắng 15 trận đấu với AI Dễ',
    descEn: 'Win 15 matches against Easy AI',
    target: 15,
    getProgress: (profile) => profile?.aiStats?.easy?.wins || 0
  },
  {
    id: 'ai_easy_30',
    category: 'pve',
    rarity: 'epic',
    icon: '⚙️',
    titleVi: 'Bá Chủ AI Dễ',
    titleEn: 'Easy Bot Overlord',
    descVi: 'Thắng 30 trận đấu với AI Dễ',
    descEn: 'Win 30 matches against Easy AI',
    target: 30,
    getProgress: (profile) => profile?.aiStats?.easy?.wins || 0
  },
  {
    id: 'ai_medium_3',
    category: 'pve',
    rarity: 'common',
    icon: '📡',
    titleVi: 'Khắc Tinh Máy Tầm Trung',
    titleEn: 'Tactical Learner',
    descVi: 'Thắng 3 trận đấu với AI Trung Bình',
    descEn: 'Win 3 matches against Medium AI',
    target: 3,
    getProgress: (profile) => profile?.aiStats?.medium?.wins || 0
  },
  {
    id: 'ai_medium_10',
    category: 'pve',
    rarity: 'rare',
    icon: '🥈',
    titleVi: 'Thợ Săn Skynet',
    titleEn: 'Skynet Hunter',
    descVi: 'Thắng 10 trận đấu với AI Trung Bình',
    descEn: 'Win 10 matches against Medium AI',
    target: 10,
    getProgress: (profile) => profile?.aiStats?.medium?.wins || 0
  },
  {
    id: 'ai_medium_25',
    category: 'pve',
    rarity: 'epic',
    icon: '🔋',
    titleVi: 'Kẻ Chế Ngự AI Trung Bình',
    titleEn: 'Medium AI Tamer',
    descVi: 'Thắng 25 trận đấu với AI Trung Bình',
    descEn: 'Win 25 matches against Medium AI',
    target: 25,
    getProgress: (profile) => profile?.aiStats?.medium?.wins || 0
  },
  {
    id: 'ai_hard_1',
    category: 'pve',
    rarity: 'rare',
    icon: '🧨',
    titleVi: 'Thử Lửa Địa Ngục',
    titleEn: 'Hellfire Trial',
    descVi: 'Đánh bại AI Cực Khó lần đầu tiên',
    descEn: 'Defeat Hard AI for the very first time',
    target: 1,
    getProgress: (profile) => profile?.aiStats?.hard?.wins || 0
  },
  {
    id: 'ai_hard_5',
    category: 'pve',
    rarity: 'epic',
    icon: '🥇',
    titleVi: 'Khắc Tinh Thuật Toán',
    titleEn: 'Algorithm Master',
    descVi: 'Thắng 5 trận đấu với AI Cực Khó',
    descEn: 'Win 5 matches against Hard AI',
    target: 5,
    getProgress: (profile) => profile?.aiStats?.hard?.wins || 0
  },
  {
    id: 'ai_hard_20',
    category: 'pve',
    rarity: 'legendary',
    icon: '🧠',
    titleVi: 'Siêu Trí Tuệ Nhân Tạo',
    titleEn: 'Superintelligence',
    descVi: 'Thắng 20 trận đấu với AI Cực Khó',
    descEn: 'Win 20 matches against Hard AI',
    target: 20,
    getProgress: (profile) => profile?.aiStats?.hard?.wins || 0
  },
  {
    id: 'ai_all_rounder_3',
    category: 'pve',
    rarity: 'epic',
    icon: '🔱',
    titleVi: 'Chinh Phục Đa Cấp Độ',
    titleEn: 'Triple Threat Conqueror',
    descVi: 'Thắng ít nhất 3 trận ở cả 3 mức độ AI (Dễ, Trung Bình, Khó)',
    descEn: 'Win at least 3 matches on each AI difficulty (Easy, Medium, Hard)',
    target: 3,
    getProgress: (profile) => Math.min(
      profile?.aiStats?.easy?.wins || 0,
      profile?.aiStats?.medium?.wins || 0,
      profile?.aiStats?.hard?.wins || 0
    )
  },
  {
    id: 'ai_total_50',
    category: 'pve',
    rarity: 'legendary',
    icon: '🛡️',
    titleVi: 'Kẻ Hủy Diệt Máy Móc',
    titleEn: 'Machine Destroyer',
    descVi: 'Đạt tổng cộng 50 trận thắng trước AI ở mọi cấp độ',
    descEn: 'Reach 50 total wins against AI across all difficulties',
    target: 50,
    getProgress: (profile) => getTotalAiWins(profile)
  },

  // ==========================================
  // 2. PVP CATEGORY (15 BADGES)
  // ==========================================
  {
    id: 'pvp_first_match',
    category: 'pvp',
    rarity: 'common',
    icon: '🚪',
    titleVi: 'Bước Chân Vào Đấu Trường',
    titleEn: 'Arena Debut',
    descVi: 'Hoàn thành trận đấu PvP đầu tiên với người chơi khác',
    descEn: 'Complete your first PvP match against another player',
    target: 1,
    getProgress: (profile) => (profile?.wins || 0) + (profile?.losses || 0)
  },
  {
    id: 'pvp_first_win',
    category: 'pvp',
    rarity: 'common',
    icon: '⚔️',
    titleVi: 'Chiến Công Đầu Tiên',
    titleEn: 'First Blood',
    descVi: 'Giành chiến thắng PvP đầu tiên trước người chơi khác',
    descEn: 'Win your first PvP match against another player',
    target: 1,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'pvp_wins_5',
    category: 'pvp',
    rarity: 'common',
    icon: '🗡️',
    titleVi: 'Tân Binh Hiếu Chiến',
    titleEn: 'Rising Contender',
    descVi: 'Thắng 5 trận đấu PvP với người chơi khác',
    descEn: 'Win 5 PvP matches against other players',
    target: 5,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'pvp_wins_10',
    category: 'pvp',
    rarity: 'rare',
    icon: '🏆',
    titleVi: 'Đấu Sĩ Đấu Trường',
    titleEn: 'PvP Warrior',
    descVi: 'Thắng 10 trận đấu PvP với người chơi khác',
    descEn: 'Win 10 PvP matches against other players',
    target: 10,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'pvp_wins_25',
    category: 'pvp',
    rarity: 'epic',
    icon: '🦅',
    titleVi: 'Dũng Sĩ Tinh Anh',
    titleEn: 'Elite Gladiator',
    descVi: 'Thắng 25 trận đấu PvP với người chơi khác',
    descEn: 'Win 25 PvP matches against other players',
    target: 25,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'pvp_wins_50',
    category: 'pvp',
    rarity: 'legendary',
    icon: '🎖️',
    titleVi: 'Chiến Thần Bách Chiến',
    titleEn: 'Arena Warlord',
    descVi: 'Thắng 50 trận đấu PvP với người chơi khác',
    descEn: 'Win 50 PvP matches against other players',
    target: 50,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'pvp_wins_100',
    category: 'pvp',
    rarity: 'legendary',
    icon: '🐉',
    titleVi: 'Độc Bá Thiên Hạ',
    titleEn: 'Supreme Conqueror',
    descVi: 'Thắng 100 trận đấu PvP với người chơi khác',
    descEn: 'Win 100 PvP matches against other players',
    target: 100,
    getProgress: (profile) => profile?.wins || 0
  },
  {
    id: 'rank_1050',
    category: 'pvp',
    rarity: 'common',
    icon: '📈',
    titleVi: 'Khởi Động Xếp Hạng',
    titleEn: 'Ranked Climber',
    descVi: 'Đạt mốc Rating 1050 trở lên trong Đấu Trường',
    descEn: 'Reach Rating 1050 or higher in PvP Arena',
    target: 1050,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_silver',
    category: 'pvp',
    rarity: 'common',
    icon: '🛡️',
    titleVi: 'Tân Tinh Bạc',
    titleEn: 'Silver Challenger',
    descVi: 'Đạt hạng Bạc (Rating >= 1100) trở lên',
    descEn: 'Reach Silver rank (Rating >= 1100) or higher',
    target: 1100,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_1200',
    category: 'pvp',
    rarity: 'rare',
    icon: '⚔️',
    titleVi: 'Chiến Binh Bạc Kỳ Cựu',
    titleEn: 'Silver Veteran',
    descVi: 'Đạt mốc Rating 1200 trở lên trong Đấu Trường',
    descEn: 'Reach Rating 1200 or higher in PvP Arena',
    target: 1200,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_gold',
    category: 'pvp',
    rarity: 'epic',
    icon: '👑',
    titleVi: 'Bậc Thầy Xếp Hạng',
    titleEn: 'Rank Master',
    descVi: 'Đạt hạng Vàng (Rating >= 1300) trở lên',
    descEn: 'Reach Gold rank (Rating >= 1300) or higher',
    target: 1300,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_1400',
    category: 'pvp',
    rarity: 'epic',
    icon: '⚜️',
    titleVi: 'Tinh Hoa Vàng Ròng',
    titleEn: 'Golden Vanguard',
    descVi: 'Đạt mốc Rating 1400 trở lên trong Đấu Trường',
    descEn: 'Reach Rating 1400 or higher in PvP Arena',
    target: 1400,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_platinum',
    category: 'pvp',
    rarity: 'legendary',
    icon: '💠',
    titleVi: 'Huyền Thoại Bạch Kim',
    titleEn: 'Platinum Legend',
    descVi: 'Đạt hạng Bạch Kim (Rating >= 1500) trở lên',
    descEn: 'Reach Platinum rank (Rating >= 1500) or higher',
    target: 1500,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_diamond',
    category: 'pvp',
    rarity: 'legendary',
    icon: '💎',
    titleVi: 'Siêu Sao Kim Cương',
    titleEn: 'Diamond Superstar',
    descVi: 'Đạt hạng Kim Cương (Rating >= 1700) trở lên',
    descEn: 'Reach Diamond rank (Rating >= 1700) or higher',
    target: 1700,
    getProgress: (profile) => getPeakRating(profile)
  },
  {
    id: 'rank_master',
    category: 'pvp',
    rarity: 'legendary',
    icon: '🌌',
    titleVi: 'Đỉnh Cao Đại Cao Thủ',
    titleEn: 'Grandmaster Sovereign',
    descVi: 'Đạt hạng Cao Thủ (Rating >= 1900) trở lên',
    descEn: 'Reach Master rank (Rating >= 1900) or higher',
    target: 1900,
    getProgress: (profile) => getPeakRating(profile)
  },

  // ==========================================
  // 3. GENERAL / MASTERY CATEGORY (12 BADGES)
  // ==========================================
  {
    id: 'codebreaker_5',
    category: 'general',
    rarity: 'common',
    icon: '🔐',
    titleVi: 'Nhà Giải Mã',
    titleEn: 'Codebreaker',
    descVi: 'Giải mã thành công số bí mật đối thủ từ 5 lượt đoán trở xuống',
    descEn: 'Solve opponent secret code in 5 or fewer guesses',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const g = getUserMatchGuesses(match, profile);
        return g !== null && g <= 5;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'pro_guesser',
    category: 'general',
    rarity: 'rare',
    icon: '⚡',
    titleVi: 'Thiên Tài Đoán Số',
    titleEn: 'Pro Guesser',
    descVi: 'Đoán giải mã thành công số đối thủ chỉ từ 4 lượt trở xuống',
    descEn: 'Solve opponent secret code in 4 or fewer guesses',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const g = getUserMatchGuesses(match, profile);
        return g !== null && g <= 4;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'sniper_guesser',
    category: 'general',
    rarity: 'epic',
    icon: '🎯',
    titleVi: 'Thần Bài Đọc Vị',
    titleEn: 'Code Sniper',
    descVi: 'Giải mã siêu tốc mật mã đối thủ chỉ trong 3 lượt đoán trở xuống',
    descEn: 'Crack opponent secret code in 3 or fewer guesses',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const g = getUserMatchGuesses(match, profile);
        return g !== null && g <= 3;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'mind_reader_2',
    category: 'general',
    rarity: 'legendary',
    icon: '🔮',
    titleVi: 'Thần Giao Cách Cảm',
    titleEn: 'Mind Reader',
    descVi: 'Giải mã thần sầu mật mã đối thủ chỉ trong 2 lượt đoán trở xuống',
    descEn: 'Miraculously crack opponent secret code in 2 or fewer guesses',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const g = getUserMatchGuesses(match, profile);
        return g !== null && g <= 2;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'fast_solver_5_times',
    category: 'general',
    rarity: 'epic',
    icon: '🗝️',
    titleVi: 'Chuyên Gia Phá Khóa',
    titleEn: 'Master Lockpicker',
    descVi: 'Có 5 trận thắng mà mỗi trận chỉ tốn từ 5 lượt đoán trở xuống',
    descEn: 'Win 5 matches using 5 or fewer guesses in each match',
    target: 5,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      return historyList.filter(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const g = getUserMatchGuesses(match, profile);
        return g !== null && g <= 5;
      }).length;
    }
  },
  {
    id: 'quick_reflex_90s',
    category: 'general',
    rarity: 'common',
    icon: '👟',
    titleVi: 'Phản Xạ Nhanh Nhạy',
    titleEn: 'Quick Reflexes',
    descVi: 'Giành chiến thắng một trận đấu hoàn chỉnh trong dưới 90 giây',
    descEn: 'Win a completed match in under 90 seconds',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        if (match.endReason && match.endReason !== 'correct_guess') return false;
        const dur = typeof match.duration === 'number' ? match.duration : 0;
        return dur > 0 && dur <= 90;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'speed_demon',
    category: 'general',
    rarity: 'rare',
    icon: '⏱️',
    titleVi: 'Tốc Chiến Tốc Thắng',
    titleEn: 'Speed Demon',
    descVi: 'Giành chiến thắng một trận đấu hoàn chỉnh trong dưới 60 giây',
    descEn: 'Win a completed match in under 60 seconds',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        if (match.endReason && match.endReason !== 'correct_guess') return false;
        const dur = typeof match.duration === 'number' ? match.duration : 0;
        return dur > 0 && dur <= 60;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'lightning_35s',
    category: 'general',
    rarity: 'legendary',
    icon: '🌩️',
    titleVi: 'Tia Chớp Đấu Trường',
    titleEn: 'Lightning Strike',
    descVi: 'Giành chiến thắng siêu tốc một trận đấu chỉ trong 35 giây trở xuống',
    descEn: 'Win a completed match at lightning speed in 35 seconds or less',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        if (match.endReason && match.endReason !== 'correct_guess') return false;
        const dur = typeof match.duration === 'number' ? match.duration : 0;
        return dur > 0 && dur <= 35;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'iron_will_8_guesses',
    category: 'general',
    rarity: 'rare',
    icon: '🧱',
    titleVi: 'Tinh Thần Thép',
    titleEn: 'Iron Will',
    descVi: 'Giành chiến thắng nghẹt thở sau cuộc đấu giằng co từ 8 lượt đoán trở lên',
    descEn: 'Win an intense marathon match taking 8 or more guesses',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const g = getUserMatchGuesses(match, profile);
        return g !== null && g >= 8;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'patience_master_180s',
    category: 'general',
    rarity: 'epic',
    icon: '♟️',
    titleVi: 'Đại Kiện Tướng Cân Não',
    titleEn: 'Grandmaster Patience',
    descVi: 'Giành chiến thắng một trận đấu trí căng thẳng kéo dài trên 3 phút (180 giây)',
    descEn: 'Win a tense mind-game match lasting 3 minutes (180 seconds) or longer',
    target: 1,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      const found = historyList.some(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const dur = typeof match.duration === 'number' ? match.duration : 0;
        return dur >= 180;
      });
      return found ? 1 : 0;
    }
  },
  {
    id: 'rps_king_5',
    category: 'general',
    rarity: 'rare',
    icon: '✌️',
    titleVi: 'Vua Oẳn Tù Tì',
    titleEn: 'RPS Champion',
    descVi: 'Chiến thắng lượt Oẳn Tù Tì đầu trận để giành quyền đi trước 5 lần',
    descEn: 'Win the opening Rock-Paper-Scissors duel to go first 5 times',
    target: 5,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      return historyList.filter(match => {
        const userPlayer = getUserPlayerEntry(match, profile);
        if (!userPlayer || typeof match.rpsWinnerIndex !== 'number' || match.rpsWinnerIndex < 0) return false;
        return userPlayer.playerIndex === match.rpsWinnerIndex;
      }).length;
    }
  },
  {
    id: 'comeback_second_turn_5',
    category: 'general',
    rarity: 'epic',
    icon: '🔄',
    titleVi: 'Lật Kèo Ngoạn Mục',
    titleEn: 'Second-Turn Comeback',
    descVi: 'Giành chiến thắng chung cuộc dù là người phải đi lượt thứ hai 5 lần',
    descEn: 'Win the match despite going second in turn order 5 times',
    target: 5,
    getProgress: (profile, historyList) => {
      if (!Array.isArray(historyList)) return 0;
      return historyList.filter(match => {
        if (!isUserMatchWinner(match, profile)) return false;
        const userPlayer = getUserPlayerEntry(match, profile);
        if (!userPlayer || typeof match.rpsWinnerIndex !== 'number' || match.rpsWinnerIndex < 0) return false;
        return userPlayer.playerIndex !== match.rpsWinnerIndex;
      }).length;
    }
  },

  // ==========================================
  // 4. PROGRESSION & STREAK CATEGORY (12 BADGES)
  // ==========================================
  {
    id: 'streak_2',
    category: 'progression',
    rarity: 'common',
    icon: '✨',
    titleVi: 'Khởi Đầu Chuỗi Thắng',
    titleEn: 'Double Strike',
    descVi: 'Đạt chuỗi thắng 2 trận PvP liên tiếp trở lên',
    descEn: 'Reach a win streak of 2 or more consecutive PvP matches',
    target: 2,
    getProgress: (profile) => getBestStreak(profile)
  },
  {
    id: 'streak_3',
    category: 'progression',
    rarity: 'rare',
    icon: '🔥',
    titleVi: 'Chuỗi Bất Bại',
    titleEn: 'Unstoppable',
    descVi: 'Đạt chuỗi thắng từ 3 trận PvP liên tiếp trở lên',
    descEn: 'Reach a win streak of 3 or more consecutive PvP matches',
    target: 3,
    getProgress: (profile) => getBestStreak(profile)
  },
  {
    id: 'streak_5',
    category: 'progression',
    rarity: 'epic',
    icon: '🌋',
    titleVi: 'Khí Thế Ngút Trời',
    titleEn: 'Rampage Streak',
    descVi: 'Đạt chuỗi thắng từ 5 trận PvP liên tiếp trở lên',
    descEn: 'Reach a win streak of 5 or more consecutive PvP matches',
    target: 5,
    getProgress: (profile) => getBestStreak(profile)
  },
  {
    id: 'streak_7',
    category: 'progression',
    rarity: 'legendary',
    icon: '☄️',
    titleVi: 'Độc Cô Cầu Bại',
    titleEn: 'Godlike Streak',
    descVi: 'Đạt chuỗi thắng từ 7 trận PvP liên tiếp trở lên',
    descEn: 'Reach a win streak of 7 or more consecutive PvP matches',
    target: 7,
    getProgress: (profile) => getBestStreak(profile)
  },
  {
    id: 'streak_10',
    category: 'progression',
    rarity: 'legendary',
    icon: '☀️',
    titleVi: 'Thần Thoại Bất Tử',
    titleEn: 'Immortal Streak',
    descVi: 'Đạt chuỗi thắng kỷ lục từ 10 trận PvP liên tiếp trở lên',
    descEn: 'Reach a legendary win streak of 10 or more consecutive PvP matches',
    target: 10,
    getProgress: (profile) => getBestStreak(profile)
  },
  {
    id: 'level_2',
    category: 'progression',
    rarity: 'common',
    icon: '🌱',
    titleVi: 'Tân Binh Cấp 2',
    titleEn: 'Level 2 Rookie',
    descVi: 'Đạt Cấp độ 2 (Level 2) trở lên trong hành trình đấu trường',
    descEn: 'Reach Level 2 or higher in arena progression',
    target: 2,
    getProgress: (profile) => getUserLevel(profile)
  },
  {
    id: 'veteran_level_5',
    category: 'progression',
    rarity: 'rare',
    icon: '🌟',
    titleVi: 'Kỳ Cựu Đấu Trường',
    titleEn: 'Arena Veteran',
    descVi: 'Đạt Cấp độ 5 (Level 5) trở lên trong hành trình đấu trường',
    descEn: 'Reach Level 5 or higher in arena progression',
    target: 5,
    getProgress: (profile) => getUserLevel(profile)
  },
  {
    id: 'level_10',
    category: 'progression',
    rarity: 'epic',
    icon: '⚡',
    titleVi: 'Chiến Binh Dạn Dày',
    titleEn: 'Battle Hardened',
    descVi: 'Đạt Cấp độ 10 (Level 10) trở lên trong hành trình đấu trường',
    descEn: 'Reach Level 10 or higher in arena progression',
    target: 10,
    getProgress: (profile) => getUserLevel(profile)
  },
  {
    id: 'level_15',
    category: 'progression',
    rarity: 'legendary',
    icon: '🏛️',
    titleVi: 'Tượng Đài Bất Diệt',
    titleEn: 'Living Monument',
    descVi: 'Đạt Cấp độ 15 (Level 15) trở lên trong hành trình đấu trường',
    descEn: 'Reach Level 15 or higher in arena progression',
    target: 15,
    getProgress: (profile) => getUserLevel(profile)
  },
  {
    id: 'xp_200',
    category: 'progression',
    rarity: 'common',
    icon: '🔋',
    titleVi: 'Thợ Săn Kinh Nghiệm',
    titleEn: 'XP Collector',
    descVi: 'Tích lũy tổng cộng 200 điểm kinh nghiệm (XP) trở lên',
    descEn: 'Accumulate 200 or more total Experience Points (XP)',
    target: 200,
    getProgress: (profile) => profile?.totalXp || 0
  },
  {
    id: 'xp_1000',
    category: 'progression',
    rarity: 'rare',
    icon: '💎',
    titleVi: 'Kho Tàng Kinh Nghiệm',
    titleEn: 'XP Hoarder',
    descVi: 'Tích lũy tổng cộng 1,000 điểm kinh nghiệm (XP) trở lên',
    descEn: 'Accumulate 1,000 or more total Experience Points (XP)',
    target: 1000,
    getProgress: (profile) => profile?.totalXp || 0
  },
  {
    id: 'total_matches_50',
    category: 'progression',
    rarity: 'epic',
    icon: '🎮',
    titleVi: 'Người Chơi Chăm Chỉ',
    titleEn: 'Dedicated Competitor',
    descVi: 'Hoàn thành tổng cộng 50 trận đấu (bao gồm cả PvP và Đấu Máy)',
    descEn: 'Complete 50 total matches across both PvP and AI modes',
    target: 50,
    getProgress: (profile) => getTotalMatchesPlayed(profile)
  }
];

function resolveEquippedTitle(equippedTitleId) {
  if (!equippedTitleId || typeof equippedTitleId !== 'string') return null;
  const def = ACHIEVEMENTS_DEFINITIONS.find(item => item.id === equippedTitleId);
  if (!def) return null;
  return {
    id: def.id,
    category: def.category,
    rarity: def.rarity || 'common',
    icon: def.icon,
    titleVi: def.titleVi,
    titleEn: def.titleEn
  };
}

function buildReconstructedPreviousProfile(profile, latestMatch) {
  if (!profile) return null;
  const prev = JSON.parse(JSON.stringify(profile));
  if (!latestMatch) return prev;

  const isWinner = isUserMatchWinner(latestMatch, profile);
  const userPlayer = getUserPlayerEntry(latestMatch, profile);
  const xpEarned = typeof userPlayer?.xpEarned === 'number' ? userPlayer.xpEarned : 0;
  prev.totalXp = Math.max(0, (prev.totalXp || 0) - xpEarned);

  if (latestMatch.isAiRoom) {
    const diff = latestMatch.aiDifficulty || 'medium';
    if (prev.aiStats && prev.aiStats[diff]) {
      if (isWinner) {
        prev.aiStats[diff].wins = Math.max(0, (prev.aiStats[diff].wins || 0) - 1);
      } else {
        prev.aiStats[diff].losses = Math.max(0, (prev.aiStats[diff].losses || 0) - 1);
      }
    }
  } else {
    if (isWinner) {
      prev.wins = Math.max(0, (prev.wins || 0) - 1);
      prev.currentWinStreak = Math.max(0, (prev.currentWinStreak || 0) - 1);
    } else {
      prev.losses = Math.max(0, (prev.losses || 0) - 1);
    }
    if (typeof userPlayer?.ratingBefore === 'number') {
      prev.rating = userPlayer.ratingBefore;
    }
  }
  return prev;
}

function calculateUserAchievements(profile, historyList = []) {
  const achievements = ACHIEVEMENTS_DEFINITIONS.map(def => {
    const rawProgress = def.getProgress(profile, historyList);
    const progress = Math.max(0, Math.min(def.target, rawProgress));
    const isUnlocked = progress >= def.target;
    const percentage = Math.min(100, Math.floor((progress / def.target) * 100));

    return {
      id: def.id,
      category: def.category,
      rarity: def.rarity || 'common',
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

  const safeXp = Math.max(0, Math.floor(typeof profile?.totalXp === 'number' ? profile.totalXp : 0));
  const levelInfo = calculateLevelProgress(safeXp);
  const pvpWins = profile?.wins || 0;
  const pvpLosses = profile?.losses || 0;
  const aiTotalWins = getTotalAiWins(profile);
  const totalWins = pvpWins + aiTotalWins;
  const bestWinStreak = getBestStreak(profile);
  const highestRating = Math.max(profile?.rating || 1000, profile?.highestRating || 1000);

  let bestGuessCount = null;
  let fastestWinSeconds = null;

  if (Array.isArray(historyList)) {
    for (const match of historyList) {
      if (!isUserMatchWinner(match, profile)) continue;
      const gCount = getUserMatchGuesses(match, profile);
      if (gCount !== null && (bestGuessCount === null || gCount < bestGuessCount)) {
        bestGuessCount = gCount;
      }
      if (!match.endReason || match.endReason === 'correct_guess') {
        const dur = typeof match.duration === 'number' ? match.duration : 0;
        if (dur > 0 && (fastestWinSeconds === null || dur < fastestWinSeconds)) {
          fastestWinSeconds = dur;
        }
      }
    }
  }

  const equippedTitle = resolveEquippedTitle(profile?.equippedTitleId);

  return {
    achievements,
    equippedTitleId: equippedTitle ? equippedTitle.id : null,
    equippedTitle,
    summary: {
      unlockedCount,
      totalCount,
      overallPercentage
    },
    careerStats: {
      level: levelInfo.level,
      totalXp: safeXp,
      totalWins,
      pvpWins,
      pvpLosses,
      aiTotalWins,
      bestWinStreak,
      highestRating,
      bestGuessCount,
      fastestWinSeconds
    }
  };
}

async function syncAndDetectNewAchievements(userId, {
  GameProfileModel = require('../models/GameProfile'),
  GameHistoryModel = require('../models/GameHistory')
} = {}) {
  if (!userId) return [];
  try {
    const [profile, historyList] = await Promise.all([
      GameProfileModel.findOne({ userId }).lean(),
      GameHistoryModel.find({ 'players.userId': userId }).sort({ finishedAt: -1 }).limit(250).lean()
    ]);

    if (!profile) return [];

    const currentResult = calculateUserAchievements(profile, historyList);
    const currentUnlocked = currentResult.achievements.filter(a => a.isUnlocked);
    const currentUnlockedIds = currentUnlocked.map(a => a.id);

    let baselineUnlockedSet;
    if (profile.achievementsInitialized) {
      baselineUnlockedSet = new Set(Array.isArray(profile.unlockedAchievementIds) ? profile.unlockedAchievementIds : []);
    } else if (getTotalMatchesPlayed(profile) <= 1) {
      baselineUnlockedSet = new Set();
    } else {
      const latestMatch = Array.isArray(historyList) && historyList.length > 0 ? historyList[0] : null;
      const prevHistoryList = Array.isArray(historyList) ? historyList.slice(1) : [];
      const prevProfile = buildReconstructedPreviousProfile(profile, latestMatch);
      const prevResult = calculateUserAchievements(prevProfile, prevHistoryList);
      baselineUnlockedSet = new Set(
        prevResult.achievements.filter(a => a.isUnlocked).map(a => a.id)
      );
    }

    const newlyUnlocked = currentUnlocked
      .filter(a => !baselineUnlockedSet.has(a.id))
      .map(a => ({
        id: a.id,
        category: a.category,
        rarity: a.rarity,
        icon: a.icon,
        titleVi: a.titleVi,
        titleEn: a.titleEn,
        descVi: a.descVi,
        descEn: a.descEn
      }));

    await GameProfileModel.updateOne(
      { userId },
      {
        $set: {
          unlockedAchievementIds: currentUnlockedIds,
          achievementsInitialized: true
        }
      }
    );

    return newlyUnlocked;
  } catch (err) {
    console.error(`[Achievements] Failed to sync achievements for user ${userId}:`, err.message);
    return [];
  }
}

module.exports = {
  ACHIEVEMENTS_DEFINITIONS,
  resolveEquippedTitle,
  calculateUserAchievements,
  syncAndDetectNewAchievements
};
