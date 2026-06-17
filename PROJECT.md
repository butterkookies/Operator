# Project: Operator AI

## Architecture
- `App.tsx`: Main application wrapper containing the responsive navigation, Settings Modal (with API key manager), and routing between pages.
- `ChatContext.tsx`: Global React Context managing Supabase chat history state across the entire application (sessions, messages, etc).
- `ResponsiveNav.tsx`: Single Unified Sidebar that houses global navigation (Dashboard, Inbox) alongside a flexible scrollable history list for recent chats.
- `OperatorChat.tsx`: Core AI assistant interface powered by Gemini. Supports interactive interviewing, multiple API key rotation for free-tier resilience, and a custom time-range picker UI that mimics Claude's layout. Features an immersive, edge-to-edge flat UI without inner containers.
- `ZenDashboard.tsx`: Minimalist Pomodoro and tasks dashboard.
- `ThoughtInbox.tsx`: A place to capture random thoughts or tasks directly from the AI.
- Supabase: Backend PostgreSQL database storing user settings (like the `gemini_api_key` array) and chat history.

## Code Layout
- Existing codebase: React + Vite + Supabase + Tailwind CSS.
- Main entry points: `src/App.tsx`, `src/components/chat/OperatorChat.tsx`, `src/components/layout/ResponsiveNav.tsx`.
- State Management: `src/contexts/ChatContext.tsx` handles global chat logic.
- Supabase client: `src/lib/supabase.ts`.
- Wireframes: `wireframe-UI.html` used for high-fidelity interactive UI/UX prototyping.
- All Lucide-react icons are used for sleek UI.

## Recent Milestones Achieved
| # | Name | Scope |
|---|------|-------|
| 1 | AI Integration | Gemini Flash connected to Google Calendar with `ask_user_question`, `schedule_calendar_event`, `delete_calendar_event` functions. |
| 2 | Free-Tier Resilience | Built a dynamic API Key Manager in `App.tsx` that accepts multiple Google Account keys. The AI automatically rotates to the next key upon hitting a 429 Rate Limit error. |
| 3 | Claude UI Redesign | Rebuilt the `ask_user_question` interface to display a sleek, dark-mode vertical stack of buttons, identical to Claude's interactive interviews. |
| 4 | Custom Time Range | Added an `inputType: 'timeRange'` feature so the AI can render native HTML time pickers for start/end times instead of generic text boxes. |
| 5 | UX Overhaul | Removed the "double sidebar" layout in favor of a Single Unified Sidebar (ChatGPT/Claude style). Lifted state to `ChatContext` so global navigation and chat history live seamlessly in `ResponsiveNav.tsx`. |
| 6 | Edge-to-Edge Design | Flattened the chat container in `OperatorChat.tsx` and removed nested margins so it natively anchors to the sidebar, drastically improving screen real estate. |
| 7 | Session Persistence | Fixed "Hello Operator" text flickering on reload and implemented `localStorage` persistence for `activeSessionId` so the user remains in their current conversation. |
| 8 | Premium Hero UI | Designed a Claude-style empty state hero section in `OperatorChat.tsx` featuring a centered layout, stylish serif typography, suggestion chips, and refined history loading logic (`isHistoryLoaded`) to prevent UI flickering on page reloads. |
## Interface Contracts
### Supabase ↔ UI
- `user_settings` table contains `gemini_api_key` stored as a JSON string of an array: `[{ email: 'account@gmail.com', key: 'AIza...' }]`.
- `OperatorChat.tsx` dynamically deserializes this array to track exhausted keys in-memory.
