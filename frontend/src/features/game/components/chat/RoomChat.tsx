'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, MessageSquare, Send, Smile } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { ChatMessage, FloatingEmote, Locale, QuickEmote } from '../../types';
import { QuickEmotePicker } from '../common/QuickEmotePicker';

function formatChatTime(timestamp: string | number): string {
  try {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

const QUICK_CHAT_SUGGESTIONS = [
  { vi: '👋 Xin chào!', en: '👋 Hello!' },
  { vi: '⚔️ Chúc may mắn!', en: '⚔️ Good luck!' },
  { vi: '🤔 Căng não thế!', en: '🤔 Brain melt!' },
  { vi: '🔥 Chiến nào!', en: "🔥 Let's go!" },
  { vi: '🤝 Trận hay lắm!', en: '🤝 Well played!' },
];

interface RoomChatProps {
  messages: ChatMessage[];
  currentUsername: string;
  input?: string;
  t: Translator;
  locale?: Locale;
  className?: string;
  isActive: boolean;
  floatingEmotes?: FloatingEmote[];
  onInputChange?: (value: string) => void;
  onSubmit: (eventOrMessage: FormEvent<HTMLFormElement> | string) => void;
  onSendReaction?: (emoji: QuickEmote) => void;
}

export const RoomChat = memo(function RoomChat({
  messages,
  currentUsername,
  input = '',
  t,
  locale = 'vi',
  className = '',
  isActive,
  floatingEmotes = [],
  onInputChange,
  onSubmit,
  onSendReaction,
}: RoomChatProps) {
  const [localInput, setLocalInput] = useState('');
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = localInput.trim();
    if (!message) return;
    onSubmit(message);
    setLocalInput('');
    onInputChange?.('');
  };

  const handleScroll = () => {
    if (!messagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    isUserAtBottomRef.current = atBottom;
    if (atBottom) {
      setShowNewMessageButton(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
      isUserAtBottomRef.current = true;
      setShowNewMessageButton(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const isNew = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (!messagesRef.current || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const sentByMe = lastMessage?.username === currentUsername;

    if (sentByMe || isUserAtBottomRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      setShowNewMessageButton(false);
    } else if (isNew) {
      setShowNewMessageButton(true);
    }
  }, [messages, currentUsername]);

  // Scroll to bottom when tab becomes active
  useEffect(() => {
    if (isActive && messagesRef.current && isUserAtBottomRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [isActive]);

  return (
    <div
      className={`relative w-full lg:w-80 lg:flex-none bg-[#0d1017] border border-white/[0.08] rounded-2xl flex flex-col h-[calc(100dvh-8rem)] max-h-[600px] lg:h-[536px] 2xl:lg:h-[650px] lg:max-h-[calc(100vh-140px)] shadow-xl overflow-hidden ${className}`}
    >
      <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#090a0f]/40">
        <div className="flex items-center space-x-2">
          <MessageSquare size={15} className="text-violet-400" />
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
            {t('roomChat')}
          </h3>
        </div>
        {messages.length > 0 && (
          <span className="text-[10px] font-mono text-slate-500 bg-[#121622] px-2 py-0.5 rounded border border-white/[0.06]">
            {messages.length}
          </span>
        )}
      </div>

      <div
        ref={messagesRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3 min-h-0 bg-transparent"
      >
        {messages.map((message, index) => {
          const isMe = message.username === currentUsername;
          const isReaction = message.type === 'reaction';
          return (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {message.username}
                </span>
                {message.isSpectator && (
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {t('spectator')}
                  </span>
                )}
                <span className="text-[9px] font-mono text-slate-600">
                  {formatChatTime(message.timestamp)}
                </span>
              </div>
              {isReaction ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border shadow-sm select-none transition-transform hover:scale-105 ${
                    isMe
                      ? 'bg-violet-500/15 border-violet-500/35 text-violet-200 rounded-tr-none'
                      : 'bg-[#121622] border-white/[0.08] text-slate-300 rounded-tl-none'
                  }`}
                >
                  <span className="text-lg leading-none filter drop-shadow-sm">
                    {message.emoji || message.content}
                  </span>
                  <span className="text-[10px] font-mono font-medium opacity-80">
                    {locale === 'vi'
                      ? isMe
                        ? 'Đã thả'
                        : 'Vừa thả'
                      : isMe
                        ? 'Sent'
                        : 'Dropped'}
                  </span>
                </div>
              ) : (
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm max-w-[85%] break-words shadow-sm font-sans leading-relaxed ${
                    isMe
                      ? 'bg-violet-600 text-white rounded-tr-sm border border-violet-400/30'
                      : 'bg-[#121622] text-slate-200 border border-white/[0.08] rounded-tl-sm'
                  }`}
                >
                  {message.content}
                </div>
              )}
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 my-auto">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-2.5">
              <MessageSquare size={18} />
            </div>
            <p className="text-xs font-mono font-bold text-slate-300 mb-1">
              {locale === 'vi' ? 'Chưa có tin nhắn nào' : 'No messages yet'}
            </p>
            <p className="text-[11px] text-slate-500 font-sans mb-3.5 max-w-[200px]">
              {locale === 'vi' ? 'Bấm tin nhắn nhanh hoặc gõ bên dưới:' : 'Tap a quick message or type below:'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[260px]">
              {QUICK_CHAT_SUGGESTIONS.map((sug) => {
                const text = locale === 'vi' ? sug.vi : sug.en;
                return (
                  <button
                    key={text}
                    type="button"
                    onClick={() => onSubmit(text)}
                    className="px-2.5 py-1 rounded-lg bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 text-[11px] font-mono text-slate-300 hover:text-white transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showNewMessageButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full shadow-xl border border-violet-400/40 flex items-center space-x-1.5 transition-all duration-200 animate-bounce cursor-pointer z-20"
        >
          <ArrowDown size={14} />
          <span>{t('newMessages')}</span>
        </button>
      )}

      <form
        onSubmit={handleFormSubmit}
        className="relative p-2.5 sm:p-3 border-t border-white/[0.06] flex items-center gap-2 shrink-0 bg-[#090a0f]/60"
      >
        {onSendReaction && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmotePicker((prev) => !prev)}
              aria-label={locale === 'vi' ? 'Mở bảng biểu cảm' : 'Toggle quick emotes'}
              title={locale === 'vi' ? 'Biểu cảm nhanh' : 'Quick Emotes'}
              className={`w-9 h-9 sm:w-10 sm:h-10 border rounded-xl transition duration-150 flex items-center justify-center cursor-pointer shrink-0 ${
                showEmotePicker
                  ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-500/25 ring-2 ring-violet-500/30'
                  : 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] hover:border-violet-500/40 text-violet-300 hover:text-white'
              }`}
            >
              <Smile size={18} aria-hidden="true" />
            </button>

            {showEmotePicker && (
              <QuickEmotePicker
                onSelect={(emoji) => {
                  onSendReaction(emoji);
                  setShowEmotePicker(false);
                }}
                onClose={() => setShowEmotePicker(false)}
                locale={locale}
                variant="popover"
                placement="bottom-left"
              />
            )}
          </div>
        )}

        <input
          type="text"
          placeholder={t('chatPlaceholder')}
          aria-label={t('chatPlaceholder')}
          value={localInput}
          onChange={(event) => setLocalInput(event.target.value)}
          className="h-9 sm:h-10 flex-1 min-w-0 bg-[#090a0f] border border-white/[0.08] focus:border-violet-500/50 focus:outline-none px-3.5 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 font-sans"
        />
        <button
          type="submit"
          disabled={!localInput.trim()}
          aria-label="Send message"
          className="w-9 h-9 sm:w-10 sm:h-10 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 active:translate-y-0.5 text-white border border-violet-400/30 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition duration-150 flex items-center justify-center cursor-pointer shrink-0 shadow-sm shadow-violet-950/40"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
});
