import { FullConfig } from '@playwright/test';
import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

async function globalTeardown(config: FullConfig) {
  console.log('--- Global DB Teardown for Playwright E2E Tests ---');
  
  let connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL or SUPABASE_DB_URL must be set in environment.');
    }
    
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
      connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    } else {
      const password = process.env.SUPABASE_DB_PASSWORD;
      if (!password) {
        throw new Error('SUPABASE_DB_PASSWORD is not set in environment.');
      }
      try {
        const urlObj = new URL(supabaseUrl);
        const projectId = urlObj.hostname.split('.')[0];
        connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectId}.supabase.co:5432/postgres`;
      } catch (e) {
        throw new Error('Invalid VITE_SUPABASE_URL format.');
      }
    }
  }
  
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Supabase database successfully for teardown.');
    
    // Clear the tasks table
    await client.query('DELETE FROM tasks;');
    console.log('Cleared tasks table after test run.');

  } catch (err) {
    console.error('Database teardown failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

export default globalTeardown;
