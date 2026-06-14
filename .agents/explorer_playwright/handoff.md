# Handoff Report: E2E Test Suite Playwright Setup

## Observation
- `TEST_INFRA.md` requires true E2E tests, involving true DB updates rather than purely mocked HTTP responses.
- The project is a Vite React application. Currently, no test scripts or Playwright dependencies exist in `package.json`.
- `TEST_INFRA.md` specifies the test structure must be inside `e2e/pomodoro/`.
- `SCOPE.md` indicates Milestone 1 is to "Setup Infra", specifically: "Initialize Playwright, create setup/teardown for DB".

## Logic Chain
1. Playwright should be installed as a development dependency via `npm install -D @playwright/test`.
2. A `playwright.config.ts` must be created at the project root. It should start the Vite development server using the `npm run dev` (or `preview`) command and wait for the default Vite port (5173).
3. To support true database updates as requested, tests should not mutate the primary development database. Instead, a local test database or local Supabase schema specifically for E2E tests needs to be used.
4. An organized directory structure is required: standard application tests should go in `e2e/pomodoro/`, while infrastructure setup (such as resetting DB states and seeding tasks) should go in a dedicated configuration directory like `e2e/setup/`. Playwright's `globalSetup` or fixture capabilities can execute database teardown/setup.

## Caveats
- Setting up a local Supabase instance could be resource-heavy for simple CI environments.
- We have not verified if a `supabase start` workflow is currently initialized in the project. If it is not, a minimal local PostgreSQL configuration or a dedicated remote E2E Supabase environment should be evaluated for the database connection.
- The tests assume `npm run dev` successfully spins up the target application.

## Conclusion
We recommend the following Playwright infrastructure setup:

1. **Install Dependencies**: Run `npm install -D @playwright/test dotenv` followed by `npx playwright install --with-deps`.
2. **Update `package.json` scripts**:
   ```json
   "test:e2e": "playwright test",
   "test:e2e:ui": "playwright test --ui"
   ```
3. **`playwright.config.ts` Configuration**:
   Create the config to specify `testDir: './e2e'`, include the web server block (e.g., `command: 'npm run dev'`, `url: 'http://localhost:5173'`), and reference a global setup module for DB initialization.
4. **Directory Structure Layout**:
   ```text
   e2e/
   ├── pomodoro/           # Actual tests for Pomodoro overhaul
   │   ├── tier1/          # Feature tests
   │   ├── tier2/          # Boundary tests
   │   ├── tier3/          # Pairwise/cross-feature tests
   │   └── tier4/          # Application scenarios
   └── setup/
       ├── global.setup.ts # Run once to prepare DB schema or local Supabase
       └── db.helper.ts    # Reusable teardown/seeding helpers for test.beforeEach
   ```
5. **Database Setup/Teardown strategy**:
   Use a `.env.e2e` file to isolate E2E environment variables. Utilize Playwright's `globalSetup` script (`e2e/setup/global.setup.ts`) to configure and reset the database instance. Tests within `e2e/pomodoro/` can use helpers from `db.helper.ts` to insert required baseline records before execution.

## Verification Method
- Execute `npm run test:e2e` and verify that the Vite web server starts on the specified port.
- Check that the `globalSetup` logic properly connects to and initializes the dedicated test database.
- Confirm that existing development data in the primary database is unmodified following an E2E test run.
