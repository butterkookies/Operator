import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

type TaskOption = {
  id: string;
  title: string;
  sessions_count: number;
};

type PomodoroEngineProps = {
  isZenMode: boolean;
  tasks: TaskOption[];
  activeTaskId: string | null;
  onActiveTaskChange: (id: string | null) => void;
  onSessionComplete: () => void;
};

const DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

// Soft chime generated via Web Audio API — no external CDN needed
function playChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  } catch {
    // AudioContext may be unavailable (e.g., in test environments)
  }
}

function sendBrowserNotification(mode: TimerMode) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  const messages: Record<TimerMode, { title: string; body: string }> = {
    focus: { title: '☕ Break Time!', body: 'Great work! Take a moment to recharge.' },
    shortBreak: { title: '🎯 Back to Work!', body: 'Short break over. Let\'s get it done.' },
    longBreak: { title: '🚀 Long Break Over!', body: 'Refreshed? Time for another focus session.' },
  };
  const { title, body } = messages[mode];
  new Notification(title, { body, icon: '/favicon.ico' });
}

export function PomodoroEngine({
  isZenMode,
  tasks,
  activeTaskId,
  onActiveTaskChange,
  onSessionComplete,
}: PomodoroEngineProps) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request notification permission on first mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCycleEnd = useCallback((completedMode: TimerMode, currentFocusCount: number) => {
    playChime();
    sendBrowserNotification(completedMode);

    if (completedMode === 'focus') {
      onSessionComplete();
      const newCount = currentFocusCount + 1;
      setFocusCount(newCount);
      if (newCount % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(DURATIONS.longBreak);
      } else {
        setMode('shortBreak');
        setTimeLeft(DURATIONS.shortBreak);
      }
    } else {
      setMode('focus');
      setTimeLeft(DURATIONS.focus);
    }
  }, [onSessionComplete]);

  // Countdown logic using a ref to avoid stale closure issues
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isRunning && endTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((endTimeRef.current! - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          endTimeRef.current = null;
          // Use functional update so we capture the latest focusCount without a stale closure
          setFocusCount(prev => {
            handleCycleEnd(mode, prev);
            return prev;
          });
        }
      }, 500);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (!isRunning) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
    } else {
      endTimeRef.current = null;
      setIsRunning(false);
    }
  };

  const resetTimer = () => {
    endTimeRef.current = null;
    setIsRunning(false);
    setTimeLeft(DURATIONS[mode]);
  };

  const switchMode = (newMode: TimerMode) => {
    endTimeRef.current = null;
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(DURATIONS[newMode]);
  };

  const progressPercentage = ((DURATIONS[mode] - timeLeft) / DURATIONS[mode]) * 100;
  const isDeepWork = isRunning && mode === 'focus';

  const activeTask = tasks.find(t => t.id === activeTaskId) || null;
  const incompleteTasks = tasks.filter(t => !(t as any).is_completed);

  const displayTitle = () => {
    if (mode !== 'focus') return MODE_LABELS[mode].toUpperCase();
    return activeTask ? activeTask.title : 'DEEP WORK';
  };

  return (
    <div
      className={`relative overflow-hidden border rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center transition-all duration-500
        ${isDeepWork ? 'bg-indigo-950 border-indigo-500 shadow-indigo-900/50' : 'bg-white border-gray-200'}
        ${isZenMode ? 'scale-105' : ''}`}
    >
      {/* Glow */}
      {isDeepWork && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-70 animate-pulse" />
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4 z-10">
        {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors
              ${mode === m
                ? 'bg-indigo-500 text-white'
                : isDeepWork
                  ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Task Selector — only shown in focus mode */}
      {mode === 'focus' && (
        <div className="relative z-20 mb-3 w-full">
          <button
            onClick={() => setIsTaskDropdownOpen(o => !o)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
              ${isDeepWork
                ? 'bg-indigo-900/60 text-indigo-200 hover:bg-indigo-800 border border-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
          >
            <span className="truncate">{activeTask ? `📌 ${activeTask.title}` : 'Select task...'}</span>
            <ChevronDown size={12} className={`shrink-0 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTaskDropdownOpen && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              <button
                onClick={() => { onActiveTaskChange(null); setIsTaskDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                None
              </button>
              {incompleteTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No tasks yet.</p>
              )}
              {incompleteTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => { onActiveTaskChange(task.id); setIsTaskDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2
                    ${activeTaskId === task.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="truncate">{task.title}</span>
                  {task.sessions_count > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                      {task.sessions_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Label */}
      <div className={`text-[10px] font-black tracking-[0.2em] mb-3 z-10 transition-colors uppercase truncate max-w-full px-2 text-center
        ${isDeepWork ? 'text-indigo-300' : 'text-gray-400'}`}>
        {displayTitle()}
      </div>

      {/* Timer */}
      <div className={`font-mono font-black text-6xl tracking-tighter mb-2 z-10 transition-colors
        ${isDeepWork ? 'text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'text-gray-800'}`}>
        {formatTime(timeLeft)}
      </div>

      {/* Focus session dots */}
      <div className="flex gap-1.5 mb-6 z-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors
              ${i < (focusCount % 4)
                ? 'bg-indigo-500'
                : isDeepWork ? 'bg-indigo-800' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-4 z-10">
        <button
          onClick={toggleTimer}
          className={`rounded-full w-14 h-14 flex items-center justify-center font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md
            ${isDeepWork
              ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/50'
              : 'bg-gray-900 text-white hover:bg-gray-800'}`}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button
          onClick={resetTimer}
          className={`rounded-full w-14 h-14 flex items-center justify-center font-bold transition-all transform hover:scale-105 active:scale-95 shadow-sm
            ${isDeepWork
              ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
        >
          <RotateCcw size={22} />
        </button>
      </div>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-1000 ease-linear"
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
}
