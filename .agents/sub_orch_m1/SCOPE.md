# Scope: Milestone 1: DB & Models

## Architecture
- Supabase Database Tasks Table
- React Next.js Dashboard component

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB & UI Update | Add `sessions_count` to tasks in Supabase. Update `Task` type in `Dashboard.tsx`. Update UI in `Dashboard.tsx` to allow selecting an active task from uncompleted tasks, and display the `sessions_count` indicator. | none | DONE |

## Interface Contracts
### Supabase ↔ Dashboard
- `Task` object gets `sessions_count` integer field.
