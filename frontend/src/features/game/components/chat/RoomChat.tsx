'use client';

import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';

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

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [isActive, messages.length]);

  return (
    <div
      className={`w-full lg:w-80 lg:flex-none bg-slate-900/70 border border-slate-800/80 rounded-2xl flex-col flex-1 min-h-[450px] lg:h-auto overflow-hidden ${className}`}
    >
      <div className="p-4 border-b border-slate-800 flex items-center space-x-2 shrink-0 bg-slate-950/20">
        <MessageSquare size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          {t('roomChat')}
        </h3>
      </div>

      <div
        ref={messagesRef}
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
          className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-40 transition duration-150 flex items-center justify-center cursor-pointer"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
