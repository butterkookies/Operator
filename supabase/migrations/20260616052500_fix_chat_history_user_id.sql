-- Fix missing user_id in chat_history
UPDATE public.chat_history ch
SET user_id = cs.user_id
FROM public.chat_sessions cs
WHERE ch.session_id = cs.id AND ch.user_id IS NULL;
