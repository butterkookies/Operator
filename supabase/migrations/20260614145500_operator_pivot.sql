-- Add status and due_date to tasks if they don't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Create thoughts table
CREATE TABLE IF NOT EXISTS public.thoughts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS public.chat_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    message text NOT NULL,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own thoughts"
    ON public.thoughts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own chat history"
    ON public.chat_history FOR ALL
    USING (auth.uid() = user_id);
