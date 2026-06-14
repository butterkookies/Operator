import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Inbox, Sparkles, Trash2, Clock } from 'lucide-react';

type Thought = {
  id: string;
  content: string;
  created_at: string;
};

export function ThoughtInbox({ session }: { session: Session }) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchThoughts();
  }, []);

  const fetchThoughts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setThoughts(data);
    }
    setIsLoading(false);
  };

  const deleteThought = async (id: string) => {
    setThoughts(prev => prev.filter(t => t.id !== id));
    await supabase.from('thoughts').delete().eq('id', id);
  };

  const handleReviewThought = (thought: Thought) => {
    // In Phase 3, this will pop up an AI modal to expand on the thought.
    // For now, it just alerts.
    alert(`Reviewing: ${thought.content}\n\n(AI Expansion coming soon)`);
  };

  return (
    <div className="flex flex-col h-full bg-white md:rounded-2xl md:border border-gray-200 md:shadow-sm overflow-hidden p-4 md:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4 shrink-0">
        <Inbox className="text-indigo-600" size={24} />
        <div>
          <h2 className="text-xl font-black text-gray-800 m-0">Thought Inbox</h2>
          <p className="text-xs text-gray-500 mt-1">Capture vague ideas now, let AI help you review them later.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex flex-col gap-2 p-4 border border-gray-100 rounded-xl bg-gray-50">
                <div className="w-1/3 h-3 bg-gray-200 rounded"></div>
                <div className="w-full h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : thoughts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Sparkles size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-bold">Your inbox is empty.</p>
            <p className="text-xs mt-2 text-center max-w-xs">
              Tell the Operator AI a random thought, and it will save it here for you to review later.
            </p>
          </div>
        ) : (
          thoughts.map(thought => (
            <div key={thought.id} className="group relative bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Clock size={12} />
                  {new Date(thought.created_at).toLocaleDateString()} at {new Date(thought.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button 
                  onClick={() => deleteThought(thought.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Thought"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed font-medium">
                {thought.content}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={() => handleReviewThought(thought)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles size={14} /> Review with AI
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
