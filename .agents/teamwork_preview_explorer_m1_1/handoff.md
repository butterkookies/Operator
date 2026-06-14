# Handoff Report: Milestone 1 - DB & Models

## Observation
1. **Database Schema:** The database schema is set up using a script at `scripts/setup_db.js`. It contains a `CREATE TABLE IF NOT EXISTS tasks` query with fields: `id`, `user_id`, `title`, `is_completed`, and `created_at`.
2. **Dashboard Component:** `src/components/dashboard/Dashboard.tsx` contains the `Task` type definition (lines 7-13) and maps over the tasks array to display them (lines 464-471).
3. **Pomodoro Timer:** The timer countdown is managed via a `useEffect` hook in `Dashboard.tsx` (lines 78-88), decrementing `timeLeft` and stopping when it reaches `0`.

## Logic Chain
1. **Database Update:** To add the `sessions_count` column safely (allowing the script to be idempotent without dropping existing tables), we need to update the `CREATE TABLE tasks` query in `scripts/setup_db.js` to include `sessions_count integer default 0`. We also need to append an `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sessions_count integer default 0;` command so existing tables are updated seamlessly.
2. **TypeScript Type Update:** The `Task` type in `Dashboard.tsx` must be updated to include `sessions_count: number;`.
3. **Optimistic UI:** When calling `addTask` in `Dashboard.tsx`, the optimistic task object should be initialized with `sessions_count: 0`.
4. **Active Task Selection:** We need a new state `const [activeTaskId, setActiveTaskId] = useState<string | null>(null);` to track the currently active task for the Pomodoro. The UI in the tasks loop needs a button (e.g., using `Play` or a "Focus" icon) to assign a task as active, but only if it's uncompleted.
5. **Session Count Indicator:** Next to each task in the list, we should render an indicator showing its session count, such as `<span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{task.sessions_count || 0} 🍅</span>`.
6. **Incrementing Logic:** Although not explicitly stated, to make the Pomodoro useful, the `useEffect` handling the timer completion should ideally increment the `sessions_count` for the `activeTaskId` both in the local React state and in Supabase.

## Caveats
- The milestone doesn't explicitly mention that the `sessions_count` must automatically increment when the Pomodoro timer reaches `0`, but it is heavily implied by the feature set. The implementer should verify if this automatic increment is desired and add it to the timer's `useEffect`.
- `scripts/setup_db.js` isn't a structured migration system (like Prisma or Supabase CLI migrations), so we rely on `IF NOT EXISTS` constructs to safely patch the schema during the setup run.

## Conclusion
The implementer should perform the following changes:
1. Modify `scripts/setup_db.js` to add `sessions_count integer default 0` to the `CREATE TABLE` query and an `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sessions_count integer default 0;` query.
2. Add `sessions_count: number;` to the `Task` type in `src/components/dashboard/Dashboard.tsx`.
3. Introduce `const [activeTaskId, setActiveTaskId] = useState<string | null>(null);` in `Dashboard.tsx`.
4. Update the task map UI to include a "Focus/Play" button to set the active task and a badge displaying the `sessions_count`. Update the left-panel Pomodoro widget to reflect the active task's title if one is selected.
5. (Optional but recommended) Update the Pomodoro `useEffect` to trigger a Supabase `update` query to increment the `sessions_count` when `timeLeft` reaches 0.

## Verification Method
1. Run `node scripts/setup_db.js` and verify no errors are thrown.
2. Run `npm run dev` to start the app.
3. Open the UI, create a task, and verify it displays `0` sessions.
4. Select the task as active. 
5. Complete a Pomodoro session (can test by temporarily hardcoding `timeLeft` to 2 seconds) and verify if the count increments properly or visually updates.
