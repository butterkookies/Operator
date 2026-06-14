import { useState, useEffect } from 'react';
import { Moon, User, Check, Trash2, X, LogOut, Calendar, Filter, Key, Eye, EyeOff, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { TodayView, WeekView, MonthView, YearView } from './CalendarViews';
import { PomodoroEngine } from './PomodoroEngine';
import { getDriveSettings, saveDriveSettings, type DriveSettings } from '../../lib/googleDrive';
import { useSupabaseTasks } from '../../hooks/useSupabaseTasks';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';

export function Dashboard({ session }: { session: Session }) {
  const [isZenMode, setIsZenMode] = useState(false);
  const [centerTab, setCenterTab] = useState<'focus' | 'calendar'>('calendar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [driveSettings, setDriveSettings] = useState<DriveSettings>({ drive_folder_id: null, drive_sync_enabled: false });
  const [isDriveToggling, setIsDriveToggling] = useState(false);
  const [geminiKeys, setGeminiKeys] = useState<{email: string, key: string}[]>([]);
  const [newKeyEmail, setNewKeyEmail] = useState('');
  const [newKeyToken, setNewKeyToken] = useState('');
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const [showGeminiKeyMap, setShowGeminiKeyMap] = useState<Record<number, boolean>>({});
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);

  // Console state
  const [consoleLogs, setConsoleLogs] = useState([
    { text: `operator_ai_core v2.0.0 initialized. User: ${session.user.email}`, color: 'text-blue-400' },
    { text: '> Connection to Supabase Auth established.', color: 'text-purple-400' },
    { text: '> Ready for natural language processing...', color: 'text-green-400' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [calendarTimeframe, setCalendarTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const {
    tasks,
    isLoadingTasks,
    addTask,
    handleSessionComplete,
    toggleTask,
    deleteTask
  } = useSupabaseTasks(session);

  const {
    calendarEvents,
    isCalendarLoading,
    calendarError,
    calendarListError,
    availableCalendars,
    selectedCalendarIds,
    setSelectedCalendarIds
  } = useGoogleCalendar(session, calendarTimeframe);

  useEffect(() => {
    if (isZenMode) {
      document.body.classList.add('zen-mode');
    } else {
      document.body.classList.remove('zen-mode');
    }
  }, [isZenMode]);

  const handleFormAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTask(newTaskTitle);
    setNewTaskTitle('');
  };

  const toggleZenMode = () => {
    setIsZenMode(!isZenMode);
  };

  const handleConsoleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      setConsoleLogs(prev => [...prev, { text: `> User: ${inputValue}`, color: 'text-white' }]);
      setInputValue('');
      setTimeout(() => {
        setConsoleLogs(prev => [...prev, { text: '> AI: Command disabled in current phase.', color: 'text-yellow-400' }]);
      }, 400);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const loadDriveSettings = async () => {
    if (!session.provider_token) return;
    try {
      const s = await getDriveSettings(session.user.id);
      setDriveSettings(s);
    } catch { /* non-fatal */ }
  };

  const loadGeminiKey = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (data?.gemini_api_key) {
      try {
        const parsed = JSON.parse(data.gemini_api_key);
        if (Array.isArray(parsed)) {
          setGeminiKeys(parsed);
        } else {
          setGeminiKeys([{ email: 'Legacy Key', key: data.gemini_api_key }]);
        }
      } catch (e) {
        setGeminiKeys([{ email: 'Legacy Key', key: data.gemini_api_key }]);
      }
    }
  };

  const saveGeminiKeys = async (keysToSave: {email: string, key: string}[]) => {
    setIsSavingGeminiKey(true);
    await supabase.from('user_settings').upsert(
      { user_id: session.user.id, gemini_api_key: JSON.stringify(keysToSave), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    setGeminiKeys(keysToSave);
    setGeminiKeySaved(true);
    setTimeout(() => setGeminiKeySaved(false), 2500);
    setIsSavingGeminiKey(false);
  };

  const addGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyEmail.trim() || !newKeyToken.trim()) return;
    const newKeys = [...geminiKeys, { email: newKeyEmail.trim(), key: newKeyToken.trim() }];
    setNewKeyEmail('');
    setNewKeyToken('');
    await saveGeminiKeys(newKeys);
  };

  const removeGeminiKey = async (idx: number) => {
    const newKeys = geminiKeys.filter((_, i) => i !== idx);
    await saveGeminiKeys(newKeys);
  };

  const handleDriveToggle = async () => {
    if (isDriveToggling) return;
    setIsDriveToggling(true);
    try {
      if (driveSettings.drive_sync_enabled) {
        // Disable — keep folder ID in case they re-enable
        await saveDriveSettings(session.user.id, { drive_sync_enabled: false });
        setDriveSettings(prev => ({ ...prev, drive_sync_enabled: false }));
      }
      // Enabling is handled by NoteVault approval flow — just close modal so user can save a note
      else {
        setIsSettingsOpen(false);
      }
    } catch { /* non-fatal */ }
    setIsDriveToggling(false);
  };

  useEffect(() => {
    if (isSettingsOpen) { loadDriveSettings(); loadGeminiKey(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]);

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
          
          <PomodoroEngine 
            isZenMode={isZenMode} 
            tasks={tasks}
            activeTaskId={activeTaskId}
            onActiveTaskChange={setActiveTaskId}
            onSessionComplete={() => handleSessionComplete(activeTaskId)}
          />

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
              Operator Focus
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
                                {cal.summaryOverride || cal.summary}
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

        {/* RIGHT PANEL — Tasks only */}
        <div className={`bg-[#fcfbf9] border border-gray-300 rounded-xl p-5 shadow-sm flex flex-col overflow-hidden transition-all duration-500 ${isZenMode ? 'opacity-0 p-0 border-none' : ''}`}>
          <p className="font-black text-sm text-gray-700 mb-4 border-b border-gray-200 pb-2 shrink-0">Master Tasks</p>
          <div className="flex flex-col flex-grow h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
              {isLoadingTasks ? <p className="text-sm text-gray-400 text-center mt-4 animate-pulse">Loading...</p> :
               tasks.length === 0 ? <p className="text-sm text-gray-400 text-center mt-4">No tasks found.</p> :
               tasks.map(task => (
                <div key={task.id}
                     className={`group bg-white border rounded-md p-2 flex gap-3 items-center shadow-sm text-sm transition-all hover:border-gray-300 ${activeTaskId === task.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}
                     onClick={() => { if (!task.is_completed) { setActiveTaskId(activeTaskId === task.id ? null : task.id); } }}
                     style={{ cursor: task.is_completed ? 'default' : 'pointer' }}
                >
                  <button onClick={(e) => { e.stopPropagation(); toggleTask(task, activeTaskId, setActiveTaskId); }} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${task.is_completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white hover:border-indigo-400'}`}>
                    {task.is_completed && <Check size={14} />}
                  </button>
                  <span className={`flex-1 transition-all ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</span>
                  <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                    Sessions: {task.sessions_count || 0}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 shrink-0"><Trash2 size={14} /></button>
                </div>
               ))}
            </div>
            <form onSubmit={handleFormAddTask} className="flex gap-2 mt-4 pt-3 border-t border-gray-100 shrink-0">
              <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Add new task..." className="flex-1 p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-indigo-500 min-w-0" />
              <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md font-bold text-sm hover:bg-gray-900 transition-colors shrink-0">Add</button>
            </form>
          </div>
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
                {/* Google Calendar */}
                <div className={`flex items-center justify-between p-3 bg-white border ${hasGoogleAccess ? 'border-green-300 bg-green-50' : 'border-gray-200 opacity-60'} rounded-xl transition-colors`}>
                  <div>
                    <p className={`font-bold text-sm ${hasGoogleAccess ? 'text-green-800' : 'text-gray-700'}`}>Google Calendar Sync</p>
                    <p className={`text-xs ${hasGoogleAccess ? 'text-green-600' : 'text-gray-500'}`}>{hasGoogleAccess ? 'Active and syncing dynamically.' : 'Log in via Google to enable.'}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${hasGoogleAccess ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${hasGoogleAccess ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>

                {/* Drive Sync */}
                <div
                  onClick={hasGoogleAccess ? handleDriveToggle : undefined}
                  className={`flex items-center justify-between p-3 bg-white border rounded-xl transition-colors
                    ${!hasGoogleAccess ? 'opacity-60 cursor-not-allowed border-gray-200' :
                      driveSettings.drive_sync_enabled ? 'border-green-300 bg-green-50 cursor-pointer hover:bg-green-100' :
                      'border-gray-200 cursor-pointer hover:bg-gray-50'}`}
                >
                  <div>
                    <p className={`font-bold text-sm ${driveSettings.drive_sync_enabled ? 'text-green-800' : 'text-gray-700'}`}>Drive Note Sync</p>
                    <p className={`text-xs ${driveSettings.drive_sync_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {!hasGoogleAccess ? 'Log in via Google to enable.' :
                        driveSettings.drive_sync_enabled ? 'Active — files sync to "Operator — Notes" folder.' :
                        'Enable via Note Vault on first upload.'}
                    </p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${driveSettings.drive_sync_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${driveSettings.drive_sync_enabled ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Gemini API Key */}
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-700 flex items-center gap-1.5">
                        <Key size={13} className="text-purple-500" /> Gemini API Keys
                      </p>
                      <p className="text-[11px] text-gray-500">Add multiple keys. Operator will auto-rotate to avoid quota limits.</p>
                    </div>
                    {geminiKeySaved && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ Saved</span>
                    )}
                  </div>

                  {geminiKeys.length > 0 && (
                    <div className="space-y-2">
                      {geminiKeys.map((k, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-bold text-gray-700 truncate">{k.email}</p>
                            <p className="font-mono text-gray-400 truncate">
                              {showGeminiKeyMap[idx] ? k.key : k.key.substring(0, 10) + '...'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowGeminiKeyMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              {showGeminiKeyMap[idx] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => removeGeminiKey(idx)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={addGeminiKey} className="space-y-2 pt-2 border-t border-gray-100">
                    <input
                      type="text"
                      value={newKeyEmail}
                      onChange={e => setNewKeyEmail(e.target.value)}
                      placeholder="Google Account Email"
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 bg-gray-50"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyToken}
                        onChange={e => setNewKeyToken(e.target.value)}
                        placeholder="API Key (AIza...)"
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 font-mono bg-gray-50"
                      />
                      <button
                        type="submit"
                        disabled={!newKeyEmail.trim() || !newKeyToken.trim() || isSavingGeminiKey}
                        className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Get free keys at{' '}
                    <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">aistudio.google.com</a>.
                    Keys are stored securely in your database.
                  </p>
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
