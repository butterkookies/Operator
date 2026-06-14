# Milestone 2: Pomodoro UI Handoff Report

## Observation
- `Dashboard.tsx` contains an inline Pomodoro widget (lines 274-302) with state variables `timeLeft` and `isRunning`, a `useEffect` for the countdown, and progress bar UI logic.
- `PomodoroEngine.tsx` exists but is a barebones, unused component. It lacks the styling and advanced UI present in `Dashboard.tsx`.
- `Dashboard.tsx` manages `activeTaskId` and a `tasks` array, but the Pomodoro widget is currently hardcoded with the text "DEEP WORK" / "FOCUS FLOW" and does not reflect the selected active task.
- `SCOPE.md` specifies that Milestone 2 requires: presets for Focus (25m), Short Break (5m), and Long Break (15m); an auto-cycle logic where every 4th break is a Long Break; the Pomodoro component must manage its internal state and be aware of these modes; and Pomodoro logic must connect properly to the active task state.

## Logic Chain
1. To satisfy the architectural direction in `PROJECT.md` and keep code modular, the inline Pomodoro widget and its logic must be extracted from `Dashboard.tsx` and moved into `PomodoroEngine.tsx`.
2. `PomodoroEngine.tsx` requires new state properties: `mode` (`'focus' | 'shortBreak' | 'longBreak'`) and `focusCount` (to track completed focus sessions for the auto-cycle logic).
3. The interval countdown logic from `Dashboard.tsx` needs to be moved to `PomodoroEngine.tsx` and expanded: when `timeLeft === 0`, it should stop the timer, increment `focusCount` (if completing a focus session), and automatically set the next mode and duration based on the sequence (Focus -> Short Break -> Focus -> Short Break -> Focus -> Short Break -> Focus -> Long Break -> Focus).
4. `PomodoroEngine.tsx` must render UI buttons for the presets (Focus, Short Break, Long Break) allowing manual mode switching.
5. `PomodoroEngine.tsx` should accept an `activeTask` prop (of type `Task | null`). The UI label that currently displays "DEEP WORK" should be updated to display `activeTask.title` when in a focus session (falling back to a default if no task is selected), or "SHORT BREAK" / "LONG BREAK" when in break modes.
6. `Dashboard.tsx` should replace its inline Pomodoro widget code and states with `<PomodoroEngine isZenMode={isZenMode} activeTask={tasks.find(t => t.id === activeTaskId) || null} />`.

## Caveats
- Auto-incrementing the task's `sessions_count` in the database is scheduled for Milestone 3 (according to `PROJECT.md`), so I did not propose implementing the Supabase update callback here. The Pomodoro engine just needs to handle local UI state, auto-cycling, and rendering the active task.
- The `isZenMode` styles inside `PomodoroEngine.tsx` need to be unified with the advanced styling copied over from `Dashboard.tsx` to maintain the design.

## Conclusion
Refactor `Dashboard.tsx` by removing the inline Pomodoro state and UI, and importing `PomodoroEngine`. Update `PomodoroEngine.tsx` to include the `Dashboard`'s sleek UI along with the newly required mode states, auto-cycle `useEffect` logic, preset buttons, and dynamic display of the active task's title. 

## Verification Method
1. Run `npm run build` to verify there are no TypeScript errors.
2. Run `npm run dev` and test the UI manually:
   - Select a task; the Pomodoro widget should dynamically show its title instead of "DEEP WORK".
   - Click the preset buttons to ensure the timer updates to 25:00, 05:00, and 15:00 respectively.
   - Start a focus timer, manually edit the state or let it run down to 0, and verify the auto-cycle transitions to a short break, then focus, and eventually a long break on the 4th cycle.
