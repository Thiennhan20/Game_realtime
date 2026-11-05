'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { FloatingEmote } from '../../types';

interface FloatingEmoteOverlayProps {
  emotes: FloatingEmote[];
  side?: 'left' | 'right';
  direction?: 'up' | 'down';
}

export function FloatingEmoteOverlay({
  emotes,
  side = 'left',
  direction = 'down',
}: FloatingEmoteOverlayProps) {
  const isDown = direction === 'down';

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
              y: isDown ? [0, 20, 50, 80] : [0, -22, -55, -85],
              x: side === 'left' ? [0, -5, 4, -2] : [0, 5, -4, 2],
              rotate: side === 'left' ? [-15, 6, -4, 0] : [15, -6, 4, 0],
            }}
            transition={{
              duration: 2.0,
              times: [0, 0.15, 0.75, 1],
              ease: 'easeOut',
            }}
            className={`absolute flex flex-col items-center select-none ${
              isDown ? 'top-full mt-1.5' : 'bottom-full mb-1'
            }`}
          >
            <div
              className={`relative flex items-center justify-center px-2 py-1.5 rounded-2xl bg-slate-900/95 border backdrop-blur-md ${
                side === 'right'
                  ? 'border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.45)]'
                  : 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.45)]'
              }`}
            >
              <span className="text-2xl sm:text-3xl leading-none filter drop-shadow-md">
                {item.emoji}
              </span>
              {isDown ? (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
              ) : (
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
