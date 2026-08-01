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
  onCreateRoom: () => void;
  onCreateAiRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onRoomIdChange: (roomId: string) => void;
  onRefresh: () => void;
  onRefreshGameProfile: () => void;
  onViewAllRooms: () => void;
  onViewLeaderboard: () => void;
}

export function LobbyScreen({
  rooms,
  isRefreshing,
  locale,
  t,
  roomId,
  gameProfile,
  isLoadingGameProfile,
  gameProfileError,
  onCreateRoom,
  onCreateAiRoom,
  onJoinRoom,
  onRoomIdChange,
  onRefresh,
  onRefreshGameProfile,
  onViewAllRooms,
  onViewLeaderboard,
}: LobbyScreenProps) {
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
        {statsCard('lg:hidden mb-3')}
        <MobileHowToPlay locale={locale} />
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl space-y-4 sm:space-y-6">
          <ModeSelector
            locale={locale}
            t={t}
            roomId={roomId}
            onCreateRoom={onCreateRoom}
            onCreateAiRoom={onCreateAiRoom}
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
            onViewAll={onViewAllRooms}
          />
        </div>
      </motion.div>

      {/* Right Column: Arena Performance (Top) & Leaderboard (Bottom) */}
      <div className="hidden lg:flex flex-col flex-1 gap-4 min-w-0">
        {statsCard('shrink-0')}
        <LeaderboardPreview locale={locale} onViewAll={onViewLeaderboard} />
      </div>
    </div>
  );
}
