
type GoogleEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  calendarColor?: string;
};

// --- HELPER: Parse time into percentage of 24h day ---
const getPositionStyles = (startStr?: string, endStr?: string) => {
  if (!startStr || !endStr) return { top: '0%', height: '100%', isAllDay: true };
  
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Start percentage
  const startHour = start.getHours();
  const startMin = start.getMinutes();
  const startPercent = ((startHour * 60 + startMin) / (24 * 60)) * 100;
  
  // Height percentage
  const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);
  const heightPercent = Math.max((durationMins / (24 * 60)) * 100, 3); // min height slightly larger for readability
  
  return { top: `${startPercent}%`, height: `${heightPercent}%`, isAllDay: false };
};

// ----------------------------------------------------
// TODAY VIEW (Time-Blocked)
// ----------------------------------------------------
export function TodayView({ events }: { events: GoogleEvent[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const allDayEvents = events.filter(e => e.start.date);
  const timedEvents = events.filter(e => e.start.dateTime);

  const nowTime = new Date();
  const currentPercent = ((nowTime.getHours() * 60 + nowTime.getMinutes()) / (24 * 60)) * 100;

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-lg border border-neutral-700 overflow-hidden relative">
      
      {/* All Day Section */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-neutral-700 p-2 bg-neutral-800 flex flex-col gap-1 z-10 relative shadow-sm">
          <p className="text-xs font-bold text-neutral-500 mb-1 uppercase">All Day</p>
          {allDayEvents.map(e => (
            <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer" 
               className="text-xs font-bold px-2 py-1 rounded text-white truncate hover:opacity-80 transition-opacity block"
               style={{ backgroundColor: e.calendarColor || '#4f46e5' }}>
              {e.summary || '(No title)'}
            </a>
          ))}
        </div>
      )}

      {/* Timeline Grid */}
      <div className="flex-grow overflow-y-auto relative bg-neutral-900">
        <div className="relative min-h-[720px]"> {/* Compressed height for better fit */}
          
          {/* Background Grid Lines */}
          {hours.map(hour => (
            <div key={hour} className="absolute w-full flex items-start border-t border-neutral-800" style={{ top: `${(hour / 24) * 100}%`, height: `${(1 / 24) * 100}%` }}>
              <span className="text-[10px] text-neutral-500 font-bold w-14 text-right pr-2 -mt-2 bg-neutral-900">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>
          ))}

          {/* Current Time Indicator Line */}
          <div className="absolute w-full border-t-2 border-red-500 z-30 pointer-events-none flex items-center" style={{ top: `${currentPercent}%` }}>
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full ml-12 -mt-[5px]"></div>
          </div>

          {/* Render Timed Events (Absolute Positioning) */}
          <div className="absolute top-0 bottom-0 left-14 right-2">
            {timedEvents.map(e => {
              const { top, height } = getPositionStyles(e.start.dateTime, e.end?.dateTime);
              return (
                <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                   className="absolute left-1 right-1 rounded p-1.5 shadow-sm border border-black/10 overflow-hidden group hover:z-40 transition-all hover:scale-[1.01] flex flex-col"
                   style={{ top, height, backgroundColor: e.calendarColor || '#4f46e5', color: '#fff' }}>
                  <div className="text-[10px] font-bold opacity-90 mb-0.5 leading-none shrink-0 drop-shadow-sm">
                    {new Date(e.start.dateTime!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs font-bold leading-tight break-words overflow-hidden drop-shadow-sm">
                    {e.summary || '(No title)'}
                  </div>
                </a>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// WEEK VIEW (7 Column Time-Blocked Grid)
// ----------------------------------------------------
export function WeekView({ events }: { events: GoogleEvent[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const nowTime = new Date();
  const currentPercent = ((nowTime.getHours() * 60 + nowTime.getMinutes()) / (24 * 60)) * 100;
  
  // Group events by day of week
  const groupedEvents: Record<number, GoogleEvent[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  
  events.forEach(e => {
    const dateStr = e.start.dateTime || e.start.date;
    if (dateStr) {
      const day = new Date(dateStr).getDay();
      groupedEvents[day].push(e);
    }
  });

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-lg border border-neutral-700 overflow-hidden relative">
      
      {/* Week Header */}
      <div className="flex border-b border-neutral-700 bg-neutral-800 z-10 shadow-sm pl-14">
        {days.map((day) => (
          <div key={day} className="flex-1 text-center py-2 border-l border-neutral-800">
            <div className="text-xs font-bold text-neutral-500 uppercase">{day}</div>
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="flex-grow overflow-y-auto relative bg-neutral-900">
        <div className="relative min-h-[720px] flex"> {/* Compressed height */}
          
          {/* Background Grid Lines (Absolute behind everything) */}
          <div className="absolute inset-0 z-0">
            {hours.map(hour => (
              <div key={hour} className="absolute w-full border-t border-neutral-800" style={{ top: `${(hour / 24) * 100}%` }}>
                <span className="absolute left-0 text-[10px] text-neutral-500 font-bold w-14 text-right pr-2 -mt-2 bg-neutral-900 z-10">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Current Time Indicator Line */}
          <div className="absolute w-full border-t-2 border-red-500 z-30 pointer-events-none flex items-center" style={{ top: `${currentPercent}%` }}>
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full ml-12 -mt-[5px]"></div>
          </div>

          {/* 7 Columns */}
          <div className="flex-grow flex ml-14 z-10 relative">
            {days.map((day, dayIndex) => {
              const dayEvents = groupedEvents[dayIndex];
              const timedEvents = dayEvents.filter(e => e.start.dateTime);
              const allDayEvents = dayEvents.filter(e => e.start.date);
              
              return (
                <div key={day} className="flex-1 border-l border-neutral-800 relative">
                  
                  {/* All day events at very top of column (static height overlay) */}
                  <div className="absolute top-0 left-0 right-0 z-20 flex flex-col gap-0.5 p-0.5 bg-neutral-900/80">
                    {allDayEvents.map(e => (
                      <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                         className="text-[9px] font-bold px-1 rounded text-white truncate block"
                         style={{ backgroundColor: e.calendarColor || '#4f46e5' }}>
                        {e.summary || '(No title)'}
                      </a>
                    ))}
                  </div>

                  {/* Timed events absolute positioned */}
                  {timedEvents.map(e => {
                    const { top, height } = getPositionStyles(e.start.dateTime, e.end?.dateTime);
                    return (
                      <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                         className="absolute left-0.5 right-0.5 rounded px-1.5 py-1 shadow-sm border border-black/10 overflow-hidden group hover:z-40 hover:scale-[1.05] transition-all flex flex-col"
                         style={{ top, height, backgroundColor: e.calendarColor || '#4f46e5', color: '#fff' }}>
                        <div className="text-[9px] font-bold leading-none opacity-90 mb-0.5 shrink-0 drop-shadow-sm">
                          {new Date(e.start.dateTime!).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                        </div>
                        <div className="text-[10px] font-bold leading-tight break-words overflow-hidden drop-shadow-sm">
                          {e.summary || '(No title)'}
                        </div>
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MONTH VIEW (True 5x7 CSS Grid)
// ----------------------------------------------------
export function MonthView({ events }: { events: GoogleEvent[] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Find the first day of the month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Create grid cells (max 35 or 42 cells)
  const totalCells = (startingDayOfWeek + daysInMonth > 35) ? 42 : 35;
  const days = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - startingDayOfWeek + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  // Map events to day numbers
  const eventsByDay: Record<number, GoogleEvent[]> = {};
  events.forEach(e => {
    const d = new Date(e.start.dateTime || e.start.date || Date.now());
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  });

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-lg border border-neutral-700 overflow-hidden">
      {/* Month Header */}
      <div className="flex border-b border-neutral-700 bg-neutral-800 shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="flex-1 text-center py-2 border-l border-neutral-800 first:border-l-0">
            <div className="text-xs font-bold text-neutral-500 uppercase">{day}</div>
          </div>
        ))}
      </div>
      
      {/* Grid */}
      <div className="flex-grow grid grid-cols-7 grid-rows-[repeat(auto-fit,minmax(0,1fr))] auto-rows-fr">
        {days.map((dayNum, idx) => (
          <div key={idx} className="border-b border-r border-neutral-800 p-1 min-h-[80px] flex flex-col relative bg-neutral-900 overflow-hidden">
            {dayNum ? (
              <>
                <div className="text-sm font-bold text-neutral-300 mb-1 pl-1">{dayNum}</div>
                <div className="flex flex-col gap-1 overflow-y-auto flex-grow pb-1 pr-1">
                  {(eventsByDay[dayNum] || []).map(e => {
                    const timeStr = e.start.dateTime ? new Date(e.start.dateTime).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) + ' ' : '';
                    return (
                      <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer" 
                         className="text-[10px] font-bold px-1.5 py-1 rounded text-white hover:opacity-80 block shrink-0 break-words leading-tight drop-shadow-sm"
                         style={{ backgroundColor: e.calendarColor || '#4f46e5' }}
                         title={e.summary}>
                        {timeStr}{e.summary || '(No title)'}
                      </a>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-neutral-800"></div> // Padding cell
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// YEAR VIEW (12-Month Heatmap Grid)
// ----------------------------------------------------
export function YearView({ events }: { events: GoogleEvent[] }) {
  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Group events by month -> day
  const eventsByDate: Record<number, Record<number, number>> = {};
  events.forEach(e => {
    const d = new Date(e.start.dateTime || e.start.date || Date.now());
    if (d.getFullYear() === currentYear) {
      const m = d.getMonth();
      const date = d.getDate();
      if (!eventsByDate[m]) eventsByDate[m] = {};
      eventsByDate[m][date] = (eventsByDate[m][date] || 0) + 1;
    }
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-neutral-800';
    if (count === 1) return 'bg-indigo-300';
    if (count === 2) return 'bg-indigo-500';
    if (count >= 3) return 'bg-indigo-700';
    return 'bg-neutral-800';
  };

  return (
    <div className="h-full overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map(month => {
        const firstDay = new Date(currentYear, month, 1).getDay();
        const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
        const totalCells = 42; // standard 6x7 grid for mini months
        const days = Array.from({ length: totalCells }, (_, i) => {
          const dayNumber = i - firstDay + 1;
          return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
        });
        
        const monthName = new Date(currentYear, month, 1).toLocaleDateString([], { month: 'short' });

        return (
          <div key={month} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 shadow-sm flex flex-col">
            <h3 className="font-bold text-indigo-400 text-sm mb-3 m-0">{monthName}</h3>
            <div className="grid grid-cols-7 gap-1 flex-grow">
              {days.map((dayNum, idx) => {
                const count = dayNum ? (eventsByDate[month]?.[dayNum] || 0) : 0;
                return (
                  <div key={idx} 
                       className={`w-full aspect-square rounded-sm transition-colors flex items-center justify-center ${dayNum ? getHeatmapColor(count) : 'bg-transparent'}`}
                       title={dayNum ? `${monthName} ${dayNum}: ${count} event(s)` : ''}
                  >
                    {dayNum && (
                      <span className={`text-[8px] font-bold ${count > 0 ? 'text-white drop-shadow-md' : 'text-neutral-500'}`}>
                        {dayNum}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
