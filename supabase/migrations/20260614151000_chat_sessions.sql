-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text DEFAULT 'New Chat',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat sessions"
    ON public.chat_sessions FOR ALL
    USING (auth.uid() = user_id);

-- Add session_id to chat_history
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

-- Create default sessions for existing users and update existing chat history
DO $$
DECLARE
    u_id uuid;
    s_id uuid;
BEGIN
    FOR u_id IN SELECT DISTINCT user_id FROM public.chat_history WHERE session_id IS NULL LOOP
        INSERT INTO public.chat_sessions (user_id, title) VALUES (u_id, 'Legacy Chat') RETURNING id INTO s_id;
        UPDATE public.chat_history SET session_id = s_id WHERE user_id = u_id AND session_id IS NULL;
    END LOOP;
END $$;
