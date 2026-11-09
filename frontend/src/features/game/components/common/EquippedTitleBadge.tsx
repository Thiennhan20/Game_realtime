'use client';

import type { AchievementRarity, EquippedTitle, Locale } from '../../types';

interface EquippedTitleBadgeProps {
  title?: EquippedTitle | null;
  locale: Locale;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

const RARITY_STYLES: Record<AchievementRarity, string> = {
  common:
    'border-emerald-500/35 bg-emerald-500/10 text-emerald-300 shadow-[0_1px_6px_rgba(16,185,129,0.12)]',
  rare:
    'border-cyan-500/40 bg-cyan-500/12 text-cyan-200 shadow-[0_1px_8px_rgba(6,182,212,0.18)]',
  epic:
    'border-fuchsia-500/45 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_1px_10px_rgba(217,70,239,0.22)]',
  legendary:
    'border-amber-400/55 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 text-amber-200 shadow-[0_1px_12px_rgba(245,158,11,0.28)]',
};

const SIZE_STYLES: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'px-1.5 py-0.5 text-[9px] gap-1 max-w-[130px]',
  sm: 'px-2 py-0.5 text-[10px] gap-1 max-w-[165px]',
  md: 'px-2.5 py-1 text-[11px] gap-1.5 max-w-[220px]',
};

export function EquippedTitleBadge({
  title,
  locale,
  size = 'sm',
  className = '',
  onClick,
}: EquippedTitleBadgeProps) {
  if (!title) return null;

  const label = locale === 'vi' ? title.titleVi : title.titleEn;
  const rarityClass = RARITY_STYLES[title.rarity] || RARITY_STYLES.common;
  const sizeClass = SIZE_STYLES[size];

  return (
    <span
      onClick={onClick}
      title={`${title.icon} ${label}`}
      aria-label={`${locale === 'vi' ? 'Danh hiệu' : 'Title'}: ${label}`}
      className={`inline-flex items-center rounded-full border font-extrabold tracking-tight whitespace-nowrap min-w-0 select-none ${rarityClass} ${sizeClass} ${className}`}
    >
      <span className="shrink-0 leading-none" aria-hidden="true">
        {title.icon}
      </span>
      <span className="truncate leading-tight">{label}</span>
    </span>
  );
}

