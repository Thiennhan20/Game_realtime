'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  ChevronDown,
  Clock,
  Gamepad2,
  Trophy,
  Users,
} from 'lucide-react';

import type { Translator } from '../../i18n';
import type { AuthUser, Locale } from '../../types';

interface GameHeaderProps {
  user: AuthUser;
  locale: Locale;
  t: Translator;
  onLocaleChange: (locale: Locale) => void;
  onBackHome: () => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
}

export function GameHeader({
  user,
  locale,
  t,
  onLocaleChange,
  onBackHome,
  onOpenProfile,
  onOpenHistory,
  onOpenLeaderboard,
  onOpenAchievements,
}: GameHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectMenuItem = (action: () => void) => {
    setIsDropdownOpen(false);
    action();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl shrink-0">
      <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            type="button"
            onClick={onBackHome}
            aria-label={locale === 'vi' ? 'Quay lại trang chủ' : 'Back to main site'}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title={locale === 'vi' ? 'Quay lại trang chủ' : 'Back to main site'}
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" aria-hidden="true" />
          </button>
          <div className="hidden xs:block p-2 sm:p-2.5 bg-purple-500/10 text-purple-400 rounded-xl shrink-0">
            <Gamepad2 size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-xl tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text flex items-center">
              <span>{locale === 'vi' ? 'Đoán Số' : 'Guess Number'}</span>
            </h1>
            <p className="hidden sm:block text-xs text-slate-300">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="flex items-center bg-slate-900/60 border border-slate-800/80 p-0.5 rounded-xl text-xs font-bold">
            {(['en', 'vi'] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => onLocaleChange(language)}
                aria-label={`Switch language to ${language.toUpperCase()}`}
                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  locale === language
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>

          {!user || !user.name || user.name.toLowerCase() === 'player' || user.name.toLowerCase() === 'user' ? (
            <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800/80 p-1 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl animate-pulse">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-800/80 rounded-full shrink-0" />
              <div className="hidden sm:block w-20 h-3.5 bg-slate-800/80 rounded-md" />
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((isOpen) => !isOpen)}
                aria-label={user.name}
                aria-expanded={isDropdownOpen}
                className="flex items-center space-x-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 p-1 rounded-full sm:px-3 sm:py-1.5 sm:rounded-xl transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-700 shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white shrink-0">
                    {user.name.slice(0, 2)}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-sm text-slate-200">
                  {user.name}
                </span>
                <ChevronDown size={14} className="hidden sm:inline text-slate-500" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => selectMenuItem(onOpenProfile)}
                    className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Users size={16} className="text-purple-400" />
                    <span>{locale === 'vi' ? 'Hồ sơ cá nhân' : 'User Profile'}</span>
                  </button>
                  <button
                    onClick={() => selectMenuItem(onOpenHistory)}
                    className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Clock size={16} className="text-cyan-400" />
                    <span>{locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}</span>
                  </button>
                  <button
                    onClick={() => selectMenuItem(onOpenLeaderboard)}
                    className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Trophy size={16} className="text-amber-400" />
                    <span>{locale === 'vi' ? 'Bảng xếp hạng' : 'Leaderboard'}</span>
                  </button>
                  <button
                    onClick={() => selectMenuItem(onOpenAchievements)}
                    className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Award size={16} className="text-emerald-400" />
                    <span>{locale === 'vi' ? 'Thành tích' : 'Achievements'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
