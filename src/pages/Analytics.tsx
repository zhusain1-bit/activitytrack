import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Award, Lightbulb, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { getWeekRange, getLastWeekRange, getDaysInRange, formatDuration, getDateKey } from '../utils/dateUtils';
import { calculateHabitStreak, getHabitCompletionRate } from '../utils/habitUtils';
import type { LocationCategory } from '../types';
import { parseISO, format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from 'date-fns';

const CHART_COLORS = {
  Work: '#3B82F6',
  Home: '#22C55E',
  Exercise: '#A855F7',
  Social: '#F97316',
  Commute: '#06B6D4',
  Other: '#6B7280',
};

export function Analytics() {
  const { state } = useApp();
  const { habits, habitCompletions, locationBlocks } = state;
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Weekly comparison data
  const weeklyData = useMemo(() => {
    const thisWeek = getWeekRange();
    const lastWeek = getLastWeekRange();

    const thisWeekDays = getDaysInRange(thisWeek.start, thisWeek.end);
    const lastWeekDays = getDaysInRange(lastWeek.start, lastWeek.end);

    const getCompletionsForDay = (date: Date) => {
      return habitCompletions.filter((c) =>
        isSameDay(parseISO(c.timestamp), date)
      ).length;
    };

    const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return weekDayNames.map((day, index) => ({
      day,
      thisWeek: thisWeekDays[index] ? getCompletionsForDay(thisWeekDays[index]) : 0,
      lastWeek: lastWeekDays[index] ? getCompletionsForDay(lastWeekDays[index]) : 0,
    }));
  }, [habitCompletions]);

  // Category time distribution
  const categoryData = useMemo(() => {
    const categoryMinutes: Record<string, number> = {};

    locationBlocks.forEach((block) => {
      const duration = Math.round(
        (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
      );
      categoryMinutes[block.category] = (categoryMinutes[block.category] || 0) + duration;
    });

    return Object.entries(categoryMinutes).map(([category, minutes]) => ({
      name: category,
      value: minutes,
      color: CHART_COLORS[category as LocationCategory] || CHART_COLORS.Other,
    }));
  }, [locationBlocks]);

  // Habit completion percentages
  const habitStats = useMemo(() => {
    const positiveHabits = habits.filter((h) => h.type === 'positive' && !h.archived);

    return positiveHabits.map((habit) => {
      const streak = calculateHabitStreak(habit.id, habitCompletions);
      const weeklyRate = getHabitCompletionRate(habit.id, habitCompletions, 7);
      const monthlyRate = getHabitCompletionRate(habit.id, habitCompletions, 30);

      return {
        habit,
        streak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        weeklyRate,
        monthlyRate,
        totalCompletions: streak.totalCompletions,
      };
    });
  }, [habits, habitCompletions]);

  // Avoidance tracking stats
  const avoidanceStats = useMemo(() => {
    const avoidanceHabits = habits.filter((h) => h.type === 'avoidance' && !h.archived);

    return avoidanceHabits.map((habit) => {
      const habitLogs = habitCompletions
        .filter((c) => c.habitId === habit.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const lastLog = habitLogs[0];
      const daysClean = lastLog
        ? Math.floor((Date.now() - new Date(lastLog.timestamp).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        habit,
        daysClean,
        totalLogs: habitLogs.length,
        lastLog: lastLog?.timestamp,
      };
    });
  }, [habits, habitCompletions]);

  // Pattern insights
  const insights = useMemo(() => {
    const patterns: { id: string; type: string; message: string; icon: React.ReactNode }[] = [];

    // Check for morning routine correlation
    const wakeHabit = habits.find((h) => h.name.includes('Wake'));
    const meditationHabit = habits.find((h) => h.name.includes('Meditation'));

    if (wakeHabit && meditationHabit) {
      const wakeCompletions = habitCompletions.filter((c) => c.habitId === wakeHabit.id);
      const meditationCompletions = habitCompletions.filter((c) => c.habitId === meditationHabit.id);

      const wakeDates = new Set(wakeCompletions.map((c) => getDateKey(c.timestamp)));
      const meditationDates = new Set(meditationCompletions.map((c) => getDateKey(c.timestamp)));

      const overlap = [...wakeDates].filter((d) => meditationDates.has(d)).length;
      if (wakeDates.size > 0) {
        const correlation = Math.round((overlap / wakeDates.size) * 100);
        if (correlation > 70) {
          patterns.push({
            id: 'wake-meditation',
            type: 'correlation',
            message: `You meditate ${correlation}% of days you wake on time`,
            icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
          });
        }
      }
    }

    // Check for gym patterns
    const gymHabit = habits.find((h) => h.name === 'Gym');
    if (gymHabit) {
      const gymCompletions = habitCompletions.filter((c) => c.habitId === gymHabit.id);
      const weekdayCount = gymCompletions.filter((c) => {
        const day = new Date(c.timestamp).getDay();
        return day !== 0 && day !== 6;
      }).length;
      const weekendCount = gymCompletions.length - weekdayCount;

      if (weekdayCount > weekendCount * 2 && gymCompletions.length > 5) {
        patterns.push({
          id: 'gym-weekday',
          type: 'trend',
          message: 'Gym sessions are more likely on weekdays',
          icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
        });
      }
    }

    // Achievement checks
    const longestStreak = Math.max(...habitStats.map((s) => s.longestStreak), 0);
    if (longestStreak >= 7) {
      patterns.push({
        id: 'week-streak',
        type: 'achievement',
        message: `You've achieved a ${longestStreak}-day streak!`,
        icon: <Award className="w-5 h-5 text-purple-500" />,
      });
    }

    // Location insights
    if (locationBlocks.length > 0) {
      const workBlocks = locationBlocks.filter((b) => b.category === 'Work');
      if (workBlocks.length > 0) {
        const totalWorkMinutes = workBlocks.reduce((sum, b) => {
          return sum + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
        }, 0);
        const avgWorkHours = (totalWorkMinutes / workBlocks.length / 60).toFixed(1);
        patterns.push({
          id: 'avg-work',
          type: 'trend',
          message: `Average work session: ${avgWorkHours} hours`,
          icon: <Calendar className="w-5 h-5 text-cyan-500" />,
        });
      }
    }

    return patterns;
  }, [habits, habitCompletions, habitStats, locationBlocks]);

  // Streak heatmap data
  const heatmapData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = getDaysInRange(monthStart, monthEnd);

    return days.map((date) => {
      const dayCompletions = habitCompletions.filter((c) =>
        isSameDay(parseISO(c.timestamp), date)
      );
      const positiveHabits = habits.filter((h) => h.type === 'positive' && !h.archived);
      const completionRate = positiveHabits.length > 0
        ? dayCompletions.length / positiveHabits.length
        : 0;

      return {
        date,
        day: format(date, 'd'),
        completions: dayCompletions.length,
        rate: completionRate,
      };
    });
  }, [currentMonth, habitCompletions, habits]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and patterns from your habits and locations
        </p>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {insight.icon}
                  <p className="text-sm">{insight.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="lastWeek" name="Last Week" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="thisWeek" name="This Week" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatDuration(Number(value))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No location data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habit stats */}
      <Card>
        <CardHeader>
          <CardTitle>Habit Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Habit</th>
                  <th className="text-center py-3 px-4 font-medium">Current Streak</th>
                  <th className="text-center py-3 px-4 font-medium">Best Streak</th>
                  <th className="text-center py-3 px-4 font-medium">7-Day Rate</th>
                  <th className="text-center py-3 px-4 font-medium">30-Day Rate</th>
                </tr>
              </thead>
              <tbody>
                {habitStats.map(({ habit, streak, longestStreak, weeklyRate, monthlyRate }) => (
                  <tr key={habit.id} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{habit.name}</td>
                    <td className="text-center py-3 px-4">
                      <Badge variant={streak > 0 ? 'success' : 'secondary'}>
                        {streak} days
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-4 text-muted-foreground">
                      {longestStreak} days
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${weeklyRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{weeklyRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${monthlyRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{monthlyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Avoidance tracking */}
      {avoidanceStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Avoidance Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {avoidanceStats.map(({ habit, daysClean, totalLogs }) => (
                <div
                  key={habit.id}
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <h4 className="font-medium mb-2">{habit.name}</h4>
                  <p className="text-3xl font-bold text-green-500">
                    {daysClean !== null ? daysClean : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {daysClean !== null ? 'days clean' : 'No logs recorded'}
                  </p>
                  {totalLogs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalLogs} total logs
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak heatmap calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Habit Heatmap</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {/* Pad start with empty cells */}
            {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {heatmapData.map(({ date, day, completions, rate }) => {
              const isToday = isSameDay(date, new Date());
              const isFuture = date > new Date();

              let bgClass = 'bg-muted/30';
              if (!isFuture) {
                if (rate >= 0.8) bgClass = 'bg-green-500';
                else if (rate >= 0.6) bgClass = 'bg-green-400';
                else if (rate >= 0.4) bgClass = 'bg-green-300';
                else if (rate >= 0.2) bgClass = 'bg-green-200';
                else if (rate > 0) bgClass = 'bg-green-100';
              }

              return (
                <div
                  key={day}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center text-sm
                    ${bgClass}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${isFuture ? 'opacity-30' : ''}
                  `}
                  title={`${format(date, 'MMM d')}: ${completions} habits completed`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="w-4 h-4 rounded bg-muted/30" />
            <div className="w-4 h-4 rounded bg-green-100" />
            <div className="w-4 h-4 rounded bg-green-200" />
            <div className="w-4 h-4 rounded bg-green-300" />
            <div className="w-4 h-4 rounded bg-green-400" />
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>More</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
