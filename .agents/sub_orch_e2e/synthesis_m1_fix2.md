## Fix Strategy for Hardcoded DB URL
The connection string in `db-setup.ts` and `db-teardown.ts` must be dynamic to avoid wiping the cloud database.

Strategy:
1. Inside `db-setup.ts` and `db-teardown.ts`, dynamically build the connection string.
2. Read `VITE_SUPABASE_URL` and `SUPABASE_DB_PASSWORD` from `.env`.
3. If an explicit `SUPABASE_DB_URL` is set, use that.
4. Else, if `VITE_SUPABASE_URL` includes `localhost` or `127.0.0.1`, use the local emulator PostgreSQL default: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
5. Else (cloud URL), extract the project ID from the hostname (e.g. `pjgylgatjlivqbaeruko`) and construct the cloud connection string using `SUPABASE_DB_PASSWORD`: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectId}.supabase.co:5432/postgres`.
6. Use this dynamic URL for the `pg` Client connection.

The implementer must update both `e2e/utils/db-setup.ts` and `e2e/utils/db-teardown.ts` with this logic.
