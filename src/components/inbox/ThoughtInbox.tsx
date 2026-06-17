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
    <div className="flex flex-col h-full bg-neutral-900 md:rounded-2xl md:border border-neutral-700 md:shadow-sm overflow-hidden p-4 md:p-6 my-0 md:my-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4 shrink-0">
        <Inbox className="text-indigo-400" size={24} />
        <div>
          <h2 className="text-xl font-black text-neutral-200 m-0">Thought Inbox</h2>
          <p className="text-xs text-neutral-500 mt-1">Capture vague ideas now, let AI help you review them later.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? null : thoughts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 animate-smooth-pop">
            <Sparkles size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-bold">Your inbox is empty.</p>
            <p className="text-xs mt-2 text-center max-w-xs">
              Tell the Operator AI a random thought, and it will save it here for you to review later.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-smooth-pop">
            {thoughts.map(thought => (
              <div key={thought.id} className="group relative bg-neutral-800 border border-neutral-700 rounded-xl p-4 hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  <Clock size={12} />
                  {new Date(thought.created_at).toLocaleDateString()} at {new Date(thought.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button 
                  onClick={() => deleteThought(thought.id)}
                  className="text-neutral-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Thought"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed font-medium">
                {thought.content}
              </p>
              <div className="mt-4 pt-4 border-t border-neutral-700 flex justify-end">
                <button 
                  onClick={() => handleReviewThought(thought)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-900/20 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles size={14} /> Review with AI
                </button>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
