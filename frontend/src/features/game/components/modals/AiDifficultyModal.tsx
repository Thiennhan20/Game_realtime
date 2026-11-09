import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Flame, Lock, X } from 'lucide-react';

import type { AiDifficulty, Locale } from '../../types';

interface AiDifficultyModalProps {
  isOpen: boolean;
  locale: Locale;
  onSelect: (difficulty: AiDifficulty) => void;
  onLockedHard: () => void;
  onClose: () => void;
}

export function AiDifficultyModal({
  isOpen,
  locale,
  onSelect,
  onLockedHard,
  onClose,
}: AiDifficultyModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#090a0f]/90"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-difficulty-title"
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-[#0d1017] border border-white/[0.08] w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#090a0f]/80 gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl shrink-0">
                  <Bot size={20} />
                </div>
                <div className="min-w-0">
                  <h2 id="ai-difficulty-title" className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider truncate">
                    {locale === 'vi' ? 'Chọn độ khó khi đấu với Máy' : 'Select AI Bot Difficulty'}
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {locale === 'vi'
                      ? 'Thử thách trí tuệ với các cấp độ thuật toán'
                      : 'Challenge your mind with AI algorithm levels'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={locale === 'vi' ? 'Đóng' : 'Close'}
                className="p-2 bg-[#121622] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] rounded-xl transition duration-150 cursor-pointer flex items-center justify-center shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <button
                onClick={() => onSelect('easy')}
                className="w-full p-3.5 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl transition duration-150 text-left flex items-center justify-between group cursor-pointer shadow-sm"
              >
                <span className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
                  <Bot size={14} className="text-emerald-400" />
                  <span>{locale === 'vi' ? 'Dễ' : 'Easy'}</span>
                </span>
                <Bot
                  size={20}
                  className="text-emerald-400 opacity-60 group-hover:opacity-100 transition shrink-0 ml-2"
                />
              </button>

              <button
                onClick={() => onSelect('medium')}
                className="w-full p-3.5 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-amber-500/40 rounded-2xl transition duration-150 text-left flex items-center justify-between group cursor-pointer shadow-sm"
              >
                <span className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
                  <Bot size={14} className="text-amber-400" />
                  <span>{locale === 'vi' ? 'Trung Bình' : 'Medium'}</span>
                </span>
                <Bot
                  size={20}
                  className="text-amber-400 opacity-60 group-hover:opacity-100 transition shrink-0 ml-2"
                />
              </button>

              <button
                onClick={onLockedHard}
                className="w-full p-3.5 bg-[#0d1017] border border-white/[0.06] rounded-2xl text-left flex items-center justify-between group opacity-60 hover:opacity-75 transition cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-3 py-1.5 bg-rose-500/10 text-rose-400/90 border border-rose-500/20 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
                    <Flame size={12} className="text-rose-400" />
                    <span>{locale === 'vi' ? 'Cực Khó' : 'Hard'}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-white/[0.04] text-slate-400 text-[10px] rounded-md font-mono font-bold flex items-center gap-1 border border-white/[0.06]">
                    <Lock size={10} /> {locale === 'vi' ? 'Khóa' : 'Locked'}
                  </span>
                </div>
                <Lock size={18} className="text-slate-500 shrink-0 ml-2" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
