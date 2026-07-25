import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Grid, RefreshCw, Users, X } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { LobbyRoom, Locale } from '../../types';
import { formatElapsedTime } from '../../utils';

interface AllRoomsModalProps {
  isOpen: boolean;
  rooms: LobbyRoom[];
  isRefreshing: boolean;
  locale: Locale;
  t: Translator;
  onRefresh: () => void;
  onJoinRoom: (roomId: string) => void;
  onClose: () => void;
}

export function AllRoomsModal({
  isOpen,
  rooms,
  isRefreshing,
  locale,
  t,
  onRefresh,
  onJoinRoom,
  onClose,
}: AllRoomsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="bg-slate-900 border border-slate-800 w-full max-w-6xl xl:max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[90vh] transform-gpu"
          >
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
                  <Grid size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>
                      {locale === 'vi' ? 'Danh sách tất cả các phòng' : 'All Active Rooms'}
                    </span>
                    <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[10px] rounded-full font-mono font-bold">
                      {rooms.length}
                    </span>
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    {locale === 'vi'
                      ? 'Chọn phòng bất kỳ để tham gia thi đấu'
                      : 'Select any waiting room to join'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 hover:border-purple-500/60 rounded-lg transition duration-150 cursor-pointer disabled:opacity-50 shadow-sm"
                  title={locale === 'vi' ? 'Làm mới danh sách phòng' : 'Refresh room list'}
                >
                  <RefreshCw
                    size={11}
                    className={isRefreshing ? 'animate-spin text-purple-400' : ''}
                  />
                  <span>{locale === 'vi' ? 'Làm mới' : 'Refresh'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-500 rounded-lg transition duration-150 cursor-pointer shadow-md flex items-center justify-center"
                  title={locale === 'vi' ? 'Đóng' : 'Close'}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              {rooms.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                  <Users size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-sm">{t('noRooms')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rooms.map((room) => {
                    const isFull =
                      room.playerCount >= 2 ||
                      (Boolean(room.state) && room.state !== 'WAITING_FOR_PLAYERS');
                    return (
                      <div
                        key={room.roomId}
                        className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                          isFull
                            ? 'bg-slate-950/40 border-slate-850 opacity-75'
                            : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-purple-500/50 shadow-lg'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-extrabold text-amber-400">
                              #{room.roomId}
                            </span>
                            {isFull ? (
                              <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                {locale === 'vi' ? 'Đã đầy' : 'Full'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                {locale === 'vi' ? 'Đang đợi' : 'Waiting'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            {room.hostAvatar ? (
                              <img
                                src={room.hostAvatar}
                                alt={room.hostName}
                                className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-extrabold text-xs uppercase text-white shrink-0 border border-slate-700">
                                {room.hostName ? room.hostName.slice(0, 2) : 'P'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs text-slate-300 font-medium truncate">
                                {locale === 'vi' ? 'Chủ phòng:' : 'Host:'}{' '}
                                <strong className="text-white font-bold">{room.hostName}</strong>
                              </p>
                              <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                                <span className="flex items-center space-x-1 shrink-0">
                                  <Users size={11} className="text-slate-500" />
                                  <span>{room.playerCount}/2</span>
                                </span>
                                <span className="flex items-center space-x-1 shrink-0">
                                  <Clock size={11} className="text-slate-500" />
                                  <span>{formatElapsedTime(room.createdAt, locale)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-1">
                          {!isFull ? (
                            <button
                              onClick={() => {
                                onClose();
                                onJoinRoom(room.roomId);
                              }}
                              className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition duration-200 cursor-pointer"
                            >
                              {locale === 'vi' ? 'Tham gia' : 'Join'}
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed opacity-60"
                            >
                              {locale === 'vi' ? 'Đã đầy' : 'Full'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
