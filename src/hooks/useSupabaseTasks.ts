import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  sessions_count: number;
  created_at: string;
}

export function useSupabaseTasks(session: Session) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setTasks(data || []);
    setIsLoadingTasks(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async (title: string) => {
    if (!title.trim()) return;
    const newTask = { user_id: session.user.id, title: title.trim(), is_completed: false, sessions_count: 0 };
    const tempId = crypto.randomUUID();
    setTasks(prev => [{ ...newTask, id: tempId, created_at: new Date().toISOString() }, ...prev]);
    
    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if (!error && data) setTasks(prev => prev.map(t => t.id === tempId ? data : t));
  };

  const handleSessionComplete = async (activeTaskId: string | null) => {
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

  const toggleTask = async (task: Task, activeTaskId: string | null, setActiveTaskId: (id: string | null) => void) => {
    const newIsCompleted = !task.is_completed;
    if (newIsCompleted && activeTaskId === task.id) {
      setActiveTaskId(null);
    }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newIsCompleted } : t));
    await supabase.from('tasks').update({ is_completed: newIsCompleted }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  return {
    tasks,
    isLoadingTasks,
    addTask,
    handleSessionComplete,
    toggleTask,
    deleteTask,
    fetchTasks
  };
}
