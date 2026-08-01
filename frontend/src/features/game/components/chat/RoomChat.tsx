'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, MessageSquare, Send } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { ChatMessage } from '../../types';

interface RoomChatProps {
  messages: ChatMessage[];
  currentUsername: string;
  input: string;
  t: Translator;
  className?: string;
  isActive: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function RoomChat({
  messages,
  currentUsername,
  input,
  t,
  className = '',
  isActive,
  onInputChange,
  onSubmit,
}: RoomChatProps) {
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

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
      className={`relative w-full lg:w-80 lg:flex-none bg-slate-900/70 border border-slate-800/80 rounded-2xl flex flex-col h-[calc(100dvh-8rem)] max-h-[600px] lg:h-[calc(100dvh-6rem)] lg:max-h-[calc(100dvh-6rem)] overflow-hidden ${className}`}
    >
      <div className="p-4 border-b border-slate-800 flex items-center space-x-2 shrink-0 bg-slate-950/20">
        <MessageSquare size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          {t('roomChat')}
        </h3>
      </div>

      <div
        ref={messagesRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0 bg-slate-950/10"
      >
        {messages.map((message, index) => {
          const isMe = message.username === currentUsername;
          return (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-slate-500">
                  {message.username}
                </span>
                <span className="text-[9px] text-slate-600">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`px-3 py-2 rounded-xl text-sm max-w-[85%] break-words ${
                  isMe
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-700 text-xs py-12">
            {t('sayHi')}
          </div>
        )}
      </div>

      {showNewMessageButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xl border border-purple-400/40 flex items-center space-x-1.5 transition-all duration-200 animate-bounce cursor-pointer z-20"
        >
          <ArrowDown size={14} />
          <span>{t('newMessages')}</span>
        </button>
      )}

      <form
        onSubmit={onSubmit}
        className="p-3 border-t border-slate-800 flex gap-2 shrink-0 bg-slate-950/20"
      >
        <input
          type="text"
          placeholder={t('chatPlaceholder')}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-3.5 py-2 rounded-xl text-base md:text-sm placeholder-slate-600"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send message"
          className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-40 transition duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
