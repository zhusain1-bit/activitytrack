import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AppState,
  AppSettings,
  LocationZone,
  Habit,
  HabitCompletion,
  LocationBlock,
  HabitStreak,
  CalendarSyncStatus,
} from '../types';
import { getInitialState, saveState } from '../utils/storage';
import { calculateHabitStreak, createHabitCompletion } from '../utils/habitUtils';

// Action types
type AppAction =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_ZONE'; payload: LocationZone }
  | { type: 'UPDATE_ZONE'; payload: LocationZone }
  | { type: 'DELETE_ZONE'; payload: string }
  | { type: 'ADD_HABIT'; payload: Habit }
  | { type: 'UPDATE_HABIT'; payload: Habit }
  | { type: 'DELETE_HABIT'; payload: string }
  | { type: 'ARCHIVE_HABIT'; payload: string }
  | { type: 'COMPLETE_HABIT'; payload: { habit: Habit; locationBlock?: LocationBlock; notes?: string } }
  | { type: 'UNDO_COMPLETION'; payload: string }
  | { type: 'UPDATE_COMPLETION'; payload: HabitCompletion }
  | { type: 'ADD_LOCATION_BLOCKS'; payload: LocationBlock[] }
  | { type: 'UPDATE_LOCATION_BLOCK'; payload: LocationBlock }
  | { type: 'DELETE_LOCATION_BLOCK'; payload: string }
  | { type: 'CLEAR_LOCATION_BLOCKS'; payload?: void }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_SYNC_STATUS'; payload: Partial<CalendarSyncStatus> }
  | { type: 'MARK_SYNCED'; payload: { locationBlockIds?: string[]; completionIds?: string[] } }
  | { type: 'IMPORT_DATA'; payload: AppState };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'ADD_ZONE':
      return {
        ...state,
        zones: [...state.zones, action.payload],
      };

    case 'UPDATE_ZONE':
      return {
        ...state,
        zones: state.zones.map((z) =>
          z.id === action.payload.id ? action.payload : z
        ),
      };

    case 'DELETE_ZONE':
      return {
        ...state,
        zones: state.zones.filter((z) => z.id !== action.payload),
      };

    case 'ADD_HABIT':
      return {
        ...state,
        habits: [...state.habits, action.payload],
      };

    case 'UPDATE_HABIT':
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.payload.id ? action.payload : h
        ),
      };

    case 'DELETE_HABIT':
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.payload),
        habitCompletions: state.habitCompletions.filter(
          (c) => c.habitId !== action.payload
        ),
        streaks: state.streaks.filter((s) => s.habitId !== action.payload),
      };

    case 'ARCHIVE_HABIT':
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.payload ? { ...h, archived: true } : h
        ),
      };

    case 'COMPLETE_HABIT': {
      const { habit, locationBlock, notes } = action.payload;
      const currentStreak = calculateHabitStreak(
        habit.id,
        state.habitCompletions
      );
      const completion = createHabitCompletion(
        habit,
        currentStreak.currentStreak,
        locationBlock,
        notes
      );

      const newStreaks = state.streaks.filter((s) => s.habitId !== habit.id);
      const updatedStreak = calculateHabitStreak(habit.id, [
        ...state.habitCompletions,
        completion,
      ]);
      newStreaks.push(updatedStreak);

      return {
        ...state,
        habitCompletions: [...state.habitCompletions, completion],
        streaks: newStreaks,
        syncStatus: {
          ...state.syncStatus,
          pendingEvents: state.syncStatus.pendingEvents + 1,
        },
      };
    }

    case 'UNDO_COMPLETION': {
      const completion = state.habitCompletions.find(
        (c) => c.id === action.payload
      );
      if (!completion) return state;

      const newCompletions = state.habitCompletions.filter(
        (c) => c.id !== action.payload
      );

      const newStreaks = state.streaks.filter(
        (s) => s.habitId !== completion.habitId
      );
      const updatedStreak = calculateHabitStreak(
        completion.habitId,
        newCompletions
      );
      newStreaks.push(updatedStreak);

      return {
        ...state,
        habitCompletions: newCompletions,
        streaks: newStreaks,
      };
    }

    case 'UPDATE_COMPLETION':
      return {
        ...state,
        habitCompletions: state.habitCompletions.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'ADD_LOCATION_BLOCKS':
      return {
        ...state,
        locationBlocks: [...state.locationBlocks, ...action.payload],
        syncStatus: {
          ...state.syncStatus,
          pendingEvents:
            state.syncStatus.pendingEvents + action.payload.length,
        },
      };

    case 'UPDATE_LOCATION_BLOCK':
      return {
        ...state,
        locationBlocks: state.locationBlocks.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };

    case 'DELETE_LOCATION_BLOCK':
      return {
        ...state,
        locationBlocks: state.locationBlocks.filter(
          (b) => b.id !== action.payload
        ),
      };

    case 'CLEAR_LOCATION_BLOCKS':
      return {
        ...state,
        locationBlocks: [],
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'UPDATE_SYNC_STATUS':
      return {
        ...state,
        syncStatus: { ...state.syncStatus, ...action.payload },
      };

    case 'MARK_SYNCED': {
      const { locationBlockIds = [], completionIds = [] } = action.payload;
      return {
        ...state,
        locationBlocks: state.locationBlocks.map((b) =>
          locationBlockIds.includes(b.id) ? { ...b, synced: true } : b
        ),
        habitCompletions: state.habitCompletions.map((c) =>
          completionIds.includes(c.id) ? { ...c, synced: true } : c
        ),
        syncStatus: {
          ...state.syncStatus,
          pendingEvents: state.syncStatus.pendingEvents -
            locationBlockIds.length -
            completionIds.length,
        },
      };
    }

    case 'IMPORT_DATA':
      return action.payload;

    default:
      return state;
  }
}

