# Scope: E2E Test Suite

## Architecture
- Setup Playwright for End-to-End Testing.
- Implement tests following `TEST_INFRA.md`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup Infra | Initialize Playwright, create setup/teardown for DB | none | DONE |
| 2 | Tier 1 Tests | Implement Tier 1 test cases (Feature coverage) | M1 | PLANNED |
| 3 | Tier 2 Tests | Implement Tier 2 test cases (Boundary & Corner cases) | M1 | PLANNED |
| 4 | Tier 3 Tests | Implement Tier 3 test cases (Cross-Feature) | M2, M3 | PLANNED |
| 5 | Tier 4 Tests | Implement Tier 4 test cases (Real-World Scenarios) | M4 | PLANNED |

## Interface Contracts
### `playwright.config.ts`
- Uses Vite local server or preview.
- Points to local test database or mocks depending on implementation details.
