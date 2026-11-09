import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface AuthRequiredScreenProps {
  t: Translator;
  locale: Locale;
  onLogin: () => void;
  onRegister: () => void;
}

export function AuthRequiredScreen({ t, onLogin, onRegister }: AuthRequiredScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#0c1017] border border-white/[0.12] p-6 sm:p-8 rounded-3xl shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <LogOut size={30} />
        </div>
        <h2 className="text-xl sm:text-2xl font-mono font-bold uppercase tracking-wider text-white mb-3">
          {t('authRequired')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed font-mono">
          {t('authDesc')}
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-violet-600/25 transition duration-200 cursor-pointer active:scale-98"
        >
          {t('goToLogin')}
        </button>

        {/* Notice for new users to register on movie website */}
        <div className="mt-5 pt-5 border-t border-white/[0.08] text-center space-y-2">
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            {t('noAccountRegisterOnMovie')}
          </p>
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-emerald-400 hover:text-emerald-300 font-mono font-bold text-xs transition cursor-pointer"
          >
            <span>{t('registerOnMovieSite')}</span>
            <span className="text-[14px]">↗</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
