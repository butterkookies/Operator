import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { PomodoroEngine } from './PomodoroEngine';
import { FocusTasksWidget } from './widgets/FocusTasksWidget';
import { DailyAgendaWidget } from './widgets/DailyAgendaWidget';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  sessions_count: number;
  created_at: string;
  status: string;
  due_date: string | null;
  priority: string;
};

const PAGE_SIZE = 50;

export function ZenDashboard({ session }: { session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    
    if (!error && data) {
      setTasks(data);
      setHasMoreTasks(data.length === PAGE_SIZE);
    }
    setIsLoadingTasks(false);
  };

  const loadMoreTasks = async () => {
    if (isLoadingMore || !hasMoreTasks) return;
    setIsLoadingMore(true);
    
    const from = tasks.length;
    const to = from + PAGE_SIZE - 1;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
      
    if (!error && data) {
      setTasks(prev => [...prev, ...data]);
      setHasMoreTasks(data.length === PAGE_SIZE);
    }
    setIsLoadingMore(false);
  };

  const handleSessionComplete = async () => {
    if (activeTaskId) {
      const task = tasks.find(t => t.id === activeTaskId);
      if (!task) return;
      const newCount = (task.sessions_count || 0) + 1;
      setTasks(prev => prev.map(t =>
        t.id === activeTaskId ? { ...t, sessions_count: newCount } : t
      ));
      await supabase.from('tasks').update({ sessions_count: newCount }).eq('id', activeTaskId);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-4 md:p-6 overflow-y-auto md:overflow-hidden">
      {/* Left Column: Pomodoro & Calendar */}
      <div className="flex flex-col gap-6 md:w-1/2 lg:w-1/3 shrink-0">
        <PomodoroEngine 
          isZenMode={false} 
          tasks={tasks}
          activeTaskId={activeTaskId}
          onActiveTaskChange={setActiveTaskId}
          onSessionComplete={handleSessionComplete}
        />
        <div className="flex-1 bg-neutral-900 rounded-2xl border border-neutral-700 shadow-sm p-4 overflow-hidden flex flex-col">
          <DailyAgendaWidget session={session} />
        </div>
      </div>

      {/* Right Column: Focus Tasks */}
      <div className="flex-1 bg-neutral-900 rounded-2xl border border-neutral-700 shadow-sm p-4 flex flex-col overflow-hidden">
        <FocusTasksWidget 
          session={session} 
          tasks={tasks} 
          setTasks={setTasks} 
          activeTaskId={activeTaskId} 
          setActiveTaskId={setActiveTaskId}
          isLoading={isLoadingTasks}
          hasMore={hasMoreTasks}
          onLoadMore={loadMoreTasks}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </div>
  );
}
