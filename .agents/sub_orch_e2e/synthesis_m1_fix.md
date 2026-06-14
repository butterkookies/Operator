## Consensus Fix Strategy
The previous dummy facade was rejected. We must implement real DB teardown and seeding.

1. `e2e/utils/db-setup.ts`: Connect to the Supabase Postgres database (via `pg`, similar to `scripts/setup_db.js`) using `SUPABASE_DB_PASSWORD` or equivalent env vars.
2. Truncate/delete the `tasks` table for the test user to ensure a clean slate.
3. If necessary, seed some dummy tasks.
4. `e2e/utils/db-teardown.ts`: Connect via `pg` and delete any tasks created during the test run.
5. Update `playwright.config.ts` to point to `globalTeardown: require.resolve('./e2e/utils/db-teardown.ts')`.

Worker should implement this using the `pg` client already available in `package.json`. No mock logs. Real SQL execution.
