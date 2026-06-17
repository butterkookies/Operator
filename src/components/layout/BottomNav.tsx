
import { Home, Calendar, CheckSquare, BrainCircuit } from 'lucide-react';

export function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-neutral-950 border-t border-neutral-600 flex items-center justify-around px-4 z-50">
      <NavItem icon={<Home size={24} />} label="Home" active />
      <NavItem icon={<Calendar size={24} />} label="Plan" />
      <NavItem icon={<BrainCircuit size={24} />} label="AI" />
      <NavItem icon={<CheckSquare size={24} />} label="Tasks" />
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${active ? 'text-blue-600' : 'text-neutral-500'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
