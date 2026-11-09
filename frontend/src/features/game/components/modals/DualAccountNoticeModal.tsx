'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Film, Gamepad2, ShieldCheck } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface DualAccountNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieUser: string;
  gameUser: string;
  locale: Locale;
  t: Translator;
}

export function DualAccountNoticeModal({
  isOpen,
  onClose,
  movieUser,
  gameUser,
  locale,
  t,
}: DualAccountNoticeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#090a0f]/90"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-[#0c1017] border border-emerald-500/30 rounded-3xl p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={30} />
            </div>

            <div className="space-y-2">
              <h3 className="font-mono font-bold text-base sm:text-lg text-white uppercase tracking-wider">
                {t('dualAccountNoticeTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed">
                {locale === 'vi'
                  ? `Bạn đang chơi Game bằng tài khoản "${gameUser}", trong khi trang Web Phim vẫn giữ nguyên tài khoản "${movieUser}".`
                  : `You are playing Game as "${gameUser}", while Movie website remains signed in as "${movieUser}".`}
              </p>
            </div>

            {/* Account comparison cards */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <div className="p-3 rounded-xl bg-[#121622] border border-white/[0.08] space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
                  <Film size={12} className="text-violet-400" />
                  <span>{locale === 'vi' ? 'Tài khoản Phim' : 'Movie Account'}</span>
                </div>
                <div className="font-mono font-bold text-xs text-white truncate">{movieUser}</div>
              </div>

              <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-violet-300 text-[10px] font-mono">
                  <Gamepad2 size={12} className="text-amber-400" />
                  <span>{locale === 'vi' ? 'Tài khoản Game' : 'Game Account'}</span>
                </div>
                <div className="font-mono font-bold text-xs text-emerald-400 truncate">{gameUser}</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              {locale === 'vi'
                ? 'Hai tài khoản hoạt động hoàn toàn độc lập. Phiên xem phim của bạn sẽ không bị ảnh hưởng hay ghi đè.'
                : 'Both accounts operate completely independently. Your movie session will not be altered or overwritten.'}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition duration-150 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Check size={16} />
              <span>{t('separateAccountUnderstood')}</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

