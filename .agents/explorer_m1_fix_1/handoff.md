# Handoff Report: Milestone 1 Setup Infra Fix Strategy

## 1. Observation
- The previous implementation in `e2e/utils/db-setup.ts` only logged console messages and mocked `VITE_SUPABASE_URL` to `http://127.0.0.1:54321` without starting any actual local Supabase instance.
- The `supabase` CLI is not installed locally in `package.json` (`devDependencies`).
- There is no `supabase` directory in the project root, meaning `npx supabase init` has never been run to scaffold the local Supabase configuration.
- The target database schema currently exists in `scripts/setup_db.js`, which was designed to connect to the cloud instance.
- `globalTeardown` is completely missing from `playwright.config.ts`.
- The tests are run on a Windows machine. `npx supabase start` strictly requires Docker Desktop (or WSL2 Docker daemon) to be running.

## 2. Logic Chain
- To satisfy the "true DB updates" requirement of `TEST_INFRA.md`, we must use a real local database instance. Supabase provides a CLI to run a full local stack via `npx supabase start`.
- **Initialization**: The `supabase` CLI must be added as a devDependency (`npm install -D supabase`). The project needs to be initialized with `npx supabase init`.
- **Schema & Seeding**: The SQL schema found in `scripts/setup_db.js` must be extracted and saved into a proper migration file (e.g., `supabase/migrations/20260612000000_init.sql`). A `supabase/seed.sql` file should be created to populate initial test users and tasks. `npx supabase start` will automatically apply migrations and seeding upon boot.
- **Global Setup (`e2e/utils/db-setup.ts`)**: This script should be updated to execute `npx supabase start` using `child_process.execSync`. 
  - Playwright's `webServer` automatically inherits environment variables set in `globalSetup`. Setting `process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'` and `process.env.VITE_SUPABASE_ANON_KEY` (using the standard local test key outputted by Supabase) in `db-setup.ts` will ensure Vite points to the local containerized instance.
- **Windows Robustness**: Because `supabase start` fails if Docker is not running, `globalSetup` must wrap the `execSync` call in a `try/catch` block. If an error is caught (particularly one mentioning Docker daemon issues), the script must **fail fast and throw a descriptive error** (e.g., `"CRITICAL: Docker is not running. Please start Docker Desktop to run E2E tests with local Supabase."`). We must *not* silently mock the database, to avoid repeating the previous integrity violation.
- **Global Teardown**: A new file `e2e/utils/db-teardown.ts` must be created containing an async function that runs `child_process.execSync('npx supabase stop')`. This file must be registered under `globalTeardown` in `playwright.config.ts`.

## 3. Caveats
- `npx supabase start` involves downloading multiple Docker images the first time it runs, which might take several minutes. You may need to increase the `globalTimeout` in `playwright.config.ts` (e.g., to 600000ms / 10 mins).
- The strategy relies strictly on Docker being available on the host machine. If Docker is entirely unavailable, the setup will hard-fail, intentionally preventing the tests from proceeding with a fake database.

## 4. Conclusion
- **Actionable Strategy**:
  1. Install `supabase` CLI (`npm i -D supabase`).
  2. Run `npx supabase init`.
  3. Create `supabase/migrations/` and `supabase/seed.sql` using the schema from `scripts/setup_db.js`.
  4. Rewrite `e2e/utils/db-setup.ts` to spawn `npx supabase start`. Add robust try/catch logic to detect missing Docker and fail explicitly.
  5. Create `e2e/utils/db-teardown.ts` to spawn `npx supabase stop`.
  6. Update `playwright.config.ts` to point to the new teardown script and potentially increase `globalTimeout`.

## 5. Verification Method
- Verify the CLI is in `package.json`.
- Inspect `e2e/utils/db-setup.ts` to ensure it uses `child_process.execSync('npx supabase start')`.
- Inspect `playwright.config.ts` to ensure `globalTeardown` points to a script that stops Supabase.
- Run `npx playwright test`. It should attempt to start Docker containers. If Docker is stopped, it should print the custom critical error instead of a generic mock facade log.
