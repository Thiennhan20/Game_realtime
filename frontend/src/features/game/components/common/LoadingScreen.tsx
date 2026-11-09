import { motion } from 'framer-motion';

interface LoadingScreenProps {
  label?: string;
  animated?: boolean;
}

export function LoadingScreen({ label, animated = false }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090a0f] text-white">
      {animated ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className={`w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full ${
            label ? 'mb-4' : ''
          }`}
        />
      ) : (
        <div
          className={`w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin ${
            label ? 'mb-4' : ''
          }`}
        />
      )}
      {label && <p className="text-slate-400 font-mono text-xs">{label}</p>}
    </div>
  );
}
