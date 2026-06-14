# Handoff: Tier 1 E2E Test Suite Design

## 1. Observation
- `TEST_INFRA.md` requires 5 test cases per feature for exactly 6 features.
- The features are: 
  1) Task Selection
  2) Session Count Display
  3) Session Count Update
  4) Timer Presets
  5) Auto-Cycle & Long Break
  6) Notifications & Audio
- Tests must be opaque-box, using Playwright, located in `e2e/pomodoro/`, and focused on Tier 1 (happy paths and equivalence classes). DB mocking/seeding is expected.

## 2. Logic Chain
- To achieve exactly 5 test cases per feature (30 total), we map each feature to a specific test file under `e2e/pomodoro/tier1/`.
- We derive the 5 cases by focusing on the standard operation (happy path), edge states (empty DB, initial load), and basic interactions.
- **Task Selection** needs to handle loading from DB, active selection, changing selection, empty states, and omitting completed tasks.
- **Session Count Display** needs to handle 0 sessions, >0 sessions, context switching between tasks, total session counts, and UI rendering (e.g., icons).
- **Session Count Update** needs to cover incrementing on completion, persisting the count, backend DB updates, discarding on cancellation, and global vs task tally alignment.
- **Timer Presets** needs to cover the 3 core modes (Pomodoro, Short Break, Long Break), seamless switching without start, and respecting customized durations.
- **Auto-Cycle & Long Break** needs to cover Pomodoro -> Short Break, Short Break -> Pomodoro, Pomodoro (4th) -> Long Break, Reset after Long Break, and manual interrupts.
- **Notifications & Audio** needs to cover audio on Pomodoro end, visual toast on end, OS-level notifications, audio on Break end, and mute/disable toggle.

## 3. Caveats
- No implementation code is written (as requested).
- DB setup/teardown mechanics (e.g., `test.beforeEach` using Supabase API) are assumed but not strictly coded.
- Actual DOM selectors are abstract; the implementer will need to add data-testids or locators.

## 4. Conclusion
The comprehensive test strategy is broken down into 6 files, each with 5 clearly defined tests.

### File 1: `e2e/pomodoro/tier1/task_selection.spec.ts`
1. **View Incomplete Tasks:** Given 3 incomplete seeded tasks, verify they appear in the task selection list/dropdown.
2. **Select Active Task:** Given multiple tasks, selecting "Task B" updates the UI to show "Task B" as the active focus.
3. **Change Selection:** Given "Task A" is selected, selecting "Task B" successfully replaces the active task without starting the timer.
4. **Empty State:** Given no tasks are selected or the DB is empty, verify the UI displays a "Select a task" prompt or default placeholder.
5. **Hide Completed Tasks:** Given a mix of completed and incomplete tasks, verify the task selector strictly omits the completed ones.

### File 2: `e2e/pomodoro/tier1/session_count_display.spec.ts`
1. **Zero Sessions:** For a task with 0 prior sessions, verify the session count indicator shows `0` (or empty icons).
2. **Existing Sessions:** For a task with 2 completed sessions, verify the UI immediately renders `2` (or 2 filled icons).
3. **Context Switching:** Given Task A (1 session) and Task B (3 sessions), verify switching between them dynamically updates the session display.
4. **Global Tally:** Verify the global/daily session tally accurately reflects the total completed sessions for the day.
5. **High Count Rendering:** For a task with 5+ sessions, verify the UI displays the count properly without breaking layout.

### File 3: `e2e/pomodoro/tier1/session_count_update.spec.ts`
1. **Increment on Completion:** After a Pomodoro timer naturally hits `00:00`, verify the active task's session count increases by 1.
2. **Persistence After Reload:** After completing a session, reload the page and verify the incremented count remains.
3. **Database Insertion:** After a completion, verify the backend DB has correctly inserted a new session record.
4. **No Increment on Cancel:** Start a timer and manually stop/cancel it. Verify the session count does not increment.
5. **Synchronized Updates:** Verify that completing a session increments both the specific task's tally and the global daily tally simultaneously.

### File 4: `e2e/pomodoro/tier1/timer_presets.spec.ts`
1. **Pomodoro Preset:** Click the Pomodoro preset; verify the timer display updates to `25:00` (or the seeded default).
2. **Short Break Preset:** Click the Short Break preset; verify the timer display updates to `05:00`.
3. **Long Break Preset:** Click the Long Break preset; verify the timer display updates to `15:00`.
4. **Instant Switch:** Switch between presets rapidly; verify the timer updates immediately without automatically starting.
5. **Custom Durations:** Given user settings for custom durations (e.g., 30m Pomodoro), verify the presets load and display these custom values.

### File 5: `e2e/pomodoro/tier1/auto_cycle_long_break.spec.ts`
1. **Pomodoro to Short Break:** When a standard Pomodoro finishes, verify the timer automatically sets to a Short Break (`05:00`).
2. **Short Break to Pomodoro:** When a Short Break finishes, verify the timer automatically sets to a Pomodoro (`25:00`).
3. **Trigger Long Break:** Complete exactly 4 Pomodoros (using mocked time); verify the 4th completion automatically triggers a Long Break (`15:00`).
4. **Cycle Reset:** After a Long Break finishes, verify the next completed Pomodoro correctly triggers a Short Break, proving the cycle counter reset.
5. **Manual Override:** During an auto-cycle, manually clicking a preset (e.g., Long Break) correctly interrupts the cycle and updates the timer state.

### File 6: `e2e/pomodoro/tier1/notifications_audio.spec.ts`
1. **Audio on Pomodoro End:** When a Pomodoro completes, verify the UI triggers an audio playback event.
2. **Visual Toast on End:** When a Pomodoro completes, verify an in-app "Session Complete" (or similar) toast/alert is visible.
3. **OS Notification:** Given browser notification permissions are granted, verify the Notification API is called upon session completion.
4. **Audio on Break End:** When a Break (short/long) completes, verify the break completion audio/chime is triggered.
5. **Mute Functionality:** Toggle the mute/disable-audio setting, complete a session, and verify the audio playback event does NOT fire.

## 5. Verification Method
- **Inspection:** Open `handoff.md` and verify there are exactly 6 sections representing the 6 features, each containing exactly 5 distinct test cases (30 total).
- **Execution:** Once the implementer writes the Playwright code based on this document, running `npx playwright test e2e/pomodoro/tier1` should execute 30 tests successfully.
