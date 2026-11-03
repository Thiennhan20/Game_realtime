'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { createTranslator } from '../i18n';
import type { Locale } from '../types';

export function useGameLocale() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>(() => {
    const queryLocale = searchParams.get('locale');
    if (queryLocale === 'vi' || queryLocale === 'en') {
      return queryLocale;
    }
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('locale');
        if (fromUrl === 'vi' || fromUrl === 'en') return fromUrl;
        const storedLocale = localStorage.getItem('game_locale');
        if (storedLocale === 'vi' || storedLocale === 'en') return storedLocale;
      } catch {
        // Ignore
      }
    }
    return 'en';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const queryLocale = searchParams.get('locale');
    if (queryLocale === 'vi' || queryLocale === 'en') {
      setLocale(queryLocale);
      localStorage.setItem('game_locale', queryLocale);
    } else {
      const storedLocale = localStorage.getItem('game_locale');
      if (storedLocale === 'vi' || storedLocale === 'en') {
        setLocale(storedLocale);
      } else if (navigator.language.toLowerCase().includes('vi')) {
        setLocale('vi');
      }
    }
    setMounted(true);
  }, [searchParams]);

  const toggleLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    localStorage.setItem('game_locale', nextLocale);
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

  return { locale, mounted, t, toggleLocale };
}
