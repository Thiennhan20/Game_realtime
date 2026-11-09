'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, Swords } from 'lucide-react';

import type { Locale } from '../../types';

interface MatchFoundOverlayProps {
  isOpen: boolean;
  roomId: string;
  opponentName: string;
  locale: Locale;
}

export function MatchFoundOverlay({
  isOpen,
  roomId,
  opponentName,
  locale,
}: MatchFoundOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="match-found-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#090a0f]/85 backdrop-blur-md select-none"
        >
          <motion.div
            key="match-found-card"
            initial={{ scale: 0.82, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm sm:max-w-md bg-[#0d1017] border border-emerald-500/50 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden"
          >
            {/* Background decorative glows */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top pill badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold tracking-wider uppercase mb-5 shadow-sm animate-pulse">
              <Sparkles size={13} className="text-emerald-400 shrink-0" />
              <span>{locale === 'vi' ? 'GHÉP TRẬN THÀNH CÔNG!' : 'MATCH FOUND!'}</span>
            </div>

            {/* Swords clash icon with radiant emerald aura */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-[#121622] to-violet-500/20 border border-emerald-400/50 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Swords size={38} className="text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0d1017] flex items-center justify-center text-white shadow-md">
                <CheckCircle2 size={14} className="text-white" />
              </span>
            </div>

            {/* Main title */}
            <h3 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight mb-1">
              {locale === 'vi' ? 'ĐÃ TÌM THẤY ĐỐI THỦ' : 'OPPONENT FOUND'}
            </h3>

            {/* Room ID Badge */}
            {roomId && (
              <div className="inline-block px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 font-mono text-[11px] font-semibold mb-3">
                {locale === 'vi' ? `Phòng #${roomId}` : `Room #${roomId}`}
              </div>
            )}

            {/* Opponent Info Box */}
            <div className="bg-[#121622]/90 border border-white/[0.08] rounded-xl p-3 mb-5 flex items-center justify-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                {locale === 'vi' ? 'Đối đầu với:' : 'Dueling with:'}
              </span>
              <span className="text-sm font-mono font-bold text-violet-300 truncate max-w-[180px]">
                {opponentName || (locale === 'vi' ? 'Người chơi' : 'Opponent')}
              </span>
            </div>

            {/* Connecting progress bar */}
            <div className="w-full bg-[#121622] h-2 rounded-full overflow-hidden border border-white/[0.08] mb-2.5">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.1, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-violet-500 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.7)]"
              />
            </div>

            <p className="text-xs font-mono text-slate-400 flex items-center justify-center gap-1.5 animate-pulse">
              <Loader2 size={13} className="animate-spin text-emerald-400 shrink-0" />
              <span>
                {locale === 'vi'
                  ? 'Đang kết nối vào đấu trường...'
                  : 'Entering battle arena...'}
              </span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

