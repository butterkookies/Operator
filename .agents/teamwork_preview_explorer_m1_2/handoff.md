# Handoff Report: Milestone 1 - DB & Models

## Observation
- **Database Schema**: There are no migration files (e.g., in a `supabase/migrations` folder). Instead, schema creation and security policies are managed by the script `scripts/setup_db.js` (lines 29-60), which uses the `pg` client to connect directly to the database and run SQL.
- **Task Type**: In `src/components/dashboard/Dashboard.tsx` (lines 7-13), the `Task` type is defined but missing the `sessions_count` property.
- **Task Creation**: In `Dashboard.tsx` (line 122), the optimistic UI insertion for new tasks (`newTask`) does not include the `sessions_count` property.
- **Dashboard UI**: The UI renders tasks mapping over the `tasks` state (lines 464-472) but has no state for tracking an active task, no way to select one, and no display for the sessions count.

## Logic Chain
1. **DB Update**: To fulfill the milestone's DB requirement, `scripts/setup_db.js` must be updated. 
   - Add `sessions_count integer default 0` to the `create table if not exists tasks` statement.
   - To ensure the change propagates to the existing database without wiping data, append `alter table tasks add column if not exists sessions_count integer default 0;` directly after the table creation script in `setup_db.js`.
   - The developer/agent will need to run `node scripts/setup_db.js` to execute the schema update.
2. **Type Update**: The `Task` type in `Dashboard.tsx` must be updated to include `sessions_count: number;` so it matches the DB schema and fulfills the Interface Contract.
3. **Optimistic UI Update**: In `Dashboard.tsx`, the `addTask` method should be updated to include `sessions_count: 0` in the `newTask` object to avoid TypeScript errors and undefined values during optimistic rendering.
4. **UI Update**:
   - Introduce `const [activeTaskId, setActiveTaskId] = useState<string | null>(null);` to track the active task.
   - Modify the task rendering loop to allow clicking an uncompleted task to make it active (e.g., adding an `onClick` to the row or title).
   - Visually distinguish the active task (e.g., using a distinct border `border-indigo-500` or background color).
   - Display the `sessions_count` next to the task (e.g., a small badge `<span className="text-xs text-gray-500">🍅 {task.sessions_count}</span>`).

## Caveats
- The milestone instructions do not specify what should happen if an active task is marked as completed. It would be good UX to clear the `activeTaskId` if the completed task matches it, e.g., in the `toggleTask` function.
- No specific visual design was provided for the "active task" state or the "sessions_count" indicator, so a reasonable default (like highlighting the row and showing a Pomodoro/🍅 icon or simple text badge) must be chosen.
- The `PomodoroEngine.tsx` is mentioned in `PROJECT.md` but not yet integrated; any future auto-incrementing logic for `sessions_count` will happen in Milestone 2.

## Conclusion
The schema update must be performed by modifying `scripts/setup_db.js` to add the column, followed by running the script. The front-end changes are entirely localized to `src/components/dashboard/Dashboard.tsx`, involving an update to the `Task` type, the addition of `activeTaskId` state, and modifications to the task row rendering to support selection and display of the session count. 

## Verification Method
1. Modify `scripts/setup_db.js` as described, then run `node scripts/setup_db.js` to apply the DB changes.
2. Apply the code changes to `src/components/dashboard/Dashboard.tsx`.
3. Run `npm run build` or `npm run lint` to verify that there are no TypeScript errors with the new `Task` type.
4. Run `npm run dev`, open the dashboard, add a task, verify the session count displays `0`, and click the task to verify it becomes visually highlighted as the active task.
