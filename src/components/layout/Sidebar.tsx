
import { Home, Calendar, CheckSquare, BrainCircuit, Settings } from 'lucide-react';

export function Sidebar() {
  return (
    <div className="hidden md:flex flex-col w-64 h-full bg-[#f3f2ee] border-r border-gray-300 p-4">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white font-bold">O</div>
        <h1 className="text-xl font-bold tracking-widest text-gray-800">OPERATOR</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <NavItem icon={<Home size={20} />} label="Dashboard" active />
        <NavItem icon={<BrainCircuit size={20} />} label="Academics" />
        <NavItem icon={<Calendar size={20} />} label="Schedule" />
        <NavItem icon={<CheckSquare size={20} />} label="Tasks" />
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-300">
        <NavItem icon={<Settings size={20} />} label="Settings" />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
