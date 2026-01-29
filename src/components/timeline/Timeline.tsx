import { useMemo } from 'react';
import { MapPin, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocationBlock, HabitCompletion, CATEGORY_COLORS } from '../../types';
import { getBlocksForDate } from '../../utils/locationUtils';
import { formatTime, formatDuration, getHourSlots, formatDate } from '../../utils/dateUtils';
import { Button } from '../ui';
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
    const height = Math.max((endHour - startHour) * 60, 30); // Minimum 30px height

    return { top: `${top}px`, height: `${height}px` };
  };

  const handlePrevDay = () => onDateChange(subDays(date, 1));
  const handleNextDay = () => onDateChange(addDays(date, 1));
  const handleToday = () => onDateChange(new Date());

  const CategoryDot = ({ category }: { category: string }) => {
    const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other;
    return (
      <span className={`inline-block w-3 h-3 rounded-full ${colorClass}`} />
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
        <div className="absolute left-0 top-0 bottom-0 w-14 border-r border-border bg-muted/30 z-20">
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

        {/* Habit markers column */}
        <div className="absolute left-14 top-0 bottom-0 w-8 border-r border-border bg-muted/10 z-15">
          {dayCompletions.map((completion) => {
            const habit = habitMap.get(completion.habitId);
            if (!habit) return null;

            const completionDate = new Date(completion.timestamp);
            const top = (completionDate.getHours() + completionDate.getMinutes() / 60) * 60;

            return (
              <div
                key={completion.id}
                className={`absolute left-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs
                  ${habit.type === 'avoidance' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ top: `${top}px` }}
                title={`${habit.name} at ${formatTime(completion.timestamp)}`}
              >
                {habit.type === 'avoidance' ? '!' : <Check className="w-3 h-3" />}
              </div>
            );
          })}
        </div>

        {/* Timeline content */}
        <div className="ml-22 relative" style={{ height: `${24 * 60}px`, marginLeft: '88px' }}>
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
            const colorClass = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.Other;
            const duration = Math.round(
              (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
            );

            return (
              <div
                key={block.id}
                className={`absolute left-1 right-1 rounded-lg border px-3 py-2
                  ${colorClass.replace('bg-', 'bg-').replace('-500', '-500/20')}
                  ${colorClass.replace('bg-', 'border-').replace('-500', '-500/50')}
                  hover:shadow-md transition-shadow cursor-pointer`}
                style={style}
              >
                <div className="flex items-center gap-2">
                  <CategoryDot category={block.category} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {block.location}
                      {zone && zone.activity !== block.location && (
                        <span className="text-muted-foreground font-normal"> - {zone.activity}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)} • {formatDuration(duration)}
                    </p>
                  </div>
                </div>
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-2 h-2 text-white" />
          </div>
          <span>Habit done</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>
          <span>Avoidance logged</span>
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
