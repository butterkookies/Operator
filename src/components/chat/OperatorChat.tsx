import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Calendar, Lightbulb, CheckSquare, Clock, Key } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useChat } from '../../contexts/ChatContext';
import { useGeminiAI } from '../../hooks/useGeminiAI';

export function OperatorChat({ session }: { session: Session }) {
  const [input, setInput] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasConfiguredKey, setHasConfiguredKey] = useState<boolean | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef1 = useRef<HTMLTextAreaElement>(null);
  const textareaRef2 = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    const fetchKeyStatus = async () => {
      const { data } = await supabase.from('user_settings').select('gemini_api_key').eq('user_id', session.user.id).maybeSingle();
      if (!mounted) return;
      if (data?.gemini_api_key) {
        try {
          const parsed = JSON.parse(data.gemini_api_key);
          setHasConfiguredKey(Array.isArray(parsed) ? parsed.length > 0 : true);
        } catch {
          setHasConfiguredKey(true);
        }
      } else {
        setHasConfiguredKey(false);
      }
    };
    fetchKeyStatus();

    const handleKeysUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      setHasConfiguredKey(customEvent.detail.hasKeys);
    };
    window.addEventListener('gemini_keys_updated', handleKeysUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('gemini_keys_updated', handleKeysUpdated);
    };
  }, [session.user.id]);

  useEffect(() => {
    [textareaRef1, textareaRef2].forEach(ref => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${Math.min(ref.current.scrollHeight, 192)}px`; // max-h-48 is 192px
      }
    });
  }, [input]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isProcessing && pendingForm === null) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const {
    messages,
    setMessages,
    activeSessionId,
    createSession,
    saveMessage,
    isHistoryLoaded,
    isSessionsLoaded
  } = useChat();

  const {
    handleSubmit: handleAIRequest,
    isProcessing,
    loadingStatus,
    activeKeyEmail,
    pendingForm,
    formResolverRef,
    systemError,
    retryFailedRequest
  } = useGeminiAI({
    session,
    messages,
    setMessages,
    activeSessionId,
    createSession,
    saveMessage
  });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingForm, systemError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const msg = input;
      setInput('');
      await handleAIRequest(msg);
    }
  };

  const isNewSession = isHistoryLoaded && isSessionsLoaded && messages.length === 0;

  return (
    <div className="flex h-full w-full bg-neutral-900 overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 relative">
        {!isNewSession && (
          <div className="h-14 border-b border-neutral-800 flex items-center px-4 justify-between bg-neutral-900/50 backdrop-blur-sm z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Operator AI</h3>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                    {activeKeyEmail && <span className="text-neutral-600 truncate max-w-[120px] ml-1">({activeKeyEmail})</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isOffline && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center z-20 shrink-0">
            <p className="text-xs font-bold text-red-400">You are currently offline. Please check your internet connection.</p>
          </div>
        )}

        {isNewSession ? (
          hasConfiguredKey === false ? (
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-8 relative custom-scrollbar bg-neutral-900 animate-smooth-pop">
              <div className="w-full max-w-2xl flex flex-col items-center bg-neutral-800/50 border border-neutral-700/50 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Key size={32} className="text-indigo-400" />
                </div>
                <h1 className="text-3xl font-serif text-white mb-4">Welcome to Operator</h1>
                <p className="text-neutral-400 mb-8 max-w-md">
                  To get started with your AI assistant, you need to connect a Gemini API key. It's free and takes less than a minute.
                </p>
                
                <div className="flex flex-col w-full gap-4 text-left">
                  <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-200 mb-1">Get your free API Key</h4>
                      <p className="text-xs text-neutral-500 mb-2">Visit Google AI Studio to generate your personal key.</p>
                      <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                        Open Google AI Studio &rarr;
                      </a>
                    </div>
                  </div>
                  
                  <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-200 mb-1">Add it to your Settings</h4>
                      <p className="text-xs text-neutral-500">Click the Settings icon in the sidebar and paste your new key.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-8 relative custom-scrollbar bg-neutral-900 animate-smooth-pop">
              <div className="w-full max-w-4xl lg:max-w-5xl lg:px-8 flex flex-col items-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#e8dcc7] mb-12 flex flex-col items-center gap-4 text-center tracking-tight">
                  <Sparkles className="text-[#d97757] w-10 h-10 md:w-12 md:h-12" />
                  Your Operator, at your service
                </h1>
              
              <form onSubmit={handleSubmit} className="relative w-full mb-8">
                <textarea 
                  ref={textareaRef1}
                  rows={1}
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  disabled={isProcessing} 
                  placeholder="How can I help you today?" 
                  className="w-full max-h-48 bg-neutral-800/80 border border-neutral-700 text-white rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all placeholder:text-neutral-500 shadow-2xl shadow-black/20 text-lg resize-none custom-scrollbar" 
                />
                <button type="submit" disabled={!input.trim() || isProcessing} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md">
                  <Send size={20} className={isProcessing ? "opacity-0" : "opacity-100"} />
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => setInput("Schedule a meeting for tomorrow")} className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600 rounded-full text-sm text-neutral-300 transition-all shadow-sm">
                  <Calendar size={14} className="text-blue-400" /> Schedule meeting
                </button>
                <button onClick={() => setInput("Save a thought: ")} className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600 rounded-full text-sm text-neutral-300 transition-all shadow-sm">
                  <Lightbulb size={14} className="text-yellow-400" /> Save a thought
                </button>
                <button onClick={() => setInput("Check my calendar for today")} className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600 rounded-full text-sm text-neutral-300 transition-all shadow-sm">
                  <Clock size={14} className="text-green-400" /> Check my day
                </button>
                <button onClick={() => setInput("Remind me to ")} className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600 rounded-full text-sm text-neutral-300 transition-all shadow-sm">
                  <CheckSquare size={14} className="text-purple-400" /> Add a task
                </button>
              </div>
            </div>
          </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-neutral-900 animate-smooth-pop">
            <div className="max-w-4xl lg:max-w-5xl lg:px-8 mx-auto w-full space-y-6">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-800 border border-neutral-700 text-neutral-200'}`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-1">
                  <User size={16} className="text-neutral-400" />
                </div>
              )}
            </div>
          ))}

          {pendingForm && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 bg-neutral-800 border border-indigo-500/30 text-neutral-200 shadow-lg shadow-indigo-900/10">
                <p className="text-sm font-medium mb-3 text-indigo-300">{pendingForm.question}</p>
                {pendingForm.inputType === 'timeRange' ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const date = formData.get('date');
                    const start = formData.get('startTime');
                    const end = formData.get('endTime');
                    if (date && start && end && formResolverRef.current) {
                      formResolverRef.current({ start: `${date}T${start}:00`, end: `${date}T${end}:00` });
                    }
                  }} className="flex flex-col gap-3">
                    <input type="date" name="date" required className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    <div className="flex gap-2">
                      <input type="time" name="startTime" required className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                      <input type="time" name="endTime" required className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">Submit Time</button>
                  </form>
                ) : pendingForm.isMultiSelect ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const selected = pendingForm.options.filter(opt => formData.get(opt) === 'on');
                    if (selected.length > 0 && formResolverRef.current) formResolverRef.current(selected);
                  }} className="flex flex-col gap-2">
                    {pendingForm.options.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-700/50 cursor-pointer transition-colors">
                        <input type="checkbox" name={opt} className="w-4 h-4 rounded border-neutral-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-neutral-800 bg-neutral-900" />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                    <button type="submit" className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">Submit Selection</button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pendingForm.options.map(opt => (
                      <button key={opt} onClick={() => { if (formResolverRef.current) formResolverRef.current(opt); }} className="text-left px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-sm transition-all">
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {systemError && !pendingForm && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-red-400" />
              </div>
              <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 bg-red-500/10 border border-red-500/20 text-neutral-200 shadow-lg">
                <p className="text-sm font-medium mb-3 text-red-200">{systemError}</p>
                <button 
                  onClick={() => retryFailedRequest()}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg px-4 py-2 text-sm font-bold transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {isProcessing && !pendingForm && !systemError && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                {loadingStatus && <span className="text-xs text-neutral-400 font-medium">{loadingStatus}</span>}
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
            </div>
          </div>
        )}

        {!isNewSession && (
          <div className="p-4 lg:px-8 bg-neutral-900 z-10 shrink-0">
            <form onSubmit={handleSubmit} className="relative max-w-4xl lg:max-w-5xl w-full mx-auto flex items-center">
              <textarea 
                ref={textareaRef2}
                rows={1}
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown}
                disabled={isProcessing || pendingForm !== null} 
                placeholder={pendingForm ? "Please answer the prompt above..." : isProcessing ? "Operator is thinking..." : "Message Operator..."} 
                className="w-full max-h-48 bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-neutral-600 resize-none custom-scrollbar min-h-[52px]" 
              />
              <button type="submit" disabled={!input.trim() || isProcessing || pendingForm !== null} className="absolute right-2 bottom-[9px] p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Send size={18} className={isProcessing && !pendingForm ? "opacity-0" : "opacity-100"} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
