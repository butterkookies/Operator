

export function TaskPanel() {
  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-600 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-700 bg-neutral-950 flex justify-between items-center">
        <h2 className="font-semibold text-neutral-200">Master List</h2>
        <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400">3 Due</span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        <TaskItem title="Finish Bio Lab Report" context="Academics" urgent />
        <TaskItem title="Email Professor Smith" context="Academics" />
        <TaskItem title="Buy Groceries" context="Personal" />
        <TaskItem title="Read Chapter 4" context="Academics" done />
      </div>
    </div>
  );
}

function TaskItem({ title, context, urgent, done }: { title: string, context: string, urgent?: boolean, done?: boolean }) {
  return (
    <div className={`p-3 rounded border ${done ? 'bg-neutral-800 border-neutral-700 opacity-60' : 'bg-neutral-900 border-neutral-700 shadow-sm'} flex items-start gap-3`}>
      <input type="checkbox" className="mt-1" defaultChecked={done} />
      <div className="flex-1">
        <div className={`text-sm font-medium ${done ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>{title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-500">{context}</span>
          {urgent && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Urgent</span>}
        </div>
      </div>
    </div>
  );
}
