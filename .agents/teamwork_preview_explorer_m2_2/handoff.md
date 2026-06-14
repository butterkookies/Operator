# Milestone 2: Pomodoro UI Handoff

## 1. Observation
- `src/components/dashboard/Dashboard.tsx` contains inline pomodoro state (`timeLeft`, `isRunning`), countdown logic (`useEffect` on lines 79-90), and the styled pomodoro widget UI (lines 273-302).
- `src/components/dashboard/PomodoroEngine.tsx` exists as a separate file but is currently unused and lacks the advanced styling of the inline widget.
- `PROJECT.md` indicates we can "keep modifying `Dashboard.tsx` or extract the Pomodoro logic correctly."
- The selected task is managed in `Dashboard.tsx` via `activeTaskId` (line 54), but it is not currently passed to or utilized by any pomodoro logic.
- Milestone 2 requires 3 presets (Focus, Short Break, Long Break), an auto-cycle logic (every 4th break is a Long Break), and connecting the logic to the active task state.

## 2. Logic Chain
1. **Extraction**: To properly fulfill the architecture goals and separate concerns, the pomodoro logic and UI should be fully extracted from `Dashboard.tsx` into `PomodoroEngine.tsx`.
2. **Internal State & Auto-cycle**: `PomodoroEngine` must manage its own state (`mode`, `timeLeft`, `isRunning`, `completedFocusCount`). Its countdown logic must detect when `timeLeft === 0` to trigger auto-cycling:
   - If completing a `focus` session: increment `completedFocusCount`. If `completedFocusCount % 4 === 0`, switch to `longBreak` (15m). Otherwise, switch to `shortBreak` (5m).
   - If completing a break: switch to `focus` (25m).
3. **Presets UI**: The `PomodoroEngine` needs preset buttons (Focus, Short Break, Long Break) to allow the user to manually switch modes. Changing modes should pause the timer and reset `timeLeft` to the respective mode duration.
4. **Active Task Integration**: `PomodoroEngine` should accept `activeTask` and `onFocusComplete` as props. 
   - It should display the `activeTask.title` when in `focus` mode.
   - When a `focus` session auto-completes, it should call `onFocusComplete()`.
5. **Dashboard Cleanup & Callback**: `Dashboard.tsx` should implement `handleFocusComplete` to increment the `sessions_count` for the `activeTaskId` locally and in Supabase. It must remove its redundant inline timer states and render `<PomodoroEngine isZenMode={isZenMode} activeTask={activeTaskObj} onFocusComplete={handleFocusComplete} />`.

## 3. Caveats
- **Styling Migration**: `Dashboard.tsx` has beautiful styling for the pomodoro widget (e.g. pulse effect, deep work text, dynamic indigo colors). The implementer must ensure these styles are **migrated** to `PomodoroEngine.tsx` rather than settling for the minimal styles currently present in the engine file.
- **Type Definitions**: The `Task` type is defined in `Dashboard.tsx`. To avoid circular imports, `PomodoroEngine` can define a minimal `Task` type (e.g., `{ id: string; title: string; sessions_count: number }`) or `Dashboard.tsx` can export its type.
- **DB Update Timing**: `PROJECT.md` hints that DB updates on session complete might be explicitly tested in M3, but updating `sessions_count` upon completion directly aligns with M2's goal to "Connect Pomodoro logic properly to the active task state."

## 4. Conclusion
The most robust solution is to fully rewrite `PomodoroEngine.tsx` by moving the styles and layout from `Dashboard.tsx` into it, while introducing `mode` and `completedFocusCount` state for auto-cycling. `Dashboard.tsx` will then simply pass down the currently selected task and handle incrementing the session count when notified by the engine.

## 5. Verification Method
- **Implementation Check**: Verify `Dashboard.tsx` no longer has `timeLeft` and `isRunning` state, and instead imports and renders `PomodoroEngine`.
- **UI Inspection**: Check that the Pomodoro widget contains the three mode buttons and displays the active task's title when selected.
- **Functional Testing**:
  1. Temporarily change timer durations in code to 1 or 2 seconds.
  2. Verify that finishing a Focus session automatically starts a Short Break (or stops and switches mode).
  3. Verify that completing 4 Focus sessions switches to a Long Break.
  4. Verify that completing a Focus session increments the active task's "Sessions" counter.
