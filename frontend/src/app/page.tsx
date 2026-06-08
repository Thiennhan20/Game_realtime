import { Suspense } from 'react';
import GameClient from './GameClient';

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading Game Client...</p>
      </div>
    }>
      <GameClient />
    </Suspense>
  );
}
