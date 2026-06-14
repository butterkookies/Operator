CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Note',
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  source_type text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notes' AND policyname='Users see own notes'
  ) THEN
    CREATE POLICY "Users see own notes" ON notes FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;
