import { useState } from 'react';
import { MessageSquare, LayoutDashboard, Inbox, PanelLeftClose, User, Plus, Trash } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';

export type Page = 'chat' | 'zen' | 'inbox';

type ResponsiveNavProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenSettings: () => void;
};

export function ResponsiveNav({ currentPage, onNavigate, onOpenSettings }: ResponsiveNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { sessions, activeSessionId, setActiveSessionId, deleteSession } = useChat();

  const handleNewChat = () => {
    onNavigate('chat');
    setActiveSessionId(null);
  };

  const handleSelectSession = (id: string) => {
    onNavigate('chat');
    setActiveSessionId(id);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id);
  };

  return (
    <div className={`flex md:flex-col ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full bg-neutral-950 md:border-r border-t md:border-t-0 border-neutral-600 p-2 md:p-4 shrink-0 transition-all duration-300 z-50`}>
      {/* Desktop Header */}
      <div className={`hidden md:flex items-center mb-8 px-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div 
            className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white font-bold shrink-0 cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Toggle Sidebar"
          >
            O
          </div>
          {!isCollapsed && <h1 className="text-xl font-bold tracking-widest text-neutral-200 whitespace-nowrap">OPERATOR</h1>}
        </div>
        {!isCollapsed && (
          <button onClick={() => setIsCollapsed(true)} className="text-neutral-500 hover:text-neutral-300 ml-2 shrink-0">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <button onClick={handleNewChat} className="hidden md:flex w-full mb-6 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-xl py-3 px-4 items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm">
          <Plus size={16} /> New Chat
        </button>
      )}

      <div className="flex flex-row md:flex-col justify-around md:justify-start gap-1 shrink-0">
        <NavItem
          icon={<MessageSquare size={20} />}
          label="Chat"
          active={currentPage === 'chat'}
          onClick={() => onNavigate('chat')}
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Zen Dashboard" 
          active={currentPage === 'zen'}
          onClick={() => onNavigate('zen')}
          isCollapsed={isCollapsed} 
        />
        <NavItem 
          icon={<Inbox size={20} />} 
          label="Inbox" 
          active={currentPage === 'inbox'}
          onClick={() => onNavigate('inbox')}
          isCollapsed={isCollapsed} 
        />
      </div>

      {/* Chat History List (Scrollable Flexible Area) */}
      {!isCollapsed && (
        <div className="hidden md:flex flex-1 flex-col overflow-hidden mt-4 pt-4 border-t border-neutral-800">
          <div className="px-3 py-1 text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-2 shrink-0">Recent Chats</div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5 -mx-2 px-2">
            {sessions.map(s => (
              <div key={s.id} onClick={() => handleSelectSession(s.id)} className={`group w-full text-left px-3 py-2 rounded-lg text-sm truncate flex items-center justify-between transition-all cursor-pointer ${activeSessionId === s.id && currentPage === 'chat' ? 'bg-indigo-500/10 text-indigo-300 font-medium' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare size={12} className="shrink-0" />
                  <span className="truncate">{s.title || 'New Conversation'}</span>
                </div>
                <button onClick={(e) => handleDeleteSession(s.id, e)} className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Delete Chat">
                  <Trash size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hidden md:block mt-auto pt-4 border-t border-neutral-600">
        <NavItem icon={<User size={20} />} label="Settings" isCollapsed={isCollapsed} onClick={onOpenSettings} />
      </div>
      
      {/* Mobile Settings Icon */}
      <div className="md:hidden flex items-center justify-center px-2 border-l border-neutral-600 ml-1">
         <NavItem icon={<User size={20} />} label="Settings" isCollapsed={true} onClick={onOpenSettings} />
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
  isCollapsed
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  isCollapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`group relative flex items-center md:w-full px-3 py-3 md:py-2 rounded-lg transition-all text-sm
        ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start'}
        ${active
          ? 'bg-indigo-100 text-indigo-400 font-bold shadow-sm'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-white font-medium'}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className={`whitespace-nowrap ${isCollapsed ? 'hidden' : 'hidden md:block ml-3'}`}>{label}</span>
      {active && !isCollapsed && <div className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
    </button>
  );
}
