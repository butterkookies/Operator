## Consensus
- Playwright should be installed via `npm install -D @playwright/test dotenv`.
- Configuration: Create `playwright.config.ts` pointing `testDir` to `./e2e` and a `webServer` block for `npm run dev` (port 5173).
- DB Teardown/Setup: Use a `globalSetup` script (e.g. `e2e/setup/global.setup.ts` or `e2e/utils/db-setup.ts`) to seed and reset a local test Supabase instance.
- Layout: Create `e2e/pomodoro/tier1` etc. according to `TEST_INFRA.md`.

## Output
Worker should execute this strategy, write the boilerplate code, run a dry-run test, and verify.
