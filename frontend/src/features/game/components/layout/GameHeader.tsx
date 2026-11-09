'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Award,
  ChevronDown,
  Clock,
  Home,
  LogOut,
  RefreshCw,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound } from '../../sound';
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
  onSwitchAccount?: () => void;
  onLogout?: () => void;
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
  onSwitchAccount,
  onLogout,
}: GameHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectMenuItem = (action: () => void) => {
    setIsDropdownOpen(false);
    action();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#090a0f] border-b border-white/[0.08] px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl shrink-0">
      <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            type="button"
            onClick={onBackHome}
            aria-label={t('backHome')}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-white/[0.16] rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 shadow-sm"
            title={t('backHome')}
          >
            <Home size={18} aria-hidden="true" />
          </button>
          <h1 className="font-mono font-bold text-sm sm:text-xl tracking-tight text-white truncate">
            {locale === 'vi' ? 'Đoán Số' : 'Guess Number'}
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="flex items-center bg-[#121622] border border-white/[0.08] p-0.5 rounded-xl text-[10px] font-mono font-bold">
            {(['en', 'vi'] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => onLocaleChange(language)}
                aria-label={`Switch language to ${language.toUpperCase()}`}
                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  locale === language
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? t('soundOff') : t('soundOn')}
            title={isMuted ? t('soundOff') : t('soundOn')}
            className={`w-7 h-7 sm:w-8 sm:h-8 border border-white/[0.08] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              isMuted
                ? 'bg-[#121622] text-slate-500 hover:text-slate-300'
                : 'bg-[#121622] hover:bg-[#181d2c] text-emerald-400 hover:text-emerald-300 shadow-sm'
            }`}
          >
            {isMuted ? (
              <VolumeX size={15} aria-hidden="true" />
            ) : (
              <Volume2 size={15} aria-hidden="true" />
            )}
          </button>

          {!user || !user.name || user.name.toLowerCase() === 'player' || user.name.toLowerCase() === 'user' ? (
            <div className="flex items-center justify-center bg-[#121622] border border-white/[0.08] p-0.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl animate-pulse">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] rounded-full shrink-0" />
              <div className="hidden sm:block w-20 h-3.5 bg-white/[0.06] rounded-md sm:ml-2" />
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((isOpen) => !isOpen)}
                aria-label={user.name}
                aria-expanded={isDropdownOpen}
                className="flex items-center justify-center bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-white/[0.16] p-0.5 sm:py-1.5 sm:px-3 sm:gap-2 rounded-full sm:rounded-xl transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 shadow-sm"
              >
                {user.avatar && !avatarError ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    onError={() => setAvatarError(true)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/[0.1] shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-600 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase text-white shrink-0">
                    {user.name.slice(0, 2)}
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-200">
                    {user.name}
                  </span>
                  <ChevronDown size={14} className="text-slate-500" />
                </div>
              </button>

              {isDropdownOpen && (
                <div
                  role="menu"
                  aria-label="User navigation"
                  className="absolute right-0 mt-2 w-56 bg-[#0c1017] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => selectMenuItem(onOpenProfile)}
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white text-xs sm:text-sm font-mono font-bold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Users size={16} className="text-violet-400" />
                    <span>{t('userProfile')}</span>
                  </button>
                  <div className="my-1 border-t border-white/[0.08]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => selectMenuItem(onOpenHistory)}
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white text-xs sm:text-sm font-mono font-bold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Clock size={16} className="text-cyan-400" />
                    <span>{t('matchHistory')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => selectMenuItem(onOpenLeaderboard)}
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white text-xs sm:text-sm font-mono font-bold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Trophy size={16} className="text-amber-400" />
                    <span>{t('leaderboard')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => selectMenuItem(onOpenAchievements)}
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white text-xs sm:text-sm font-mono font-bold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                  >
                    <Award size={16} className="text-emerald-400" />
                    <span>{t('achievements')}</span>
                  </button>

                  {(onSwitchAccount || onLogout) && <div className="my-1 border-t border-white/[0.08]" />}

                  {onSwitchAccount && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => selectMenuItem(onSwitchAccount)}
                      className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-mono font-bold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                    >
                      <RefreshCw size={15} className="text-amber-400" />
                      <span>{t('switchAccount')}</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => selectMenuItem(onLogout)}
                      className="w-full text-left py-2.5 px-4 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs sm:text-sm font-mono font-bold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                    >
                      <LogOut size={15} className="text-rose-400" />
                      <span>{t('logout')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
