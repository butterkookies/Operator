# Architecture Context

## App Purpose
**Operator: AI Command Center**
A unified web application designed to combat procrastination for college students. Operator acts as an intelligent agent. The user gives it natural language commands via the Unified Console, and it parses them, clarifies details, and posts directly to a persistent database and calendar.

## Tech Stack
- **Framework:** Vite + React (TypeScript SPA)
- **Frontend:** Tailwind CSS v4 (Hardware-accelerated native CSS transitions)
- **Icons:** Lucide React
- **Backend/Database:** Supabase (PostgreSQL for Tasks, Users, Workspaces)
- **AI Backend:** Google Gemini API

## Core Data Flow
**Relational First Architecture:**
Instead of a scattered structure (Notion + Firebase + Next.js), Operator uses Supabase as the central nervous system.
1. The AI parses the user command in the `UnifiedConsole`.
2. Structured task data is inserted directly into the Supabase PostgreSQL database.
3. The UI (`TaskPanel`, `TimelinePanel`) listens to Supabase real-time updates and re-renders instantaneously.

## Structural Mapping
- `src/App.tsx`: Main dashboard layout grid (Sidebar, Timeline, Console, Task List) with Zen Mode toggling.
- `src/components/layout/`: Global layout elements (Sidebar, BottomNav).
- `src/components/dashboard/`: Specific fixed-slot dashboard panels (TimelinePanel, UnifiedConsole, TaskPanel, PomodoroEngine).
- Backend APIs will be handled directly via the `@supabase/supabase-js` client in the browser or Supabase Edge Functions.
