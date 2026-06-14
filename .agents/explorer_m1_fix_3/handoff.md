# Handoff Report: Milestone 1 Setup Infra E2E Fix Strategy

## 1. Observation
- `package.json` currently lacks `@supabase/cli` as a dev dependency.
- `e2e/utils/db-setup.ts` is a facade that only outputs `console.log` statements and sets static mock environment variables without starting any database.
- `e2e/utils/db-teardown.ts` exists but is highly dangerous: it attempts to connect directly to the production Supabase PostgreSQL instance (`db.pjgylgatjlivqbaeruko.supabase.co`) and blindly executes `DELETE FROM tasks;`.
- `playwright.config.ts` does not register the `globalTeardown` script. Furthermore, the `webServer` configuration runs `npm run dev` without a specific environment mode, so Vite will load default `.env` variables instead of test-specific ones.
- Running `npx supabase status` on Windows when Docker Desktop is closed fails with a `pipe/docker_engine` connection error.

## 2. Logic Chain
- The milestone scope and `TEST_INFRA.md` explicitly demand "true DB updates" and a "local Supabase / DB seeding step for tests". The previous facade implementation violated this core requirement.
- To use a real local DB safely, `db-setup.ts` must programmatically execute `npx supabase start`.
- Since Playwright's `globalSetup` runs in an isolated Node process, simply modifying `process.env` will not pass the new variables to Vite's dev server. The setup script must extract the local API URL and Anon Key (via `npx supabase status -o json`) and persist them to a `.env.test.local` file.
- The Vite dev server in Playwright must be instructed to load these test variables by updating its launch command to `npm run dev -- --mode test`.
- To prevent resource leaks and avoid touching production, the dangerous `db-teardown.ts` must be completely rewritten to run `npx supabase stop` and clean up the `.env.test.local` file. It must then be properly registered in `playwright.config.ts`.
- Since tests will run on Windows, Docker might be disabled. To make the script robust, it should explicitly check `docker info`. If Docker is unreachable, the script must throw a clear, descriptive error instructing the developer to start Docker, rather than silently failing or falling back to a dummy facade.

## 3. Caveats
- If the developer does not have Docker running, they will be hard-blocked from running E2E tests. While a mock fallback could be implemented, it would require significant app-level refactoring to inject mock DB clients, directly contradicting the "true DB updates" requirement.
- The initial `npx supabase start` pulls several large Docker images. This might exceed Playwright's default timeouts on the first run.
- Using `execSync` blocks the Node event loop, but since this only happens during `globalSetup` before tests begin, it is acceptable.

## 4. Conclusion
The E2E database infrastructure must be completely overhauled:
1. **Dependencies**: Run `npm install -D supabase`.
2. **Setup Script (`db-setup.ts`)**: Implement `child_process.execSync` to verify Docker availability, run `npx supabase start`, fetch local credentials, and write them to `.env.test.local`.
3. **Teardown Script (`db-teardown.ts`)**: Remove all production database code. Use `execSync` to run `npx supabase stop` and delete the `.env.test.local` file.
4. **Configuration (`playwright.config.ts`)**: Add `globalTeardown: './e2e/utils/db-teardown.ts'` and update the webServer command to `npm run dev -- --mode test`.

## 5. Verification Method
- Start Docker Desktop on Windows.
- Run `npx playwright test`.
- Verify in the terminal that `npx supabase start` is invoked and completes.
- Verify that a `.env.test.local` file is generated with `http://127.0.0.1:...` credentials while tests run, and that Vite connects to it.
- Ensure that upon test completion, `npx supabase stop` is called and the `.env.test.local` file is deleted.
