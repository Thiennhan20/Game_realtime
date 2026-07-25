'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { createTranslator } from '../i18n';
import type { Locale } from '../types';

export function useGameLocale() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
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
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams]);

  const toggleLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    localStorage.setItem('game_locale', nextLocale);
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

  return { locale, mounted, t, toggleLocale };
}
