'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { FloatingEmote } from '../../types';

interface FloatingEmoteOverlayProps {
  emotes: FloatingEmote[];
  side?: 'left' | 'right';
}

export function FloatingEmoteOverlay({ emotes, side = 'left' }: FloatingEmoteOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        {emotes.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              opacity: 0,
              scale: 0.3,
              y: 0,
              x: 0,
              rotate: side === 'left' ? -15 : 15,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.35, 1.15, 0.9],
              y: [0, -22, -55, -85],
              x: side === 'left' ? [0, -5, 4, -2] : [0, 5, -4, 2],
              rotate: side === 'left' ? [-15, 6, -4, 0] : [15, -6, 4, 0],
            }}
            transition={{
              duration: 2.0,
              times: [0, 0.15, 0.75, 1],
              ease: 'easeOut',
            }}
            className="absolute bottom-full mb-1 flex flex-col items-center select-none"
          >
            <div className="relative flex items-center justify-center px-2 py-1.5 rounded-2xl bg-slate-900/95 border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.45)] backdrop-blur-md">
              <span className="text-2xl sm:text-3xl leading-none filter drop-shadow-md">
                {item.emoji}
              </span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
