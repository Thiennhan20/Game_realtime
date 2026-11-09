import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crown, Lock, Shield, Trophy, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { RANK_TIERS, getRankBadgePath, getRankProgress } from '../../ranks';
import type { GameProfile, Locale } from '../../types';
import { RankBadge } from '../common/RankBadge';

interface RankInfoModalProps {
  isOpen: boolean;
  locale: Locale;
  profile: Pick<GameProfile, 'rating' | 'highestRating' | 'rank' | 'rankEn' | 'rankKey'>;
  onClose: () => void;
}

const emptySubscribe = () => () => {};

const VH_TEXT = {
  en: {
    title: 'Rank Tiers & Rating',
    subtitle: 'Earn rating points by winning PvP matches to climb the ranks',
    youAreHere: 'Current',
    achieved: 'Achieved',
    locked: 'Locked',
    peakLabel: 'Peak',
    currentRating: 'Rating',
    pointsNeeded: 'Need {points} pts for {next}',
    topReached: 'Highest tier reached!',
    minRating: 'Rating Range',
    close: 'Close',
  },
  vi: {
    title: 'Bậc xếp hạng và đánh giá',
    subtitle: 'Đạt điểm rating cao hơn từ các trận thắng PvP để leo lên bảng vàng',
    youAreHere: 'Hiện tại',
    achieved: 'Đã đạt',
    locked: 'Chưa đạt',
    peakLabel: 'Cao nhất',
    currentRating: 'Hiện tại',
    pointsNeeded: 'Cần thêm {points} điểm để lên {next}',
    topReached: 'Bạn đã đạt hạng cao nhất!',
    minRating: 'Mốc điểm Rating',
    close: 'Đóng',
  },
} as const;

export function RankInfoModal({ isOpen, locale, profile, onClose }: RankInfoModalProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

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

  if (!isOpen || !isClient) return null;

  const text = VH_TEXT[locale];
  const rating = Math.max(0, Math.floor(profile.rating));
  const formatter = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  const { current, next, progress, pointsToNext } = getRankProgress(rating);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[320] flex items-center justify-center p-2.5 sm:p-5 bg-[#090a0f]/90"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={text.title}
          className="bg-[#0d1017] border border-white/[0.08] w-full max-w-4xl h-auto max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-w-0"
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#090a0f]/90 shrink-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 border border-amber-500/20">
                <Crown size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-base font-mono font-bold text-white uppercase tracking-wider truncate">
                  {text.title}
                </h2>
                <p className="text-[11px] text-slate-400 leading-tight truncate sm:whitespace-normal">
                  {text.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={text.close}
              className="p-1.5 sm:p-2 bg-[#121622] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] rounded-xl transition duration-150 cursor-pointer shrink-0 ml-1 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Content Area - Responsive Container */}
          <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3.5 sm:space-y-4">
            {/* User Current Rank Overview Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-400/40 bg-[#121622] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <RankBadge tier={current} locale={locale} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      {text.youAreHere}
                    </span>
                    <span className="bg-amber-400 text-slate-950 font-black font-mono text-[9px] px-2 py-0.5 rounded-md uppercase">
                      {locale === 'vi' ? current.nameVi : current.nameEn}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm font-bold text-white leading-snug">
                    {next
                      ? text.pointsNeeded
                          .replace('{points}', formatter.format(pointsToNext))
                          .replace('{next}', locale === 'vi' ? next.nameVi : next.nameEn)
                      : text.topReached}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
                <div className="px-2.5 py-1 rounded-xl border border-white/[0.08] bg-[#090a0f] text-cyan-300 font-bold flex items-center gap-1.5 shadow-inner">
                  <Zap size={12} className="text-cyan-400 shrink-0" />
                  <span>{text.currentRating}: {formatter.format(rating)}</span>
                </div>
                <div className="px-2.5 py-1 rounded-xl border border-white/[0.08] bg-[#090a0f] text-amber-300 font-bold flex items-center gap-1.5 shadow-inner">
                  <Trophy size={12} className="text-amber-400 shrink-0" />
                  <span>{text.peakLabel}: {formatter.format(profile.highestRating ?? rating)}</span>
                </div>
              </div>
            </div>

            {/* Rank Tier Grid - 1 Col Mobile, 2 Cols Tablet, 3 Cols Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {RANK_TIERS.map((tier) => {
                const isCurrent = tier.key === current.key;
                const isAchieved = rating >= tier.minRating;

                return (
                  <div
                    key={tier.key}
                    className={`p-3.5 rounded-2xl border transition duration-200 flex flex-col justify-between gap-3 min-w-0 ${
                      isCurrent
                        ? 'border-2 border-amber-400/80 bg-[#121622] shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30'
                        : isAchieved
                        ? 'bg-[#121622] border-white/[0.08] hover:border-white/[0.16]'
                        : 'border-white/[0.06] bg-[#0d1017] opacity-70 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getRankBadgePath(tier.key)}
                          alt={locale === 'vi' ? tier.nameVi : tier.nameEn}
                          className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                        />
                        <RankBadge tier={tier} locale={locale} size="sm" />
                      </div>
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black font-mono uppercase tracking-wider flex items-center gap-1 shadow-sm shrink-0 ml-auto">
                          <Shield size={10} />
                          {text.youAreHere}
                        </span>
                      ) : isAchieved ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ml-auto">
                          <Check size={11} className="text-emerald-400" />
                          <span>{text.achieved}</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] text-slate-400 border border-white/[0.08] text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ml-auto">
                          <Lock size={9} />
                          <span>{text.locked}</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/[0.06] min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                        {text.minRating}
                      </span>
                      <p className="text-xs sm:text-sm font-mono font-black text-slate-100 truncate">
                        {tier.maxRating !== null
                          ? `${formatter.format(tier.minRating)} – ${formatter.format(tier.maxRating)} Rating`
                          : `>= ${formatter.format(tier.minRating)} Rating`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer with overall progress bar & target */}
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-white/[0.08] bg-[#090a0f]/90 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:flex-1 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 font-mono">
                <span className="uppercase tracking-wider text-[10px]">
                  {locale === 'vi' ? 'Tiến trình lên hạng' : 'Rank Progress'}
                </span>
                <span className="text-slate-300 text-xs">
                  {formatter.format(rating)} Rating
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-[#090a0f] ring-1 ring-white/[0.08] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Right side: Next Rank Target Chip */}
            <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono font-bold text-xs flex items-center justify-center sm:justify-start gap-1.5 shrink-0 shadow-sm">
              <Zap size={14} className="text-amber-400 shrink-0" />
              <span>
                {next
                  ? (locale === 'vi'
                      ? `Mục tiêu: ${next.nameVi} (${formatter.format(next.minRating)})`
                      : `Target: ${next.nameEn} (${formatter.format(next.minRating)})`)
                  : (locale === 'vi' ? 'Bậc Cao Nhất' : 'Peak Rank Tier')}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
