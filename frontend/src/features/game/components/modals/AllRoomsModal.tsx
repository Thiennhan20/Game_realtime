import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Grid,
  RefreshCw,
  Users,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
  onSpectateRoom?: (roomId: string) => void;
  onClose: () => void;
}

const ROOMS_PER_PAGE = 8;

export function AllRoomsModal({
  isOpen,
  rooms,
  isRefreshing,
  locale,
  t,
  onRefresh,
  onJoinRoom,
  onSpectateRoom,
  onClose,
}: AllRoomsModalProps) {
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter rooms based on active tab
  const filteredRooms = useMemo(() => {
    if (filter === 'waiting') {
      return rooms.filter(
        (r) => r.playerCount < 2 && (!r.state || r.state === 'WAITING_FOR_PLAYERS')
      );
    }
    if (filter === 'playing') {
      return rooms.filter(
        (r) => r.playerCount >= 2 || (Boolean(r.state) && r.state !== 'WAITING_FOR_PLAYERS')
      );
    }
    return rooms;
  }, [rooms, filter]);

  // Reset to first page when filter changes or room count drops
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedRooms = useMemo(() => {
    const start = (validPage - 1) * ROOMS_PER_PAGE;
    return filteredRooms.slice(start, start + ROOMS_PER_PAGE);
  }, [filteredRooms, validPage]);

  const handleFilterChange = (newFilter: 'all' | 'waiting' | 'playing') => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const waitingCount = useMemo(
    () => rooms.filter((r) => r.playerCount < 2 && (!r.state || r.state === 'WAITING_FOR_PLAYERS')).length,
    [rooms]
  );
  const playingCount = useMemo(
    () => rooms.filter((r) => r.playerCount >= 2 || (Boolean(r.state) && r.state !== 'WAITING_FOR_PLAYERS')).length,
    [rooms]
  );

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
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
                  <Grid size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>
                      {locale === 'vi' ? 'Danh sách phòng' : 'All Active Rooms'}
                    </span>
                    <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[10px] rounded-full font-mono font-bold">
                      {rooms.length}
                    </span>
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    {locale === 'vi'
                      ? 'Chọn phòng bất kỳ để tham gia thi đấu hoặc xem trận'
                      : 'Select any waiting room to join or spectate'}
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

            {/* Filter Tabs Bar */}
            <div className="px-3 sm:px-6 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter size={11} className="text-purple-400" />
                  <span>{locale === 'vi' ? 'Lọc:' : 'Filter:'}</span>
                </span>
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-purple-500/25 border border-purple-500/50 text-purple-200 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {locale === 'vi' ? 'Tất cả' : 'All'} ({rooms.length})
                </button>
                <button
                  onClick={() => handleFilterChange('waiting')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filter === 'waiting'
                      ? 'bg-blue-500/25 border border-blue-500/50 text-blue-200 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {locale === 'vi' ? 'Đang đợi' : 'Waiting'} ({waitingCount})
                </button>
                <button
                  onClick={() => handleFilterChange('playing')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filter === 'playing'
                      ? 'bg-amber-500/25 border border-amber-500/50 text-amber-200 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {locale === 'vi' ? 'Đang đấu' : 'In Game'} ({playingCount})
                </button>
              </div>

              {totalPages > 1 && (
                <div className="text-[11px] text-slate-400 font-mono">
                  {locale === 'vi'
                    ? `Trang ${validPage}/${totalPages}`
                    : `Page ${validPage}/${totalPages}`}
                </div>
              )}
            </div>

            {/* Room Cards Grid (Paginated to max 8 rooms for light mobile footprint) */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                  <Users size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-sm">
                    {filter === 'all'
                      ? t('noRooms')
                      : locale === 'vi'
                        ? 'Không có phòng nào trong danh mục này'
                        : 'No rooms found in this category'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedRooms.map((room) => {
                    const isFull =
                      room.playerCount >= 2 ||
                      (Boolean(room.state) && room.state !== 'WAITING_FOR_PLAYERS');
                    return (
                      <div
                        key={room.roomId}
                        className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                          isFull
                            ? 'bg-slate-950/40 border-slate-850 opacity-85'
                            : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-purple-500/50 shadow-lg'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-extrabold text-amber-400">
                              #{room.roomId}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isFull ? (
                                <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  {room.state === 'PLAYING'
                                    ? locale === 'vi'
                                      ? 'Đang đấu'
                                      : 'Playing'
                                    : locale === 'vi'
                                      ? 'Đã đầy'
                                      : 'Full'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                  {locale === 'vi' ? 'Đang đợi' : 'Waiting'}
                                </span>
                              )}
                              {typeof room.spectatorCount === 'number' && room.spectatorCount > 0 && (
                                <span
                                  className={`px-1.5 py-0.5 border rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                    room.spectatorCount >= 10
                                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                      : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                  }`}
                                >
                                  <Eye size={10} />
                                  <span>{room.spectatorCount}/10</span>
                                </span>
                              )}
                            </div>
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
                          ) : onSpectateRoom ? (
                            (room.spectatorCount || 0) >= 10 ? (
                              <button
                                disabled
                                className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed opacity-60 flex items-center justify-center gap-1.5"
                              >
                                <Eye size={13} />
                                <span>{locale === 'vi' ? 'Đầy người xem' : 'Full (10/10)'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onClose();
                                  onSpectateRoom(room.roomId);
                                }}
                                className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 hover:border-blue-500/60 text-blue-300 font-bold text-xs rounded-xl shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Eye size={13} />
                                <span>{locale === 'vi' ? 'Xem trận' : 'Spectate'}</span>
                              </button>
                            )
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

            {/* Pagination Controls Bar */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage <= 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>{locale === 'vi' ? 'Trước' : 'Prev'}</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                        page === validPage
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage >= totalPages}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>{locale === 'vi' ? 'Sau' : 'Next'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
