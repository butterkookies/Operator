import { useState } from 'react';
import { MessageSquare, LayoutDashboard, Inbox, PanelLeftClose, User } from 'lucide-react';

export type Page = 'chat' | 'zen' | 'inbox';

type ResponsiveNavProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenSettings: () => void;
};

export function ResponsiveNav({ currentPage, onNavigate, onOpenSettings }: ResponsiveNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`flex md:flex-col ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full bg-[#f3f2ee] md:border-r border-t md:border-t-0 border-gray-300 p-2 md:p-4 shrink-0 transition-all duration-300 z-50`}>
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
          {!isCollapsed && <h1 className="text-xl font-bold tracking-widest text-gray-800 whitespace-nowrap">OPERATOR</h1>}
        </div>
        {!isCollapsed && (
          <button onClick={() => setIsCollapsed(true)} className="text-gray-400 hover:text-gray-700 ml-2 shrink-0">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-row md:flex-col justify-around md:justify-start gap-1">
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
      </nav>

      <div className="hidden md:block mt-auto pt-4 border-t border-gray-300">
        <NavItem icon={<User size={20} />} label="Settings" isCollapsed={isCollapsed} onClick={onOpenSettings} />
      </div>
      
      {/* Mobile Settings Icon */}
      <div className="md:hidden flex items-center justify-center px-2 border-l border-gray-300 ml-1">
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
          ? 'bg-indigo-100 text-indigo-700 font-bold shadow-sm'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 font-medium'}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className={`whitespace-nowrap ${isCollapsed ? 'hidden' : 'hidden md:block ml-3'}`}>{label}</span>
      {active && !isCollapsed && <div className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
    </button>
  );
}
