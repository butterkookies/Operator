# Background Investigation

## Observation
1. **Background Tab Throttling (MAJOR)**: In `src/components/dashboard/PomodoroEngine.tsx` lines 18-42, `timeLeft` is updated by subtracting 1 every second. Browser throttling will cause `setInterval` to run less frequently, resulting in slow countdowns.
2. **Linter Error**: The linter fails with `react-hooks/set-state-in-effect` because `setIsRunning(false)` is called synchronously inside the effect body on line 25 when `timeLeft === 0 && isRunning`.
3. **E2E Test Mismatch**: In `src/components/dashboard/Dashboard.tsx` at line 283, the UI renders the text "Focus Console", which causes the e2e test to fail because it expects "Operator Focus".
4. **Local sessions_count increment**: The current active task state is managed in `src/components/dashboard/Dashboard.tsx` (line 47). `PomodoroEngine` does not have a mechanism to notify the dashboard when a session is completed.

## Logic Chain
1. To fix the throttling, we need to introduce an `endTime` state in `PomodoroEngine` and calculate `remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000))`. This absolute calculation ensures the timer stays accurate regardless of the interval firing rate.
2. To fix the linter error, we should perform the completion logic inside the `setInterval` callback when `remaining <= 0`. This avoids calling state setters synchronously within the main body of the `useEffect`.
3. To fix the e2e test, we simply replace the string "Focus Console" with "Operator Focus" in `Dashboard.tsx`.
4. To fix the missing local state increment, we should pass an `onSessionComplete` callback from `Dashboard.tsx` to `PomodoroEngine`. When `remaining <= 0` and `mode === 'focus'`, `PomodoroEngine` will call this callback, which will map over `tasks` and increment `sessions_count` for the `activeTaskId`.

## Caveats
- Using `setInterval` in background tabs can still be throttled to 1 minute, meaning the transition from focus to break might happen up to a minute late if the tab is heavily throttled. Complete exactness would require Web Workers, but the absolute timestamp approach satisfies the immediate problem of the timer taking significantly longer than 25 minutes.
- The `onSessionComplete` callback will recreate the interval in `PomodoroEngine` if its reference changes, but the absolute `endTime` ensures the timer remains accurate despite interval recreations.

## Conclusion
The fixes require modifying both `PomodoroEngine.tsx` and `Dashboard.tsx`. 
`PomodoroEngine.tsx` needs to manage an `endTime` state, evaluate remaining time in the interval, handle completion inside the callback, and call an `onSessionComplete` prop. 
`Dashboard.tsx` needs to rename "Focus Console" and provide an `onSessionComplete` handler that increments `sessions_count`.

## Verification Method
- Run `npm run lint` to verify the `react-hooks/set-state-in-effect` error is resolved.
- Check the UI to ensure "Operator Focus" is displayed.
- Test the Pomodoro timer by setting a preset, waiting a few seconds, pausing, and resuming, to verify that it functions correctly with the `endTime` logic.
- Complete a focus session with an active task selected and verify that the "Sessions: X" count on the task increments.
