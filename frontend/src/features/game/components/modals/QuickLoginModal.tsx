'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Film, KeyRound, Loader2, LogIn, Sparkles, User, X } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { AuthUser, Locale } from '../../types';
import { getMainSiteUrl, navigateTopWindow } from '../../utils';

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentMovieUser: AuthUser | null;
  onUseParentMovieAccount: () => void;
  onSubmitLogin: (email: string, pass: string) => Promise<{
    success: boolean;
    error?: string;
    isDifferentFromMovie?: boolean;
    user?: AuthUser;
  }>;
  locale: Locale;
  t: Translator;
}

export function QuickLoginModal({
  isOpen,
  onClose,
  parentMovieUser,
  onUseParentMovieAccount,
  onSubmitLogin,
  locale,
  t,
}: QuickLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage(locale === 'vi' ? 'Vui lòng nhập đầy đủ thông tin.' : 'Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await onSubmitLogin(email.trim(), password.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || t('invalidCredentials'));
      return;
    }

    // Success handled by parent
    onClose();
  };

  const handleRegisterClick = () => {
    const registerUrl = getMainSiteUrl('/login?mode=register', locale);
    navigateTopWindow(registerUrl);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#090a0f]/90 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-[#0c1017] border border-white/[0.12] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#121622]/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <LogIn size={18} />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm sm:text-base text-white tracking-wide uppercase">
                    {locale === 'vi' ? 'Đăng Nhập Đấu Trường' : 'Arena Login'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {locale === 'vi' ? 'Tài khoản MovieSaw & Đấu Trường' : 'MovieSaw & Arena Account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Option 1: 1-Click Login with MovieSaw Account (Rendered ONLY if parent site is authenticated) */}
              {parentMovieUser && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-950/40 via-[#121622] to-indigo-950/30 border border-violet-500/30 space-y-3 shadow-md">
                    <div className="flex items-center gap-3">
                      {parentMovieUser.avatar ? (
                        <img
                          src={parentMovieUser.avatar}
                          alt={parentMovieUser.name}
                          className="w-10 h-10 rounded-full border border-violet-400/50 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-mono font-bold text-sm text-white shrink-0">
                          {parentMovieUser.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Film size={12} className="text-violet-400" />
                          <span className="text-[10px] font-mono font-bold text-violet-300 uppercase tracking-wider">
                            {t('parentMovieAccountActive')}
                          </span>
                        </div>
                        <h4 className="font-mono font-bold text-sm text-white truncate">
                          {parentMovieUser.name}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onUseParentMovieAccount();
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-violet-600/30 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Sparkles size={14} className="text-amber-300 animate-pulse" />
                      <span>{t('continueWithMovieAccount').replace('{name}', parentMovieUser.name)}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center py-1">
                    <div className="border-t border-white/[0.08] w-full" />
                    <span className="bg-[#0c1017] px-3 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                      {t('orUseDifferentAccount')}
                    </span>
                    <div className="border-t border-white/[0.08] w-full" />
                  </div>
                </div>
              )}

              {/* Option 2: Form Login for Custom Game Account */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono leading-relaxed"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-slate-300">
                    {t('emailOrUsername')}
                  </label>
                  <div className="relative flex items-center">
                    <User size={15} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#121622] border border-white/[0.08] focus:border-violet-500/80 rounded-xl text-white font-mono text-xs placeholder-slate-500 outline-none transition"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-slate-300">
                    {t('password')}
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound size={15} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder')}
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#121622] border border-white/[0.08] focus:border-violet-500/80 rounded-xl text-white font-mono text-xs placeholder-slate-500 outline-none transition"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white font-mono font-bold text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-violet-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-white" />
                      <span>{t('loggingIn')}</span>
                    </>
                  ) : (
                    <span>{t('loginToGame')}</span>
                  )}
                </button>
              </form>

              {/* Notice & Registration Link for New Users */}
              <div className="p-3.5 rounded-2xl bg-[#121622]/80 border border-white/[0.06] text-center space-y-2">
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  {t('noAccountRegisterOnMovie')}
                </p>
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-emerald-400 hover:text-emerald-300 font-mono font-bold text-xs transition cursor-pointer"
                >
                  <span>{t('registerOnMovieSite')}</span>
                  <span className="text-[14px]">↗</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

