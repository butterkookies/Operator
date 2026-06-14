import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Message } from './useSupabaseChat';

// Module-level tracking of keys that hit the 429 quota this session
const exhaustedKeys = new Set<string>();

interface GeminiAIOptions {
  session: Session;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  activeSessionId: string | null;
  createSession: (title: string) => Promise<string | null>;
  saveMessage: (sessionId: string, message: Message) => Promise<void>;
  availableCalendars: any[];
  todayEvents: any[];
}

export function useGeminiAI({
  session,
  messages,
  setMessages,
  activeSessionId,
  createSession,
  saveMessage,
  availableCalendars,
  todayEvents
}: GeminiAIOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [activeKeyEmail, setActiveKeyEmail] = useState<string>('');
  const [pendingForm, setPendingForm] = useState<{question: string, options: string[], isMultiSelect: boolean, inputType?: string} | null>(null);
  const formResolverRef = useRef<((res: any) => void) | null>(null);

  const handleSubmit = async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) return;

    setIsProcessing(true);

    const newMsg: Message = { id: crypto.randomUUID(), role: 'user', content: userMessage };
    setMessages(prev => [...prev, newMsg]);

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
      const newSessionId = await createSession(title);
      if (newSessionId) {
        currentSessionId = newSessionId;
      }
    }

    if (currentSessionId) {
      await saveMessage(currentSessionId, newMsg);
    }

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let apiKeys: {email: string, key: string}[] = [];
      if (settings?.gemini_api_key) {
        try {
          const parsed = JSON.parse(settings.gemini_api_key);
          if (Array.isArray(parsed)) {
            apiKeys = parsed;
          } else {
            apiKeys = [{ email: 'Legacy Key', key: settings.gemini_api_key.trim() }];
          }
        } catch {
          apiKeys = [{ email: 'Legacy Key', key: settings.gemini_api_key.trim() }];
        }
      }

      if (apiKeys.length === 0) {
        const replyMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: "Please enter your Gemini API key in the Account Settings (profile icon) to enable AI intent parsing." };
        setMessages(prev => [...prev, replyMsg]);
        if (currentSessionId) await saveMessage(currentSessionId, replyMsg);
        setIsProcessing(false);
        return;
      }

      const prompt = `You are Operator, a helpful AI assistant.
Current Date & Time: ${new Date().toLocaleString()}
Available Calendars: ${JSON.stringify(availableCalendars)}
Today's Primary Events: ${JSON.stringify(todayEvents)}

Analyze the user's message.
- If the user asks about their schedule TODAY, you already have the events! Do NOT call 'get_calendar_events'.
- If they ask about FUTURE days, use 'get_calendar_events'.
- CRITICAL FOR SCHEDULING: When the user wants to book a meeting, you MUST verify that you have ALL of the following: 
  1) A specific Date 
  2) A specific Start Time 
  3) A specific Duration or End Time 
  4) The target Calendar ID (Find this by matching the user's requested calendar name against the 'summary' in Available Calendars. Use case-insensitive partial matching).
- If ANY of these 4 things are missing or ambiguous, you MUST use 'ask_user_question' to ask the user for ONLY the specific missing information, ONE piece at a time. For example, if you need the calendar, ask "Which calendar?" and provide the 'summary' values from Available Calendars as options. If you need the start and end time, ask "What time?" and SET inputType to 'timeRange' to show a time picker. You MUST provide 'options' as an array of logical choices for the user to select from whenever possible (except when using timeRange). Do NOT guess the duration. Do NOT guess the calendar.
- If the user asks to remove, cancel, or delete an event TODAY, find its ID in Today's Primary Events and call 'delete_calendar_event' directly.
- If they want to delete a future event, first use 'get_calendar_events' to find the event ID, then use 'delete_calendar_event'.
- If a tool returns an error, you MUST explain the error to the user in the 'replyMessage'.

For ALL OTHER responses, or AFTER you have used a tool, you MUST respond ONLY with a raw JSON object containing exactly these keys:
{
  "intent": "TASK" | "THOUGHT" | "CHAT",
  "extractedData": "The concise title of the task or thought to save. Empty if CHAT.",
  "replyMessage": "A short, friendly reply acknowledging the action."
}`;

      let contents: any[] = [];
      contents.push({ role: 'user', parts: [{ text: `System Context: ${prompt}` }] });
      contents.push({ role: 'model', parts: [{ text: "Understood." }] });

      const history = messages.slice(-10).filter(m => m.role !== 'system' && m.id !== '1');
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }

      contents.push({ role: 'user', parts: [{ text: `User Message: "${userMessage}"` }] });
      const tools = [{
        functionDeclarations: [
          {
            name: "get_calendar_events",
            description: "Fetch the user's Google Calendar events for a timeframe. Returns an array of events.",
            parameters: {
              type: "OBJECT",
              properties: {
                timeMin: { type: "STRING", description: "ISO 8601 string for start time" },
                timeMax: { type: "STRING", description: "ISO 8601 string for end time" }
              },
              required: ["timeMin", "timeMax"]
            }
          },
          {
            name: "schedule_calendar_event",
            description: "Schedule a new event on the user's Google Calendar.",
            parameters: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING", description: "Title of the event" },
                start: { type: "STRING", description: "ISO 8601 string for start time" },
                end: { type: "STRING", description: "ISO 8601 string for end time" },
                calendarId: { type: "STRING", description: "The ID of the calendar to use. Defaults to 'primary'." }
              },
              required: ["summary", "start", "end"]
            }
          },
          {
            name: "ask_user_question",
            description: "Ask the user a question to clarify ambiguity, pick a calendar, or get a missing date/time. This pauses execution and waits for their input.",
            parameters: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING", description: "The question to ask the user." },
                options: { type: "ARRAY", items: { type: "STRING" }, description: "Optional array of choices for the user to pick from." },
                isMultiSelect: { type: "BOOLEAN", description: "If true, the user can pick multiple options." },
                inputType: { type: "STRING", description: "Optional. Set to 'timeRange' if asking for a start and end time. Otherwise omit." }
              },
              required: ["question"]
            }
          },
          {
            name: "delete_calendar_event",
            description: "Delete an event from the user's Google Calendar.",
            parameters: {
              type: "OBJECT",
              properties: {
                eventId: { type: "STRING", description: "The ID of the event to delete." },
                calendarId: { type: "STRING", description: "The ID of the calendar containing the event." }
              },
              required: ["eventId", "calendarId"]
            }
          }
        ]
      }];

      const callGemini = async (): Promise<any> => {
        const availableKeys = apiKeys.filter(k => !exhaustedKeys.has(k.key));
        if (availableKeys.length === 0) {
          throw new Error("All provided API keys have hit their rate limit. Please add more keys or try again later.");
        }
        
        const currentKeyObj = availableKeys[0];
        const currentKey = currentKeyObj.key;
        setActiveKeyEmail(currentKeyObj.email);
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, tools, generationConfig: { temperature: 0.1 } })
        });
        
        if (!res.ok) {
          if (res.status === 429) {
            console.warn(`[Rate Limit] Key exhausted. Rotating to next API key...`);
            setLoadingStatus('Switching connection...');
            exhaustedKeys.add(currentKey);
            return callGemini();
          }
          throw new Error(`Gemini API Error (${res.status}): ${await res.text()}`);
        }
        return await res.json();
      };

      let data = await callGemini();
      let parts = data.candidates[0].content.parts;
      let functionCallPart = parts.find((p: any) => p.functionCall);

      let loopCount = 0;
      while (functionCallPart && loopCount < 25) {
        loopCount++;
        const { name, args } = functionCallPart.functionCall;
        let apiResult: any = null;

        if (name === 'get_calendar_events') {
          setLoadingStatus('Checking your calendar...');
          try {
            let selectedCals = ['primary'];
            const saved = localStorage.getItem('operator_selected_calendars');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.length > 0) selectedCals = parsed;
            }
            const fetchPromises = selectedCals.map(async (calId) => {
              const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(args.timeMin)}&timeMax=${encodeURIComponent(args.timeMax)}&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${session.provider_token}` } });
              if (!res.ok) {
                if (res.status === 401) {
                  window.dispatchEvent(new Event('google-token-expired'));
                  throw new Error("Calendar access token expired. Please tell the user to click the 'Reconnect' banner at the top of the screen.");
                }
                const errText = await res.text();
                throw new Error(`Google API Error (${res.status}): ${errText}`);
              }
              const d = await res.json();
              return d.items ? d.items.map((e: any) => ({ id: e.id, calendarId: calId, summary: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date })) : [];
            });
            const results = await Promise.all(fetchPromises);
            apiResult = results.flat();
          } catch (e: any) {
            apiResult = { error: e.message };
          }
        } else if (name === 'schedule_calendar_event') {
          setLoadingStatus('Placing event...');
          try {
            const startIso = new Date(args.start).toISOString();
            const endIso = new Date(args.end).toISOString();
            const targetCalendar = args.calendarId || 'primary';
            const payload = { summary: args.summary, start: { dateTime: startIso }, end: { dateTime: endIso } };
            
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.provider_token}`, 'Content-Type': 'application/json' },
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
            const d = await res.json();
            apiResult = { success: true, link: d.htmlLink };
          } catch (e: any) {
            console.error("Failed to parse or schedule event:", e);
            apiResult = { error: e.message };
          }
        } else if (name === 'delete_calendar_event') {
          setLoadingStatus('Removing event...');
          try {
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(args.calendarId)}/events/${encodeURIComponent(args.eventId)}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${session.provider_token}` }
            });
            if (!res.ok) {
              if (res.status === 401) {
                window.dispatchEvent(new Event('google-token-expired'));
                throw new Error("Calendar access token expired. Please tell the user to click the 'Reconnect' banner at the top of the screen.");
              }
              const errText = await res.text();
              throw new Error(`Google API Error (${res.status}): ${errText}`);
            }
            apiResult = { success: true };
          } catch (e: any) {
            console.error("Failed to delete event:", e);
            apiResult = { error: e.message };
          }
        } else if (name === 'ask_user_question') {
          setLoadingStatus('');
          setPendingForm({ question: args.question, options: args.options || [], isMultiSelect: args.isMultiSelect || false, inputType: args.inputType });
          const userResponse = await new Promise((resolve) => {
            formResolverRef.current = resolve;
          });
          setPendingForm(null);
          setLoadingStatus('Processing response...');
          apiResult = userResponse;
        }

        contents.push({ role: 'model', parts: parts });
        contents.push({ role: 'function', parts: [{ functionResponse: { name, response: { result: apiResult } } }] });
        
        data = await callGemini();
        parts = data.candidates[0].content.parts;
        functionCallPart = parts.find((p: any) => p.functionCall);
      }

      setLoadingStatus('');

      if (loopCount >= 25) {
        throw new Error("AI is stuck in an infinite tool-calling loop. Please try a different prompt.");
      }

      const textPart = parts.find((p: any) => p.text);
      const rawJson = (textPart?.text || "").replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(rawJson);
      } catch (e) {
        parsed = { intent: 'CHAT', extractedData: '', replyMessage: textPart?.text || "Done." };
      }

      if (parsed.intent === 'TASK' && parsed.extractedData) {
        await supabase.from('tasks').insert([{ user_id: session.user.id, title: parsed.extractedData, is_completed: false, sessions_count: 0 }]);
      } else if (parsed.intent === 'THOUGHT' && parsed.extractedData) {
        await supabase.from('thoughts').insert([{ user_id: session.user.id, content: parsed.extractedData }]);
      }

      const replyMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: parsed.replyMessage || "Done." };
      setMessages(prev => [...prev, replyMsg]);
      if (currentSessionId) await saveMessage(currentSessionId, replyMsg);

    } catch (error: any) {
      console.error(error);
      
      let friendlyError = error.message || 'Unknown error';
      if (friendlyError.includes('Gemini API Error (429)')) {
        friendlyError = "You have hit the free-tier rate limit for the Gemini API (max 15 requests per minute). Please wait about 60 seconds and try again.";
      }
      
      const errorMsg: Message = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: `Sorry, I had trouble processing that request: ${friendlyError}` 
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setIsProcessing(false);
  };

  return {
    handleSubmit,
    isProcessing,
    loadingStatus,
    activeKeyEmail,
    pendingForm,
    formResolverRef
  };
}
