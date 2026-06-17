import { supabase } from './supabase';

async function fetchWithTokenRefresh(url: string, options: RequestInit): Promise<Response> {
  let response = await fetch(url, options);
  
  if (response.status === 401) {
    console.log("Google token expired. Attempting background refresh...");
    try {
      const { data, error } = await supabase.functions.invoke('refresh-google-token');
      
      if (error || !data?.access_token) {
        throw new Error("Token refresh failed");
      }
      
      const newAccessToken = data.access_token;
      
      // Update app state
      window.dispatchEvent(new CustomEvent('google-token-refreshed', { detail: { access_token: newAccessToken } }));
      
      // Retry request
      const newOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`
        }
      };
      
      response = await fetch(url, newOptions);
    } catch (err) {
      console.error("Background token refresh failed:", err);
      window.dispatchEvent(new Event('google-token-expired'));
    }
  }
  
  return response;
}

export async function fetchAvailableCalendars(token: string) {
  let allItems: any[] = [];
  let pageToken = '';
  do {
    const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await fetchWithTokenRefresh(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (response.ok && data.items) {
      allItems = allItems.concat(data.items);
    } else {
      if (response.status === 401) window.dispatchEvent(new Event('google-token-expired'));
      throw new Error(data.error?.message || 'Failed to fetch calendar list.');
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  
  return allItems.map(c => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary || false
  }));
}

export async function fetchCalendarEvents(selectedCals: string[], timeMin: string, timeMax: string, token: string) {
  const fetchPromises = selectedCals.map(async (calId) => {
    const res = await fetchWithTokenRefresh(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.dispatchEvent(new Event('google-token-expired'));
        throw new Error("Calendar access token expired. Please tell the user to click the 'Reconnect' banner at the top of the screen.");
      }
      const errText = await res.text();
      throw new Error(`Google API Error (${res.status}): ${errText}`);
    }
    const d = await res.json();
    return d.items ? d.items.map((e: any) => ({ 
      id: e.id, 
      calendarId: calId, 
      summary: e.summary, 
      start: e.start?.dateTime || e.start?.date, 
      end: e.end?.dateTime || e.end?.date 
    })) : [];
  });
  const results = await Promise.all(fetchPromises);
  return results.flat();
}

export async function createCalendarEvent(calendarId: string, summary: string, startIso: string, endIso: string, token: string) {
  const payload = { summary, start: { dateTime: startIso }, end: { dateTime: endIso } };
  const res = await fetchWithTokenRefresh(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('google-token-expired'));
      throw new Error("Calendar access token expired. Please tell the user to click the 'Reconnect' banner at the top of the screen.");
    }
    const errText = await res.text();
    throw new Error(`Google API Error (${res.status}): ${errText}`);
  }
  return await res.json();
}

export async function deleteCalendarEvent(calendarId: string, eventId: string, token: string) {
  const res = await fetchWithTokenRefresh(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('google-token-expired'));
      throw new Error("Calendar access token expired. Please tell the user to click the 'Reconnect' banner at the top of the screen.");
    }
    const errText = await res.text();
    throw new Error(`Google API Error (${res.status}): ${errText}`);
  }
  return true;
}
