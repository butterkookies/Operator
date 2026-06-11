import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen } from './components/auth/AuthScreen';
import { Dashboard } from './components/dashboard/Dashboard';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

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

    return () => subscription.unsubscribe();
  }, []);

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
    return <AuthScreen />;
  }

  return <Dashboard session={session} />;
}
