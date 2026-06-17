import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
};

export function useSupabaseChat(session: Session) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionIdState, setActiveSessionIdState] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('operator_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.mode === 'session' ? parsed.id : null;
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  });
  const [isSessionsLoaded, setIsSessionsLoaded] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const justCreatedSessionId = useRef<string | null>(null);

  const activeSessionId = activeSessionIdState;
  const setActiveSessionId = (id: string | null) => {
    setActiveSessionIdState(id);
    const stateToSave = id ? { mode: 'session', id } : { mode: 'new' };
    localStorage.setItem('operator_chat_state', JSON.stringify(stateToSave));
  };
  
  // Use AbortController instead of isMounted
  useEffect(() => {
    const abortController = new AbortController();

    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (abortController.signal.aborted) return;

        if (!error && data && data.length > 0) {
          setSessions(data);
          const savedStr = localStorage.getItem('operator_chat_state');
          if (savedStr) {
            try {
              const saved = JSON.parse(savedStr);
              if (saved.mode === 'new') {
                setActiveSessionIdState(null);
              } else if (saved.mode === 'session' && data.some(s => s.id === saved.id)) {
                setActiveSessionIdState(saved.id);
              } else {
                setActiveSessionId(data[0].id);
              }
            } catch (e) {
              setActiveSessionId(data[0].id);
            }
          } else {
            // Fresh login fallback
            setActiveSessionId(data[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch sessions", e);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSessionsLoaded(true);
        }
      }
    };

    fetchSessions();

    return () => {
      abortController.abort();
    };
  }, [session.user.id]);

  useEffect(() => {
    const abortController = new AbortController();

    if (!isSessionsLoaded) return;

    if (!activeSessionId) {
      setMessages([]);
      setIsHistoryLoaded(true);
      return;
    }
    
    if (justCreatedSessionId.current === activeSessionId) {
      justCreatedSessionId.current = null;
      setIsHistoryLoaded(true);
      return;
    }
    
    // Clear messages while fetching to prevent flickering of old chat/default messages
    setMessages([]);
    setIsHistoryLoaded(false);

    const fetchChatHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('session_id', activeSessionId)
          .order('created_at', { ascending: true })
          .limit(50);
          
        if (abortController.signal.aborted) return;
        if (error) throw error;
        
        if (data && data.length > 0) {
          const loadedMsgs = data.map(d => ({
            id: d.id,
            role: d.role as 'user' | 'assistant',
            content: d.message
          }));
          setMessages(loadedMsgs);
        } else {
          setMessages([]);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load chat history:", e);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsHistoryLoaded(true);
        }
      }
    };
    
    fetchChatHistory();

    return () => {
      abortController.abort();
    };
  }, [activeSessionId, isSessionsLoaded]);

  const createSession = async (title: string): Promise<string | null> => {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: session.user.id, title }])
      .select()
      .single();
    
    if (newSession) {
      justCreatedSessionId.current = newSession.id;
      setActiveSessionId(newSession.id);
      setSessions(prev => [newSession, ...prev]);
      return newSession.id;
    }
    return null;
  };

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) {
        setMessages([]);
      }
    }
    await supabase.from('chat_sessions').delete().eq('id', id);
  };

  const saveMessage = async (sessionId: string, message: Message) => {
    await supabase.from('chat_history').insert([{
      session_id: sessionId,
      user_id: session.user.id,
      role: message.role,
      message: message.content
    }]);
  };

  return {
    messages,
    setMessages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    saveMessage,
    isSessionsLoaded,
    isHistoryLoaded
  };
}
