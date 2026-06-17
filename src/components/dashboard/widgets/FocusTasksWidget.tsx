import { useState } from 'react';
import { Check, Trash2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Task } from '../ZenDashboard';

type Props = {
  session: Session;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
};

export function FocusTasksWidget({ session, tasks, setTasks, activeTaskId, setActiveTaskId, isLoading, hasMore, onLoadMore, isLoadingMore }: Props) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = { 
      user_id: session.user.id, 
      title: newTaskTitle.trim(), 
      is_completed: false, 
      sessions_count: 0,
      status: 'todo',
      priority: 'medium'
    };
    
    // Optimistic insert
    const tempId = crypto.randomUUID();
    setTasks(prev => [{ ...newTask, id: tempId, created_at: new Date().toISOString(), due_date: null } as Task, ...prev]);
    setNewTaskTitle('');
    
    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if (!error && data) setTasks(prev => prev.map(t => t.id === tempId ? data : t));
  };

  const toggleTask = async (task: Task) => {
    const newIsCompleted = !task.is_completed;
    if (newIsCompleted && activeTaskId === task.id) setActiveTaskId(null);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newIsCompleted } : t));
    await supabase.from('tasks').update({ is_completed: newIsCompleted }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-black text-neutral-200 mb-4 border-b border-neutral-800 pb-2 shrink-0">Focus Tasks</h2>
      
      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? null : tasks.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center mt-10 animate-smooth-pop">You have no pending tasks. Enjoy the zen.</p>
        ) : (
          <div className="space-y-2 animate-smooth-pop">
            {tasks.map(task => (
              <div key={task.id}
                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all text-sm
                  ${activeTaskId === task.id 
                    ? 'border-indigo-500 bg-indigo-900/20/50 shadow-sm ring-1 ring-indigo-500' 
                    : 'border-neutral-700 bg-neutral-900 hover:border-indigo-300'}`}
                onClick={() => { if (!task.is_completed) setActiveTaskId(activeTaskId === task.id ? null : task.id); }}
                style={{ cursor: task.is_completed ? 'default' : 'pointer' }}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleTask(task); }} 
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0
                    ${task.is_completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-neutral-600 bg-neutral-900 hover:border-indigo-400'}`}
                >
                  {task.is_completed && <Check size={12} strokeWidth={3} />}
                </button>
                
                <span className={`flex-1 transition-all ${task.is_completed ? 'text-neutral-500 line-through' : 'text-neutral-200 font-medium'}`}>
                  {task.title}
                </span>
                
                {task.sessions_count > 0 && (
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-100/50 px-2 py-0.5 rounded-full shrink-0">
                    {task.sessions_count} 🍅
                  </span>
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-500 transition-all p-1 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            
            {hasMore && (
              <button 
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="w-full py-3 mt-4 text-xs font-bold text-neutral-500 border border-neutral-700 rounded-xl hover:bg-neutral-800 hover:text-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : 'Load More Tasks'}
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={addTask} className="mt-4 pt-4 border-t border-neutral-800 shrink-0 relative">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={newTaskTitle} 
            onChange={e => setNewTaskTitle(e.target.value)} 
            placeholder="Add a new task..." 
            className="w-full pl-4 pr-12 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm outline-none focus:bg-neutral-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
          />
          <button 
            type="submit" 
            disabled={!newTaskTitle.trim()}
            className="absolute right-2 w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
