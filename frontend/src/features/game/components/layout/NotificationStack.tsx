import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, X } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface NotificationStackProps {
  error: string | null;
  isReconnecting: boolean;
  disconnectedOpponent: string | null;
  locale: Locale;
  t: Translator;
  onDismissError: () => void;
  onDismissOpponent: () => void;
}

export function NotificationStack({
  error,
  isReconnecting,
  disconnectedOpponent,
  locale,
  t,
  onDismissError,
  onDismissOpponent,
}: NotificationStackProps) {
  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[200] flex flex-col gap-2.5 max-w-xs sm:max-w-sm w-full pointer-events-none">
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
