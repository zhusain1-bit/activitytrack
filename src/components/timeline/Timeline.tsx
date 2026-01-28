import React, { useMemo } from 'react';
import { MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocationBlock, HabitCompletion, CATEGORY_COLORS } from '../../types';
import { getBlocksForDate } from '../../utils/locationUtils';
import { formatTime, formatDuration, getHourSlots, formatDate } from '../../utils/dateUtils';
import { Badge, Button } from '../ui';
import { addDays, subDays, isToday, parseISO, isSameDay } from 'date-fns';

interface TimelineProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function Timeline({ date, onDateChange }: TimelineProps) {
  const { state } = useApp();
  const { locationBlocks, habitCompletions, habits, zones } = state;

  const hourSlots = useMemo(() => getHourSlots(date), [date]);

  const dayBlocks = useMemo(
    () => getBlocksForDate(locationBlocks, date),
    [locationBlocks, date]
  );

  const dayCompletions = useMemo(
    () => habitCompletions.filter((c) => isSameDay(parseISO(c.timestamp), date)),
    [habitCompletions, date]
  );

  const habitMap = useMemo(
    () => new Map(habits.map((h) => [h.id, h])),
    [habits]
  );

  const zoneMap = useMemo(
    () => new Map(zones.map((z) => [z.id, z])),
    [zones]
  );

  // Calculate position and height for location blocks
  const getBlockStyle = (block: LocationBlock) => {
    const startDate = new Date(block.startTime);
    const endDate = new Date(block.endTime);

    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;

    const top = startHour * 60; // 60px per hour
    const height = Math.max((endHour - startHour) * 60, 20); // Minimum 20px height

    return { top: `${top}px`, height: `${height}px` };
  };

  // Get completions within a block
  const getCompletionsInBlock = (block: LocationBlock): HabitCompletion[] => {
    const blockStart = new Date(block.startTime).getTime();
    const blockEnd = new Date(block.endTime).getTime();

    return dayCompletions.filter((c) => {
      const completionTime = new Date(c.timestamp).getTime();
      return completionTime >= blockStart && completionTime <= blockEnd;
    });
  };

  // Get completions not in any block
  const unassignedCompletions = useMemo(() => {
    const assignedIds = new Set(
      dayBlocks.flatMap((b) => getCompletionsInBlock(b).map((c) => c.id))
    );
    return dayCompletions.filter((c) => !assignedIds.has(c.id));
  }, [dayBlocks, dayCompletions]);

  const handlePrevDay = () => onDateChange(subDays(date, 1));
  const handleNextDay = () => onDateChange(addDays(date, 1));
  const handleToday = () => onDateChange(new Date());

  const CategoryBadge = ({ category }: { category: string }) => {
    const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other;
    return (
      <span className={`inline-block w-2 h-2 rounded-full ${colorClass}`} />
    );
  };

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold min-w-[150px] text-center">
            {isToday(date) ? 'Today' : formatDate(date)}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {!isToday(date) && (
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
        )}
      </div>

      {/* Timeline view */}
      <div className="relative bg-card border border-border rounded-xl overflow-hidden">
        {/* Hour markers */}
        <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-border bg-muted/30">
          {hourSlots.map(({ hour }) => (
            <div
              key={hour}
              className="h-[60px] flex items-start justify-end pr-2 pt-1"
            >
              <span className="text-xs text-muted-foreground">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline content */}
        <div className="ml-16 relative" style={{ height: `${24 * 60}px` }}>
          {/* Hour grid lines */}
          {hourSlots.map(({ hour }) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border/50"
              style={{ top: `${hour * 60}px` }}
            />
          ))}

          {/* Current time indicator */}
          {isToday(date) && (
            <div
              className="absolute left-0 right-0 z-30 pointer-events-none"
              style={{
                top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px`,
              }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}

          {/* Location blocks */}
          {dayBlocks.map((block) => {
            const style = getBlockStyle(block);
            const zone = block.zoneId ? zoneMap.get(block.zoneId) : null;
            const completionsInBlock = getCompletionsInBlock(block);
            const colorClass = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.Other;
            const duration = Math.round(
              (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
            );

            return (
              <div
                key={block.id}
                className={`absolute left-2 right-2 rounded-lg border p-2 overflow-hidden
                  ${colorClass.replace('bg-', 'bg-opacity-10 border-').replace('-500', '-500/30')}
                  hover:shadow-md transition-shadow cursor-pointer z-10`}
                style={style}
              >
                <div className="flex items-start gap-2">
                  <CategoryBadge category={block.category} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {block.location}
                      {zone && zone.activity !== block.location && ` - ${zone.activity}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)} ({formatDuration(duration)})
                    </p>

                    {/* Habit completions within block */}
                    {completionsInBlock.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {completionsInBlock.map((c) => {
                          const habit = habitMap.get(c.habitId);
                          if (!habit) return null;
                          return (
                            <Badge
                              key={c.id}
                              variant={habit.type === 'avoidance' ? 'destructive' : 'success'}
                              size="sm"
                            >
                              {habit.type === 'avoidance' ? '!' : '✓'} {habit.name}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Unassigned habit completions */}
          {unassignedCompletions.map((completion) => {
            const habit = habitMap.get(completion.habitId);
            if (!habit) return null;

            const completionDate = new Date(completion.timestamp);
            const top = (completionDate.getHours() + completionDate.getMinutes() / 60) * 60;

            return (
              <div
                key={completion.id}
                className="absolute left-2 right-2 h-8 rounded-lg border bg-green-500/10 border-green-500/30 p-1 z-20 flex items-center gap-2"
                style={{ top: `${top}px` }}
              >
                <Badge variant={habit.type === 'avoidance' ? 'destructive' : 'success'} size="sm">
                  {habit.type === 'avoidance' ? '!' : '✓'} {habit.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTime(completion.timestamp)}
                </span>
              </div>
            );
          })}

          {/* Empty state */}
          {dayBlocks.length === 0 && dayCompletions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity recorded</p>
                <p className="text-xs">Import location data or log habits</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {(dayBlocks.length > 0 || dayCompletions.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Locations</span>
            </div>
            <p className="text-2xl font-bold">{dayBlocks.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Habits</span>
            </div>
            <p className="text-2xl font-bold">{dayCompletions.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
