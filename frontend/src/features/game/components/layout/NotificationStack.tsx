import { AnimatePresence, motion } from 'framer-motion';
import { Award, X } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale, UnlockedAchievementNotice } from '../../types';

interface NotificationStackProps {
  error: string | null;
  isReconnecting: boolean;
  reconnectCountdown?: number;
  disconnectedOpponent: string | null;
  unlockedAchievements?: UnlockedAchievementNotice[];
  locale: Locale;
  t: Translator;
  onDismissError: () => void;
  onDismissOpponent: () => void;
  onDismissAchievements?: () => void;
}

export function NotificationStack({
  error,
  isReconnecting,
  reconnectCountdown = 120,
  disconnectedOpponent,
  unlockedAchievements = [],
  locale,
  t,
  onDismissError,
  onDismissOpponent,
  onDismissAchievements,
}: NotificationStackProps) {
  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[200] flex flex-col gap-2.5 max-w-xs sm:max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {unlockedAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            role="status"
            aria-atomic="true"
            className="bg-[#0c1017] border border-amber-400/50 p-3.5 rounded-2xl text-xs sm:text-sm text-amber-100 shadow-[0_8px_30px_rgba(245,158,11,0.25)] flex items-start gap-3 pointer-events-auto"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-lg shrink-0">
              {unlockedAchievements[0]?.icon || <Award size={18} className="text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                {locale === 'vi'
                  ? `Mở khóa ${unlockedAchievements.length} thành tích mới!`
                  : `Unlocked ${unlockedAchievements.length} new achievement${unlockedAchievements.length > 1 ? 's' : ''}!`}
              </p>
              <p className="font-mono font-bold text-white truncate mt-0.5">
                {locale === 'vi'
                  ? unlockedAchievements[0]?.titleVi
                  : unlockedAchievements[0]?.titleEn}
                {unlockedAchievements.length > 1
                  ? ` (+${unlockedAchievements.length - 1})`
                  : ''}
              </p>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {locale === 'vi'
                  ? unlockedAchievements[0]?.descVi
                  : unlockedAchievements[0]?.descEn}
              </p>
            </div>
            {onDismissAchievements && (
              <button
                type="button"
                onClick={onDismissAchievements}
                className="p-1 text-slate-400 hover:text-white bg-[#121622] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition duration-150 cursor-pointer shrink-0 flex items-center justify-center"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={13} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (() => {
          const isVictoryNotice = error.includes('chiến thắng') || error.includes('won');
          const isJoinNotice =
            error.includes('vào phòng') ||
            error.includes('joined') ||
            error.includes('luyện tập với AI') ||
            error.includes('training room');
          const isSpectateNotice =
            error.includes('xem trận') ||
            error.includes('spectating');

          let accentBar = 'bg-rose-500';
          let borderStyle = 'border-rose-500/30 text-rose-200';

          if (isVictoryNotice) {
            accentBar = 'bg-emerald-400';
            borderStyle = 'border-emerald-500/30 text-emerald-100';
          } else if (isJoinNotice) {
            accentBar = 'bg-violet-400';
            borderStyle = 'border-violet-500/30 text-violet-100';
          } else if (isSpectateNotice) {
            accentBar = 'bg-cyan-400';
            borderStyle = 'border-cyan-500/30 text-cyan-100';
          }

          return (
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={`relative overflow-hidden bg-[#0c1017]/95 backdrop-blur-md border ${borderStyle} py-3 px-4 pl-4.5 rounded-xl text-xs sm:text-sm font-sans font-medium shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3 pointer-events-auto`}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentBar}`} />
              <span className="flex-1 leading-snug">{error}</span>
              <button
                onClick={onDismissError}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition duration-150 cursor-pointer shrink-0 flex items-center justify-center"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="relative overflow-hidden bg-[#0c1017]/95 backdrop-blur-md border border-amber-500/30 px-4 py-3 pl-4.5 rounded-xl text-xs sm:text-sm font-sans font-medium text-amber-200 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-2.5 pointer-events-auto"
          >
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
            <span className="flex-1 leading-snug">
              {locale === 'vi'
                ? `Mất kết nối. Đang tự động kết nối lại... (${reconnectCountdown}s)`
                : `Connection interrupted. Auto-reconnecting... (${reconnectCountdown}s)`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {disconnectedOpponent && (
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="relative overflow-hidden bg-[#0c1017]/95 backdrop-blur-md border border-orange-500/30 px-4 py-3 pl-4.5 rounded-xl text-xs sm:text-sm font-sans font-medium text-orange-200 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-3 pointer-events-auto"
          >
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400" />
            <span className="flex-1 leading-snug">
              {t('opponentReconnecting').replace('{username}', disconnectedOpponent)}
            </span>
            <button
              onClick={onDismissOpponent}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition duration-150 cursor-pointer shrink-0 flex items-center justify-center"
              title={locale === 'vi' ? 'Đóng' : 'Close'}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
