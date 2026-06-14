import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Menu, Plus, MessageSquare, Trash } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseChat } from '../../hooks/useSupabaseChat';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';
import { useGeminiAI } from '../../hooks/useGeminiAI';

export function OperatorChat({ session }: { session: Session }) {
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    saveMessage
  } = useSupabaseChat(session);

  const {
    availableCalendars,
    calendarEvents: todayEvents
  } = useGoogleCalendar(session, 'today');

  const {
    handleSubmit: handleAIRequest,
    isProcessing,
    loadingStatus,
    activeKeyEmail,
    pendingForm,
    formResolverRef
  } = useGeminiAI({
    session,
    messages,
    setMessages,
    activeSessionId,
    createSession,
    saveMessage,
    availableCalendars,
    todayEvents: todayEvents // The hook returns calendarEvents, wait, let me check what I named it.
  });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const msg = input;
      setInput('');
      await handleAIRequest(msg);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(sessionId);
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative">
      <div className={`absolute md:static inset-y-0 left-0 z-20 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <button onClick={startNewChat} className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors bg-neutral-900 hover:bg-neutral-800 px-3 py-2 rounded-lg w-full">
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {sessions.map(s => (
            <div key={s.id} onClick={() => { setActiveSessionId(s.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`group flex items-center justify-between w-full p-3 rounded-lg cursor-pointer transition-all ${activeSessionId === s.id ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                <span className="text-sm truncate">{s.title || 'New Conversation'}</span>
              </div>
              <button onClick={(e) => handleDeleteSession(s.id, e)} className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Chat">
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 relative">
        <div className="h-14 border-b border-neutral-800 flex items-center px-4 justify-between bg-neutral-900/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg">
              <Menu size={18} />
            </button>
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-neutral-900">
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

          {isProcessing && !pendingForm && (
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

        <div className="p-4 bg-neutral-900 border-t border-neutral-800 z-10 shrink-0">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isProcessing || pendingForm !== null} placeholder={pendingForm ? "Please answer the prompt above..." : isProcessing ? "Operator is thinking..." : "Message Operator..."} className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-neutral-600" />
            <button type="submit" disabled={!input.trim() || isProcessing || pendingForm !== null} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Send size={18} className={isProcessing && !pendingForm ? "opacity-0" : "opacity-100"} />
            </button>
          </form>
        </div>
      </div>

      {isSidebarOpen && window.innerWidth < 768 && (
        <div className="absolute inset-0 bg-black/50 z-10" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}
