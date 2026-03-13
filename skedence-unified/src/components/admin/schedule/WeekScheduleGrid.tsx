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
  isClassBooking?: boolean; // True for class registrations
  classId?: string; // Reference to class document
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
  isClassBooking?: boolean; // True for class placeholder slots
  classId?: string; // Reference to class document
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

  // Generate week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Half-hour time slots (6 AM to 11:30 PM)
  // Generate 30-minute intervals for better granularity
  const timeSlots = Array.from({ length: 36 }, (_, i) => {
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
      !b.isClassBooking && // Exclude class registrations - shown as class objects
      isBefore(new Date(b.startTime), cellEnd) &&
      isAfter(new Date(b.endTime), cellStart)
    );

    const cellClasses = classes.filter(c =>
      isBefore(new Date(c.startTime), cellEnd) &&
      isAfter(new Date(c.endTime), cellStart)
    );

    const cellAvailability = availabilitySlots.filter(s => {
      // Exclude class placeholder slots - classes shown separately
      if (s.isClassBooking) return false;
      const slotStart = new Date(s.startTime);
      const slotEnd = new Date(s.endTime);
      return isBefore(slotStart, cellEnd) && isAfter(slotEnd, cellStart);
    });

    return { cellBookings, cellClasses, cellAvailability };
  };

  const formatTimeSlot = (hour: number, minute: number) => {
    const date = setMinutes(setHours(new Date(), hour), minute);
    return minute === 0 ? format(date, 'ha') : format(date, 'h:mm');
  };

  const currentTimeY = getCurrentTimePosition();
  const now = new Date();
  const currentHour = getHours(now);

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

      {/* Schedule grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        {/* Week days header - inside scroll container so it scrolls horizontally with grid */}
        <div className="flex bg-white border-b sticky top-0 z-20">
          <div className="w-12 sm:w-16 flex-shrink-0 bg-white" /> {/* Time column spacer */}
          <div className="flex flex-1 min-w-[560px] sm:min-w-0">
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
        </div>

        <div className="flex min-w-full">
          {/* Time column */}
          <div className="w-12 sm:w-16 flex-shrink-0 bg-background sticky left-0 z-10">
            {timeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="h-7 sm:h-14 flex items-start justify-center pt-1 text-[10px] sm:text-xs text-muted-foreground border-b border-border/30"
              >
                {slot.minute === 0 ? formatTimeSlot(slot.hour, slot.minute) : (
                  <span className="text-muted-foreground/60">{formatTimeSlot(slot.hour, slot.minute)}</span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 min-w-[560px] sm:min-w-0 relative">
            {weekDays.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={`flex-1 min-w-[80px] sm:min-w-0 border-l relative ${
                  isToday(day) ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Time slot rows for this day */}
                {timeSlots.map((slot, slotIdx) => {
                  const { cellBookings, cellClasses, cellAvailability } = getEventsForCell(day, slot.hour);
                  const isCurrentTimeSlot = isToday(day) && slot.hour === currentHour;
                  
                  return (
                    <div
                      key={slotIdx}
                      ref={isCurrentTimeSlot ? currentTimeRef : undefined}
                      className={`h-7 sm:h-14 border-b border-border/30 relative group ${
                        isCurrentTimeSlot ? 'bg-yellow-50/50' : ''
                      }`}
                      onClick={() => slot.minute === 0 && onAddAvailability(day, slot.hour)}
                    >
                      {/* Add button on hover (desktop only) */}
                      <div className="hidden sm:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Render bookings in this cell */}
                      {cellBookings.map((booking) => {
                        const startTime = new Date(booking.startTime);
                        const endTime = new Date(booking.endTime);
                        const startMinutes = getHours(startTime) * 60 + getMinutes(startTime);
                        const endMinutes = getHours(endTime) * 60 + getMinutes(endTime);
                        const duration = endMinutes - startMinutes;
                        const cellStartMinutes = slot.hour * 60 + slot.minute;
                        
                        // Only render if this is the starting cell for the booking
                        if (startMinutes === cellStartMinutes) {
                          const heightInCells = duration / 30; // 30-min cells
                          // Mobile: 28px per cell (h-7), Desktop: 56px per cell (h-14)
                          const mobileHeight = heightInCells * 28;
                          const desktopHeight = heightInCells * 56;
                          
                          return (
                            <div
                              key={booking.id}
                              data-booking-id={booking.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onBookingClick(booking);
                              }}
                              className="absolute left-0.5 right-0.5 bg-blue-500 text-white rounded px-1 py-0.5 text-[10px] sm:text-xs font-medium overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors z-10"
                              style={{ 
                                height: `${mobileHeight}px`,
                                top: 0 
                              }}
                            >
                              <style dangerouslySetInnerHTML={{__html: `
                                @media (min-width: 640px) {
                                  [data-booking-id="${booking.id}"] { height: ${desktopHeight}px !important; }
                                }
                              `}} />
                              <div className="truncate">{booking.clientName || 'Booking'}</div>
                              <div className="text-[8px] sm:text-[10px] opacity-90 truncate">
                                {format(startTime, 'h:mm')} - {format(endTime, 'h:mm a')}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}

                      {/* Render classes in this cell */}
                      {cellClasses.map((classItem) => {
                        const startTime = new Date(classItem.startTime);
                        const endTime = new Date(classItem.endTime);
                        const startMinutes = getHours(startTime) * 60 + getMinutes(startTime);
                        const endMinutes = getHours(endTime) * 60 + getMinutes(endTime);
                        const duration = endMinutes - startMinutes;
                        const cellStartMinutes = slot.hour * 60 + slot.minute;
                        
                        // Only render if this is the starting cell for the class
                        if (startMinutes === cellStartMinutes) {
                          const heightInCells = duration / 30;
                          const mobileHeight = heightInCells * 28;
                          const desktopHeight = heightInCells * 56;
                          
                          return (
                            <div
                              key={classItem.id}
                              data-class-id={classItem.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onClassClick(classItem);
                              }}
                              className="absolute left-0.5 right-0.5 bg-purple-500 text-white rounded px-1 py-0.5 text-[10px] sm:text-xs font-medium overflow-hidden cursor-pointer hover:bg-purple-600 transition-colors z-10"
                              style={{ 
                                height: `${mobileHeight}px`,
                                top: 0 
                              }}
                            >
                              <style dangerouslySetInnerHTML={{__html: `
                                @media (min-width: 640px) {
                                  [data-class-id="${classItem.id}"] { height: ${desktopHeight}px !important; }
                                }
                              `}} />
                              <div className="truncate">{classItem.title}</div>
                              <div className="text-[8px] sm:text-[10px] opacity-90 truncate">
                                {classItem.currentParticipants}/{classItem.maxParticipants} • {format(startTime, 'h:mm a')}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}

                      {/* Render availability slots in this cell */}
                      {cellAvailability.map((availSlot) => {
                        const startTime = new Date(availSlot.startTime);
                        const endTime = new Date(availSlot.endTime);
                        const startMinutes = getHours(startTime) * 60 + getMinutes(startTime);
                        const endMinutes = getHours(endTime) * 60 + getMinutes(endTime);
                        const duration = endMinutes - startMinutes;
                        const cellStartMinutes = slot.hour * 60 + slot.minute;
                        
                        // Only render if this is the starting cell for the availability
                        if (startMinutes === cellStartMinutes) {
                          const heightInCells = duration / 30;
                          const mobileHeight = heightInCells * 28;
                          const desktopHeight = heightInCells * 56;
                          
                          return (
                            <div
                              key={availSlot.id}
                              data-avail-id={availSlot.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAvailabilityClick(availSlot);
                              }}
                              className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] sm:text-xs overflow-hidden cursor-pointer transition-colors ${
                                availSlot.status === 'open'
                                  ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                              }`}
                              style={{ 
                                height: `${mobileHeight}px`,
                                top: 0 
                              }}
                            >
                              <style dangerouslySetInnerHTML={{__html: `
                                @media (min-width: 640px) {
                                  [data-avail-id="${availSlot.id}"] { height: ${desktopHeight}px !important; }
                                }
                              `}} />
                              <div className="truncate font-medium">
                                {availSlot.status === 'open' ? 'Available' : 'Unavailable'}
                              </div>
                              <div className="text-[8px] sm:text-[10px] opacity-75 truncate">
                                {format(startTime, 'h:mm')} - {format(endTime, 'h:mm a')}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })}

                {/* Current time indicator for this day */}
                {currentTimeY !== null && isToday(day) && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{ top: `${currentTimeY}px` }}
                  >
                    <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
