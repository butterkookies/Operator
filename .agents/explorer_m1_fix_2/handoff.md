# Handoff Report: E2E Playwright + Supabase Fix Strategy

## 1. Observation
- The previous implementation (`e2e/utils/db-setup.ts`) provided a facade that logged to the console and set mock environment variables without starting a real database.
- `playwright.config.ts` lacked a `globalTeardown` entry entirely.
- Playwright's `webServer` feature launches the Vite dev server **before** `globalSetup` executes. Consequently, setting `process.env.VITE_SUPABASE_URL` in `globalSetup` has no effect on Vite, as Vite has already initialized with the previous environment.
- Supabase CLI (`npx supabase start`) relies on Docker, which is particularly relevant on Windows where Docker Desktop might not be running or might require elevated privileges.

## 2. Logic Chain
- To achieve true E2E testing, we must instantiate a real local Supabase instance during the test lifecycle.
- Because `webServer` starts before `globalSetup`, we cannot dynamically inject Supabase credentials from `globalSetup` into Vite.
- Fortunately, local Supabase credentials (API URL and Anon Key) are highly deterministic and remain constant across local startups unless explicitly changed.
- We can expose these credentials safely by hardcoding them into a `.env.test` file and instructing the `webServer` to run Vite in `test` mode (`--mode test`).
- To prevent test runner hangs on Windows when Docker isn't running, `globalSetup` must proactively check `docker info` before attempting `npx supabase start`.
- Database seeding can be handled implicitly by Supabase's built-in `supabase/seed.sql` on startup, or explicitly by running `npx supabase db reset` in the setup script to ensure a clean state for every test run.

## 3. Caveats
- **Docker Dependency**: `npx supabase start` strictly requires Docker Desktop to be running on the Windows machine. If it is not running, the tests cannot proceed. The proposed strategy mitigates cryptic errors by checking `docker info` first, but it does not remove the Docker requirement.
- **Initial Startup Time**: The first run of `npx supabase start` downloads multiple Docker images and can take a few minutes. Subsequent runs are much faster (seconds).

## 4. Conclusion
**Proposed Implementation Strategy:**

1. **Supabase Initialization**:
   - Install the CLI: `npm install -D supabase`.
   - Run `npx supabase init` to generate the `supabase/` folder, `config.toml`, and `seed.sql`.

2. **Exposing Credentials to Vite**:
   - Create `.env.test` with the deterministic local credentials:
     ```env
     VITE_SUPABASE_URL=http://127.0.0.1:54321
     VITE_SUPABASE_ANON_KEY=<the_default_local_anon_key>
     ```
     *(The exact anon key can be obtained by running `npx supabase status` once).*
   - In `playwright.config.ts`, update the webServer command:
     `command: 'npm run dev -- --mode test'` (or `vite --mode test`).

3. **Global Setup (`e2e/utils/db-setup.ts`)**:
   - Import `execSync` from `child_process`.
   - Wrap in `try/catch`.
   - Run `execSync('docker info', { stdio: 'ignore' })` to verify Docker is running.
   - Run `execSync('npx supabase start', { stdio: 'inherit' })`.
   - (Optional) Run `execSync('npx supabase db reset', { stdio: 'inherit' })` to guarantee a clean, seeded state based on `supabase/seed.sql`.

4. **Global Teardown (`e2e/utils/db-teardown.ts`)**:
   - Run `execSync('npx supabase stop', { stdio: 'inherit' })`.
   - Register this file in `playwright.config.ts` under `globalTeardown: './e2e/utils/db-teardown.ts'`.

## 5. Verification Method
- **Implementation Check**: Verify `e2e/utils/db-setup.ts` and `e2e/utils/db-teardown.ts` contain the `child_process.execSync` calls for `supabase start` and `supabase stop`.
- **Vite Env Check**: Inspect `playwright.config.ts` to ensure the `webServer` command is using `--mode test`, and that `.env.test` exists with the correct URL/Key.
- **Execution Test**: Start Docker Desktop, then run `npx playwright test`. Observe the terminal to ensure Supabase containers spin up, tests execute against the local DB, and the containers shut down properly at the end.
