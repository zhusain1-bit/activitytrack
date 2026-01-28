import React, { useState, useMemo } from 'react';
import { Check, X, Clock, Flame, AlertTriangle, RotateCcw, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Habit, HabitCompletion } from '../../types';
import { isHabitCompletedToday, getTodayCompletions, calculateHabitStreak, sortHabits, getScheduledTimeToday } from '../../utils/habitUtils';
import { formatTime } from '../../utils/dateUtils';
import { Badge, Button, Modal, Textarea } from '../ui';

interface HabitItemProps {
  habit: Habit;
  isCompleted: boolean;
  todayCompletion: HabitCompletion | null;
  streak: number;
  daysClean?: number;
  onComplete: (notes?: string) => void;
  onUndo: () => void;
}

function HabitItem({
  habit,
  isCompleted,
  todayCompletion,
  streak,
  daysClean,
  onComplete,
  onUndo,
}: HabitItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const isAvoidance = habit.type === 'avoidance';
  const scheduledTime = getScheduledTimeToday(habit);
  const isOverdue = scheduledTime && new Date() > scheduledTime && !isCompleted;

  const handleComplete = () => {
    if (notes.trim()) {
      onComplete(notes.trim());
      setNotes('');
      setShowNotes(false);
    } else {
      onComplete();
    }
  };

  return (
    <>
      <div
        className={`
          group flex items-center gap-3 p-3 rounded-lg border transition-all
          ${isCompleted
            ? isAvoidance
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-green-500/5 border-green-500/20'
            : 'bg-card border-border hover:border-primary/50'}
        `}
      >
        {/* Checkbox */}
        <button
          onClick={() => !isCompleted && handleComplete()}
          disabled={isCompleted}
          className={`
            flex-shrink-0 w-6 h-6 rounded-full border-2
            flex items-center justify-center transition-all
            ${isCompleted
              ? isAvoidance
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-green-500 border-green-500 text-white animate-pulse-check'
              : isAvoidance
                ? 'border-red-300 hover:border-red-500'
                : 'border-muted-foreground/30 hover:border-primary'
            }
          `}
        >
          {isCompleted && (isAvoidance ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />)}
        </button>

        {/* Habit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium truncate ${
                isCompleted ? 'text-muted-foreground' : 'text-foreground'
              }`}
            >
              {habit.name}
            </span>
            {isAvoidance && (
              <Badge variant="destructive" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Avoid
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="warning" size="sm">
                <Clock className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>

          {/* Completion time or scheduled time */}
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {todayCompletion ? (
              <span>Completed at {formatTime(todayCompletion.timestamp)}</span>
            ) : scheduledTime ? (
              <span>Scheduled: {formatTime(scheduledTime)}</span>
            ) : null}

            {/* Streak */}
            {!isAvoidance && streak > 0 && (
              <span className="flex items-center gap-1 text-orange-500">
                <Flame className="w-3 h-3" />
                {streak} day streak
              </span>
            )}

            {/* Days clean for avoidance */}
            {isAvoidance && daysClean !== undefined && daysClean > 0 && (
              <span className="text-green-500">
                {daysClean} days clean
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isCompleted && (
            <button
              onClick={() => setShowNotes(true)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              title="Add notes"
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {isCompleted && todayCompletion && (
            <button
              onClick={onUndo}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Notes modal */}
      <Modal
        isOpen={showNotes}
        onClose={() => setShowNotes(false)}
        title={`Complete: ${habit.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this habit..."
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNotes(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete}>
              {isAvoidance ? 'Log' : 'Complete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface HabitChecklistProps {
  compact?: boolean;
}

export function HabitChecklist({ compact = false }: HabitChecklistProps) {
  const { state, completeHabit, undoCompletion } = useApp();
  const { habits, habitCompletions, locationBlocks } = state;

  const todayCompletions = useMemo(
    () => getTodayCompletions(habitCompletions),
    [habitCompletions]
  );

  const sortedHabits = useMemo(() => sortHabits(habits.filter(h => !h.archived)), [habits]);
  const positiveHabits = sortedHabits.filter((h) => h.type === 'positive');
  const avoidanceHabits = sortedHabits.filter((h) => h.type === 'avoidance');

  // Get current location for habit context
  const currentLocationBlock = useMemo(() => {
    const now = new Date().getTime();
    return locationBlocks.find((b) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      return now >= start && now <= end;
    });
  }, [locationBlocks]);

  const getHabitData = (habit: Habit) => {
    const isCompleted = isHabitCompletedToday(habit.id, habitCompletions);
    const todayCompletion = todayCompletions.find((c) => c.habitId === habit.id) || null;
    const streakData = calculateHabitStreak(habit.id, habitCompletions);

    // For avoidance habits, days clean is time since last logged
    let daysClean: number | undefined;
    if (habit.type === 'avoidance') {
      const habitCompletionsForHabit = habitCompletions
        .filter((c) => c.habitId === habit.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (habitCompletionsForHabit.length > 0) {
        const lastCompletion = new Date(habitCompletionsForHabit[0].timestamp);
        daysClean = Math.floor((Date.now() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return { isCompleted, todayCompletion, streak: streakData.currentStreak, daysClean };
  };

  const handleComplete = (habit: Habit, notes?: string) => {
    completeHabit(habit, currentLocationBlock, notes);
  };

  const handleUndo = (completionId: string) => {
    undoCompletion(completionId);
  };

  // Calculate completion stats
  const completedCount = positiveHabits.filter((h) =>
    isHabitCompletedToday(h.id, habitCompletions)
  ).length;
  const totalCount = positiveHabits.length;

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Today's Habits</h3>
        <Badge variant={completedCount === totalCount ? 'success' : 'secondary'}>
          {completedCount}/{totalCount} complete
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Positive habits */}
      <div className="space-y-2">
        {positiveHabits.map((habit) => {
          const data = getHabitData(habit);
          return (
            <HabitItem
              key={habit.id}
              habit={habit}
              {...data}
              onComplete={(notes) => handleComplete(habit, notes)}
              onUndo={() => data.todayCompletion && handleUndo(data.todayCompletion.id)}
            />
          );
        })}
      </div>

      {/* Avoidance habits separator */}
      {avoidanceHabits.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              TRACKING TO AVOID
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            {avoidanceHabits.map((habit) => {
              const data = getHabitData(habit);
              return (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  {...data}
                  onComplete={(notes) => handleComplete(habit, notes)}
                  onUndo={() => data.todayCompletion && handleUndo(data.todayCompletion.id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
