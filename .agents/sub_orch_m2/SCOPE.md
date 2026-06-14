# Scope: Milestone 2 - Pomodoro UI

## Architecture
- `src/components/dashboard/Dashboard.tsx` or `src/components/dashboard/PomodoroEngine.tsx`: The pomodoro state and view.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2 | Pomodoro UI | Implement Focus (25m), Short Break (5m), Long Break (15m) presets. Auto-cycle logic (every 4th break is a Long Break). The Pomodoro component should be aware of these modes and manage its internal state correctly. Connect Pomodoro logic properly to the active task state. | M1 | IN_PROGRESS |

## Interface Contracts
- Modes: Focus, Short Break, Long Break.
- Timer lengths: 25m, 5m, 15m.
- Cycle logic: Focus -> Short Break -> Focus -> Short Break -> Focus -> Short Break -> Focus -> Long Break -> Focus ...
- Active task is selected from uncompleted tasks (implemented in M1). The Pomodoro logic needs to interact with this state.
