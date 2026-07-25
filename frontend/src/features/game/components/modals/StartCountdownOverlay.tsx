import { AnimatePresence, motion } from 'framer-motion';

import type { Locale } from '../../types';

interface StartCountdownOverlayProps {
  isOpen: boolean;
  countdown: number;
  isMyTurn: boolean;
  opponentName: string;
  locale: Locale;
}

export function StartCountdownOverlay({
  isOpen,
  countdown,
  isMyTurn,
  opponentName,
  locale,
}: StartCountdownOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center space-y-6 max-w-sm w-full px-6"
          >
            <div className="text-xs font-black tracking-[0.2em] text-purple-400 uppercase">
              {locale === 'vi' ? '⚔️ ĐẤU TRƯỜNG ĐỐI CHIẾN' : '⚔️ BATTLE ARENA'}
            </div>

            <div className="text-sm font-bold text-slate-300">
              {isMyTurn ? (
                <span className="text-emerald-400 font-extrabold block text-base mb-1">
                  {locale === 'vi' ? '🎉 Bạn Thắng Oẳn Tù Tì!' : '🎉 You Won RPS!'}
                </span>
              ) : (
                <span className="text-pink-400 font-extrabold block text-base mb-1">
                  {locale === 'vi'
                    ? `😢 ${opponentName || 'Đối thủ'} Thắng Oẳn Tù Tì!`
                    : `😢 ${opponentName || 'Opponent'} Won RPS!`}
                </span>
              )}
              <span>
                {isMyTurn
                  ? locale === 'vi'
                    ? 'Bạn được quyền đoán trước!'
                    : 'You get to guess first!'
                  : locale === 'vi'
                    ? 'Đối thủ được quyền đoán trước!'
                    : 'Opponent gets to guess first!'}
              </span>
            </div>

            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-500 select-none py-4"
            >
              {countdown > 0 ? countdown : locale === 'vi' ? 'CHIẾN!' : 'BATTLE!'}
            </motion.div>

            <div className="text-xs text-slate-500 animate-pulse uppercase tracking-wider">
              {locale === 'vi' ? 'Trực chiến chuẩn bị bắt đầu...' : 'Battle starting in...'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
