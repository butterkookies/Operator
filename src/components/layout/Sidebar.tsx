import { useState } from 'react';
import { Home, Calendar, CheckSquare, BookOpen, Settings, PanelLeftClose } from 'lucide-react';

type Page = 'dashboard' | 'vault';

type SidebarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

      <nav className="flex-1 flex flex-row md:flex-col justify-around md:justify-start gap-1">
        <NavItem
          icon={<Home size={20} />}
          label="Dashboard"
          active={currentPage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          isCollapsed={isCollapsed}
        />
        <NavItem icon={<Calendar size={20} />} label="Schedule" isCollapsed={isCollapsed} />
        <NavItem icon={<CheckSquare size={20} />} label="Tasks" isCollapsed={isCollapsed} />
        <NavItem
          icon={<BookOpen size={20} />}
          label="Note Vault"
          active={currentPage === 'vault'}
          onClick={() => onNavigate('vault')}
          isCollapsed={isCollapsed}
        />
      </nav>

      <div className="hidden md:block mt-auto pt-4 border-t border-neutral-600">
        <NavItem icon={<Settings size={20} />} label="Settings" isCollapsed={isCollapsed} />
      </div>
      
      {/* Mobile Settings Icon */}
      <div className="md:hidden flex items-center justify-center px-2 border-l border-neutral-600 ml-1">
         <NavItem icon={<Settings size={20} />} label="Settings" isCollapsed={true} />
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
