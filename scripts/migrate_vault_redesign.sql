-- subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  drive_folder_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subjects' AND policyname='Users own subjects') THEN
    CREATE POLICY "Users own subjects" ON subjects FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add columns to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS original_mime text;

-- Add gemini_api_key to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS gemini_api_key text;
