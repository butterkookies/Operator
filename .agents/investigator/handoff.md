# Handoff Report: Fix Strategy for Hardcoded DB Connection String

## Observation
- `e2e/utils/db-setup.ts` (lines 11-17) hardcodes the database connection string:
  ```typescript
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error('SUPABASE_DB_PASSWORD is not set in environment.');
  }

  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.pjgylgatjlivqbaeruko.supabase.co:5432/postgres`;
  ```
- `e2e/utils/db-teardown.ts` has identical logic at lines 11-17.
- `.env` typically defines `VITE_SUPABASE_URL` (e.g., `https://pjgylgatjlivqbaeruko.supabase.co` for cloud or `http://127.0.0.1:54321` for local emulator).
- The hardcoded hostname `db.pjgylgatjlivqbaeruko.supabase.co` forces connections to the cloud database, meaning `DELETE FROM tasks;` will always wipe the cloud DB, regardless of whether `VITE_SUPABASE_URL` points to a local emulator.

## Logic Chain
1. Playwright's `db-setup.ts` and `db-teardown.ts` require a direct DB connection to clear test data.
2. To safely support both local and cloud testing, the DB connection string must align with the target environment defined by `VITE_SUPABASE_URL`.
3. If `VITE_SUPABASE_URL` points to the local emulator (`127.0.0.1` or `localhost`), the script should connect to the local Supabase DB (defaulting to port `54322` and password `postgres`).
4. If `VITE_SUPABASE_URL` points to the cloud (`*.supabase.co`), the project ID can be parsed from the URL, and the hostname constructed dynamically (`db.<projectId>.supabase.co`).
5. Providing an explicit `SUPABASE_DB_URL` environment variable as a fallback offers maximum flexibility to override this dynamic parsing.
6. Since the connection logic is duplicated in `db-setup.ts` and `db-teardown.ts`, it should ideally be consolidated into a shared utility.

## Caveats
- The fix assumes the local Supabase emulator uses the default database port `54322` and password `postgres`. If the user has a custom configuration for their local emulator, they will need to define `SUPABASE_DB_URL` explicitly in their `.env`.
- `VITE_SUPABASE_URL` must be a valid URL string parseable by `new URL()`.

## Conclusion
The `db-setup.ts` and `db-teardown.ts` files must be updated to build the connection string dynamically. 

**Recommended Implementation Plan:**
1. Create a helper function (e.g., in `e2e/utils/db-config.ts` or directly within the files) to determine the connection string.
2. Logic:
   - First, check `process.env.SUPABASE_DB_URL`. If set, use it.
   - If not set, parse `process.env.VITE_SUPABASE_URL`.
   - If `url.hostname` is `127.0.0.1` or `localhost`, return `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
   - If `url.hostname.endsWith('.supabase.co')`, extract the project ID (`url.hostname.split('.')[0]`), require `process.env.SUPABASE_DB_PASSWORD`, and return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectId}.supabase.co:5432/postgres`.
   - Otherwise, throw an error.
3. Update `db-setup.ts` and `db-teardown.ts` to use this dynamically generated connection string.

## Verification Method
1. Configure `.env` with `VITE_SUPABASE_URL=http://127.0.0.1:54321`.
2. Run tests using `npx playwright test`.
3. Check the console logs from Playwright to confirm the connection string targeted `127.0.0.1:54322` and that the cloud database was untouched.
4. Optionally, test with the cloud URL to ensure the dynamic construction still accurately resolves `db.pjgylgatjlivqbaeruko.supabase.co`.
