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
    <div className="max-w-7xl w-full mx-auto lg:hidden flex border border-slate-800 bg-slate-900/60 backdrop-blur-md rounded-xl p-1 mb-4 shrink-0">
      <button
        onClick={() => onChange('arena')}
        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
          activeTab === 'arena' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
        }`}
      >
        {t('activeTabGame')}
      </button>
      <button
        onClick={() => onChange('chat')}
        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
          activeTab === 'chat' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
        }`}
      >
        <span>{t('activeTabChat')}</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full font-extrabold animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
