import { motion } from 'framer-motion';

import type { Translator } from '../../i18n';
import type { LobbyRoom, Locale } from '../../types';
import { BattleGuide } from './BattleGuide';
import { LeaderboardPreview } from './LeaderboardPreview';
import { LobbyRoomList } from './LobbyRoomList';
import { MobileHowToPlay } from './MobileHowToPlay';
import { ModeSelector } from './ModeSelector';
import { SetupGuide } from './SetupGuide';

interface LobbyScreenProps {
  rooms: LobbyRoom[];
  isRefreshing: boolean;
  locale: Locale;
  t: Translator;
  roomId: string;
  onCreateRoom: () => void;
  onCreateAiRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onRoomIdChange: (roomId: string) => void;
  onRefresh: () => void;
  onViewAllRooms: () => void;
  onViewLeaderboard: () => void;
}

export function LobbyScreen({
  rooms,
  isRefreshing,
  locale,
  t,
  roomId,
  onCreateRoom,
  onCreateAiRoom,
  onJoinRoom,
  onRoomIdChange,
  onRefresh,
  onViewAllRooms,
  onViewLeaderboard,
}: LobbyScreenProps) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-4 sm:gap-6 py-1 sm:py-2 max-w-6xl mx-auto w-full">
      <div className="hidden lg:flex flex-col flex-1 gap-4 min-w-0">
        <SetupGuide locale={locale} />
        <LeaderboardPreview locale={locale} onViewAll={onViewLeaderboard} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full flex flex-col justify-center"
      >
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

      <BattleGuide locale={locale} />
    </div>
  );
}
