# Handoff Report: Milestone 2 - Pomodoro UI & Engine Updates

## Observation
- `src/components/dashboard/Dashboard.tsx` handles the Pomodoro state inline (`timeLeft`, `isRunning` at lines 38-40) and implements its UI (lines 273-302). It uses a hardcoded 25-minute timer.
- The `useEffect` for the countdown (lines 79-90 in `Dashboard.tsx`) only decrements the timer and stops it at 0, with no cycle or transition logic.
- `src/components/dashboard/PomodoroEngine.tsx` is an isolated, very basic component not used in `Dashboard.tsx`. It lacks the advanced styling present in `Dashboard.tsx` (like the glowing background, progress bar, Zen mode transitions).
- `Dashboard.tsx` tracks active tasks via `activeTaskId` and `tasks` state, but the current Pomodoro widget UI does not show or interact with the active task.
- The progress bar calculation (line 301) uses a hardcoded `25 * 60` for the total time.

## Logic Chain
1. **File to Modify**: It is preferable to modify `Dashboard.tsx` directly rather than extracting to or modifying `PomodoroEngine.tsx`, because `Dashboard.tsx` contains complex layout and Zen mode styling that would be difficult to cleanly move without regressions.
2. **State Additions**: We need to introduce new states in `Dashboard.tsx`: `pomodoroMode` ('focus', 'shortBreak', 'longBreak') and `focusCount` (number).
3. **Auto-cycle Logic**: The countdown `useEffect` should check if `timeLeft === 0`. If so:
   - If mode is `focus`: increment `focusCount`. If `(focusCount + 1) % 4 === 0`, switch to `longBreak` (15m). Otherwise, switch to `shortBreak` (5m).
   - If mode is a break: switch back to `focus` (25m).
4. **Presets**: Add UI buttons inside the Pomodoro widget to allow manual selection of the three modes. Update the `resetTimer` function to reset to the current mode's duration instead of always 25 minutes.
5. **Active Task Connection**: Retrieve the active task (`tasks.find(t => t.id === activeTaskId)`) and render its title inside the Pomodoro widget, visually indicating what the user is currently focusing on.
6. **Progress Bar**: Calculate the progress bar width dynamically based on the maximum time of the current mode (e.g., `totalTime = mode === 'focus' ? 1500 : mode === 'shortBreak' ? 300 : 900`).

## Caveats
- Milestone 3 is slated to add "Auto-increment `sessions_count` on focus session complete" via Supabase. We are deferring the database update for session counts to M3 and only tracking `focusCount` locally for the auto-cycle logic.
- The prompt asks to "Connect Pomodoro logic properly to the active task state", which we interpreted as displaying the active task in the Pomodoro widget. If there are other expectations (e.g., preventing the timer from starting without a task), they are not specified in `SCOPE.md`.

## Conclusion
The Implementer should update the inline Pomodoro logic within `src/components/dashboard/Dashboard.tsx`. They need to add `pomodoroMode` and `focusCount` states, update the timer's `useEffect` to handle automatic mode transitions, add UI preset buttons, dynamically calculate the progress bar, and display the `activeTaskId`'s task title in the widget.

## Verification Method
1. Start the app (e.g., `npm run dev`).
2. Click a task in the "Master Tasks" list to set it as active; verify its title is displayed in the Pomodoro widget.
3. Click the new "Focus", "Short Break", and "Long Break" preset buttons; verify the timer updates to 25:00, 05:00, and 15:00 respectively.
4. Temporarily edit the code to set the timer duration to a few seconds, let the timer run down, and verify that it correctly cycles: Focus -> Short Break -> Focus ... and every 4th break is a Long Break.
