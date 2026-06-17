

export function TimelinePanel() {
  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-600 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-700 bg-neutral-950 flex justify-between items-center">
        <h2 className="font-semibold text-neutral-200">Timeline</h2>
        <div className="flex gap-1 text-xs">
          <button className="px-2 py-1 bg-neutral-900 border border-neutral-600 rounded shadow-sm">Day</button>
          <button className="px-2 py-1 text-neutral-500 hover:text-neutral-200">Week</button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {/* Placeholder Events */}
        <EventCard time="09:00 AM" title="Calculus Lecture" type="class" />
        <EventCard time="11:30 AM" title="Study Group" type="meeting" />
        <EventCard time="02:00 PM" title="Deep Work: Bio Essay" type="focus" />
      </div>
    </div>
  );
}

function EventCard({ time, title, type }: { time: string, title: string, type: string }) {
  const colors = {
    class: 'border-blue-400 bg-blue-50',
    meeting: 'border-purple-400 bg-purple-50',
    focus: 'border-orange-400 bg-orange-50'
  };
  
  return (
    <div className={`p-3 rounded border-l-4 ${colors[type as keyof typeof colors] || 'border-gray-400 bg-neutral-800'}`}>
      <div className="text-xs text-neutral-500 font-medium mb-1">{time}</div>
      <div className="text-sm font-semibold text-neutral-200">{title}</div>
    </div>
  );
}
