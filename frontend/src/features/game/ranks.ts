export type RankKey =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master';

export interface RankTier {
  key: RankKey;
  nameVi: string;
  nameEn: string;
  minRating: number;
  maxRating: number | null; // null = no upper bound
}

// Keep in sync with backend/services/rating.js RANK_TIERS
export const RANK_TIERS: RankTier[] = [
  { key: 'bronze', nameVi: 'Đồng', nameEn: 'Bronze', minRating: 0, maxRating: 1099 },
  { key: 'silver', nameVi: 'Bạc', nameEn: 'Silver', minRating: 1100, maxRating: 1299 },
  { key: 'gold', nameVi: 'Vàng', nameEn: 'Gold', minRating: 1300, maxRating: 1499 },
  { key: 'platinum', nameVi: 'Bạch Kim', nameEn: 'Platinum', minRating: 1500, maxRating: 1699 },
  { key: 'diamond', nameVi: 'Kim Cương', nameEn: 'Diamond', minRating: 1700, maxRating: 1899 },
  { key: 'master', nameVi: 'Cao Thủ', nameEn: 'Master', minRating: 1900, maxRating: null },
];

export function getRankByRating(rating: number): RankTier {
  const safe = Math.max(0, Math.floor(rating));
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (safe >= RANK_TIERS[i].minRating) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

export function getRankByKey(key?: string | null): RankTier | null {
  if (!key) return null;
  return RANK_TIERS.find((t) => t.key === key) ?? null;
}

export function getRankProgress(rating: number) {
  const current = getRankByRating(rating);
  const currentIndex = RANK_TIERS.findIndex((t) => t.key === current.key);
  const next = currentIndex >= 0 && currentIndex < RANK_TIERS.length - 1
    ? RANK_TIERS[currentIndex + 1]
    : null;
  if (!next) return { current, next: null, progress: 100, pointsToNext: 0 };
  const span = next.minRating - current.minRating;
  const gained = Math.max(0, rating - current.minRating);
  return {
    current,
    next,
    progress: Math.min(100, Math.max(0, Math.round((gained / span) * 100))),
    pointsToNext: Math.max(0, next.minRating - Math.max(0, Math.floor(rating))),
  };
}
