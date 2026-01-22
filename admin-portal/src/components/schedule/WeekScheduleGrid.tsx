'use client';

import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday, setHours, setMinutes, getHours, getMinutes, isBefore, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Booking {
  id: string;
  clientId?: string;
  clientUID?: string;
  clientName?: string;
  trainerId: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'canceled';
}

interface GroupClass {
  id: string;
  title: string;
  currentParticipants: number;
  maxParticipants: number;
  startTime: Date;
  endTime: Date;
  isOpenForRegistration: boolean;
}

interface AvailabilitySlot {
  id: string;
  trainerId: string;
  startTime: Date;
  endTime: Date;
  status: 'open' | 'unavailable';
}

interface WeekScheduleGridProps {
  trainerId: string;
  bookings: Booking[];
  classes: GroupClass[];
  availabilitySlots: AvailabilitySlot[];
  onAddAvailability: (day: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
  onClassClick: (classItem: GroupClass) => void;
  onAvailabilityClick: (slot: AvailabilitySlot) => void;
  onRefresh: () => void;
}

export function WeekScheduleGrid({
  trainerId,
  bookings,
  classes,
  availabilitySlots,
  onAddAvailability,
  onBookingClick,
  onClassClick,
  onAvailabilityClick,
  onRefresh,
}: WeekScheduleGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasScrolledToCurrentTime, setHasScrolledToCurrentTime] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Generate week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Hours to display (6 AM to 11 PM, ending at midnight)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  // Week navigation
  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const goToNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));
  const goToToday = () => {
    setSelectedDate(new Date());
    setHasScrolledToCurrentTime(false);
  };

  // Format week range for header
  const weekTitle = `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`;

  // Get current time position for red line
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hour = getHours(now);
    const minute = getMinutes(now);
    
    if (hour < 6 || hour > 23) return null;
    
    const hourIndex = hour - 6;
    const rowHeight = 56; // Match iOS app
    const minuteFraction = minute / 60;
    
    return hourIndex * rowHeight + minuteFraction * rowHeight;
  };

  // Scroll to current time on mount
  useEffect(() => {
    if (!hasScrolledToCurrentTime && currentTimeRef.current) {
      currentTimeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHasScrolledToCurrentTime(true);
    }
  }, [hasScrolledToCurrentTime]);

  // Get events for a specific hour/day cell
  const getEventsForCell = (day: Date, hour: number) => {
    const cellStart = setMinutes(setHours(day, hour), 0);
    const cellEnd = setMinutes(setHours(day, hour + 1), 0);

    const cellBookings = bookings.filter(b => 
      b.trainerId === trainerId &&
      isBefore(new Date(b.startTime), cellEnd) &&
      isAfter(new Date(b.endTime), cellStart)
    );

    const cellClasses = classes.filter(c =>
      isBefore(new Date(c.startTime), cellEnd) &&
      isAfter(new Date(c.endTime), cellStart)
    );

    const cellAvailability = availabilitySlots.filter(s => {
      const slotStart = new Date(s.startTime);
      const slotEnd = new Date(s.endTime);
      return isBefore(slotStart, cellEnd) && isAfter(slotEnd, cellStart);
    });

    return { cellBookings, cellClasses, cellAvailability };
  };

  const formatHour = (hour: number) => {
    const date = setHours(new Date(), hour);
    return format(date, 'ha');
  };

  const currentTimeY = getCurrentTimePosition();
  const now = new Date();
  const currentHour = getHours(now);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[200px] text-center">
            {weekTitle}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week days header */}
      <div className="flex bg-white border-b sticky top-0 z-10">
        <div className="w-12 sm:w-16 flex-shrink-0" /> {/* Time column spacer */}
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={`flex-1 min-w-[80px] sm:min-w-0 text-center py-2 border-l ${
              isToday(day) ? 'bg-blue-50' : ''
            }`}
          >
            <div className="text-[10px] sm:text-xs text-gray-600">
              <span className="hidden sm:inline">{format(day, 'EEE')}</span>
              <span className="sm:hidden">{format(day, 'EEEEE')}</span>
            </div>
            <div className={`text-sm sm:text-base font-semibold ${
              isToday(day) ? 'text-blue-600' : ''
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <div className="flex min-w-full">
          {/* Time column */}
          <div className="w-12 sm:w-16 flex-shrink-0 bg-gray-50 sticky left-0 z-10">
            {hours.map((hour) => (
              <div
                key={hour}
                id={hour === currentHour ? 'current-hour' : undefined}
                ref={hour === currentHour ? currentTimeRef : null}
                className="h-14 sm:h-16 flex items-start justify-center pt-1 text-[10px] sm:text-xs text-gray-500"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 relative min-w-[560px] sm:min-w-0">
            {/* Current time indicator */}
            {currentTimeY !== null && weekDays.some(d => isToday(d)) && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ top: `${currentTimeY}px` }}
              >
                <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full" />
              </div>
            )}

            <div className="flex">
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`flex-1 border-l ${
                    isToday(day) ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {hours.map((hour) => {
                    const { cellBookings, cellClasses, cellAvailability } = getEventsForCell(day, hour);
                    const isEmpty = cellBookings.length === 0 && cellClasses.length === 0 && cellAvailability.length === 0;

                    return (
                      <div
                        key={hour}
                        className="h-14 sm:h-16 border-b border-gray-200 p-0.5 relative group cursor-pointer touch-manipulation"
                        onClick={() => isEmpty && onAddAvailability(day, hour)}
                      >
                        {/* Empty cell hover state */}
                        {isEmpty && (
                          <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors rounded" />
                        )}

                        {/* Availability slots */}
                        {cellAvailability.map((slot) => (
                          <div
                            key={slot.id}
                            className={`absolute inset-0.5 rounded text-xs flex items-center justify-center cursor-pointer ${
                              slot.status === 'open'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAvailabilityClick(slot);
                            }}
                          >
                            {slot.status === 'open' ? 'Available' : 'Unavailable'}
                          </div>
                        ))}

                        {/* Bookings */}
                        {cellBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="absolute inset-0.5 bg-blue-500 text-white rounded text-xs p-1 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(booking);
                            }}
                          >
                            <div className="font-medium truncate w-full text-center">
                              {booking.clientName || 'Booked'}
                            </div>
                          </div>
                        ))}

                        {/* Group Classes */}
                        {cellClasses.map((classItem) => (
                          <div
                            key={classItem.id}
                            className="absolute inset-0.5 bg-purple-500 text-white rounded text-xs p-1 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClassClick(classItem);
                            }}
                          >
                            <div className="font-medium truncate w-full text-center">
                              {classItem.title}
                            </div>
                            <div className="text-[10px] opacity-90">
                              {classItem.currentParticipants}/{classItem.maxParticipants}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
