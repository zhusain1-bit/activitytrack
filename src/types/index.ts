// Location Zone Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationCategory =
  | 'Work'
  | 'Home'
  | 'Exercise'
  | 'Social'
  | 'Commute'
  | 'Other';

export interface LocationZone {
  id: string;
  name: string;
  coordinates: Coordinates;
  radius: number; // in meters
  category: LocationCategory;
  activity: string; // e.g., "Working", "Relaxing", etc.
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// Location Block from Google Timeline or derived
export interface LocationBlock {
  id: string;
  location: string; // Zone name or raw location
  zoneId?: string; // Reference to LocationZone if matched
  category: LocationCategory;
  startTime: string; // ISO string
  endTime: string; // ISO string
  coordinates?: Coordinates;
  calendarEventId?: string;
  synced: boolean;
}

// Habit Types
export type HabitType = 'positive' | 'avoidance';

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  scheduledTime?: string; // e.g., "08:30" for "8:30 AM Wake"
  defaultDuration: number; // in minutes
  icon?: string;
  color?: string;
  archived: boolean;
  order: number;
  createdAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  timestamp: string; // ISO string - when checked off
  duration: number; // in minutes
  locationBlockId?: string; // Reference to location if nested
  zoneId?: string;
  streak: number;
  notes?: string;
  calendarEventId?: string;
  synced: boolean;
}

// Streak tracking
export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  totalCompletions: number;
}

// Google Calendar Types
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  colorId?: string;
  location?: string;
}

export interface CalendarSyncStatus {
  lastSyncTime?: string;
  pendingEvents: number;
  syncInProgress: boolean;
  error?: string;
}

// Google Timeline Import Types
export interface GoogleTimelinePlaceVisit {
  location: {
    latitudeE7: number;
    longitudeE7: number;
    name?: string;
    address?: string;
    placeId?: string;
  };
  duration: {
    startTimestamp: string;
    endTimestamp: string;
  };
  placeConfidence?: string;
}

export interface GoogleTimelineActivitySegment {
  startLocation?: {
    latitudeE7: number;
    longitudeE7: number;
  };
  endLocation?: {
    latitudeE7: number;
    longitudeE7: number;
  };
  duration: {
    startTimestamp: string;
    endTimestamp: string;
  };
  activityType?: string;
  distance?: number;
}

export interface GoogleTimelineData {
  timelineObjects: Array<{
    placeVisit?: GoogleTimelinePlaceVisit;
    activitySegment?: GoogleTimelineActivitySegment;
  }>;
}

// Analytics Types
export interface DailyStats {
  date: string; // YYYY-MM-DD
  habitsCompleted: number;
  habitsTotal: number;
  locationBlocks: number;
  totalTimeTracked: number; // in minutes
  categoryBreakdown: Record<LocationCategory, number>; // minutes per category
  habitCompletions: string[]; // habit IDs completed
}

export interface WeeklyComparison {
  thisWeek: DailyStats[];
  lastWeek: DailyStats[];
}

export interface PatternInsight {
  id: string;
  type: 'correlation' | 'trend' | 'achievement';
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

// App State Types
export interface AppSettings {
  googleCalendarConnected: boolean;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  tokenExpiry?: string;
  defaultHabitDuration: number;
  autoSync: boolean;
  autoLocationTracking: boolean; // Auto-track location using browser geolocation
  syncInterval: number; // in minutes
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  calendarId?: string; // Which calendar to sync to
}

export interface AppState {
  zones: LocationZone[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  locationBlocks: LocationBlock[];
  settings: AppSettings;
  syncStatus: CalendarSyncStatus;
  streaks: HabitStreak[];
}

// Default habits as specified
export const DEFAULT_HABITS: Omit<Habit, 'id' | 'createdAt'>[] = [
  { name: '8:30 AM Wake', type: 'positive', scheduledTime: '08:30', defaultDuration: 5, archived: false, order: 0 },
  { name: 'Gym', type: 'positive', defaultDuration: 60, archived: false, order: 1 },
  { name: '30-Min Meditation', type: 'positive', defaultDuration: 30, archived: false, order: 2 },
  { name: '30 Min Jobs', type: 'positive', defaultDuration: 30, archived: false, order: 3 },
  { name: 'Practice Flashcards', type: 'positive', defaultDuration: 30, archived: false, order: 4 },
  { name: 'Night Prayer', type: 'positive', defaultDuration: 15, archived: false, order: 5 },
  { name: 'Run', type: 'positive', defaultDuration: 45, archived: false, order: 6 },
  { name: 'Weed', type: 'avoidance', defaultDuration: 0, archived: false, order: 7 },
  { name: 'Alcohol', type: 'avoidance', defaultDuration: 0, archived: false, order: 8 },
  { name: 'P', type: 'avoidance', defaultDuration: 0, archived: false, order: 9 },
];

// Category color mapping
export const CATEGORY_COLORS: Record<LocationCategory, string> = {
  Work: 'bg-blue-500',
  Home: 'bg-green-500',
  Exercise: 'bg-purple-500',
  Social: 'bg-orange-500',
  Commute: 'bg-cyan-500',
  Other: 'bg-gray-500',
};

export const CATEGORY_COLOR_IDS: Record<LocationCategory, string> = {
  Work: '1', // Lavender
  Home: '2', // Sage
  Exercise: '3', // Grape
  Social: '6', // Tangerine
  Commute: '7', // Peacock
  Other: '8', // Graphite
};
