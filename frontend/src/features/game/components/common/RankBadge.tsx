import { useState } from 'react';
import { Crown, Gem, Medal, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import type { ComponentType } from 'react';

import type { RankTier } from '../../ranks';

interface RankBadgeProps {
  tier: RankTier;
  locale: 'en' | 'vi';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

interface RankVisual {
  Icon: ComponentType<{ size?: number | string; className?: string }>;
  chipClasses: string;
  iconClasses: string;
}

const RANK_VISUALS: Record<RankTier['key'], RankVisual> = {
  bronze: {
    Icon: ShieldCheck,
    chipClasses: 'border-amber-700/60 bg-gradient-to-r from-amber-950/70 to-amber-900/40 text-amber-200 shadow-sm shadow-amber-950/40',
    iconClasses: 'text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]',
  },
  silver: {
    Icon: Medal,
    chipClasses: 'border-slate-400/50 bg-gradient-to-r from-slate-900/80 to-slate-800/60 text-slate-200 shadow-sm shadow-slate-900/40',
    iconClasses: 'text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]',
  },
  gold: {
    Icon: Trophy,
    chipClasses: 'border-yellow-500/60 bg-gradient-to-r from-amber-950/70 via-yellow-900/40 to-amber-900/50 text-yellow-300 shadow-sm shadow-yellow-950/40',
    iconClasses: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]',
  },
  platinum: {
    Icon: Sparkles,
    chipClasses: 'border-cyan-400/60 bg-gradient-to-r from-cyan-950/70 via-teal-900/40 to-cyan-900/50 text-cyan-200 shadow-sm shadow-cyan-950/40',
    iconClasses: 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]',
  },
  diamond: {
    Icon: Gem,
    chipClasses: 'border-sky-400/60 bg-gradient-to-r from-sky-950/70 via-blue-900/40 to-sky-900/50 text-sky-200 shadow-sm shadow-sky-950/40',
    iconClasses: 'text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]',
  },
  master: {
    Icon: Crown,
    chipClasses: 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-950/70 via-purple-900/40 to-fuchsia-900/50 text-fuchsia-200 shadow-sm shadow-fuchsia-950/40',
    iconClasses: 'text-fuchsia-300 drop-shadow-[0_0_8px_rgba(232,121,249,0.7)]',
  },
};

const SIZE_STYLES = {
  sm: {
    chip: 'px-2 py-0.5 text-[10px] gap-1.5',
    imgSize: 'w-4 h-4',
    icon: 12,
  },
  md: {
    chip: 'px-2.5 py-1 text-xs gap-2',
    imgSize: 'w-5 h-5',
    icon: 15,
  },
  lg: {
    chip: 'px-3 py-1.5 text-sm gap-2.5',
    imgSize: 'w-6 h-6',
    icon: 18,
  },
} as const;

export function RankBadge({
  tier,
  locale,
  size = 'sm',
  showLabel = true,
  className = '',
  onClick,
}: RankBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const { Icon, chipClasses, iconClasses } = RANK_VISUALS[tier.key];
  const styles = SIZE_STYLES[size];
  const label = locale === 'vi' ? tier.nameVi : tier.nameEn;
  const imagePath = `/ranks/${tier.key}.png`;

  const inner = (
    <>
      {!imgError ? (
        <img
          src={imagePath}
          alt={label}
          onError={() => setImgError(true)}
          className={`${styles.imgSize} object-contain shrink-0 drop-shadow-md`}
        />
      ) : (
        <Icon size={styles.icon} className={`${iconClasses} shrink-0`} />
      )}
      {showLabel && <span className="font-black tracking-wide">{label}</span>}
    </>
  );

  const baseClasses = `inline-flex items-center rounded-lg border ${styles.chip} ${chipClasses} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} cursor-pointer transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 active:scale-95`}
        aria-label={
          locale === 'vi'
            ? `Xem chi tiết các bậc xếp hạng. Hiện tại: ${label}`
            : `View rank tiers. Current rank: ${label}`
        }
      >
        {inner}
      </button>
    );
  }

  return <span className={baseClasses}>{inner}</span>;
}
