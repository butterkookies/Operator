import { useState, useEffect } from 'react';
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
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
          setActiveSessionId(data[0].id);
        }
      } catch (e) {
        console.error("Failed to fetch sessions", e);
      }
    };

    fetchSessions();

    return () => {
      abortController.abort();
    };
  }, [session.user.id]);

  useEffect(() => {
    const abortController = new AbortController();

    if (!activeSessionId) {
      setMessages([{ id: '1', role: 'assistant', content: "Hello. I am Operator. What's on your mind today? I can log tasks, add to your calendar, or just listen to your thoughts." }]);
      return;
    }

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
          setMessages([{ id: '1', role: 'assistant', content: "Hello. I am Operator. What's on your mind today? I can log tasks, add to your calendar, or just listen to your thoughts." }]);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load chat history:", e);
        }
      }
    };
    
    fetchChatHistory();

    return () => {
      abortController.abort();
    };
  }, [activeSessionId]);

  const createSession = async (title: string): Promise<string | null> => {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: session.user.id, title }])
      .select()
      .single();
    
    if (newSession) {
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
        setMessages([{ id: '1', role: 'assistant', content: "Hello. I am Operator. What's on your mind today?" }]);
      }
    }
    await supabase.from('chat_sessions').delete().eq('id', id);
  };

  const saveMessage = async (sessionId: string, message: Message) => {
    await supabase.from('chat_history').insert([{
      session_id: sessionId,
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
    saveMessage
  };
}
