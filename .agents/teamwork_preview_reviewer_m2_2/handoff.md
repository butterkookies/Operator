## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Major] Finding 1: Background Tab Throttling & Timer Drift

- **What**: The Pomodoro countdown relies on a naive `setInterval` that decrements `timeLeft` by 1 every second. Additionally, because `timeLeft` is in the `useEffect` dependency array, the interval is cleared and recreated every second.
- **Where**: `src/components/dashboard/PomodoroEngine.tsx` (lines 18-42)
- **Why**: Modern browsers heavily throttle `setInterval` in inactive background tabs (often clamped to 1 execution per minute). A 25-minute Pomodoro timer will take exponentially longer to complete if the user minimizes the window or switches tabs to do deep work. Furthermore, clearing and recreating the interval every 1 second causes cumulative drift even in an active tab.
- **Suggestion**: Use an absolute timestamp approach. When the timer starts, calculate `endTime = Date.now() + timeLeft * 1000`. Use `setInterval` only to update the UI based on `Math.max(0, Math.round((endTime - Date.now()) / 1000))`. This ensures the timer remains accurate regardless of browser throttling.

### [Minor] Finding 2: Inefficient React Re-renders / Setup Overhead

- **What**: Recreating the interval on every tick.
- **Where**: `src/components/dashboard/PomodoroEngine.tsx` (lines 18-42)
- **Why**: Since `timeLeft` is in the `useEffect` dependency array, the `setInterval` is destroyed and recreated 1,500 times during a standard 25-minute focus session, adding unnecessary overhead.
- **Suggestion**: Extract the interval logic so it does not depend on `timeLeft` changing, or switch to the timestamp-based approach suggested above.

## Verified Claims

- M2 UI requirements (Focus, Short Break, Long Break presets) → verified via `view_file` → PASS
- Auto-cycle logic (every 4th break is Long) → verified via `view_file` → PASS
- Pomodoro integration with `activeTask` → verified via `view_file` → PASS
- Build succeeds without errors → verified via `npm run build` → PASS

## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [High] Challenge 1: Background Execution Failure
- **Assumption challenged**: `setInterval(..., 1000)` fires precisely every 1000ms regardless of browser state.
- **Attack scenario**: User starts a 25-minute timer and minimizes the browser to focus on reading a document or doing work in another application. The browser throttles the inactive tab to 1 tick per minute. The timer actually takes 25 hours to reach 0 instead of 25 minutes.
- **Blast radius**: Core Pomodoro functionality is broken, rendering the tool useless for actual productivity tracking.
- **Mitigation**: Implement absolute time tracking (`Date.now() + remainingTime`) rather than relative decrementing.
