'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  locale: Locale;
  t: Translator;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  t,
}: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-[#090a0f]/90"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-sm bg-[#0c1017] border border-white/[0.12] rounded-3xl p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <LogOut size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="font-mono font-bold text-base sm:text-lg text-white uppercase tracking-wider">
                {t('logoutConfirmTitle')}
              </h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                {t('logoutConfirmDesc')}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.04] text-slate-300 hover:text-white font-mono font-bold text-xs transition duration-150 cursor-pointer border border-white/[0.08]"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfirm();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-98 text-white font-mono font-bold text-xs transition duration-150 cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                <LogOut size={14} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

