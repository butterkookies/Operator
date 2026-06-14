# Handoff: Playwright Infra Strategy

## Observation
- `TEST_INFRA.md` requires opaque-box testing using Playwright, with tests located in `e2e/pomodoro/`.
- `TEST_INFRA.md` states: "The request asks for true DB updates, so we'll configure a local Supabase / DB seeding step for tests."
- `SCOPE.md` specifies Milestone 1 as "Setup Infra: Initialize Playwright, create setup/teardown for DB" and requires `playwright.config.ts` to use "Vite local server or preview".
- Inspection of `package.json` reveals that `@playwright/test` is not yet installed.

## Logic Chain
1. Playwright must be added to dev dependencies to run tests.
2. `playwright.config.ts` must configure a `webServer` block to automatically start the Vite React app (`npm run dev`) at `http://localhost:5173`.
3. To meet the "true DB updates / local Supabase" requirement, a `globalSetup` (and optionally `globalTeardown`) script must be configured in Playwright to reset or seed the local database before test suites run.
4. The test directory needs to map the logical feature tiers described in `TEST_INFRA.md`.

## Caveats
- Since it's unclear whether the team prefers `npm run dev` vs `npm run preview` for tests, the recommendation defaults to `npm run dev` to avoid constant build steps during test development.
- The exact mechanism for Supabase local DB resets (e.g., executing raw SQL via `pg` or utilizing supabase CLI commands) will need to be decided during implementation based on existing Supabase local setup.

## Conclusion
**Recommended Strategy:**
1. **Dependencies**: Run `npm install -D @playwright/test`.
2. **Configuration**: Create `playwright.config.ts` with:
   - `testDir: './e2e'`
   - `webServer: { command: 'npm run dev', port: 5173 }`
   - `globalSetup: require.resolve('./e2e/global.setup.ts')`
3. **Directory Layout**: Create the following folders:
   - `e2e/pomodoro/tier1/`
   - `e2e/pomodoro/tier2/`
   - `e2e/pomodoro/tier3/`
   - `e2e/pomodoro/tier4/`
4. **Setup Script**: Create `e2e/global.setup.ts` to connect to the local Supabase instance and reset/seed necessary tables before testing.

## Verification Method
- After implementation, verify by running `npx playwright test --ui` (or headless).
- Confirm the Vite server spins up automatically and the `global.setup.ts` correctly establishes/resets the DB state without errors.
