# Handoff Report: Milestone 1 - DB & Models

## Observation
- The project does not use a traditional `supabase/migrations` folder for schema changes. Instead, there is a `scripts/setup_db.js` file containing a `CREATE TABLE IF NOT EXISTS tasks` statement and RLS policies.
- `src/components/dashboard/Dashboard.tsx` defines the `Task` type at line 7, lacking `sessions_count`.
- Task creation happens in `addTask` at line 119 in `Dashboard.tsx`.
- The task list UI is rendered around line 460 in `Dashboard.tsx`, mapping over `tasks`.
- There is currently no state or UI mechanism to select an "active" task from uncompleted tasks, and no display for `sessions_count`.

## Logic Chain
1. **Database Update**: Since the schema is managed via `scripts/setup_db.js`, the `CREATE TABLE` statement needs to be updated with `sessions_count integer default 0`. Furthermore, to apply this change to an already existing database without wiping data, an `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sessions_count integer default 0;` should be appended before or after the policy definitions in the script.
2. **Type Update**: The `Task` type in `Dashboard.tsx` must be updated to include `sessions_count: number` so TypeScript handles the new field correctly.
3. **Task Creation**: When creating a new task, the temporary object used for optimistic UI updates in `addTask` should include `sessions_count: 0` to match the expected `Task` type.
4. **Active Task Selection**: We need a new state `const [activeTaskId, setActiveTaskId] = useState<string | null>(null);` in `Dashboard.tsx`. The task list UI should be modified to let the user select an active task (e.g., clicking the row, or a dedicated button) only if it's uncompleted. Visual feedback should indicate which task is active.
5. **Sessions Count Display**: The task list item UI needs a small badge or text block (e.g., a tomato icon or "Sessions: X") displaying `task.sessions_count`.

## Caveats
- The `SCOPE.md` doesn't explicitly mention tying the active task to the Pomodoro timer in this milestone. Therefore, I recommend only implementing the selection state and visual indication in the task list without modifying the Pomodoro widget logic.
- If a task is marked as completed while it is active, the `activeTaskId` should likely be cleared to prevent having a completed task as active.

## Conclusion
To fulfill Milestone 1:
1. Edit `scripts/setup_db.js` to add `sessions_count` to the `tasks` schema and include an `ALTER TABLE` statement for existing deployments.
2. Edit `src/components/dashboard/Dashboard.tsx` to:
   - Add `sessions_count: number` to the `Task` type.
   - Add `activeTaskId` state.
   - Update `addTask` to include `sessions_count: 0`.
   - Render the `sessions_count` for each task in the list.
   - Add an `onClick` handler and visual styling to allow users to set an uncompleted task as active.

## Verification Method
1. Run `node scripts/setup_db.js` to apply the database changes. Use a database client to verify the `tasks` table has the `sessions_count` column.
2. Run `npm run dev` to start the frontend.
3. Open the browser and verify the "Master Tasks" tab allows selecting an active task.
4. Verify that new tasks can be created and that `sessions_count` starts at 0 and is displayed in the UI.
5. Run `npm run build` to ensure there are no TypeScript errors regarding the `Task` type.
