# Verification & Challenge Report: Milestone 2 Implementation

## 1. Observation
- The worker successfully extracted `PomodoroEngine.tsx` and integrated it into `Dashboard.tsx`.
- The state machine logic uses `useEffect` to manage `timeLeft`, `mode`, and `isRunning`.
- `npm run build` succeeds, but `npm run lint` fails with 26 errors. The worker introduced a critical React Hook violation in `PomodoroEngine.tsx`: `Calling setState synchronously within an effect can trigger cascading renders` (line 25).
- The countdown relies on `setTimeLeft(prev => prev - 1)` within a naive `setInterval(..., 1000)`.
- The connection to `activeTask` is strictly visual (the title changes to the task title). There is no callback to increment the task's `sessions_count` in the local React state when a Pomodoro finishes.

## 2. Logic Chain
- **State Machine Verification**: A programmatic trace of the `useEffect` logic confirms the auto-cycle transitions are functionally correct. When a Focus session (25m) reaches 0, `focusCount` increments. On the 4th completion, `mode` is set to `longBreak` (15m). Otherwise, it sets `shortBreak` (5m). When any break reaches 0, it reverts to `focus` (25m). The timer correctly stops between cycles, requiring the user to press Play (standard Pomodoro behavior).
- **Linter Failure**: The `useEffect` checks `if (timeLeft === 0 && isRunning)` and directly calls `setIsRunning(false)`, `setMode()`, and `setTimeLeft()`. Calling state setters synchronously inside the effect body triggers immediate re-renders, causing cascading renders. This violates React best practices and fails the project's strict ESLint rules.
- **Timer Drift Vulnerability**: Browsers aggressively throttle `setInterval` for background tabs (often to 1 execution per minute). Because the logic uses naive decrements (`prev - 1`), a 25-minute Pomodoro will drift heavily and take much longer in real time if the user switches tabs to work.
- **Task Connection**: The requirement was to "Connect Pomodoro logic properly to the active task state." While displaying the task title is implemented, completed Pomodoros do not update the UI's `sessions_count` for the active task. An `onSessionComplete` callback prop should ideally be emitted from `PomodoroEngine`.

## 3. Caveats
- The timer state machine logic itself is mathematically and logically sound, assuming a perfectly executing runtime. The flaws are entirely in how it interacts with React rendering and browser background processing.
- The lack of a local `sessions_count` update might be intentional if the worker deferred *all* session tracking to Milestone 3, but the M3 instructions specify "Do NOT implement *database* updates", implying local UI state should probably be wired up now.

## 4. Conclusion
- **Risk Assessment**: **HIGH**. The implementation functionally works in a happy path, but it is architecturally flawed and fails CI/CD linting checks.
- The `PomodoroEngine.tsx` needs to be refactored to:
  1. Calculate remaining time based on timestamp diffs (e.g., `endTime - Date.now()`) to survive background tab throttling.
  2. Move the session completion logic out of the synchronous `useEffect` body (preferably into a helper function called by the interval, or by using a `useRef` for tracking completion) to fix the ESLint failure.
  3. Emit an `onPomodoroComplete` event so `Dashboard.tsx` can increment the active task's `sessions_count` in the UI.

## 5. Verification Method
1. **Linter**: Run `npm run lint` and observe the `react-hooks/set-state-in-effect` error in `PomodoroEngine.tsx`.
2. **Timer Drift**: Start the timer, switch to a heavy different tab for 2 minutes, return, and observe that the timer has only ticked down by a few seconds.
3. **Task Connection**: Complete a 1-second Pomodoro (by temporarily modifying the source) and observe that the `sessions_count` on the active task in the left pane remains `0`.

---

## Challenge Summary (Adversarial Review)

### High Challenge 1: Background Tab Timer Drift
- **Assumption challenged**: `setInterval(..., 1000)` executes exactly every 1000ms.
- **Attack scenario**: The user starts a focus session and switches tabs to read a PDF or watch a lecture. The browser throttles the inactive tab's JavaScript execution to save battery.
- **Blast radius**: The Pomodoro timer drifts significantly. A 25-minute session takes 40+ minutes of real time, destroying the user's study schedule.
- **Mitigation**: When the timer starts, calculate `endTime = Date.now() + timeLeft * 1000`. Inside the interval, calculate `Math.max(0, Math.round((endTime - Date.now()) / 1000))` instead of naively decrementing by 1.

### Medium Challenge 2: Synchronous State Updates in Effect
- **Assumption challenged**: Calling multiple state setters inside a `useEffect` body is safe.
- **Attack scenario**: `timeLeft` hits 0. The effect runs and synchronously calls 4 state setters.
- **Blast radius**: Fails ESLint checks (`npm run lint`), breaking CI/CD. It also forces React to perform cascading renders, which can cause subtle UI stuttering or edge-case bugs in complex trees.
- **Mitigation**: Handle the completion logic inside the `setInterval` callback when `prev <= 1`, rather than letting the state settle at `0` and catching it in a separate effect execution.

### Low Challenge 3: Incomplete Active Task Connection
- **Assumption challenged**: Connecting logic to active task only requires displaying the title.
- **Attack scenario**: The user finishes a Focus session, expecting their task's "Sessions: 0" counter to increment to 1. It does not.
- **Blast radius**: UI feels disconnected. User does not get visual feedback that their work was tracked against the task.
- **Mitigation**: Add an `onSessionComplete: (taskId: string) => void` prop to `PomodoroEngine` and increment the local state in `Dashboard.tsx`.
