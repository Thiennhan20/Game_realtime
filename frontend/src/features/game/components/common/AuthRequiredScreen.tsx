import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

import type { Translator } from '../../i18n';

interface AuthRequiredScreenProps {
  t: Translator;
  onLogin: () => void;
}

export function AuthRequiredScreen({ t, onLogin }: AuthRequiredScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogOut size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-3">{t('authRequired')}</h2>
        <p className="text-slate-400 mb-6">{t('authDesc')}</p>
        <button
          onClick={onLogin}
          className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer"
        >
          {t('goToLogin')}
        </button>
      </motion.div>
    </div>
  );
}
