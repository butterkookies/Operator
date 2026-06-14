# Project: Operator AI

## Architecture
- `App.tsx`: Main application wrapper containing the responsive navigation, Settings Modal (with API key manager), and routing between pages.
- `OperatorChat.tsx`: Core AI assistant interface powered by Gemini. Supports interactive interviewing, multiple API key rotation for free-tier resilience, and a custom time-range picker UI that mimics Claude's layout.
- `ZenDashboard.tsx`: Minimalist Pomodoro and tasks dashboard.
- `ThoughtInbox.tsx`: A place to capture random thoughts or tasks directly from the AI.
- Supabase: Backend PostgreSQL database storing user settings (like the `gemini_api_key` array) and chat history.

## Code Layout
- Existing codebase: React + Vite + Supabase + Tailwind CSS.
- Main entry points: `src/App.tsx`, `src/components/chat/OperatorChat.tsx`.
- Supabase client: `src/lib/supabase.ts`.
- All Lucide-react icons are used for sleek UI.

## Recent Milestones Achieved
| # | Name | Scope |
|---|------|-------|
| 1 | AI Integration | Gemini Flash connected to Google Calendar with `ask_user_question`, `schedule_calendar_event`, `delete_calendar_event` functions. |
| 2 | Free-Tier Resilience | Built a dynamic API Key Manager in `App.tsx` that accepts multiple Google Account keys. The AI automatically rotates to the next key upon hitting a 429 Rate Limit error. |
| 3 | Claude UI Redesign | Rebuilt the `ask_user_question` interface to display a sleek, dark-mode vertical stack of buttons, identical to Claude's interactive interviews. |
| 4 | Custom Time Range | Added an `inputType: 'timeRange'` feature so the AI can render native HTML time pickers for start/end times instead of generic text boxes. |

## Interface Contracts
### Supabase ↔ UI
- `user_settings` table contains `gemini_api_key` stored as a JSON string of an array: `[{ email: 'account@gmail.com', key: 'AIza...' }]`.
- `OperatorChat.tsx` dynamically deserializes this array to track exhausted keys in-memory.
