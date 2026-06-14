# Implementation Plan for M2 (Iteration 2)

## Goal
Fix the issues found in the previous iteration of Milestone 2:
1. Background Tab Throttling
2. `useEffect` linter error caused by synchronous state updates
3. E2E test mismatch
4. Local React state update for `sessions_count`

## Changes to `PomodoroEngine.tsx`
1. **Background Throttling**: 
   - Add a new state: `endTime: number | null`.
   - When the timer is started (in `toggleTimer`), set `endTime = Date.now() + timeLeft * 1000`.
   - When paused or reset, clear `endTime`.
   - Inside the `useEffect` `setInterval`, calculate the remaining time: `const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000))`. Update `timeLeft` to `remaining`.
2. **Linter Error / Auto-Cycle Logic**:
   - Move the mode transition logic (focus to break, etc.) **inside** the `setInterval` callback when `remaining === 0`.
   - When `remaining === 0`:
     - Clear the interval.
     - If the current mode is `'focus'`:
       - Increment `focusCount`.
       - Call `onSessionComplete()` (if provided).
       - If `(newFocusCount) % 4 === 0`, switch to `'longBreak'` (15m). Otherwise switch to `'shortBreak'` (5m).
     - If the current mode is a break, switch to `'focus'` (25m).
     - Keep `isRunning = false` (wait for the user to press Play again, just like a standard Pomodoro).
3. **New Prop**: Accept `onSessionComplete?: () => void`.

## Changes to `Dashboard.tsx`
1. **E2E Test Fix**: Rename the text `"Focus Console"` (around line 283) to `"Operator Focus"`.
2. **Local Session Update**: 
   - Create a function `handleSessionComplete` that updates the `tasks` state, incrementing `sessions_count` by 1 for the task matching `activeTaskId`.
   - Pass this function to `<PomodoroEngine />` via the `onSessionComplete` prop.
   - Do NOT implement Supabase database calls (that is reserved for M3).

**CRITICAL INTEGRITY REMINDER**: Do NOT cheat tests. Provide genuine React code.
