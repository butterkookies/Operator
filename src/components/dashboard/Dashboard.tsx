import { useState, useEffect } from 'react';
import { Moon, Play, RotateCcw, FileText, Pause, User, Settings, Check, Trash2, X, LogOut, Calendar, Filter, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { TodayView, WeekView, MonthView, YearView } from './CalendarViews';

type Task = {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
};

type GoogleEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  calendarColor?: string;
};

type GoogleCalendar = {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
};

export function Dashboard({ session }: { session: Session }) {
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'vault'>('tasks');
  const [centerTab, setCenterTab] = useState<'focus' | 'calendar'>('calendar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Pomodoro State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Console state
  const [consoleLogs, setConsoleLogs] = useState([
    { text: `operator_ai_core v2.0.0 initialized. User: ${session.user.email}`, color: 'text-blue-400' },
    { text: '> Connection to Supabase Auth established.', color: 'text-purple-400' },
    { text: '> Ready for natural language processing...', color: 'text-green-400' }
  ]);
  const [inputValue, setInputValue] = useState('');

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<GoogleEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarListError, setCalendarListError] = useState<string | null>(null);
  const [calendarTimeframe, setCalendarTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('week');
  
  // Multi-Calendar state
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('operator_selected_calendars');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('operator_selected_calendars', JSON.stringify(Array.from(selectedCalendarIds)));
  }, [selectedCalendarIds]);

  // Pomodoro countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (session.provider_token) {
      fetchAvailableCalendars();
    }
  }, [session.provider_token]);

  useEffect(() => {
    if (session.provider_token && selectedCalendarIds.size > 0) {
      fetchCalendarEvents();
    } else if (selectedCalendarIds.size === 0) {
      setCalendarEvents([]);
    }
  }, [calendarTimeframe, session.provider_token, selectedCalendarIds]);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setTasks(data || []);
    setIsLoadingTasks(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = { user_id: session.user.id, title: newTaskTitle.trim(), is_completed: false };
    const tempId = crypto.randomUUID();
    setTasks(prev => [{ ...newTask, id: tempId, created_at: new Date().toISOString() }, ...prev]);
    setNewTaskTitle('');
    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if (!error && data) setTasks(prev => prev.map(t => t.id === tempId ? data : t));
  };

  const toggleTask = async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const fetchAvailableCalendars = async () => {
    if (!session.provider_token) return;
    try {
      setCalendarListError(null);
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      const data = await response.json();
      if (response.ok && data.items) {
        setAvailableCalendars(data.items);
        // Only set primary as default if we don't have any saved preferences
        if (selectedCalendarIds.size === 0 && !localStorage.getItem('operator_selected_calendars')) {
          const primary = data.items.find((c: any) => c.primary);
          if (primary) setSelectedCalendarIds(new Set([primary.id]));
        }
      } else {
        setCalendarListError(data.error?.message || 'Failed to fetch calendar list.');
      }
    } catch (error: any) {
      setCalendarListError(error.message);
    }
  };

  const fetchCalendarEvents = async () => {
    if (!session.provider_token || selectedCalendarIds.size === 0) return;
    setIsCalendarLoading(true);
    setCalendarError(null);
    
    const now = new Date();
    let timeMax = new Date();
    
    if (calendarTimeframe === 'today') timeMax.setHours(23, 59, 59, 999);
    else if (calendarTimeframe === 'week') timeMax.setDate(now.getDate() + 7);
    else if (calendarTimeframe === 'month') timeMax.setMonth(now.getMonth() + 1);
    else if (calendarTimeframe === 'year') timeMax.setFullYear(now.getFullYear() + 1);

    try {
      const fetchPromises = Array.from(selectedCalendarIds).map(async (calendarId) => {
        const calData = availableCalendars.find(c => c.id === calendarId);
        const calColor = calData?.backgroundColor || '#4f46e5';

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=2500`,
          { headers: { Authorization: `Bearer ${session.provider_token}` } }
        );
        const data = await response.json();
        if (response.ok && data.items) {
          // Inject native calendar color into events
          return data.items.map((event: any) => ({ ...event, calendarColor: calColor }));
        } else {
          if (selectedCalendarIds.size === 1) setCalendarError(data.error?.message || 'Failed to fetch calendar data.');
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allEvents = results.flat();
      
      allEvents.sort((a, b) => {
        const timeA = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const timeB = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return timeA - timeB;
      });

      setCalendarEvents(allEvents);
    } catch (error: any) {
      setCalendarError(error.message);
    }
    setIsCalendarLoading(false);
  };

  const toggleZenMode = () => {
    setIsZenMode(!isZenMode);
    document.body.classList.toggle('zen-mode');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setTimeLeft(25 * 60); };

  const handleConsoleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      setConsoleLogs(prev => [...prev, { text: `> User: ${inputValue}`, color: 'text-white' }]);
      setInputValue('');
      setTimeout(() => {
        setConsoleLogs(prev => [...prev, { text: '> AI: Command disabled in current phase.', color: 'text-yellow-400' }]);
      }, 400);
    }
  };

  const hasGoogleAccess = !!session.provider_token;

  return (
    <div className={`min-h-screen p-5 transition-colors duration-500 font-sans relative ${isZenMode ? 'bg-[#1a1b26]' : 'bg-[#e6e4df]'}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className={`text-2xl font-bold m-0 ${isZenMode ? 'text-white' : 'text-gray-800'}`}>Academics</h1>
          <p className="text-gray-500 text-sm m-0">Operator Command Center</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleZenMode} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-sm transition-all duration-300 ${isZenMode ? 'bg-gray-800 text-green-400 border border-gray-700' : 'bg-white text-gray-800 border border-gray-300'}`}>
            <Moon size={16} /> {isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-full transition-colors ${isZenMode ? 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700' : 'bg-white text-gray-500 hover:text-indigo-600 border border-gray-300 shadow-sm'}`} title="Account Settings">
            <User size={18} />
          </button>
        </div>
      </div>

      {/* NEW LAYOUT GRID */}
      <div className="grid gap-5 min-h-[85vh] transition-all duration-500" 
           style={{ gridTemplateColumns: isZenMode ? '0fr 1fr 0fr' : '1fr 2.5fr 1fr' }}>
        
        {/* LEFT PANEL: Pomodoro & Vocabulary */}
        <div className={`flex flex-col gap-5 transition-all duration-500 ${isZenMode ? 'opacity-0 h-0 overflow-hidden' : ''}`}>
          
          {/* POMODORO WIDGET */}
          <div className={`relative overflow-hidden border rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center transition-all duration-500 ${isRunning ? 'bg-indigo-950 border-indigo-500 shadow-indigo-900/50' : 'bg-white border-gray-200'}`}>
            
            {/* Glowing background effect when running */}
            {isRunning && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-70 animate-pulse"></div>
            )}

            <div className={`text-[10px] font-black tracking-[0.2em] mb-3 z-10 transition-colors ${isRunning ? 'text-indigo-300' : 'text-gray-400'}`}>
              {isRunning ? 'DEEP WORK' : 'FOCUS FLOW'}
            </div>
            
            <div className={`font-mono font-black text-6xl tracking-tighter mb-6 z-10 transition-colors ${isRunning ? 'text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'text-gray-800'}`}>
              {formatTime(timeLeft)}
            </div>
            
            <div className="flex gap-4 z-10">
              <button onClick={toggleTimer} 
                      className={`rounded-full w-14 h-14 flex items-center justify-center font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md ${isRunning ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/50' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
              <button onClick={resetTimer} 
                      className={`rounded-full w-14 h-14 flex items-center justify-center font-bold transition-all transform hover:scale-105 active:scale-95 shadow-sm ${isRunning ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}>
                <RotateCcw size={22} />
              </button>
            </div>
            
            {/* Progress Bar indicator */}
            <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-1000 ease-linear" style={{ width: `${((25 * 60 - timeLeft) / (25 * 60)) * 100}%` }}></div>
          </div>

          {/* VOCABULARY WIDGET */}
          <div className="bg-[#fcfbf9] border border-gray-300 rounded-xl p-5 shadow-sm flex flex-col flex-grow">
            <div className="flex items-center gap-2 text-indigo-600 mb-4">
              <BookOpen size={16} />
              <h2 className="text-sm font-bold m-0 uppercase tracking-wide text-gray-700">Vocabulary Expansion</h2>
            </div>
            
            <div className="flex-grow flex flex-col justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 mb-1">Ephemeral</p>
                <p className="text-xs text-indigo-500 font-mono mb-4">/əˈfem(ə)rəl/</p>
                <p className="text-sm text-gray-600 italic leading-relaxed">
                  "Lasting for a very short time."
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <button className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">Generate New Word →</button>
            </div>
          </div>
        </div>

        {/* CENTER STAGE: Tabs (Focus vs Calendar) */}
        <div className="bg-[#fcfbf9] border border-gray-300 rounded-xl p-5 shadow-sm flex flex-col">
          
          <div className="flex gap-4 mb-4 border-b border-gray-300 pb-2 shrink-0">
            <button 
              onClick={() => setCenterTab('focus')}
              className={`font-bold text-base pb-2 border-b-2 transition-colors ${centerTab === 'focus' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
            >
              Focus Console
            </button>
            <button 
              onClick={() => setCenterTab('calendar')}
              className={`font-bold text-base pb-2 border-b-2 transition-colors ${centerTab === 'calendar' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
            >
              Master Calendar
            </button>
          </div>

          {/* CONSOLE VIEW */}
          {centerTab === 'focus' && (
            <div className="bg-[#1a1b26] rounded-xl p-5 flex-grow font-mono flex flex-col shadow-inner">
              <div className="flex-grow overflow-y-auto mb-3 space-y-1 text-sm">
                {consoleLogs.map((log, i) => <div key={i} className={log.color}>{log.text}</div>)}
              </div>
              <div className="flex border-t border-gray-700 pt-3 items-center shrink-0">
                <span className="text-green-400 mr-2">{'>'}</span>
                <input 
                  type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleConsoleInput}
                  placeholder="Type command here..." 
                  className="flex-grow bg-transparent border-none text-green-400 font-mono outline-none text-base"
                />
              </div>
            </div>
          )}

          {/* CALENDAR VIEW */}
          {centerTab === 'calendar' && (
            <div className="flex flex-col flex-grow h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0 relative">
                <h2 className="text-xl font-black text-gray-800 m-0">
                  {calendarTimeframe === 'today' ? 'Today' : 
                   calendarTimeframe === 'week' ? 'This Week' : 
                   calendarTimeframe === 'month' ? 'This Month' : '12 Months'}
                </h2>
                
                {hasGoogleAccess && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 outline-none text-gray-600 font-bold hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Filter size={12} /> Calendars
                    </button>
                    <div className="bg-gray-100 p-1 rounded-md flex gap-1">
                      <button onClick={() => setCalendarTimeframe('today')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${calendarTimeframe === 'today' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Today</button>
                      <button onClick={() => setCalendarTimeframe('week')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${calendarTimeframe === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Week</button>
                      <button onClick={() => setCalendarTimeframe('month')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${calendarTimeframe === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Month</button>
                      <button onClick={() => setCalendarTimeframe('year')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${calendarTimeframe === 'year' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Year</button>
                    </div>

                    {/* Filter Popover */}
                    {isFilterOpen && (
                      <div className="absolute top-10 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-50 max-h-[60vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider m-0">Visible Calendars</p>
                          <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={14} /></button>
                        </div>
                        <div className="space-y-2 mt-3">
                          {calendarListError && <p className="text-xs text-red-500 mb-2 leading-tight">{calendarListError}</p>}
                          {availableCalendars.length === 0 && !calendarListError && <p className="text-xs text-gray-400">Loading...</p>}
                          {availableCalendars.map(cal => (
                            <label key={cal.id} className="flex items-center gap-2 cursor-pointer group p-1.5 hover:bg-gray-50 rounded">
                              <input 
                                type="checkbox" className="accent-indigo-600 shrink-0"
                                checked={selectedCalendarIds.has(cal.id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedCalendarIds);
                                  if (e.target.checked) newSet.add(cal.id); else newSet.delete(cal.id);
                                  setSelectedCalendarIds(newSet);
                                }}
                              />
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cal.backgroundColor || '#4f46e5' }}></div>
                              <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors truncate">
                                {cal.summary}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CALENDAR CONTENT AREA */}
              <div className="flex-grow overflow-hidden relative">
                {!hasGoogleAccess ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-60 text-center px-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Calendar size={32} className="mb-3 text-gray-400" />
                    <p className="text-sm font-bold text-gray-600">Google Calendar Disabled</p>
                    <p className="text-xs text-gray-400 mt-1">Log out and sign back in with Google to enable.</p>
                  </div>
                ) : selectedCalendarIds.size === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-50 text-center px-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Filter size={32} className="mb-3 text-gray-400" />
                    <p className="text-sm font-bold text-gray-500">No calendars selected.</p>
                    <p className="text-xs text-gray-400 mt-1">Click Calendars above to select.</p>
                  </div>
                ) : isCalendarLoading ? (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                ) : calendarError && calendarEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-80 text-center px-4 text-red-500 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-bold mb-2">Google API Error</p>
                    <p className="text-xs break-words w-full max-w-md">{calendarError}</p>
                  </div>
                ) : calendarTimeframe === 'today' ? (
                  <TodayView events={calendarEvents} />
                ) : calendarTimeframe === 'week' ? (
                  <WeekView events={calendarEvents} />
                ) : calendarTimeframe === 'month' ? (
                  <MonthView events={calendarEvents} />
                ) : (
                  <YearView events={calendarEvents} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className={`bg-[#fcfbf9] border border-gray-300 rounded-xl p-5 shadow-sm flex flex-col overflow-hidden transition-all duration-500 ${isZenMode ? 'opacity-0 p-0 border-none' : ''}`}>
          <div className="flex gap-4 mb-4 border-b border-gray-300 pb-2 shrink-0">
            <button onClick={() => setActiveTab('tasks')} className={`font-bold text-sm pb-1 border-b-2 transition-colors ${activeTab === 'tasks' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>Master Tasks</button>
            <button onClick={() => setActiveTab('vault')} className={`font-bold text-sm pb-1 border-b-2 transition-colors ${activeTab === 'vault' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>Note Vault</button>
          </div>

          {activeTab === 'tasks' && (
            <div className="flex flex-col flex-grow h-full overflow-hidden">
              <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                {isLoadingTasks ? <p className="text-sm text-gray-400 text-center mt-4 animate-pulse">Loading...</p> : 
                 tasks.length === 0 ? <p className="text-sm text-gray-400 text-center mt-4">No tasks found.</p> : 
                 tasks.map(task => (
                  <div key={task.id} className="group bg-white border border-gray-200 rounded-md p-2 flex gap-3 items-center shadow-sm text-sm transition-all hover:border-gray-300">
                    <button onClick={() => toggleTask(task)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${task.is_completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white hover:border-indigo-400'}`}>
                      {task.is_completed && <Check size={14} />}
                    </button>
                    <span className={`flex-1 transition-all ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</span>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 shrink-0"><Trash2 size={14} /></button>
                  </div>
                 ))}
              </div>
              <form onSubmit={addTask} className="flex gap-2 mt-4 pt-3 border-t border-gray-100 shrink-0">
                <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Add new task..." className="flex-1 p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-indigo-500 min-w-0" />
                <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md font-bold text-sm hover:bg-gray-900 transition-colors shrink-0">Add</button>
              </form>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="flex flex-col flex-grow">
              <p className="text-xs text-gray-500 mt-0 mb-4">Drag & drop images of handwritten notes or PDFs to extract text.</p>
              <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center text-gray-500 bg-white cursor-pointer hover:bg-indigo-50 transition-colors">
                <FileText className="mx-auto mb-2 text-indigo-400" size={32} />
                <div className="font-bold text-gray-700 text-sm">Upload PDF or Image</div>
              </div>
              <div className="mt-6 flex-grow flex flex-col items-center justify-center opacity-50">
                <p className="text-sm font-bold text-gray-400 text-center">Your vault is empty.<br/>Upload a note to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACCOUNT SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
          <div className="bg-[#fcfbf9] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 transform transition-all">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800 m-0">Account Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner">
                  {(session.user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Logged in as</p>
                  <p className="font-bold text-gray-800 text-lg">{session.user.email || 'Unknown User'}</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className={`flex items-center justify-between p-3 bg-white border ${hasGoogleAccess ? 'border-green-300 bg-green-50' : 'border-gray-200 opacity-60'} rounded-xl transition-colors`}>
                  <div>
                    <p className={`font-bold text-sm ${hasGoogleAccess ? 'text-green-800' : 'text-gray-700'}`}>Google Calendar Sync</p>
                    <p className={`text-xs ${hasGoogleAccess ? 'text-green-600' : 'text-gray-500'}`}>{hasGoogleAccess ? 'Active and syncing dynamically.' : 'Log in via Google to enable.'}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${hasGoogleAccess ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${hasGoogleAccess ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl opacity-60 cursor-not-allowed">
                  <div>
                    <p className="font-bold text-sm text-gray-700">Drive Note Sync</p>
                    <p className="text-xs text-gray-500">Backup uploaded notes to Google Drive</p>
                  </div>
                  <div className="w-10 h-5 bg-gray-300 rounded-full relative"><div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"></div></div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button onClick={handleLogout} className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg transition-colors flex items-center gap-2">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
