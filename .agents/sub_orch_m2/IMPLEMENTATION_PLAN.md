# Implementation Plan for M2

## Approach
Extract Pomodoro logic and UI from `Dashboard.tsx` to `PomodoroEngine.tsx`.

## Changes to `PomodoroEngine.tsx`
1. Migrate the advanced styling and layout for the Pomodoro widget from `Dashboard.tsx` into this component.
2. Accept props: `isZenMode: boolean`, `activeTask: any` (you can define a minimal type for the task).
3. State required:
   - `mode`: `'focus' | 'shortBreak' | 'longBreak'` (default `'focus'`)
   - `timeLeft`: number (default 25 * 60)
   - `isRunning`: boolean
   - `focusCount`: number (default 0)
4. UI Additions:
   - Three preset buttons inside the widget: "Focus" (25m), "Short Break" (5m), "Long Break" (15m). Clicking one pauses the timer and sets `mode` and `timeLeft` accordingly.
   - Display `activeTask.title` when in Focus mode. If no active task, display "DEEP WORK". In break modes, display "SHORT BREAK" or "LONG BREAK".
5. Auto-cycle Logic (in a `useEffect` for the countdown):
   - When `timeLeft === 0`, stop the timer.
   - If completing a `'focus'` session: increment `focusCount`. If `(focusCount + 1) % 4 === 0`, switch to `'longBreak'` (15m). Otherwise switch to `'shortBreak'` (5m).
   - If completing a break: switch to `'focus'` (25m).
   - Do NOT implement database updates or Supabase callbacks here (those are for M3).

## Changes to `Dashboard.tsx`
1. Remove inline Pomodoro state (`timeLeft`, `isRunning`) and the `useEffect` countdown logic.
2. Remove the inline Pomodoro widget JSX.
3. Import and render `<PomodoroEngine isZenMode={isZenMode} activeTask={tasks.find(t => t.id === activeTaskId) || null} />` in place of the removed widget.

**CRITICAL INTEGRITY REMINDER**: Do NOT create dummy implementations. Provide genuine React code.
