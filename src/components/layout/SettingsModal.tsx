import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { X, Key, Eye, EyeOff, LogOut, Trash2, Info } from 'lucide-react';

const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
      <svg className="transform -rotate-90 w-10 h-10">
        <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-neutral-800" />
        <circle cx="20" cy="20" r={radius} stroke={color} strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-500 ease-out" />
      </svg>
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
}

export function SettingsModal({ isOpen, onClose, session }: SettingsModalProps) {
  const [geminiKeys, setGeminiKeys] = useState<{email: string, key: string, tier?: 'free' | 'paid'}[]>([]);
  const [newKeyEmail, setNewKeyEmail] = useState('');
  const [newKeyToken, setNewKeyToken] = useState('');
  const [newKeyTier, setNewKeyTier] = useState<'free' | 'paid'>('free');
  const [showGeminiKeyMap, setShowGeminiKeyMap] = useState<Record<number, boolean>>({});
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  
  const [dailyRequests, setDailyRequests] = useState(0);
  const [minuteRequests, setMinuteRequests] = useState(0);
  const [nextDailyReset, setNextDailyReset] = useState('24 hours');
  const [nextMinuteReset, setNextMinuteReset] = useState('60 seconds');

  const calculateUsage = () => {
    let logs: number[] = (window as any).__geminiLogs || [];
    if (!Array.isArray(logs)) logs = [];
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;
    
    logs = logs.filter(t => t > oneDayAgo);
    
    const dailyCount = logs.length;
    const minuteCount = logs.filter(t => t > oneMinuteAgo).length;
    
    setDailyRequests(dailyCount);
    setMinuteRequests(minuteCount);
    
    if (dailyCount > 0) {
      const oldestDaily = Math.min(...logs);
      const resetTimeDaily = oldestDaily + 24 * 60 * 60 * 1000;
      const diffDaily = resetTimeDaily - now;
      if (diffDaily > 0) {
        const hours = Math.floor(diffDaily / (1000 * 60 * 60));
        const mins = Math.floor((diffDaily % (1000 * 60 * 60)) / (1000 * 60));
        setNextDailyReset(`${hours > 0 ? hours + ' hours, ' : ''}${mins} minutes`);
      } else {
        setNextDailyReset('now');
      }
    } else {
      setNextDailyReset('24 hours');
    }
    
    const minuteLogs = logs.filter(t => t > oneMinuteAgo);
    if (minuteLogs.length > 0) {
      const oldestMinute = Math.min(...minuteLogs);
      const resetTimeMinute = oldestMinute + 60 * 1000;
      const diffMinute = Math.ceil((resetTimeMinute - now) / 1000);
      setNextMinuteReset(`${diffMinute > 0 ? diffMinute : 0} seconds`);
    } else {
      setNextMinuteReset('60 seconds');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGeminiKey();
      calculateUsage();
      const interval = setInterval(calculateUsage, 1000);
      window.addEventListener('gemini_usage_updated', calculateUsage);
      return () => {
        clearInterval(interval);
        window.removeEventListener('gemini_usage_updated', calculateUsage);
      };
    }
  }, [isOpen]);

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
          setGeminiKeys([{ email: 'Legacy Key', key: data.gemini_api_key, tier: 'free' }]);
        }
      } catch (e) {
        setGeminiKeys([{ email: 'Legacy Key', key: data.gemini_api_key, tier: 'free' }]);
      }
    }
  };

  const saveGeminiKeys = async (keysToSave: {email: string, key: string, tier?: 'free' | 'paid'}[]) => {
    setIsSavingGeminiKey(true);
    await supabase.from('user_settings').upsert(
      { user_id: session.user.id, gemini_api_key: JSON.stringify(keysToSave), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    setGeminiKeys(keysToSave);
    setGeminiKeySaved(true);
    setTimeout(() => setGeminiKeySaved(false), 2500);
    setIsSavingGeminiKey(false);
    window.dispatchEvent(new CustomEvent('gemini_keys_updated', { detail: { hasKeys: keysToSave.length > 0 } }));
  };

  const addGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyEmail.trim() || !newKeyToken.trim()) return;
    const newKeys = [...geminiKeys, { email: newKeyEmail.trim(), key: newKeyToken.trim(), tier: newKeyTier }];
    setNewKeyEmail('');
    setNewKeyToken('');
    setNewKeyTier('free');
    await saveGeminiKeys(newKeys);
  };

  const removeGeminiKey = async (idx: number) => {
    const newKeys = geminiKeys.filter((_, i) => i !== idx);
    await saveGeminiKeys(newKeys);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity p-4 md:p-0">
      <div className="bg-neutral-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-neutral-700 flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-neutral-700 flex justify-between items-center bg-neutral-900 shrink-0">
          <h2 className="text-xl font-bold text-neutral-200 m-0">Account Settings</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 transition-colors" title="Close settings"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner">
              {(session.user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">Logged in as</p>
              <p className="font-bold text-neutral-200 text-lg">{session.user.email || 'Unknown User'}</p>
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-neutral-700">
            <div className="p-3 bg-neutral-900 border border-neutral-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-neutral-300 flex items-center gap-1.5">
                    <Key size={13} className="text-purple-500" /> Gemini API Keys
                  </p>
                  <p className="text-[11px] text-neutral-400">Add multiple keys. Operator will auto-rotate to avoid quota limits.</p>
                </div>
                {geminiKeySaved && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ Saved</span>
                )}
              </div>

              {geminiKeys.length > 0 && (
                <div className="space-y-2">
                  {geminiKeys.map((k, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-neutral-700 bg-neutral-800">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-200">{k.email}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${k.tier === 'paid' ? 'bg-amber-500/20 text-amber-500' : 'bg-neutral-600 text-neutral-300'}`}>
                            {k.tier === 'paid' ? 'PAID' : 'FREE'}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {showGeminiKeyMap[idx] ? k.key : '•'.repeat(Math.min(20, k.key.length))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          title={showGeminiKeyMap[idx] ? "Hide key" : "Show key"}
                          onClick={() => setShowGeminiKeyMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                          {showGeminiKeyMap[idx] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          title="Remove key"
                          onClick={() => removeGeminiKey(idx)}
                          className="text-neutral-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={addGeminiKey} className="space-y-2 pt-2 border-t border-neutral-800">
                <input
                  type="text"
                  value={newKeyEmail}
                  onChange={e => setNewKeyEmail(e.target.value)}
                  placeholder="Google Account Email"
                  className="w-full text-xs border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-purple-400 bg-neutral-800"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyToken}
                    onChange={e => setNewKeyToken(e.target.value)}
                    placeholder="API Key (AIza...)"
                    className="flex-1 text-xs border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-purple-400 font-mono bg-neutral-800"
                  />
                  <select
                    value={newKeyTier}
                    onChange={e => setNewKeyTier(e.target.value as 'free' | 'paid')}
                    className="w-24 text-xs border border-neutral-700 rounded-lg px-2 py-2 outline-none focus:border-purple-400 bg-neutral-800 text-neutral-200"
                  >
                    <option value="free">Free Tier</option>
                    <option value="paid">Paid Tier</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!newKeyEmail.trim() || !newKeyToken.trim() || isSavingGeminiKey}
                    className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
              </form>
              <p className="text-[10px] text-neutral-500 leading-tight">
                Get free keys at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">aistudio.google.com</a>.
                Keys are stored securely in your database.
              </p>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-xl space-y-5">
              <div className="flex items-center gap-1.5 text-neutral-200 font-bold text-sm">
                Gemini Models <Info size={14} className="text-neutral-500" />
              </div>

              {geminiKeys.length > 0 && geminiKeys[0].tier === 'paid' ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex flex-col items-center justify-center text-center">
                  <p className="text-amber-500 font-bold mb-1">Paid Tier Active</p>
                  <p className="text-xs text-amber-500/70">Limits are disabled. You are running at maximum capacity.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-200 mb-1">Daily Limit</p>
                      <p className="text-xs text-neutral-500">
                        You have used {dailyRequests} of your 1500 daily requests, it will partially refresh in {nextDailyReset}.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-neutral-300">{Math.min(100, Math.round((dailyRequests / 1500) * 100))}%</span>
                      <CircularProgress percentage={Math.min(100, Math.round((dailyRequests / 1500) * 100))} color="#4ade80" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-200 mb-1">Minute Limit</p>
                      <p className="text-xs text-neutral-500">
                        You have used {minuteRequests} of your 15 per-minute requests, it will partially refresh in {nextMinuteReset}.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-neutral-300">{Math.min(100, Math.round((minuteRequests / 15) * 100))}%</span>
                      <CircularProgress percentage={Math.min(100, Math.round((minuteRequests / 15) * 100))} color="#4ade80" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 bg-neutral-800 border-t border-neutral-700 flex justify-end shrink-0">
          <button onClick={handleLogout} className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg transition-colors flex items-center gap-2">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
