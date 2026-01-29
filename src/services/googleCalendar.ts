import { CalendarEvent, LocationBlock, HabitCompletion, Habit, LocationCategory, CATEGORY_COLOR_IDS } from '../types';

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInitialized = false;
let gisInitialized = false;

// Load the Google API client library
export async function loadGoogleApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.gapi) {
      initializeGapi().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      initializeGapi().then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.body.appendChild(script);
  });
}

async function initializeGapi(): Promise<void> {
  return new Promise((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInitialized = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Load the Google Identity Services library
export async function loadGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.accounts) {
      initializeGis();
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      initializeGis();
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(script);
  });
}

function initializeGis(): void {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // Will be set when requesting token
  });
  gisInitialized = true;
}

// Initialize both libraries
export async function initializeGoogleAuth(): Promise<void> {
  await Promise.all([loadGoogleApi(), loadGoogleIdentityServices()]);
}

// Request access token
export function requestAccessToken(): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    };

    // Check if we have a valid token
    if (window.gapi.client.getToken() === null) {
      // Prompt the user to select an account and consent
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip consent if already authorized
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

// Revoke access token
export function revokeAccessToken(): void {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken(null);
    });
  }
}

// Set access token from stored value
export function setAccessToken(token: string): void {
  window.gapi.client.setToken({ access_token: token });
}

// Get current access token
export function getAccessToken(): string | null {
  const token = window.gapi.client.getToken();
  return token?.access_token || null;
}

// Check if API is ready
export function isApiReady(): boolean {
  return gapiInitialized && gisInitialized;
}

// List available calendars
export async function listCalendars(): Promise<{ id: string; summary: string }[]> {
  try {
    const response = await window.gapi.client.calendar.calendarList.list();
    return response.result.items?.map((cal: { id: string; summary: string }) => ({
      id: cal.id,
      summary: cal.summary,
    })) || [];
  } catch (error) {
    console.error('Error listing calendars:', error);
    throw error;
  }
}

// Create a calendar event
export async function createCalendarEvent(
  event: CalendarEvent,
  calendarId: string = 'primary'
): Promise<string> {
  try {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId,
      resource: event,
    });
    return response.result.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Update a calendar event
