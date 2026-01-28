import { format, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, subDays, subWeeks, isSameDay, differenceInMinutes, differenceInDays, parseISO, isValid } from 'date-fns';

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
}

export function formatDurationLong(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
  const minStr = mins === 1 ? '1 minute' : `${mins} minutes`;
  return `${hourStr} ${minStr}`;
}

export function getToday(): Date {
  return startOfDay(new Date());
}

export function getTodayRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: startOfDay(today),
    end: endOfDay(today),
  };
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function getLastWeekRange(): { start: Date; end: Date } {
  const lastWeek = subWeeks(new Date(), 1);
  return getWeekRange(lastWeek);
}

export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let current = startOfDay(start);
  const endDay = startOfDay(end);

  while (current <= endDay) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isSameDay(d, new Date());
}

export function getDurationMinutes(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return differenceInMinutes(endDate, startDate);
}

export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return Math.abs(differenceInDays(d1, d2));
}

export function getHourSlots(date: Date = new Date()): { hour: number; time: Date }[] {
  const slots: { hour: number; time: Date }[] = [];
  const dayStart = startOfDay(date);

  for (let hour = 0; hour < 24; hour++) {
    slots.push({
      hour,
      time: new Date(dayStart.getTime() + hour * 60 * 60 * 1000),
    });
  }

  return slots;
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function getDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function getWeekDays(): string[] {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return getDaysInRange(firstDay, lastDay);
}

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function fromISOString(isoString: string): Date | null {
  const date = parseISO(isoString);
  return isValid(date) ? date : null;
}

// Get streak count based on consecutive days
export function calculateStreak(completionDates: string[]): number {
  if (completionDates.length === 0) return 0;

  // Sort dates in descending order
  const sortedDates = [...completionDates]
    .map(d => startOfDay(parseISO(d)))
    .sort((a, b) => b.getTime() - a.getTime());

  // Remove duplicates (same day completions)
  const uniqueDates: Date[] = [];
  for (const date of sortedDates) {
    if (uniqueDates.length === 0 || !isSameDay(date, uniqueDates[uniqueDates.length - 1])) {
      uniqueDates.push(date);
    }
  }

  // Check if today or yesterday was completed
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  if (!isSameDay(uniqueDates[0], today) && !isSameDay(uniqueDates[0], yesterday)) {
    return 0; // Streak broken
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const expected = subDays(uniqueDates[i - 1], 1);
    if (isSameDay(uniqueDates[i], expected)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// For avoidance habits, calculate days clean
export function calculateDaysClean(lastRelapse: string | undefined): number {
  if (!lastRelapse) return 0;

  const lastDate = parseISO(lastRelapse);
  if (!isValid(lastDate)) return 0;

  return differenceInDays(new Date(), lastDate);
}
