# Handoff Report: Review of E2E DB Setup Fix

## 1. Observation
- The implementer updated `e2e/utils/db-setup.ts` and `e2e/utils/db-teardown.ts` to actually connect to the database via `pg` and run `DELETE FROM tasks;`.
- Playwright tests run successfully (`npx playwright test` completes and outputs DB cleanup logs).
- `e2e/utils/db-setup.ts` and `e2e/utils/db-teardown.ts` both hardcode the production/cloud database hostname: 
  `const connectionString = \`postgresql://postgres:${encodeURIComponent(password)}@db.pjgylgatjlivqbaeruko.supabase.co:5432/postgres\`;`
- The `TEST_INFRA.md` specifies that "Mocking: Supabase calls can be mocked or use a local dev database for true E2E."

## 2. Logic Chain
- The test setup and teardown successfully wipe the database and pass the dummy test.
- However, the hardcoded `db.pjgylgatjlivqbaeruko.supabase.co` hostname creates a **Critical** robustness vulnerability. 
- If a developer sets `VITE_SUPABASE_URL` to a local emulator (e.g., `http://127.0.0.1:54321`), the web application will run against the local emulator, but the test scripts will ignore this environment and attempt to wipe the production/cloud database.
- Even if they are testing against the cloud DB, wiping the entire `tasks` table (`DELETE FROM tasks;`) for all users is highly destructive. True E2E tests should use isolation (e.g., via a designated `test_user_id` or isolated test database).

## 3. Caveats
- `scripts/setup_db.js` also contains the hardcoded connection string, but that is an initialization script, whereas `db-setup.ts` and `db-teardown.ts` run automatically on every test invocation, multiplying the risk.

## 4. Conclusion
- **Verdict: REQUEST_CHANGES**
- The database connection string must not hardcode the cloud domain. It should be dynamically constructed from `process.env.VITE_SUPABASE_URL` or a dedicated `DATABASE_URL` environment variable.
- A hardcoded cloud database in a test script makes the infrastructure dangerous for local development and non-conformant to robust test practices.
- The implementer needs to parse `VITE_SUPABASE_URL` or use `DATABASE_URL` so the teardown correctly targets the same DB the application targets.

## 5. Verification Method
- View `e2e/utils/db-setup.ts` and observe the hardcoded `connectionString`.
- Change `VITE_SUPABASE_URL` in `.env` to `http://127.0.0.1:54321` and observe that `db-setup.ts` still connects to `db.pjgylgatjlivqbaeruko.supabase.co` and wipes it.
