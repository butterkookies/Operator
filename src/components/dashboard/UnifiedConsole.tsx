import { useState } from 'react';
import { Mic, Terminal, Send } from 'lucide-react';

export function UnifiedConsole() {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-[#1a1b26] border border-gray-700 rounded-lg shadow-inner overflow-hidden text-gray-300 font-mono">
      <div className="px-4 py-2 border-b border-gray-700 bg-[#16161e] flex justify-between items-center text-xs">
        <span className="flex items-center gap-2">
          <Terminal size={14} className="text-green-400" />
          operator_ai_core
        </span>
        <span className="text-gray-500">v2.0.0</span>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="text-green-400">&gt; Operator online. How can I assist?</div>
        <div className="opacity-50 text-sm">Try saying: "Schedule 2 hours of Bio study tonight" or "Explain derivatives".</div>
      </div>

      <div className="p-3 bg-[#16161e] border-t border-gray-700 flex items-center gap-2">
        <button className="p-2 rounded-full hover:bg-gray-700 text-gray-400 transition-colors">
          <Mic size={18} />
        </button>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Command or ask a question..." 
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600 text-sm"
        />
        <button className="p-2 rounded hover:bg-gray-700 text-green-400 transition-colors">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
