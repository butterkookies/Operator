-- user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid REFERENCES auth.users PRIMARY KEY,
  drive_folder_id text,
  drive_sync_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='Users own settings'
  ) THEN
    CREATE POLICY "Users own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Add Drive columns to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS drive_file_id text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS drive_link text;
