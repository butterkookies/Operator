# BRIEFING — 2026-06-12T15:06:00+08:00

## Mission
Recommend a fix strategy for a hardcoded database connection string in `db-setup.ts` and `db-teardown.ts` to prevent wiping the cloud DB during tests.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator
- Working directory: c:\Users\user\Documents\ANDREI_FILES\DEVFILES\PROJECTS\Operator\.agents\investigator
- Original parent: d1a8b2ff-ce1a-47eb-9594-d5eda0e17240
- Milestone: Milestone 1: Setup Infra (Playwright)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Must provide a 5-component handoff report

## Current Parent
- Conversation ID: d1a8b2ff-ce1a-47eb-9594-d5eda0e17240
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `e2e/utils/db-setup.ts`
  - `e2e/utils/db-teardown.ts`
  - `playwright.config.ts`
  - `.env`
  - `TEST_INFRA.md`
  - `.agents/sub_orch_e2e/SCOPE.md`
- **Key findings**:
  - `db-setup.ts` and `db-teardown.ts` hardcode the connection string hostname: `db.pjgylgatjlivqbaeruko.supabase.co`.
  - `VITE_SUPABASE_URL` is available in the `.env` file and defines the target environment.
- **Unexplored areas**: None, the issue is fully understood.

## Key Decisions Made
- Recommended strategy: Parse `VITE_SUPABASE_URL` dynamically. If local, use `127.0.0.1:54322`. If cloud, parse project ID from URL and build hostname `db.<projectId>.supabase.co`.
- Extracted a recommendation to DRY the code by creating a shared utility `db-config.ts`.

## Artifact Index
- .agents/investigator/handoff.md — 5-component handoff report
