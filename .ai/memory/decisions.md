# Architecture Decision Records (ADRs)

### 1. Framework: Next.js to Vite (SPA)
**Decision:** Pivoted from Next.js (App Router) to Vite (React SPA).
**Reason:** A personal operator dashboard needs to feel like rapid desktop software. SSR/hydration overhead from Next.js is unnecessary. Vite provides significantly faster development loops and leaner production bundles.

### 2. Database: Supabase over Firebase & Notion
**Decision:** Selected Supabase (PostgreSQL) instead of Firebase or Notion for core task storage.
**Reason:** Task management requires complex, relational queries (filtering tasks by date, tags, completion, and sorting). Firebase (NoSQL) is poor at this, and Notion's API is too slow and acts as a single point of failure.

### 3. UI Layout: Fixed Slots + Zen Mode
**Decision:** Removed `dnd-kit` (drag-and-drop complexity) in favor of a rigid, fixed 3-column grid (Left, Center, Right) with a "Zen Mode" toggle.
**Reason:** A cluttered UI causes decision fatigue. The Fixed Slot layout guarantees consistency, while Zen Mode uses CSS transitions to hide all tasks/calendars, expanding the Pomodoro timer and AI Console to enforce absolute focus.

### 4. AI Constraint: Destructive Action Lockdown
**Decision:** The AI is strictly limited to READ and CREATE (or minor UPDATE) operations.
**Reason:** Prevents the AI from accidentally generating commands that delete databases or wipe calendars.
