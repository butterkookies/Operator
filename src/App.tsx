import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { X, Key, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ResponsiveNav, type Page } from './components/layout/ResponsiveNav';
import { OperatorChat } from './components/chat/OperatorChat';
import { ZenDashboard } from './components/dashboard/ZenDashboard';
import { ThoughtInbox } from './components/inbox/ThoughtInbox';
import { PomodoroEngine } from './components/dashboard/PomodoroEngine';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiKeys, setGeminiKeys] = useState<{email: string, key: string}[]>([]);
  const [newKeyEmail, setNewKeyEmail] = useState('');
  const [newKeyToken, setNewKeyToken] = useState('');
  const [showGeminiKeyMap, setShowGeminiKeyMap] = useState<Record<number, boolean>>({});
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const [isCalendarTokenExpired, setIsCalendarTokenExpired] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleTokenExpired = () => setIsCalendarTokenExpired(true);
    window.addEventListener('google-token-expired', handleTokenExpired);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('google-token-expired', handleTokenExpired);
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen && session) {
      loadGeminiKey();
    }
  }, [isSettingsOpen, session]);

  const loadGeminiKey = async () => {
    if (!session) return;
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
    if (!session) return;
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

  const handleReconnectCalendar = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file',
        redirectTo: window.location.href
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#e6e4df] flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-inner">
          <div className="w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    if (window.location.pathname === '/test-pomodoro') {
      return (
        <div className="min-h-screen bg-[#e6e4df] p-6">
          <PomodoroEngine 
            isZenMode={false} 
            tasks={[]} 
            activeTaskId={null} 
            onActiveTaskChange={() => {}} 
            onSessionComplete={() => {}} 
          />
        </div>
      );
    }
    return <AuthScreen />;
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen overflow-hidden bg-[#e6e4df] font-sans relative">
      <ResponsiveNav 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
      />
      
      <main className="flex-1 overflow-hidden p-2 md:p-6 flex flex-col">
        {isCalendarTokenExpired && (
          <div className="bg-yellow-500 text-white px-4 py-3 rounded-xl mb-4 shadow-md flex items-center justify-between shrink-0">
            <span className="font-bold text-sm">Your Google Calendar connection has expired. Please reconnect to continue using AI scheduling.</span>
            <button 
              onClick={handleReconnectCalendar}
              className="bg-white text-yellow-600 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-50 transition-colors"
            >
              Reconnect
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 ${currentPage === 'chat' ? 'flex flex-col' : 'hidden'}`}>
            <OperatorChat session={session} />
          </div>
          <div className={`absolute inset-0 ${currentPage === 'zen' ? 'flex flex-col' : 'hidden'}`}>
            <ZenDashboard session={session} />
          </div>
          <div className={`absolute inset-0 ${currentPage === 'inbox' ? 'flex flex-col' : 'hidden'}`}>
            <ThoughtInbox session={session} />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
          <div className="bg-[#fcfbf9] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
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
                    Get free keys at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">aistudio.google.com</a>.
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
