# E2E Test Infra: Operator Pomodoro Overhaul

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Task Selection | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 2 | Session Count Display | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 3 | Session Count Update | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 4 | Timer Presets | ORIGINAL_REQUEST R3 | 5      | 5      | ✓      |
| 5 | Auto-Cycle & Long Break | ORIGINAL_REQUEST R3 | 5      | 5      | ✓      |
| 6 | Notifications & Audio | ORIGINAL_REQUEST R4 | 5      | 5      | ✓      |

## Test Architecture
- Test runner: Playwright (for Vite React app)
- Test case format: Playwright TS test files
- Directory layout: `e2e/pomodoro/`
- Mocking: Supabase calls can be mocked or use a local dev database for true E2E. The request asks for true DB updates, so we'll configure a local Supabase / DB seeding step for tests.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full standard pomodoro cycle | F1, F3, F4, F5, F6 | High |
| 2 | Interrupted cycle (pause/resume) | F4, F5 | Medium |
| 3 | Task switching between cycles | F1, F2, F3 | Medium |
| 4 | Notification permission denied | F6 | Medium |
| 5 | Long usage (4+ complete cycles) | F1, F3, F4, F5, F6 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
