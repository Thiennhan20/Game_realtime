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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                  <Bot size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {locale === 'vi' ? 'Chọn độ khó khi đấu với Máy' : 'Select AI Bot Difficulty'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {locale === 'vi'
                      ? 'Thử thách trí tuệ với các cấp độ thuật toán'
                      : 'Challenge your mind with AI algorithm levels'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg transition duration-150 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={() => onSelect('easy')}
                className="w-full p-3.5 bg-slate-950/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition duration-150 text-left flex items-center justify-between group cursor-pointer"
              >
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md">
                  🟢 {locale === 'vi' ? 'Dễ' : 'Easy'}
                </span>
                <Bot
                  size={20}
                  className="text-emerald-400 opacity-60 group-hover:opacity-100 transition shrink-0 ml-2"
                />
              </button>

              <button
                onClick={() => onSelect('medium')}
                className="w-full p-3.5 bg-slate-950/80 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/50 rounded-xl transition duration-150 text-left flex items-center justify-between group cursor-pointer"
              >
                <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-md">
                  🟡 {locale === 'vi' ? 'Trung Bình' : 'Medium'}
                </span>
                <Bot
                  size={20}
                  className="text-amber-400 opacity-60 group-hover:opacity-100 transition shrink-0 ml-2"
                />
              </button>

              <button
                onClick={onLockedHard}
                className="w-full p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl text-left flex items-center justify-between group opacity-60 hover:opacity-75 transition cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-3 py-1.5 bg-rose-500/10 text-rose-400/80 text-xs font-bold rounded-md flex items-center gap-1">
                    🔴 {locale === 'vi' ? 'Cực Khó' : 'Hard'}
                    <Flame size={12} className="text-rose-400/60" />
                  </span>
                  <span className="px-2 py-0.5 bg-slate-800/80 text-slate-400 text-[10px] rounded-md font-mono font-bold flex items-center gap-1">
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
