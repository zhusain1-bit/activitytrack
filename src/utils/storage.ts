import { AppState, AppSettings, LocationZone, Habit, HabitCompletion, LocationBlock, HabitStreak, DEFAULT_HABITS, CalendarSyncStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'activitytrack_data';

const defaultSettings: AppSettings = {
  googleCalendarConnected: false,
  defaultHabitDuration: 30,
  autoSync: true,
  autoLocationTracking: false,
  syncInterval: 15,
  theme: 'system',
  notificationsEnabled: true,
};

const defaultSyncStatus: CalendarSyncStatus = {
  pendingEvents: 0,
  syncInProgress: false,
};

export function getInitialState(): AppState {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppState;
      // Ensure all required fields exist
      return {
        zones: parsed.zones || [],
        habits: parsed.habits || createDefaultHabits(),
        habitCompletions: parsed.habitCompletions || [],
        locationBlocks: parsed.locationBlocks || [],
        settings: { ...defaultSettings, ...parsed.settings },
        syncStatus: { ...defaultSyncStatus, ...parsed.syncStatus },
        streaks: parsed.streaks || [],
      };
    } catch {
      console.error('Failed to parse stored data, using defaults');
    }
  }

  return {
    zones: [],
    habits: createDefaultHabits(),
    habitCompletions: [],
    locationBlocks: [],
    settings: defaultSettings,
    syncStatus: defaultSyncStatus,
    streaks: [],
  };
}

function createDefaultHabits(): Habit[] {
  const now = new Date().toISOString();
  return DEFAULT_HABITS.map((habit) => ({
    ...habit,
    id: uuidv4(),
    createdAt: now,
  }));
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Export data as JSON
export function exportData(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

// Import data from JSON
export function importData(jsonString: string): AppState | null {
  try {
    const data = JSON.parse(jsonString) as AppState;
    // Validate required fields
    if (!data.habits || !data.settings) {
      throw new Error('Invalid data format');
    }
    return data;
  } catch (error) {
    console.error('Failed to import data:', error);
    return null;
  }
}

// Export to CSV format
export function exportHabitsToCSV(completions: HabitCompletion[], habits: Habit[]): string {
  const habitMap = new Map(habits.map(h => [h.id, h.name]));
  const headers = ['Date', 'Time', 'Habit', 'Duration (min)', 'Streak', 'Notes'];
  const rows = completions.map(c => {
    const date = new Date(c.timestamp);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      habitMap.get(c.habitId) || 'Unknown',
      c.duration.toString(),
      c.streak.toString(),
      c.notes || '',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportLocationsToCSV(blocks: LocationBlock[]): string {
  const headers = ['Date', 'Start Time', 'End Time', 'Location', 'Category', 'Duration (min)'];
  const rows = blocks.map(b => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    return [
      start.toLocaleDateString(),
      start.toLocaleTimeString(),
      end.toLocaleTimeString(),
      b.location,
      b.category,
      duration.toString(),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Backup/restore utilities
export function createBackup(state: AppState): Blob {
  const data = JSON.stringify(state, null, 2);
  return new Blob([data], { type: 'application/json' });
}

export function downloadBackup(state: AppState): void {
  const blob = createBackup(state);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activitytrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
