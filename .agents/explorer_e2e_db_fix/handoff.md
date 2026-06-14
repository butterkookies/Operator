# Handoff Report: E2E Database Connection String Fix Strategy

## Observation
- `e2e/utils/db-setup.ts` and `e2e/utils/db-teardown.ts` construct the database connection string by hardcoding the cloud hostname: `postgresql://postgres:${encodeURIComponent(password)}@db.pjgylgatjlivqbaeruko.supabase.co:5432/postgres`.
- Both scripts execute a destructive command (`await client.query('DELETE FROM tasks;');`).
- The application code (`src/lib/supabase.ts`) relies on `import.meta.env.VITE_SUPABASE_URL` to connect to the Supabase API. This means the frontend might be pointing to a local emulator while the E2E scripts blindly wipe the cloud database.
- According to `supabase/config.toml`, the local Supabase emulator exposes the Postgres database on port `54322` (`[db] port = 54322`).

## Logic Chain
1. **The Risk:** Hardcoding the cloud database URL ensures that running E2E tests *always* wipes the cloud `tasks` table, even when the developer intends to test against a local emulator. This causes silent data loss.
2. **The Goal:** The database cleared by the E2E scripts must be the same database that `VITE_SUPABASE_URL` points to. Moreover, destructive actions on remote databases must require explicit opt-in to prevent accidental wipes.
3. **The Solution:** Calculate the database connection string dynamically. If the environment points to a local emulator, use the emulator's default connection string. If it points to a remote instance, require a dedicated override variable (e.g., `TEST_DATABASE_URL`) to explicitly acknowledge the wipe.

## Caveats
- `scripts/setup_db.js` also hardcodes the cloud domain. While the prompt explicitly scoped the fix to `db-setup.ts` and `db-teardown.ts`, the implementer should consider updating `scripts/setup_db.js` with the same dynamic URL logic for consistency.
- Tests will require the local emulator to be running (e.g., `supabase start`) if `TEST_DATABASE_URL` is omitted and `VITE_SUPABASE_URL` indicates local dev.

## Conclusion
Implement a dynamic connection string resolution strategy in `e2e/utils/db-setup.ts` and `e2e/utils/db-teardown.ts`:

1. **Check for explicit test DB URL:** Check `process.env.TEST_DATABASE_URL`. If set, use it.
2. **Local Fallback:** If not set, check `process.env.VITE_SUPABASE_URL`. If it contains `localhost` or `127.0.0.1`, default to the local emulator DB string: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
3. **Safety Guard:** If `VITE_SUPABASE_URL` points to a remote instance and `TEST_DATABASE_URL` is not set, **throw an Error** explaining that `TEST_DATABASE_URL` must be set for remote testing to prevent accidental data loss.
4. Extract this logic into a shared helper function (e.g., `e2e/utils/get-db-url.ts`) and import it in both setup and teardown scripts to stay DRY.

## Verification Method
1. **Local Emulator Mode:** Set `VITE_SUPABASE_URL="http://127.0.0.1:54321"` and omit `TEST_DATABASE_URL`. Run `npx playwright test`. The tests should connect to `127.0.0.1:54322` and clear the local DB without errors.
2. **Safety Guard Mode:** Set `VITE_SUPABASE_URL="https://somecloud.supabase.co"` and omit `TEST_DATABASE_URL`. Run `npx playwright test`. The process must abort immediately with the safety error.
3. **Explicit Remote Mode:** Set `VITE_SUPABASE_URL="https://somecloud.supabase.co"` and provide a safe `TEST_DATABASE_URL`. Run `npx playwright test`. The tests should connect to the explicit test DB and execute normally.