// Context interface
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Zone actions
  addZone: (zone: Omit<LocationZone, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateZone: (zone: LocationZone) => void;
  deleteZone: (id: string) => void;
  // Habit actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (habit: Habit) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  completeHabit: (habit: Habit, locationBlock?: LocationBlock, notes?: string) => void;
  undoCompletion: (id: string) => void;
  // Location actions
  addLocationBlocks: (blocks: LocationBlock[]) => void;
  updateLocationBlock: (block: LocationBlock) => void;
  deleteLocationBlock: (id: string) => void;
  clearLocationBlocks: () => void;
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  // Sync actions
  updateSyncStatus: (status: Partial<CalendarSyncStatus>) => void;
  markSynced: (locationBlockIds?: string[], completionIds?: string[]) => void;
  // Data actions
  importData: (data: AppState) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Zone actions
  const addZone = (zone: Omit<LocationZone, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    dispatch({
      type: 'ADD_ZONE',
      payload: {
        ...zone,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const updateZone = (zone: LocationZone) => {
    dispatch({
      type: 'UPDATE_ZONE',
      payload: { ...zone, updatedAt: new Date().toISOString() },
    });
  };

  const deleteZone = (id: string) => {
    dispatch({ type: 'DELETE_ZONE', payload: id });
  };

  // Habit actions
  const addHabit = (habit: Omit<Habit, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_HABIT',
      payload: {
        ...habit,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      },
    });
  };

  const updateHabit = (habit: Habit) => {
    dispatch({ type: 'UPDATE_HABIT', payload: habit });
  };

  const deleteHabit = (id: string) => {
    dispatch({ type: 'DELETE_HABIT', payload: id });
  };

  const archiveHabit = (id: string) => {
    dispatch({ type: 'ARCHIVE_HABIT', payload: id });
  };

  const completeHabit = (
    habit: Habit,
    locationBlock?: LocationBlock,
    notes?: string
  ) => {
    dispatch({
      type: 'COMPLETE_HABIT',
      payload: { habit, locationBlock, notes },
    });
  };

  const undoCompletion = (id: string) => {
    dispatch({ type: 'UNDO_COMPLETION', payload: id });
  };

  // Location actions
  const addLocationBlocks = (blocks: LocationBlock[]) => {
    dispatch({ type: 'ADD_LOCATION_BLOCKS', payload: blocks });
  };

  const updateLocationBlock = (block: LocationBlock) => {
    dispatch({ type: 'UPDATE_LOCATION_BLOCK', payload: block });
  };

  const deleteLocationBlock = (id: string) => {
    dispatch({ type: 'DELETE_LOCATION_BLOCK', payload: id });
  };

  const clearLocationBlocks = () => {
    dispatch({ type: 'CLEAR_LOCATION_BLOCKS' });
  };

  // Settings actions
  const updateSettings = (settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  // Sync actions
  const updateSyncStatus = (status: Partial<CalendarSyncStatus>) => {
    dispatch({ type: 'UPDATE_SYNC_STATUS', payload: status });
  };

  const markSynced = (locationBlockIds?: string[], completionIds?: string[]) => {
    dispatch({
      type: 'MARK_SYNCED',
      payload: { locationBlockIds, completionIds },
    });
  };

  // Data actions
  const importData = (data: AppState) => {
    dispatch({ type: 'IMPORT_DATA', payload: data });
  };

  const value: AppContextValue = {
    state,
    dispatch,
    addZone,
    updateZone,
    deleteZone,
    addHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
    completeHabit,
    undoCompletion,
    addLocationBlocks,
    updateLocationBlock,
    deleteLocationBlock,
    clearLocationBlocks,
    updateSettings,
    updateSyncStatus,
    markSynced,
    importData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use the context
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
