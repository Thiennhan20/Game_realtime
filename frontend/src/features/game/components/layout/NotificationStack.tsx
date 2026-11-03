import { AnimatePresence, motion } from 'framer-motion';
import { Award, WifiOff, X } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale, UnlockedAchievementNotice } from '../../types';

interface NotificationStackProps {
  error: string | null;
  isReconnecting: boolean;
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
            className="bg-slate-900/95 backdrop-blur-md border border-amber-400/55 p-3.5 rounded-2xl text-xs sm:text-sm text-amber-100 shadow-[0_8px_30px_rgba(245,158,11,0.28)] flex items-start gap-3 pointer-events-auto"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg shrink-0">
              {unlockedAchievements[0]?.icon || <Award size={18} className="text-amber-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                {locale === 'vi'
                  ? `🎖️ Mở khóa ${unlockedAchievements.length} thành tích mới!`
                  : `🎖️ Unlocked ${unlockedAchievements.length} new achievement${unlockedAchievements.length > 1 ? 's' : ''}!`}
              </p>
              <p className="font-extrabold text-white truncate mt-0.5">
                {locale === 'vi'
                  ? unlockedAchievements[0]?.titleVi
                  : unlockedAchievements[0]?.titleEn}
                {unlockedAchievements.length > 1
                  ? ` (+${unlockedAchievements.length - 1})`
                  : ''}
              </p>
              <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                {locale === 'vi'
                  ? unlockedAchievements[0]?.descVi
                  : unlockedAchievements[0]?.descEn}
              </p>
            </div>
            {onDismissAchievements && (
              <button
                type="button"
                onClick={onDismissAchievements}
                className="p-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-full transition duration-200 cursor-pointer shrink-0 flex items-center justify-center"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={13} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-red-950/90 backdrop-blur-md border border-red-500/50 p-3 rounded-xl text-xs sm:text-sm font-semibold text-red-200 shadow-2xl flex items-center gap-3 pointer-events-auto"
          >
            <span className="shrink-0">⚠️</span>
            <span className="flex-1 leading-snug">{error}</span>
            <button
              onClick={onDismissError}
              className="p-1 text-white bg-slate-950/25 hover:bg-white hover:text-slate-950 border border-white/70 rounded-full transition duration-200 cursor-pointer shrink-0 flex items-center justify-center"
              title={locale === 'vi' ? 'Đóng' : 'Close'}
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-yellow-950/90 backdrop-blur-md border border-yellow-500/50 p-3 rounded-xl text-xs sm:text-sm font-semibold text-yellow-200 shadow-2xl flex items-center gap-2.5 pointer-events-auto"
          >
            <WifiOff size={15} className="animate-pulse shrink-0" />
            <span className="flex-1 leading-snug">{t('reconnecting')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {disconnectedOpponent && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-orange-950/90 backdrop-blur-md border border-orange-500/50 p-3 rounded-xl text-xs sm:text-sm font-semibold text-orange-200 shadow-2xl flex items-center gap-3 pointer-events-auto"
          >
            <WifiOff size={15} className="animate-pulse shrink-0" />
            <span className="flex-1 leading-snug">
              {t('opponentReconnecting').replace('{username}', disconnectedOpponent)}
            </span>
            <button
              onClick={onDismissOpponent}
              className="p-1 text-white bg-slate-950/25 hover:bg-white hover:text-slate-950 border border-white/70 rounded-full transition duration-200 cursor-pointer shrink-0 flex items-center justify-center"
              title={locale === 'vi' ? 'Đóng' : 'Close'}
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
