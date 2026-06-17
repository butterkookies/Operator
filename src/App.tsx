import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { AuthScreen } from './components/auth/AuthScreen';
import { ResponsiveNav, type Page } from './components/layout/ResponsiveNav';
import { OperatorChat } from './components/chat/OperatorChat';
import { ZenDashboard } from './components/dashboard/ZenDashboard';
import { ThoughtInbox } from './components/inbox/ThoughtInbox';
import { PomodoroEngine } from './components/dashboard/PomodoroEngine';
import { SettingsModal } from './components/layout/SettingsModal';
import { ChatProvider } from './contexts/ChatContext';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarTokenExpired, setIsCalendarTokenExpired] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
      if (session?.provider_refresh_token) {
        await supabase.from('user_integrations').upsert({
          user_id: session.user.id,
          google_refresh_token: session.provider_refresh_token,
          updated_at: new Date().toISOString()
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.provider_refresh_token) {
        await supabase.from('user_integrations').upsert({
          user_id: session.user.id,
          google_refresh_token: session.provider_refresh_token,
          updated_at: new Date().toISOString()
        });
      }
    });

    const handleTokenExpired = () => setIsCalendarTokenExpired(true);
    window.addEventListener('google-token-expired', handleTokenExpired);

    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSession(prev => prev ? { ...prev, provider_token: customEvent.detail.access_token } : null);
      setIsCalendarTokenExpired(false);
    };
    window.addEventListener('google-token-refreshed', handleTokenRefreshed);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('google-token-expired', handleTokenExpired);
      window.removeEventListener('google-token-refreshed', handleTokenRefreshed);
    };
  }, []);

  const handleReconnectCalendar = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file',
        redirectTo: window.location.href,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-neutral-900 font-sans"></div>;
  }

  if (!session) {
    if (window.location.pathname === '/test-pomodoro') {
      return (
        <div className="min-h-screen bg-neutral-900 p-6">
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
    <ChatProvider session={session}>
      <div className="flex flex-col-reverse md:flex-row h-screen overflow-hidden bg-neutral-900 font-sans relative">
        <ResponsiveNav 
          currentPage={currentPage} 
          onNavigate={setCurrentPage} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
        />
        
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {isCalendarTokenExpired && (
            <div className="bg-yellow-500 text-white px-4 py-3 m-4 md:m-6 rounded-xl mb-4 shadow-md flex items-center justify-between shrink-0">
              <span className="font-bold text-sm">Your Google Calendar connection has expired. Please reconnect to continue using AI scheduling.</span>
              <button 
                onClick={handleReconnectCalendar}
                className="bg-neutral-900 text-yellow-600 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-50 transition-colors"
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
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        session={session} 
      />
      </div>
    </ChatProvider>
  );
}
