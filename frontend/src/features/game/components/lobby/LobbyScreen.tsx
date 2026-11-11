import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import type { Translator } from '../../i18n';
import type { GameProfile, LobbyRoom, Locale } from '../../types';
import { LeaderboardPreview } from './LeaderboardPreview';
import { LobbyRoomList } from './LobbyRoomList';
import { MobileHowToPlay } from './MobileHowToPlay';
import { ModeSelector } from './ModeSelector';
import { PlayerStatsCard } from './PlayerStatsCard';
import { SetupGuide } from './SetupGuide';

interface LobbyScreenProps {
  rooms: LobbyRoom[];
  isRefreshing: boolean;
  locale: Locale;
  t: Translator;
  roomId: string;
  gameProfile: GameProfile | null;
  isLoadingGameProfile: boolean;
  gameProfileError: string | null;
  isQuickMatching?: boolean;
  quickMatchElapsedSeconds?: number;
  quickMatchFoundRoom?: { roomId: string; hostName: string } | null;
  onQuickMatch: () => void;
  onCancelQuickMatch?: () => void;
  onCreateRoom: () => void;
  onCreateAiRoom: () => void;
  onOpenDailyChallenge?: () => void;
  onJoinRoom: (roomId: string) => void;
  onRoomIdChange: (roomId: string) => void;
  onRefresh: () => void;
  onRefreshGameProfile: () => void;
  onViewAllRooms: () => void;
  onViewLeaderboard: () => void;
  onSpectateRoom?: (roomId: string) => void;
  onOpenProfile?: (userId: string | null) => void;
}

export const LobbyScreen = memo(function LobbyScreen({
  rooms,
  isRefreshing,
  locale,
  t,
  roomId,
  gameProfile,
  isLoadingGameProfile,
  gameProfileError,
  isQuickMatching = false,
  quickMatchElapsedSeconds = 0,
  quickMatchFoundRoom = null,
  onQuickMatch,
  onCancelQuickMatch,
  onCreateRoom,
  onCreateAiRoom,
  onOpenDailyChallenge,
  onJoinRoom,
  onRoomIdChange,
  onRefresh,
  onRefreshGameProfile,
  onViewAllRooms,
  onViewLeaderboard,
  onSpectateRoom,
  onOpenProfile,
}: LobbyScreenProps) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop((prev) => (prev !== desktop ? desktop : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const statsCard = (className: string) => (
    <PlayerStatsCard
      locale={locale}
      profile={gameProfile}
      isLoading={isLoadingGameProfile}
      error={gameProfileError}
      onRetry={onRefreshGameProfile}
      className={className}
    />
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-4 sm:gap-6 py-1 sm:py-2 max-w-[1700px] mx-auto w-full px-2 sm:px-4">
      {/* Left Column: Complete Game Guide (Steps 1 to 5) */}
      <div className="hidden lg:flex flex-col flex-1 gap-4 min-w-0">
        <SetupGuide locale={locale} />
      </div>

      {/* Center Column: Core Mode Selector & Waiting Rooms */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full lg:w-[440px] xl:w-[480px] shrink-0 flex flex-col justify-center"
      >
        {!isDesktop && statsCard('mb-3')}
        <MobileHowToPlay locale={locale} />
        <div className="bg-[#0d1017] border border-white/[0.08] p-4 sm:p-6 rounded-xl shadow-xl space-y-4 sm:space-y-6">
          <ModeSelector
            locale={locale}
            t={t}
            roomId={roomId}
            isQuickMatching={isQuickMatching}
            quickMatchElapsedSeconds={quickMatchElapsedSeconds}
            quickMatchFoundRoom={quickMatchFoundRoom}
            onQuickMatch={onQuickMatch}
            onCancelQuickMatch={onCancelQuickMatch}
            onCreateRoom={onCreateRoom}
            onCreateAiRoom={onCreateAiRoom}
            onOpenDailyChallenge={onOpenDailyChallenge}
            onJoinRoom={onJoinRoom}
            onRoomIdChange={onRoomIdChange}
          />
          <LobbyRoomList
            rooms={rooms}
            isRefreshing={isRefreshing}
            locale={locale}
            t={t}
            onRefresh={onRefresh}
            onJoin={onJoinRoom}
            onSpectate={onSpectateRoom}
            onViewAll={onViewAllRooms}
            onOpenProfile={onOpenProfile}
          />
        </div>
      </motion.div>

      {/* Right Column: Arena Performance (Top) & Leaderboard (Bottom) */}
      <div className="hidden lg:flex flex-col flex-1 gap-4 min-w-0">
        {isDesktop && statsCard('shrink-0')}
        {isDesktop && (
          <LeaderboardPreview
            locale={locale}
            onViewAll={onViewLeaderboard}
            onOpenProfile={onOpenProfile}
          />
        )}
      </div>
    </div>
  );
});
