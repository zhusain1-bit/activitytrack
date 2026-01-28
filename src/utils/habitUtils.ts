import { Habit, HabitCompletion, HabitStreak, LocationBlock } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { startOfDay, isSameDay, subDays, parseISO, format } from 'date-fns';

// Calculate streak for a habit
export function calculateHabitStreak(
  habitId: string,
  completions: HabitCompletion[]
): HabitStreak {
  const habitCompletions = completions
    .filter((c) => c.habitId === habitId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (habitCompletions.length === 0) {
    return {
      habitId,
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
    };
  }

  // Get unique completion dates
  const completionDates = habitCompletions.map((c) =>
    format(parseISO(c.timestamp), 'yyyy-MM-dd')
  );
  const uniqueDates = [...new Set(completionDates)];

  // Calculate current streak
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  let currentStreak = 0;
  let checkDate = uniqueDates.includes(today) ? today : yesterday;

  if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
    currentStreak = 1;
    let i = uniqueDates.indexOf(checkDate);

    while (i >= 0 && i < uniqueDates.length - 1) {
      const currentDate = parseISO(uniqueDates[i]);
      const nextDate = parseISO(uniqueDates[i + 1]);
      const dayDiff = Math.abs(
        (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        currentStreak++;
        i++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const currentDate = parseISO(uniqueDates[i]);
    const nextDate = parseISO(uniqueDates[i + 1]);
    const dayDiff = Math.abs(
      (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    habitId,
    currentStreak,
    longestStreak,
    lastCompletedDate: uniqueDates[0],
    totalCompletions: habitCompletions.length,
  };
}

// Check if habit was completed today
export function isHabitCompletedToday(
  habitId: string,
  completions: HabitCompletion[]
): boolean {
  const today = startOfDay(new Date());
  return completions.some(
    (c) => c.habitId === habitId && isSameDay(parseISO(c.timestamp), today)
  );
}

// Get today's completions
export function getTodayCompletions(
  completions: HabitCompletion[]
): HabitCompletion[] {
  const today = startOfDay(new Date());
  return completions.filter((c) => isSameDay(parseISO(c.timestamp), today));
}

// Create a new habit completion
export function createHabitCompletion(
  habit: Habit,
  currentStreak: number,
  locationBlock?: LocationBlock,
  notes?: string
): HabitCompletion {
  return {
    id: uuidv4(),
    habitId: habit.id,
    timestamp: new Date().toISOString(),
    duration: habit.defaultDuration,
    locationBlockId: locationBlock?.id,
    zoneId: locationBlock?.zoneId,
    streak: currentStreak + 1,
    notes,
    synced: false,
  };
}

// For avoidance habits, calculate days since last logged
export function calculateDaysClean(
  habitId: string,
  completions: HabitCompletion[]
): number {
  const habitCompletions = completions
    .filter((c) => c.habitId === habitId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (habitCompletions.length === 0) {
    // No completions means user has been clean
    // For now, return 0 as we don't know the start date
    return 0;
  }

  const lastCompletion = parseISO(habitCompletions[0].timestamp);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysDiff;
}

// Get completion percentage for a week
export function getWeeklyCompletionPercentage(
  habits: Habit[],
  completions: HabitCompletion[],
  weekStart: Date,
  weekEnd: Date
): number {
  const positiveHabits = habits.filter((h) => h.type === 'positive' && !h.archived);
  if (positiveHabits.length === 0) return 0;

  const weekCompletions = completions.filter((c) => {
    const date = parseISO(c.timestamp);
    return date >= weekStart && date <= weekEnd;
  });

  // Count unique habit-day combinations
  const completedDays = new Set(
    weekCompletions.map(
      (c) => `${c.habitId}-${format(parseISO(c.timestamp), 'yyyy-MM-dd')}`
    )
  );

  // Calculate total possible (habits * 7 days)
  const totalPossible = positiveHabits.length * 7;

  return Math.round((completedDays.size / totalPossible) * 100);
}

// Get habit suggestions based on current location
export function getHabitSuggestionsForLocation(
  habits: Habit[],
  currentLocation: LocationBlock | null
): Habit[] {
  if (!currentLocation) return [];

  // Define location-habit associations
  const locationHabitMap: Record<string, string[]> = {
    Gym: ['Gym'],
    Exercise: ['Gym', 'Run'],
    Home: ['30-Min Meditation', 'Night Prayer', 'Practice Flashcards'],
    Work: ['30 Min Jobs', 'Practice Flashcards'],
  };

  const category = currentLocation.category;
  const location = currentLocation.location.toLowerCase();

  const suggestedNames = [
    ...(locationHabitMap[category] || []),
    ...(location.includes('gym') ? ['Gym'] : []),
    ...(location.includes('home') ? locationHabitMap['Home'] : []),
  ];

  return habits.filter(
    (h) => !h.archived && suggestedNames.includes(h.name)
  );
}

// Sort habits by order
export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => a.order - b.order);
}

// Reorder habits
export function reorderHabits(
  habits: Habit[],
  habitId: string,
  newIndex: number
): Habit[] {
  const sorted = sortHabits(habits);
  const currentIndex = sorted.findIndex((h) => h.id === habitId);

  if (currentIndex === -1 || currentIndex === newIndex) {
    return habits;
  }

  const [habit] = sorted.splice(currentIndex, 1);
  sorted.splice(newIndex, 0, habit);

  return sorted.map((h, i) => ({ ...h, order: i }));
}

// Get habits by type
export function getHabitsByType(
  habits: Habit[],
  type: 'positive' | 'avoidance'
): Habit[] {
  return habits.filter((h) => h.type === type && !h.archived);
}

// Parse scheduled time to Date for today
export function getScheduledTimeToday(habit: Habit): Date | null {
  if (!habit.scheduledTime) return null;

  const [hours, minutes] = habit.scheduledTime.split(':').map(Number);
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today;
}

// Check if habit is overdue (for scheduled habits)
export function isHabitOverdue(
  habit: Habit,
  completions: HabitCompletion[]
): boolean {
  if (!habit.scheduledTime) return false;

  const scheduledTime = getScheduledTimeToday(habit);
  if (!scheduledTime) return false;

  const now = new Date();
  if (now < scheduledTime) return false;

  // Check if completed today
  return !isHabitCompletedToday(habit.id, completions);
}

// Get completion rate for a habit over the last N days
export function getHabitCompletionRate(
  habitId: string,
  completions: HabitCompletion[],
  days: number
): number {
  const startDate = subDays(new Date(), days);

  const completionDates = completions
    .filter((c) => c.habitId === habitId && parseISO(c.timestamp) >= startDate)
    .map((c) => format(parseISO(c.timestamp), 'yyyy-MM-dd'));

  const uniqueDates = new Set(completionDates);
  return Math.round((uniqueDates.size / days) * 100);
}
