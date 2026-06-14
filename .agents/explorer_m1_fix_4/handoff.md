# Handoff: E2E Database Setup Strategy (Milestone 1)

## 1. Observation
- `e2e/utils/db-setup.ts` currently acts as a dummy facade; it only sets mock environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and logs strings to the console, without actually setting up a database.
- `playwright.config.ts` references `globalSetup: './e2e/utils/db-setup.ts'` but does not define a `globalTeardown` property.
- The reviewer explicitly vetoed this implementation: *"The implementer must replace the dummy db-setup.ts with functional database setup logic (e.g., executing `supabase db reset`) and implement the missing teardown functionality."*
- Currently, the project lacks a `supabase/` directory (no `supabase/config.toml` or `supabase/migrations/`), meaning local Supabase has not been initialized.
- Existing database setup logic targets a remote database (`scripts/setup_db.js`), but the reviewer requirement specifically calls for "seeding the local DB".

## 2. Logic Chain
1. **Local DB Initialization Needed:** Since the reviewer demands a local database setup via Supabase CLI (e.g. `supabase db reset`), the project must first have local Supabase initialized. We need to run `npx supabase init` and port the SQL from `scripts/setup_db.js` into a proper initial migration under `supabase/migrations/`.
2. **Functional Setup Script:** The `e2e/utils/db-setup.ts` must programmatically execute the Supabase CLI to ensure a clean local database state. It should use Node's `child_process.execSync` to run `npx supabase start` (or `npx supabase db reset` if we assume the container is kept running). After starting, it must export the local Supabase URL and Anon Key to `process.env` so the Vite dev server uses them.
3. **Missing Teardown Script:** The reviewer noted the absence of teardown logic. We must create a new file `e2e/utils/db-teardown.ts` to perform cleanup. If `npx supabase start` is used in setup, teardown should run `npx supabase stop` to halt the Docker containers, leaving a clean environment.
4. **Configuration Update:** `playwright.config.ts` must be updated to register the new teardown script using `globalTeardown: './e2e/utils/db-teardown.ts'`.

## 3. Caveats
- **Docker Requirement:** The `npx supabase start` command requires Docker to be running on the host machine. If Docker is unavailable in the environment running the E2E tests, this approach will fail.
- **Performance:** Starting and stopping Supabase containers for every test run can add ~30-60 seconds of overhead. A common optimization is to start the containers manually before running tests, and only use `npx supabase db reset` in `db-setup.ts`.
- I have not implemented the code; this report only outlines the strategy required to satisfy the reviewer's feedback.

## 4. Conclusion
To resolve the reviewer's veto, the implementer must:
1. Run `npx supabase init` and migrate the schema from `scripts/setup_db.js` into `supabase/migrations/xxxx_init.sql`.
2. Update `e2e/utils/db-setup.ts` to execute `child_process.execSync('npx supabase db reset')` (or `start`) and set the proper local environment variables.
3. Create `e2e/utils/db-teardown.ts` to execute `child_process.execSync('npx supabase stop')`.
4. Add `globalTeardown: './e2e/utils/db-teardown.ts'` to `playwright.config.ts`.

## 5. Verification Method
- **Verify Schema:** Check that the `supabase/migrations/` directory exists and contains the SQL for the `tasks` table and RLS policies.
- **Verify Test Run:** Run the test command `npx playwright test`. Ensure the terminal output shows the Supabase CLI successfully resetting the database before tests, and stopping/cleaning up after tests.
- **Verify Local Environment:** The E2E tests must pass without throwing database connection or schema errors, confirming that the local Vite app successfully connects to the local Supabase instance.
