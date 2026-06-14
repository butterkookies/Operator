# Original User Request

## Initial Request — 2026-06-12T14:42:16+08:00

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Implement the Pomodoro Timer overhaul in the Operator dashboard, including task integration, automatic focus/break cycles, and audio/visual notifications.

Working directory: c:\Users\user\Documents\ANDREI_FILES\DEVFILES\PROJECTS\Operator
Integrity mode: development

## Requirements

### R1. Database Update
Add a `sessions_count` integer column (default `0`) to the `tasks` table in Supabase. The agent team should determine the best method to execute this schema change (e.g. executing SQL or providing a script).

### R2. Task Integration
Update the UI in `Dashboard.tsx` to allow selecting an active task from uncompleted tasks. Display the `sessions_count` indicator next to tasks. Update Supabase when a focus session completes.

### R3. Pomodoro Presets & Cycles
Implement Focus (25m), Short Break (5m), and Long Break (15m) modes. Auto-cycle between them (every 4th break is a Long Break).

### R4. Notifications
Request browser Notification permissions. Play an audio chime and show a browser push notification when a timer cycle reaches 0. Use a placeholder URL for the audio if necessary.

## Acceptance Criteria

### Verification Method: Agent-as-Judge
An independent agent must launch the local dev server and verify the following rubric objectively:

- [ ] A specific task can be selected within the Pomodoro widget.
- [ ] Setting the timer to 1 second (for testing) and letting it run down correctly triggers the transition to a "Short Break" mode.
- [ ] Upon the timer finishing, an audio chime plays and a browser notification is requested/displayed.
- [ ] Upon completing a focus session, the `sessions_count` on the selected task increments in both the UI and the Supabase database.
- [ ] After completing 4 focus sessions, the next break mode is automatically set to "Long Break".

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
