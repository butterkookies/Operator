import { createContext, useContext, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseChat, type Message, type ChatSession } from '../hooks/useSupabaseChat';

type ChatContextType = {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessions: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  createSession: (title: string) => Promise<string | null>;
  deleteSession: (id: string) => Promise<void>;
  saveMessage: (sessionId: string, message: Message) => Promise<void>;
  isSessionsLoaded: boolean;
  isHistoryLoaded: boolean;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ session, children }: { session: Session; children: ReactNode }) {
  const chat = useSupabaseChat(session);

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
