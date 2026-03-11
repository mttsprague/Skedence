'use client';

import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday, setHours, setMinutes, getHours, getMinutes, isBefore, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
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
}: WeekScheduleGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasScrolledToCurrentTime, setHasScrolledToCurrentTime] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const [multipleEventsDialog, setMultipleEventsDialog] = useState<MultipleEventsDialogData | null>(null);

  // Generate week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Half-hour time slots (6 AM to 11:30 PM)
  // Generate 30-minute intervals for better granulari
    const totalMinutes = (6 * 60) + (i * 30); // Start at 6 AM, 30-min intervals
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return { hour, minute };
  });

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

  // Get events for a specific day (for rendering)
  const getEventsForDay = (day: Date) => {
    const dayStart = setMinutes(setHours(day, 0), 0);
    const dayEnd = setMinutes(setHours(day, 23), 59);

    const dayBookings = bookings.filter(b => 
      b.trainerId === trainerId &&
    nst currentHour = getHours(now);

  return (
    <div className="flex flex-col h-full bg-background">
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
            <div className="text-[10px] sm:text-xs text-foreground/80">
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
          <div className="w-12 sm:w-16 flex-shrink-0 bg-background sticky left-0 z-10">
            {timeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="h-7 sm:h-8 flex items-start justify-center pt-1 text-[10px] sm:text-xs text-muted-foreground"
              >
                {slot.minute === 0 ? formatTimeSlot(slot.hour, slot.minute) : (
                  <span className="text-muted-foreground/60">{formatTimeSlot(slot.hour, slot.minute)}</span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 flex relative">
            {weekDays.map((day, dayIdx) => {
              const { dayBookings, dayClasses, dayAvailability } = getEventsForDay(day);
              
              return (
                <div
                  key={dayIdx}
                  className={`flex-1 min-w-[80px] sm:min-w-0 border-l relative ${
                    isToday(day) ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Background grid cells */}
                  {timeSlots.map((slot, idx) => {
                    const { cellBookings, cellClasses, cellAvailability } = getEventsForCell(day, slot.hour);
                    const hasEvents = slot.minute === 0 && (cellBookings.length > 0 || cellClasses.length > 0 || cellAvailability.length > 0);
                    
                    return (
                      <div
                        key={idx}
                        className={`h-7 sm:h-8 relative ${
                          slot.minute === 0 ? 'border-b border-gray-300' : 'border-b border-gray-100'
                        } ${
                          !hasEvents && slot.minute === 0 ? 'cursor-pointer hover:bg-background' : ''
                        }`}
                        onClick={() => !hasEvents && slot.minute === 0 && onAddAvailability(day, slot.hour)}
                      />
                    );
                  })}

                  {/* Absolutely positioned events overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Availability slots */}
                    {dayAvailability.map((slot) => {
                      const yOffset = getSlotYOffset(new Date(slot.startTime));
                      const height = getSlotHeight(new Date(slot.startTime), new Date(slot.endTime));
                      const slotStartTime = new Date(slot.startTime);
                      
                      const showBadge = shouldShowBadge(slotStartTime, day);
                      const slotHour = getHours(slotStartTime);
                      const { hourBookings, hourClasses, hourAvailability } = getEventsInHour(day, slotHour);
                      const totalEventsInHour = hourBookings.length + hourClasses.length + hourAvailability.length;
                      
                      return (
                        <div
                          key={slot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAvailabilityClick(slot);
                          }}
                          className={`absolute left-1 right-1 rounded cursor-pointer transition-colors pointer-events-auto ${
                            slot.status === 'open'
                              ? 'bg-gray-200 hover:bg-gray-300'
                              : 'bg-gray-400 hover:bg-gray-500'
                          }`}
                          style={{
                            top: `${yOffset}px`,
                            height: `${Math.max(height, 20)}px`,
                          }}
                        >
                          <div className="text-[9px] sm:text-[10px] text-foreground font-medium text-center py-1 truncate px-1">
                            {slot.status === 'open' ? 'Open' : 'Unavailable'}
                          </div>
                          
                          {/* Badge counter for multiple events */}
                          {showBadge && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setMultipleEventsDialog({
                                  day,
                                  hour: slotHour,
                                  bookings: hourBookings,
                                  classes: hourClasses,
                                  availabilitySlots: hourAvailability
                                });
                              }}
                              className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-red-600 z-10"
                            >
                              {totalEventsInHour}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Bookings */}
                    {dayBookings.map((booking) => {
                      const yOffset = getSlotYOffset(new Date(booking.startTime));
                      const height = getSlotHeight(new Date(booking.startTime), new Date(booking.endTime));
                      const isCompleted = new Date(booking.endTime) < new Date();
                      const bookingStartTime = new Date(booking.startTime);
                      
                      const showBadge = shouldShowBadge(bookingStartTime, day);
                      const bookingHour = getHours(bookingStartTime);
                      const { hourBookings, hourClasses, hourAvailability } = getEventsInHour(day, bookingHour);
                      const totalEventsInHour = hourBookings.length + hourClasses.length + hourAvailability.length;
                      
                      return (
                        <div
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick(booking);
                          }}
                          className={`absolute left-1 right-1 text-white rounded cursor-pointer transition-colors pointer-events-auto ${
                            booking.isClassBooking
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : isCompleted 
                              ? 'bg-purple-500 hover:bg-purple-600' 
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                          style={relative min-w-[560px] sm:min-w-0">