export async function updateCalendarEvent(
  eventId: string,
  event: CalendarEvent,
  calendarId: string = 'primary'
): Promise<void> {
  try {
    await window.gapi.client.calendar.events.update({
      calendarId,
      eventId,
      resource: event,
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Delete a calendar event
export async function deleteCalendarEvent(
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  try {
    await window.gapi.client.calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

// Check if event exists
export async function eventExists(
  eventId: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    await window.gapi.client.calendar.events.get({
      calendarId,
      eventId,
    });
    return true;
  } catch {
    return false;
  }
}

// List events in a time range
export async function listEvents(
  timeMin: string,
  timeMax: string,
  calendarId: string = 'primary'
): Promise<CalendarEvent[]> {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.result.items || [];
  } catch (error) {
    console.error('Error listing events:', error);
    throw error;
  }
}

// Color IDs for different event types
const HABIT_COLOR_ID = '10'; // Basil (green)
const AVOIDANCE_COLOR_ID = '11'; // Tomato (red)

// Create event from location block
export function locationBlockToEvent(block: LocationBlock, zoneActivity?: string): CalendarEvent {
  const activity = zoneActivity || block.location;
  const title = block.category === 'Commute' ? 'Commute' : `${block.location} - ${activity}`;

  return {
    summary: title,
    description: `Category: ${block.category}\nAuto-generated by ActivityTrack`,
    start: {
      dateTime: block.startTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: block.endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: CATEGORY_COLOR_IDS[block.category as LocationCategory] || '8',
    location: block.coordinates
      ? `${block.coordinates.lat}, ${block.coordinates.lng}`
      : undefined,
  };
}

// Create event from habit completion
export function habitCompletionToEvent(
  completion: HabitCompletion,
  habit: Habit
): CalendarEvent {
  const isAvoidance = habit.type === 'avoidance';
  const emoji = isAvoidance ? '!' : '✓';
  const title = `${emoji} ${habit.name}`;

  const startDate = new Date(completion.timestamp);
  const endDate = new Date(startDate.getTime() + completion.duration * 60 * 1000);

  let description = `Streak: ${completion.streak} days\n`;
  if (completion.notes) {
    description += `Notes: ${completion.notes}\n`;
  }
  description += 'Auto-generated by ActivityTrack';

  return {
    summary: title,
    description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: isAvoidance ? AVOIDANCE_COLOR_ID : HABIT_COLOR_ID,
  };
}

// Sync a single location block to calendar
export async function syncLocationBlock(
  block: LocationBlock,
  zoneActivity: string | undefined,
  calendarId: string = 'primary'
): Promise<string> {
  const event = locationBlockToEvent(block, zoneActivity);

  if (block.calendarEventId) {
    // Update existing event
    const exists = await eventExists(block.calendarEventId, calendarId);
    if (exists) {
      await updateCalendarEvent(block.calendarEventId, event, calendarId);
      return block.calendarEventId;
    }
  }

  // Create new event
  return await createCalendarEvent(event, calendarId);
}

// Sync a single habit completion to calendar
export async function syncHabitCompletion(
  completion: HabitCompletion,
  habit: Habit,
  calendarId: string = 'primary'
): Promise<string> {
  const event = habitCompletionToEvent(completion, habit);

  if (completion.calendarEventId) {
    // Update existing event
    const exists = await eventExists(completion.calendarEventId, calendarId);
    if (exists) {
      await updateCalendarEvent(completion.calendarEventId, event, calendarId);
      return completion.calendarEventId;
    }
  }

  // Create new event
  return await createCalendarEvent(event, calendarId);
}

// Batch sync multiple items
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errors: string[];
}

export async function batchSyncToCalendar(
  blocks: LocationBlock[],
  completions: HabitCompletion[],
  habits: Habit[],
  zones: Map<string, { activity: string }>,
  calendarId: string = 'primary',
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    errors: [],
  };

  const habitMap = new Map(habits.map(h => [h.id, h]));
  const total = blocks.length + completions.length;
  let current = 0;

  // Sync location blocks
  for (const block of blocks) {
    if (!block.synced) {
      try {
        const zoneActivity = block.zoneId ? zones.get(block.zoneId)?.activity : undefined;
        await syncLocationBlock(block, zoneActivity, calendarId);
        block.synced = true;
        result.syncedCount++;
      } catch (error) {
        result.errors.push(`Failed to sync location: ${block.location}`);
        result.success = false;
      }
    }
    current++;
    onProgress?.(current, total);
  }

  // Sync habit completions
  for (const completion of completions) {
    if (!completion.synced) {
      const habit = habitMap.get(completion.habitId);
      if (habit) {
        try {
          await syncHabitCompletion(completion, habit, calendarId);
          completion.synced = true;
          result.syncedCount++;
        } catch (error) {
          result.errors.push(`Failed to sync habit: ${habit.name}`);
          result.success = false;
        }
      }
    }
    current++;
    onProgress?.(current, total);
  }

  return result;
}

// Type declarations for Google APIs
declare global {
  interface Window {
    gapi: {
      load: (name: string, callback: () => void) => void;
      client: {
        init: (config: {
          apiKey: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        getToken: () => { access_token: string } | null;
        setToken: (token: { access_token: string } | null) => void;
        calendar: {
          calendarList: {
            list: () => Promise<{
              result: { items?: { id: string; summary: string }[] };
            }>;
          };
          events: {
            insert: (params: {
              calendarId: string;
              resource: CalendarEvent;
            }) => Promise<{ result: { id: string } }>;
            update: (params: {
              calendarId: string;
              eventId: string;
              resource: CalendarEvent;
            }) => Promise<void>;
            delete: (params: {
              calendarId: string;
              eventId: string;
            }) => Promise<void>;
            get: (params: {
              calendarId: string;
              eventId: string;
            }) => Promise<{ result: CalendarEvent }>;
            list: (params: {
              calendarId: string;
              timeMin: string;
              timeMax: string;
              singleEvents: boolean;
              orderBy: string;
            }) => Promise<{ result: { items?: CalendarEvent[] } }>;
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: google.accounts.oauth2.TokenResponse) => void;
          }) => google.accounts.oauth2.TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken: (options?: { prompt?: string }) => void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
    token_type: string;
    scope: string;
  }
}
