# Handoff Report: Tier 1 E2E Test Suite Design

## Observation
- Analyzed `TEST_INFRA.md`. Identified the 6 target features for the Tier 1 E2E Test Suite:
  1. Task Selection
  2. Session Count Display
  3. Session Count Update
  4. Timer Presets
  5. Auto-Cycle & Long Break
  6. Notifications & Audio
- Analyzed `PROJECT.md`. Confirmed interface contracts:
  - `tasks` table includes a `sessions_count` column (integer, default 0).
  - Pomodoro timer values: Focus (25m), Short Break (5m), Long Break (15m).
  - Auto-increment logic: `sessions_count = sessions_count + 1` upon Focus completion.
  - Notifications & Audio require browser push notifications and an audio chime.
- The constraint is to produce exactly 5 opaque-box Playwright test cases per feature (total 30 cases) focused on happy paths and equivalence class representatives.

## Logic Chain
- **Task Selection**: Needs to cover standard selection, switching, deselection, completed-task exclusions, and new-task immediate selectability. These represent the primary UI states for task interactivity.
- **Session Count Display**: Needs to cover initialization (0), existing values (N > 0), visibility on the list, visibility on the active widget, and persistence on completed tasks.
- **Session Count Update**: Needs to cover positive DB and UI updates on Focus complete, and negative checks for pauses, resets, and breaks to ensure accurate tracking.
- **Timer Presets**: Needs to cover the specific time assignments (25, 5, 15) and transitions between these states both while idle and active.
- **Auto-Cycle & Long Break**: Needs to cover state machine transitions: Focus -> Short Break, Break -> Focus, 4th Focus -> Long Break, and the cycle reset after the long break.
- **Notifications & Audio**: Needs to verify Web APIs (`Notification`, `HTMLAudioElement`) are called correctly during timer completion events, and not triggered during premature termination (pauses/resets).

## Caveats
- Time advancement is assumed to be mocked (e.g., using Playwright's `page.clock` or similar `fast-forward` mechanisms) to avoid waiting 25 minutes per test.
- Supabase calls are assumed to be directed to a local dev instance with predictable state seeding to allow for robust opaque-box testing without flakiness.
- UI locators (like test IDs) are implied but not hardcoded in this strategy, as the tests must remain opaque-box and requirement-driven.

## Conclusion
The Tier 1 E2E Test Suite is structured into 6 Playwright TS files located in `e2e/pomodoro/tier1/`. Below is the detailed logic for the 30 test cases.

### 1. `e2e/pomodoro/tier1/task_selection.spec.ts`
1. **Select Uncompleted Task**: Verify that clicking an uncompleted task in the list sets it as the active task in the Pomodoro widget.
2. **Switch Active Task**: Verify that clicking a different uncompleted task updates the active task in the widget without side effects.
3. **Deselect Active Task**: Verify that clicking the currently active task (or a clear button) deselects it, returning the widget to a standalone timer mode.
4. **Completed Task Exclusion**: Verify that tasks marked as completed cannot be selected as the active Pomodoro task (e.g., selection action is disabled or hidden).
5. **Immediate Selection of New Task**: Verify that a newly created task can immediately be selected as the active Pomodoro task.

### 2. `e2e/pomodoro/tier1/session_count_display.spec.ts`
1. **Initial Zero Display**: Verify that a newly created task displays a session count of "0" on the UI.
2. **Existing Count Display**: Verify that a task loaded from the database with an existing `sessions_count` (e.g., 3) correctly displays this number.
3. **List Visibility**: Verify that the session count is clearly visible on every uncompleted item in the task list.
4. **Widget Visibility**: Verify that when a task is selected, its session count is prominently displayed within the active Pomodoro widget.
5. **Completed Task Display**: Verify that when a task is marked as completed, its final session count remains visible in the completed tasks list.

### 3. `e2e/pomodoro/tier1/session_count_update.spec.ts`
1. **UI Increment on Focus Complete**: Verify that when a Focus session completes, the active task's session count increments by exactly 1 in the UI immediately.
2. **DB Persistence on Complete**: Verify that after a Focus session completes, refreshing the page retains the incremented session count (confirming backend update).
3. **No Increment on Pause/Reset**: Verify that pausing or resetting a Focus timer before it reaches 0:00 does not increment the session count.
4. **No Increment on Breaks**: Verify that completing a Short Break or Long Break does not increment the active task's session count.
5. **Consecutive Increments**: Verify that completing two consecutive Focus sessions correctly increments the count twice (e.g., 0 to 1, then 1 to 2).

### 4. `e2e/pomodoro/tier1/timer_presets.spec.ts`
1. **Focus Preset Time**: Verify that clicking the "Focus" preset sets the timer display to 25:00.
2. **Short Break Preset Time**: Verify that clicking the "Short Break" preset sets the timer display to 05:00.
3. **Long Break Preset Time**: Verify that clicking the "Long Break" preset sets the timer display to 15:00.
4. **Interrupt Running Timer**: Verify that clicking a different preset while a timer is running automatically stops the timer and applies the new preset time.
5. **Active State Indication**: Verify that the currently selected preset is visually distinct (e.g., highlighted tab or button) from the inactive presets.

### 5. `e2e/pomodoro/tier1/auto_cycle.spec.ts`
*(Requires clock mocking to fast-forward time)*
1. **Focus to Short Break Transition**: Verify that completing the 1st Focus session automatically switches the active preset to "Short Break".
2. **Break to Focus Transition**: Verify that completing a Short Break automatically switches the active preset back to "Focus".
3. **Fourth Focus to Long Break**: Verify that completing the 4th consecutive Focus session automatically switches the active preset to "Long Break".
4. **Cycle Reset After Long Break**: Verify that after completing a Long Break, the cycle counter resets (the next completed Focus session leads to a Short Break, not a Long Break).
5. **Manual Preset Override**: Verify that if a user manually clicks "Focus" during a break, the timer accurately reflects the 25:00 Focus state and respects the ongoing cycle count.

### 6. `e2e/pomodoro/tier1/notifications_audio.spec.ts`
*(Requires mocking Web APIs: `Notification` and `HTMLAudioElement.prototype.play`)*
1. **Focus Complete Chime**: Verify that completing a Focus session successfully calls the `.play()` method on the designated audio element.
2. **Focus Complete Notification**: Verify that completing a Focus session triggers a browser `Notification` with content indicating Focus completion.
3. **Break Complete Chime**: Verify that completing a Break session successfully calls the `.play()` method on the designated audio element.
4. **Break Complete Notification**: Verify that completing a Break session triggers a browser `Notification` with content indicating Break completion.
5. **No Alert on Reset**: Verify that manually resetting the timer before completion does not trigger either the audio chime or the browser notification.

## Verification Method
- **File Output Validation**: Confirm the `handoff.md` lists exactly 6 feature categories and 5 test cases per feature.
- **Coverage Check**: Review the test strategies to ensure no implementation-specific locators are hardcoded, confirming an opaque-box approach.
- **Traceability**: Match the 6 features to `TEST_INFRA.md` definitions and `PROJECT.md` interface contracts to verify full requirement alignment.
