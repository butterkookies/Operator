import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function setupDatabase() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  
  if (!password) {
    console.error('Error: SUPABASE_DB_PASSWORD is not set in .env.local');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.pjgylgatjlivqbaeruko.supabase.co:5432/postgres`;
  
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database successfully.');

    const sql = `
      -- Create the tasks table if it doesn't exist
      create table if not exists tasks (
        id uuid default gen_random_uuid() primary key,
        user_id uuid references auth.users not null,
        title text not null,
        is_completed boolean default false,
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );

      -- Turn on Row Level Security
      alter table tasks enable row level security;

      -- Drop existing policies if any (to allow re-running)
      drop policy if exists "Users can view their own tasks" on tasks;
      drop policy if exists "Users can insert their own tasks" on tasks;
      drop policy if exists "Users can update their own tasks" on tasks;
      drop policy if exists "Users can delete their own tasks" on tasks;

      -- Create Policies
      create policy "Users can view their own tasks" on tasks
        for select using (auth.uid() = user_id);

      create policy "Users can insert their own tasks" on tasks
        for insert with check (auth.uid() = user_id);

      create policy "Users can update their own tasks" on tasks
        for update using (auth.uid() = user_id);

      create policy "Users can delete their own tasks" on tasks
        for delete using (auth.uid() = user_id);
    `;

    console.log('Executing database schema and security policies...');
    await client.query(sql);
    console.log('Success! The database is now secure and ready for tasks.');

  } catch (err) {
    console.error('Database setup failed:', err);
  } finally {
    await client.end();
  }
}

setupDatabase();
