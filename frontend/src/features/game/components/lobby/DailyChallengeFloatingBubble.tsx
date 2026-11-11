'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound, triggerHaptic } from '../../sound';
import type { Locale } from '../../types';

interface DailyChallengeFloatingBubbleProps {
  onOpen: () => void;
  locale: Locale;
  t: Translator;
}

export function DailyChallengeFloatingBubble({
  onOpen,
  locale,
  t,
}: DailyChallengeFloatingBubbleProps) {
  const isDraggingRef = useRef(false);

  const handleClick = () => {
    if (isDraggingRef.current) return;
    sound.playClick();
    triggerHaptic(25);
    onOpen();
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 20 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      drag
      dragMomentum={false}
      dragElastic={0.12}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      onClick={handleClick}
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 select-none cursor-pointer touch-none"
    >
      {/* Outer Glow Halo */}
      <div className="absolute inset-0 rounded-full sm:rounded-2xl bg-amber-500/25 blur-lg pointer-events-none animate-pulse" />

      {/* Interactive Capsule Button */}
      <div className="relative group flex items-center gap-2.5 p-2 sm:px-4 sm:py-3 rounded-full sm:rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white border border-amber-300/40 shadow-[0_6px_25px_rgba(245,158,11,0.45)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.65)] transition-all duration-300">
        {/* Icon & Sparkle */}
        <div className="relative flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white/20 border border-white/30 text-amber-100 shrink-0 shadow-inner">
          <Calendar size={18} className="drop-shadow-sm" />
          <span className="absolute -top-1 -right-1 text-amber-200 animate-spin" style={{ animationDuration: '6s' }}>
            <Sparkles size={11} />
          </span>
        </div>

        {/* Text Details (Hidden on ultra-narrow mobile, shown on sm+) */}
        <div className="hidden sm:flex flex-col text-left pr-1">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-mono font-bold text-xs sm:text-sm tracking-tight text-white drop-shadow-sm">
              {t('dailyChallenge')}
            </span>
          </div>
          <span className="text-[10px] text-amber-100/90 font-sans leading-tight">
            {locale === 'vi' ? '1 mã số • 8 lượt' : '1 code daily • 8 tries'}
          </span>
        </div>

        {/* Reward Pill Badge */}
        <div className="px-2 py-0.5 rounded-full bg-[#0d1017]/80 border border-amber-300/50 text-amber-300 font-mono font-black text-[10px] tracking-wide shrink-0 shadow-sm flex items-center gap-1">
          <span>+50</span>
          <span className="text-[9px] text-amber-400/80">XP</span>
        </div>
      </div>
    </motion.div>
  );
}

