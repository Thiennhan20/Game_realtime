import type { Translator } from '../../i18n';

export type MobileRoomTab = 'arena' | 'chat';

interface MobileRoomTabsProps {
  activeTab: MobileRoomTab;
  unreadCount?: number;
  t: Translator;
  onChange: (tab: MobileRoomTab) => void;
}

export function MobileRoomTabs({ activeTab, unreadCount = 0, t, onChange }: MobileRoomTabsProps) {
  return (
    <div className="max-w-[1700px] w-full mx-auto lg:hidden flex border border-slate-800 bg-slate-900/60 backdrop-blur-md rounded-xl p-1 mb-4 shrink-0 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => onChange('arena')}
        aria-label={t('activeTabGame')}
        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          activeTab === 'arena' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
        }`}
      >
        {t('activeTabGame')}
      </button>
      <button
        type="button"
        onClick={() => onChange('chat')}
        aria-label={`${t('activeTabChat')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          activeTab === 'chat' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
        }`}
      >
        <span>{t('activeTabChat')}</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full font-extrabold shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
