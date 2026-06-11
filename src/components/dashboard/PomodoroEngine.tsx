import { useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export function PomodoroEngine({ isZenMode }: { isZenMode: boolean }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={`bg-[#fcfbf9] border border-gray-300 rounded-lg shadow-sm flex flex-col items-center justify-center transition-all duration-300 ${isZenMode ? 'h-64' : 'h-48'}`}>
      <div className="text-gray-500 text-sm font-medium mb-2 tracking-widest uppercase">Focus Flow</div>
      <div className={`font-mono text-gray-800 transition-all duration-300 ${isZenMode ? 'text-7xl' : 'text-5xl'}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="flex gap-4 mt-6">
        <button 
          onClick={() => setIsRunning(!isRunning)}
          className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors shadow-md"
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
        <button 
          onClick={() => setTimeLeft(25 * 60)}
          className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors shadow-sm"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}
