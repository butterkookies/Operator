# E2E Test Suite Playwright Setup Recommendation

## 1. Observation
- `TEST_INFRA.md:17-21` states: Test runner is "Playwright (for Vite React app)", Directory layout is `e2e/pomodoro/`, and it asks for "true DB updates, so we'll configure a local Supabase / DB seeding step for tests."
- `.agents/sub_orch_e2e/SCOPE.md:17-19` states Interface Contracts for `playwright.config.ts`: "Uses Vite local server or preview. Points to local test database or mocks depending on implementation details."
- `package.json:6-10` shows Vite commands available: `npm run dev` and `npm run preview`.
- `PROJECT.md:5` states the app uses a Supabase backend for PostgreSQL.

## 2. Logic Chain
- Based on `TEST_INFRA.md` and `SCOPE.md`, we need to set up Playwright specifically tailored for a Vite React application that depends on a local Supabase instance.
- The directory layout needs to be rooted at `e2e/` with a specific `e2e/pomodoro/` structure.
- Because we require "true DB updates", we need a way to reset and seed the database. Playwright's `globalSetup` is the standard approach to initialize database state before the entire test suite runs. A dedicated utility script (e.g., `e2e/utils/db-setup.ts`) can handle Supabase test seeding.
- To serve the Vite app during testing, Playwright's `webServer` config can run `npm run dev` (port 5173) or `npm run build && npm run preview` (port 4173). Since testing true DB updates often goes hand-in-hand with development, `npm run dev` with port 5173 is recommended, or `preview` if a built artifact test is desired. Both should be easily configurable.
- To isolate the test database from development, test environments should load a specific test configuration, likely via `.env.test`.

## 3. Caveats
- I assumed the existence of a local Supabase development environment (e.g., via Supabase CLI `supabase start`). If this is not present, testing will fail or hit production, meaning a local Docker or Supabase CLI setup must be confirmed by the implementer.
- It is assumed that the test DB connection details will be provided via environment variables (like `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in a `.env.test` file.

## 4. Conclusion
**Implementation Strategy for Milestone 1 (Playwright Setup):**

1. **Package Installation**: Run `npm install -D @playwright/test dotenv`.
2. **Directory Layout Creation**:
   ```
   e2e/
   ├── pomodoro/           # Main test files
   ├── utils/
   │   ├── db-setup.ts     # Global DB setup & teardown
   │   └── fixtures.ts     # Playwright custom fixtures
   ```
3. **`playwright.config.ts` Configuration**:
   Create `playwright.config.ts` in the root directory:
   ```typescript
   import { defineConfig, devices } from '@playwright/test';
   import dotenv from 'dotenv';

   // Load test environment variables
   dotenv.config({ path: '.env.test' });

   export default defineConfig({
     testDir: './e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: 'html',
     globalSetup: require.resolve('./e2e/utils/db-setup.ts'),
     use: {
       baseURL: 'http://localhost:5173',
       trace: 'on-first-retry',
     },
     projects: [
       { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
     ],
     webServer: {
       command: 'npm run dev', // or 'npm run build && npm run preview'
       url: 'http://localhost:5173',
       reuseExistingServer: !process.env.CI,
     },
   });
   ```
4. **Database Seeding Step**:
   Implement `e2e/utils/db-setup.ts` to connect to the local Supabase instance, clear existing test data in the `tasks` table, and seed standard test records (e.g., incomplete tasks, specific `sessions_count` values) required for the test philosophy.

## 5. Verification Method
- **Static Check**: Verify that `playwright.config.ts` exists and specifies `testDir: './e2e'` and a `webServer` block.
- **Dry Run**: Run `npx playwright test --dry-run` to ensure the config compiles and Playwright can discover the test directories without syntax errors.
- **Server Startup**: Ensure that running Playwright successfully boots the Vite server locally and executes the global setup script without crashing.
