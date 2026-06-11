

export function TimelinePanel() {
  return (
    <div className="flex flex-col h-full bg-[#fcfbf9] border border-gray-300 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-[#f3f2ee] flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Timeline</h2>
        <div className="flex gap-1 text-xs">
          <button className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm">Day</button>
          <button className="px-2 py-1 text-gray-500 hover:text-gray-800">Week</button>
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
    <div className={`p-3 rounded border-l-4 ${colors[type as keyof typeof colors] || 'border-gray-400 bg-gray-50'}`}>
      <div className="text-xs text-gray-500 font-medium mb-1">{time}</div>
      <div className="text-sm font-semibold text-gray-800">{title}</div>
    </div>
  );
}
