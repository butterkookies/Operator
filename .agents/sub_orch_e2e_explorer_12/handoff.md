# Handoff Report

## Observation
- The `TEST_INFRA.md` requires 5 Tier 1 E2E test cases per feature for 6 specified features (Task Selection, Session Count Display, Session Count Update, Timer Presets, Auto-Cycle & Long Break, Notifications & Audio), totaling 30 cases.
- The project is a React+Vite app using Supabase (`PROJECT.md`).
- Tests should be opaque-box, written for Playwright.
- Test paths should follow `e2e/pomodoro/tier1/<feature>.spec.ts`.

## Logic Chain
1. **Task Selection**: Must verify selection, deselection, active state presentation, restriction against completed tasks, and switching between tasks.
2. **Session Count Display**: Must check 0 sessions, >0 sessions, 2-digit counts, real-time update in list, and accurate counts for unselected tasks.
3. **Session Count Update**: Focus completion must increment the count; Breaks or cancelled/reset sessions must not. DB state simulation required.
4. **Timer Presets**: Focus = 25m, Short Break = 5m, Long Break = 15m. Must test transition when paused and reset behavior.
5. **Auto-Cycle & Long Break**: Validate standard Pomodoro cycle sequence (Focus -> Short Break -> ... -> 4th Focus -> Long Break -> cycle reset).
6. **Notifications & Audio**: Mock `HTMLAudioElement.play()` and `Notification` API. Verify permissions handled gracefully (denied states).

## Caveats
- Auto-start behavior on phase transition is assumed to happen automatically or require one click; tests are written assuming fast-forwarding the timer triggers the phase change. Playwright's clock mocking (`page.clock.fastForward`) will be essential.
- Supabase backend requires either local seeding or MSW network mocking during Playwright setup to isolate the "opaque-box" testing cleanly.

## Conclusion
Here is the detailed Tier 1 E2E test suite strategy (30 test cases):

### `e2e/pomodoro/tier1/task_selection.spec.ts`
1. **TC1_1: Select uncompleted task**: Navigate to dashboard, click an uncompleted task. Verify the task name appears in the Pomodoro widget.
2. **TC1_2: Cannot select completed task**: Attempt to click a task marked as completed. Verify the selection is disabled or ignored by the Pomodoro widget.
3. **TC1_3: Switch selected task**: With Task A selected, click Task B. Verify Task B replaces Task A in the Pomodoro widget.
4. **TC1_4: Clear task selection**: Click the clear/deselect button on the active task in the widget. Verify the widget reverts to an unselected state.
5. **TC1_5: Selection persists across presets**: With a task selected, switch the timer preset (e.g., Focus to Short Break). Verify the selected task remains unchanged.

### `e2e/pomodoro/tier1/session_count_display.spec.ts`
1. **TC2_1: Initial count is 0**: Create a new task. Verify the session count indicator shows `0`.
2. **TC2_2: Widget reflects count**: Select a task seeded with >0 sessions. Verify the Pomodoro widget displays the correct session count.
3. **TC2_3: Double-digit layout**: Select a task seeded with 10+ sessions. Verify the count displays correctly without layout breakage.
4. **TC2_4: Real-time update in list**: Complete a Focus session for a selected task. Verify the task list immediately reflects the count + 1 without a page reload.
5. **TC2_5: Unselected task counts**: Seed multiple tasks with different counts. Verify the task list accurately displays the individual counts for each.

### `e2e/pomodoro/tier1/session_count_update.spec.ts`
1. **TC3_1: Focus increments count**: Start and complete a Focus session. Verify the task's session count increases by 1 in both UI and DB.
2. **TC3_2: Short Break no increment**: Start and complete a Short Break. Verify the session count does not change.
3. **TC3_3: Long Break no increment**: Start and complete a Long Break. Verify the session count does not change.
4. **TC3_4: Pause and resume**: Start a Focus session, pause, resume, and complete. Verify the session count increments exactly by 1.
5. **TC3_5: Reset no increment**: Start a Focus session, wait 10 seconds, then click reset. Verify the session count does not change.

### `e2e/pomodoro/tier1/timer_presets.spec.ts`
1. **TC4_1: Focus preset**: Click "Focus". Verify timer shows exactly `25:00`.
2. **TC4_2: Short Break preset**: Click "Short Break". Verify timer shows exactly `05:00`.
3. **TC4_3: Long Break preset**: Click "Long Break". Verify timer shows exactly `15:00`.
4. **TC4_4: Switch preset while paused**: Change from Focus to Short Break. Verify timer updates to `05:00` without automatically starting.
5. **TC4_5: Explicit reset**: Run a preset for 5 seconds, then reset. Verify timer reverts to the full preset duration and remains stopped.

### `e2e/pomodoro/tier1/auto_cycle.spec.ts`
1. **TC5_1: Focus to Short Break**: Fast-forward a Focus session to completion. Verify timer auto-transitions to the Short Break preset (`05:00`).
2. **TC5_2: Short Break to Focus**: Fast-forward a Short Break to completion. Verify timer auto-transitions to the Focus preset (`25:00`).
3. **TC5_3: 4th Focus to Long Break**: Complete 3 Focus sessions. On the 4th Focus completion, verify timer transitions to Long Break (`15:00`) instead of Short Break.
4. **TC5_4: Cycle reset after Long Break**: Fast-forward a Long Break to completion. Verify timer transitions back to Focus (`25:00`).
5. **TC5_5: 5th Focus to Short Break**: Fast-forward the 5th Focus (first session of new cycle). Verify timer transitions to Short Break (`05:00`), proving the 4-cycle counter was correctly reset.

### `e2e/pomodoro/tier1/notifications_audio.spec.ts`
1. **TC6_1: Focus completion audio**: Fast-forward Focus to 0. Verify `HTMLAudioElement.play()` is invoked.
2. **TC6_2: Break completion audio**: Fast-forward Short Break to 0. Verify `HTMLAudioElement.play()` is invoked.
3. **TC6_3: Focus completion push notification**: With notifications granted, complete Focus. Verify `new Notification()` is fired with correct focus-ended title.
4. **TC6_4: Break completion push notification**: With notifications granted, complete Break. Verify `new Notification()` is fired with break-ended title.
5. **TC6_5: Graceful denial**: Block notification permissions. Complete a session. Verify the app does not crash, auto-cycle still proceeds, and audio still plays.

## Verification Method
1. The implementer must create these 6 files in `e2e/pomodoro/tier1/`.
2. They must write Playwright code implementing the logic matching the step-by-step cases above.
3. Finally, running `npx playwright test e2e/pomodoro/tier1/` should execute exactly 30 tests successfully.
