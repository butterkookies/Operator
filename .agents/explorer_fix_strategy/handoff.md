# Handoff Report

## 1. Observation
- `e2e/utils/db-setup.ts` contains a hardcoded connection string on line 16: ``const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.pjgylgatjlivqbaeruko.supabase.co:5432/postgres`;``
- `e2e/utils/db-teardown.ts` contains the exact same hardcoded connection string on line 16.
- The `.env` file contains `VITE_SUPABASE_URL=https://pjgylgatjlivqbaeruko.supabase.co` and `SUPABASE_DB_PASSWORD=83WbwaYiER8kJaDV`.
- As Reviewer 4 pointed out, if `VITE_SUPABASE_URL` is changed to point to a local Supabase emulator (e.g., `http://127.0.0.1:54321`), the global setup/teardown will still connect to and wipe the cloud database, leading to potential data loss and test flakiness.

## 2. Logic Chain
- To prevent accidentally wiping the cloud database when testing locally, the DB connection string must be determined dynamically based on the active environment.
- The most robust way to do this is to check the `VITE_SUPABASE_URL` environment variable:
  - If `VITE_SUPABASE_URL` points to `localhost` or `127.0.0.1`, the setup/teardown should default to the standard local Supabase PostgreSQL connection string (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`).
  - If `VITE_SUPABASE_URL` points to a cloud instance (`.supabase.co`), it should extract the project ID from the hostname (e.g., `pjgylgatjlivqbaeruko`) and construct the cloud DB URL using the `SUPABASE_DB_PASSWORD`.
  - Alternatively, a direct `SUPABASE_DB_URL` environment variable could be introduced to override any inferred connection strings, providing maximum flexibility.

## 3. Caveats
- Relying on `VITE_SUPABASE_URL` to derive the PostgreSQL connection string assumes standard Supabase port configurations for local emulators (API on 54321, DB on 54322). If a custom local configuration is used, users will need to explicitly set a `SUPABASE_DB_URL`.
- Modifying `.env` might be required if we choose to only rely on an explicit `SUPABASE_DB_URL` environment variable instead of dynamic parsing.

## 4. Conclusion
**Proposed Fix Strategy:**
1. Update `db-setup.ts` and `db-teardown.ts` to replace the hardcoded `connectionString` logic.
2. Implement a unified helper function or logic block that evaluates the target database:
   - First check if an explicit `SUPABASE_DB_URL` environment variable is provided. If so, use it.
   - Else, check if `process.env.VITE_SUPABASE_URL` contains `localhost` or `127.0.0.1`. If so, use the default local emulator DB URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
   - Else, if it's a cloud URL, extract the project ID from `VITE_SUPABASE_URL` (e.g., `new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0]`) and build the connection string using `process.env.SUPABASE_DB_PASSWORD`.
3. Apply this logic to both `db-setup.ts` and `db-teardown.ts` (or extract it to a shared helper file, e.g., `db-config.ts`).

## 5. Verification Method
- Change `VITE_SUPABASE_URL` in `.env` to `http://127.0.0.1:54321`.
- Run the Playwright setup step or test suite: `npx playwright test`.
- Verify via console logs or a local DB viewer that the connection attempts to reach `127.0.0.1:54322` instead of the cloud URL, and fails fast if the local emulator is not running, instead of clearing the remote tasks table.
- Change `VITE_SUPABASE_URL` back to the cloud URL and ensure the setup correctly parses the project ID and connects to the cloud DB.
