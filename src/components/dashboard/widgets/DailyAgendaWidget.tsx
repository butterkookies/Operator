import { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Calendar as CalendarIcon, Clock, Filter, X } from 'lucide-react';

type GoogleEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  calendarColor?: string;
};

type GoogleCalendar = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  primary?: boolean;
};

export function DailyAgendaWidget({ session }: { session: Session }) {
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-Calendar state
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [isCalendarListLoaded, setIsCalendarListLoaded] = useState(false);
  const [calendarListError, setCalendarListError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('operator_selected_calendars');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem('operator_selected_calendars', JSON.stringify(Array.from(selectedCalendarIds)));
  }, [selectedCalendarIds]);

  useEffect(() => {
    if (session.provider_token) {
      fetchAvailableCalendars();
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.provider_token]);

  useEffect(() => {
    if (session.provider_token && isCalendarListLoaded) {
      if (selectedCalendarIds.size > 0) {
        fetchTodayEvents();
      } else {
        setEvents([]);
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.provider_token, selectedCalendarIds, isCalendarListLoaded]);

  // Close filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const fetchAvailableCalendars = async () => {
    if (!session.provider_token) return;
    try {
      setCalendarListError(null);
      let allItems: GoogleCalendar[] = [];
      let pageToken = '';
      let hasError = false;
      let errorMsg = '';
      do {
        const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const response = await fetch(url, { headers: { Authorization: `Bearer ${session.provider_token}` } });
        const data = await response.json();
        if (response.ok && data.items) {
          allItems = allItems.concat(data.items);
        } else {
          hasError = true;
          errorMsg = data.error?.message || 'Failed to fetch calendar list.';
          if (response.status === 401) window.dispatchEvent(new Event('google-token-expired'));
          break;
        }
        pageToken = data.nextPageToken;
      } while (pageToken);

      if (!hasError) {
        setAvailableCalendars(allItems);
        const availableIds = new Set(allItems.map((c: GoogleCalendar) => c.id));
        
        if (selectedCalendarIds.size === 0 && !localStorage.getItem('operator_selected_calendars')) {
          const primary = allItems.find((c: GoogleCalendar) => c.primary);
          if (primary) setSelectedCalendarIds(new Set([primary.id]));
        } else {
          setSelectedCalendarIds(prev => {
            const next = new Set(prev);
            for (const id of next) {
              if (!availableIds.has(id)) next.delete(id);
            }
            return next;
          });
        }
        setIsCalendarListLoaded(true);
      } else {
        setCalendarListError(errorMsg);
        setIsCalendarListLoaded(true);
      }
    } catch (error: any) {
      setCalendarListError(error.message);
      setIsCalendarListLoaded(true);
    }
  };

  const fetchTodayEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const fetchPromises = Array.from(selectedCalendarIds).map(async (calendarId) => {
        const calData = availableCalendars.find(c => c.id === calendarId);
        const calColor = calData?.backgroundColor || '#4f46e5';

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${session.provider_token}` } }
        );
        const data = await response.json();
        if (response.ok && data.items) {
          return data.items.map((event: GoogleEvent) => ({ ...event, calendarColor: calColor }));
        } else {
          if (response.status === 401) window.dispatchEvent(new Event('google-token-expired'));
          if (response.status === 404) {
            setSelectedCalendarIds(prev => {
              const next = new Set(prev);
              next.delete(calendarId);
              return next;
            });
          } else if (selectedCalendarIds.size === 1) {
            setError(data.error?.message || 'Failed to fetch calendar data.');
          }
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allEvents = results.flat();
      
      allEvents.sort((a, b) => {
        const timeA = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const timeB = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return timeA - timeB;
      });

      setEvents(allEvents);
    } catch (e: any) {
      setError(e.message);
    }
    setIsLoading(false);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'All Day';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-100 pb-2 shrink-0 relative">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" size={20} />
          <h2 className="text-lg font-black text-gray-800 m-0">Today's Agenda</h2>
        </div>
        
        {session.provider_token && (
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-600 font-bold hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
            >
              <Filter size={12} /> Calendars
            </button>

            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 max-h-[60vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider m-0">Visible Calendars</p>
                  <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={14} /></button>
                </div>
                <div className="space-y-2">
                  {calendarListError && <p className="text-xs text-red-500 mb-2 leading-tight">{calendarListError}</p>}
                  {availableCalendars.length === 0 && !calendarListError && <p className="text-xs text-gray-400">Loading calendars...</p>}
                  {availableCalendars.map(cal => (
                    <label key={cal.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <input 
                        type="checkbox" className="accent-indigo-600 w-4 h-4 shrink-0 rounded"
                        checked={selectedCalendarIds.has(cal.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedCalendarIds);
                          if (e.target.checked) newSet.add(cal.id); else newSet.delete(cal.id);
                          setSelectedCalendarIds(newSet);
                        }}
                      />
                      <div className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: cal.backgroundColor || '#4f46e5' }}></div>
                      <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors truncate font-medium">
                        {cal.summaryOverride || cal.summary}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {!session.provider_token ? (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 font-medium mb-2">Google Calendar not connected.</p>
            <p className="text-xs text-gray-400">Sign in with Google to view your agenda.</p>
          </div>
        ) : selectedCalendarIds.size === 0 ? (
          <div className="text-center mt-6 text-gray-400">
            <p className="text-sm font-medium">No calendars selected.</p>
            <p className="text-xs mt-1">Click Calendars above to select.</p>
          </div>
        ) : isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>
        ) : events.length === 0 ? (
          <div className="text-center mt-6 text-gray-400">
            <p className="text-sm font-medium">No events scheduled today.</p>
            <p className="text-xs mt-1">Free time! Use the focus timer.</p>
          </div>
        ) : (
          events.map(event => (
            <a 
              key={event.id}
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-0.5 flex flex-col items-center">
                  <Clock size={14} className="mb-1" style={{ color: event.calendarColor }} />
                  <span className="text-[10px] font-bold text-gray-500">
                    {formatTime(event.start.dateTime)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                    {event.summary || '(No Title)'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {event.end.dateTime ? `Ends at ${formatTime(event.end.dateTime)}` : 'All Day'}
                  </p>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
