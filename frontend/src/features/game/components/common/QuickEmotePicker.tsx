'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Locale, QuickEmote } from '../../types';

export const QUICK_EMOTES: Array<{
  emoji: QuickEmote;
  labelVi: string;
  labelEn: string;
}> = [
  { emoji: '😎', labelVi: 'Ngầu', labelEn: 'Cool' },
  { emoji: '🔥', labelVi: 'Tự tin', labelEn: 'Fire' },
  { emoji: '😱', labelVi: 'Sốc', labelEn: 'Shock' },
  { emoji: '🤔', labelVi: 'Suy tư', labelEn: 'Thinking' },
  { emoji: '💀', labelVi: 'Bất lực', labelEn: 'Dead' },
  { emoji: '👏', labelVi: 'Khâm phục', labelEn: 'Clap' },
  { emoji: '😂', labelVi: 'Cười bò', labelEn: 'Laugh' },
  { emoji: '🥳', labelVi: 'Ăn mừng', labelEn: 'Party' },
  { emoji: '🤫', labelVi: 'Suỵt', labelEn: 'Quiet' },
  { emoji: '🥶', labelVi: 'Lạnh gáy', labelEn: 'Cold' },
  { emoji: '🧠', labelVi: 'Não to', labelEn: 'Big Brain' },
  { emoji: '🎯', labelVi: 'Chuẩn đét', labelEn: 'Bullseye' },
  { emoji: '💣', labelVi: 'Bùng nổ', labelEn: 'Bomb' },
  { emoji: '🤡', labelVi: 'Tấu hài', labelEn: 'Clown' },
  { emoji: '🤝', labelVi: 'Bắt tay', labelEn: 'Respect' },
  { emoji: '💔', labelVi: 'Cay đắng', labelEn: 'Broken' },
];

interface QuickEmotePickerProps {
  onSelect: (emoji: QuickEmote) => void;
  onClose?: () => void;
  locale: Locale;
  variant?: 'popover' | 'inline';
  placement?: 'bottom-left' | 'top-right';
}

export function QuickEmotePicker({
  onSelect,
  onClose,
  locale,
  variant = 'popover',
  placement = 'bottom-left',
}: QuickEmotePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== 'popover' || !onClose) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [variant, onClose]);

  if (variant === 'inline') {
    return (
      <div className="grid grid-cols-8 gap-1 shrink-0 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
        {QUICK_EMOTES.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => onSelect(item.emoji)}
            title={locale === 'vi' ? item.labelVi : item.labelEn}
            aria-label={locale === 'vi' ? item.labelVi : item.labelEn}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-purple-600/30 border border-slate-700/60 hover:border-purple-500/50 flex items-center justify-center text-sm transition-all duration-150 active:scale-90 cursor-pointer shadow-sm hover:scale-115"
          >
            <span>{item.emoji}</span>
          </button>
        ))}
      </div>
    );
  }

  const placementClasses =
    placement === 'bottom-left'
      ? 'left-0 bottom-full mb-2'
      : 'right-0 top-full mt-2';

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.92, y: placement === 'bottom-left' ? -6 : 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: placement === 'bottom-left' ? -6 : 6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`absolute ${placementClasses} z-50 p-1.5 bg-slate-900/95 border border-purple-500/40 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col gap-1 w-[260px] sm:w-[276px]`}
    >
      <div className="grid grid-cols-8 gap-1">
        {QUICK_EMOTES.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => {
              onSelect(item.emoji);
              onClose?.();
            }}
            title={locale === 'vi' ? item.labelVi : item.labelEn}
            aria-label={locale === 'vi' ? item.labelVi : item.labelEn}
            className="group relative flex items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-slate-800/60 hover:bg-purple-600/40 border border-slate-700/50 hover:border-purple-500/60 transition-all duration-150 active:scale-90 cursor-pointer shadow-sm hover:scale-120"
          >
            <span className="text-base sm:text-lg leading-none select-none">{item.emoji}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
