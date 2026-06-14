import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';

export type GoogleEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  calendarColor?: string;
  calendarId?: string;
};

export type GoogleCalendar = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  primary?: boolean;
};

export function useGoogleCalendar(
  session: Session, 
  calendarTimeframe: 'today' | 'week' | 'month' | 'year' = 'week'
) {
  const [calendarEvents, setCalendarEvents] = useState<GoogleEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarListError, setCalendarListError] = useState<string | null>(null);
  
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [isCalendarListLoaded, setIsCalendarListLoaded] = useState(false);
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
    } catch (error: unknown) {
      setCalendarListError((error as Error).message);
      setIsCalendarListLoaded(true);
    }
  };

  const fetchCalendarEvents = async () => {
    if (!session.provider_token || selectedCalendarIds.size === 0 || !isCalendarListLoaded) {
      setCalendarEvents([]);
      return;
    }
    setIsCalendarLoading(true);
    setCalendarError(null);
    
    const now = new Date();
    const timeMax = new Date();
    
    if (calendarTimeframe === 'today') timeMax.setHours(23, 59, 59, 999);
    else if (calendarTimeframe === 'week') timeMax.setDate(now.getDate() + 7);
    else if (calendarTimeframe === 'month') timeMax.setMonth(now.getMonth() + 1);
    else if (calendarTimeframe === 'year') timeMax.setFullYear(now.getFullYear() + 1);

    try {
      const fetchPromises = Array.from(selectedCalendarIds).map(async (calendarId) => {
        const calData = availableCalendars.find(c => c.id === calendarId);
        const calColor = calData?.backgroundColor || '#4f46e5';

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=2500`,
          { headers: { Authorization: `Bearer ${session.provider_token}` } }
        );
        const data = await response.json();
        if (response.ok && data.items) {
          return data.items.map((event: GoogleEvent) => ({ ...event, calendarColor: calColor, calendarId }));
        } else {
          if (response.status === 401) {
            window.dispatchEvent(new Event('google-token-expired'));
            throw new Error('Google Calendar access token expired');
          }
          if (response.status === 404) {
            setSelectedCalendarIds(prev => {
              const next = new Set(prev);
              next.delete(calendarId);
              return next;
            });
          } else if (selectedCalendarIds.size === 1) {
            setCalendarError(data.error?.message || 'Failed to fetch calendar data.');
          }
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allEvents = results.flat();
      
      allEvents.sort((a, b) => {
        const dateA = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const dateB = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return dateA - dateB;
      });

      setCalendarEvents(allEvents);
    } catch (error: unknown) {
      setCalendarError((error as Error).message);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (session.provider_token) {
      fetchAvailableCalendars();
    }
  }, [session.provider_token]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [calendarTimeframe, session.provider_token, selectedCalendarIds, isCalendarListLoaded]);

  return {
    calendarEvents,
    isCalendarLoading,
    calendarError,
    calendarListError,
    availableCalendars,
    isCalendarListLoaded,
    selectedCalendarIds,
    setSelectedCalendarIds,
    fetchCalendarEvents
  };
}
