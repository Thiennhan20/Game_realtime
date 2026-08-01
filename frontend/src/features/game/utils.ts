import type { Locale } from './types';

export function isLocalHost() {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
  );
}

export function getAuthApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    (isLocalHost() ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api')
  );
}

export function getSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (isLocalHost()) {
    return 'http://localhost:8080';
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function getGameApiUrl(path: string) {
  const baseUrl = getSocketUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export function calculateLevelProgress(totalXp: number) {
  const safeTotalXp = Number.isFinite(totalXp)
    ? Math.max(0, Math.floor(totalXp))
    : 0;
  let level = Math.floor(
    (Math.sqrt(1 + (4 * safeTotalXp) / 25) - 1) / 2,
  );

  const cumulativeXpAtLevel = (value: number) => 25 * value * (value + 1);
  while (cumulativeXpAtLevel(level + 1) <= safeTotalXp) level += 1;
  while (level > 0 && cumulativeXpAtLevel(level) > safeTotalXp) level -= 1;

  return {
    totalXp: safeTotalXp,
    level,
    currentXp: safeTotalXp - cumulativeXpAtLevel(level),
    xpForNextLevel: 50 * (level + 1),
  };
}

export function getMainSiteUrl(path = '', locale?: Locale) {
  const baseUrl = isLocalHost() ? 'http://localhost:3000' : 'https://moviesaw.vercel.app';
  const url = `${baseUrl}${path}`;

  let activeLocale = locale;
  if (!activeLocale && typeof window !== 'undefined') {
    const stored = localStorage.getItem('game_locale');
    if (stored === 'vi' || stored === 'en') {
      activeLocale = stored as Locale;
    }
  }

  if (activeLocale) {
    const separator = url.includes('?') ? '&' : '?';
    const langFull = activeLocale === 'vi' ? 'vi-VN' : 'en-US';
    return `${url}${separator}lang=${langFull}&locale=${activeLocale}`;
  }

  return url;
}

export function navigateTopWindow(targetUrl: string) {
  if (typeof window === 'undefined') return;
  if (window.top) {
    window.top.location.href = targetUrl;
    return;
  }
  window.location.href = targetUrl;
}

export function normalizeRoomId(value: string) {
  let normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (/^G\d{6}$/.test(normalized)) {
    normalized = `G-${normalized.slice(1)}`;
  }
  if (!/^G-\d{6}$/.test(normalized) && !/^\d{6}$/.test(normalized)) {
    return null;
  }
  return normalized.startsWith('G-') ? normalized : `G-${normalized}`;
}

export function isUniqueFourDigitCode(value: string) {
  return /^\d{4}$/.test(value) && new Set(value).size === 4;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

export function formatElapsedTime(timestamp: number | undefined, locale: Locale) {
  if (!timestamp) return locale === 'vi' ? 'Vừa xong' : 'Just now';
  const differenceInSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (differenceInSeconds < 60) return locale === 'vi' ? 'Vừa xong' : 'Just now';
  const minutes = Math.floor(differenceInSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}
