import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Account created successfully! You are now logging in...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file',
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center font-sans p-5 transition-all duration-500">
      <div className="bg-neutral-950 border border-neutral-600 rounded-2xl p-10 max-w-md w-full shadow-lg flex flex-col items-center">
        
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <div className="w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        <h1 className="text-3xl font-bold text-neutral-200 mb-2 m-0">Operator</h1>
        <p className="text-neutral-500 mb-8 text-sm text-center">
          {isSignUp ? 'Create a new secure workspace.' : 'A highly focused academic operating system.'}
        </p>

        {errorMsg && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="w-full bg-green-50 border border-green-200 text-green-600 text-sm p-3 rounded-lg mb-4 text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-600 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              placeholder="you@university.edu"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-600 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></div>
            ) : isSignUp ? (
              <UserPlus size={18} />
            ) : (
              <LogIn size={18} />
            )}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-6 opacity-60">
          <div className="flex-1 h-px bg-gray-400"></div>
          <span className="text-xs font-bold text-neutral-500 uppercase">Or</span>
          <div className="flex-1 h-px bg-gray-400"></div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-neutral-900 border-2 border-neutral-700 hover:border-neutral-600 text-neutral-300 font-bold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 opacity-70" />
          Continue with Google
        </button>

        <p className="mt-8 text-sm text-neutral-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }} 
            className="text-indigo-400 font-bold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

      </div>
    </div>
  );
}
