'use client';

import { useState, useEffect, useRef } from 'react';
import { format, setHours, setMinutes, getHours, getMinutes, isBefore, isAfter, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
  trainerId?: string;
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

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AllTrainersDayGridProps {
  trainers: Trainer[];
  bookings: Booking[];
  classes: GroupClass[];
  availabilitySlots: AvailabilitySlot[];
  onAddAvailability: (trainerId: string, day: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
  onClassClick: (classItem: GroupClass) => void;
  onAvailabilityClick: (slot: AvailabilitySlot) => void;
}

export function AllTrainersDayGrid({
  trainers,
  bookings,
  classes,
  availabilitySlots,
  onAddAvailability,
  onBookingClick,
  onClassClick,
  onAvailabilityClick,
}: AllTrainersDayGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasScrolledToCurrentTime, setHasScrolledToCurrentTime] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  
  // Half-hour time slots (6 AM to 11:30 PM)
  const timeSlots = Array.from({ length: 36 }, (_, i) => {
    const totalMinutes = (6 * 60) + (i * 30);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return { hour, minute };
  });

  // Day navigation
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
    setHasScrolledToCurrentTime(false);
  };
  
  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
    setHasScrolledToCurrentTime(false);
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
    setHasScrolledToCurrentTime(false);
  };

  // Format date for header
  const dateTitle = format(selectedDate, 'EEEE, MMMM d, yyyy');

  // Get current time position for red line
  const getCurrentTimePosition = () => {
    const now = new Date();
    const todayDate = format(now, 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (todayDate !== selectedDateStr) return null;
    
    const hour = getHours(now);
    const minute = getMinutes(now);
    
    if (hour < 6 || hour > 23) return null;
    
    const hourIndex = hour - 6;
    const rowHeight = 56;
    const minuteFraction = minute / 60;
    
    return hourIndex * rowHeight + minuteFraction * rowHeight;
  };

  // Scroll to current time on mount and date change
  useEffect(() => {
    if (!hasScrolledToCurrentTime && currentTimeRef.current) {
      setTimeout(() => {
        currentTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHasScrolledToCurrentTime(true);
      }, 100);
    }
  }, [hasScrolledToCurrentTime, selectedDate]);

  // Get events for a specific trainer on the selected day
  const getEventsForTrainer = (trainerId: string) => {
    const dayStart = setMinutes(setHours(selectedDate, 0), 0);
    const dayEnd = setMinutes(setHours(selectedDate, 23), 59);

    const trainerBookings = bookings.filter(b => 
      b.trainerId === trainerId &&
      !b.isClassBooking && // Exclude class registrations - shown as class objects
      isBefore(new Date(b.startTime), dayEnd) &&
      isAfter(new Date(b.endTime), dayStart)
    );

    const trainerClasses = classes.filter(c => {
      const classTrainerId = (c as any).trainerId;
      return classTrainerId === trainerId &&
        isBefore(new Date(c.startTime), dayEnd) &&
        isAfter(new Date(c.endTime), dayStart);
    });

    const trainerAvailability = availabilitySlots.filter(s => {
      // Exclude class placeholder slots - classes shown separately
      if (s.isClassBooking) return false;
      return s.trainerId === trainerId &&
        isBefore(new Date(s.startTime), dayEnd) &&
        isAfter(new Date(s.endTime), dayStart);
    });

    return { trainerBookings, trainerClasses, trainerAvailability };
  };

  // Helper functions for absolute positioning
  const getSlotYOffset = (startTime: Date): number => {
    const hour = getHours(startTime);
    const minute = getMinutes(startTime);
    
    const firstHour = 6; // 6 AM
    const rowHeight = 28; // 28px per half hour (56px per hour / 2)
    
    const hourOffset = hour - firstHour;
    const minuteFraction = minute / 60;
    
    // Calculate offset: (hour offset * 2 rows per hour) + (minute fraction * 2 rows per hour)
    return (hourOffset * 2 + minuteFraction * 2) * rowHeight;
  };

  const getSlotHeight = (startTime: Date, endTime: Date): number => {
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    const rowHeight = 28; // 28px per half hour
    // Calculate height: (duration in minutes / 30 minutes per row) * row height
    return (durationMinutes / 30) * rowHeight;
  };

  // Get events for a specific hour/trainer cell (for tap detection on empty cells)
  const hasEventsInHour = (trainerId: string, hour: number): boolean => {
    const cellStart = setMinutes(setHours(selectedDate, hour), 0);
    const cellEnd = setMinutes(setHours(selectedDate, hour + 1), 0);

    const hasBooking = bookings.some(b => 
      b.trainerId === trainerId &&
      isBefore(new Date(b.startTime), cellEnd) &&
      isAfter(new Date(b.endTime), cellStart)
    );

    const hasClass = classes.some(c => {
      const classTrainerId = (c as any).trainerId;
      return classTrainerId === trainerId &&
        isBefore(new Date(c.startTime), cellEnd) &&
        isAfter(new Date(c.endTime), cellStart);
    });

    const hasAvailability = availabilitySlots.some(s => 
      s.trainerId === trainerId &&
      isBefore(new Date(s.startTime), cellEnd) &&
      isAfter(new Date(s.endTime), cellStart)
    );

    return hasBooking || hasClass || hasAvailability;
  };

  const formatTimeSlot = (hour: number, minute: number) => {
    const date = setMinutes(setHours(new Date(), hour), minute);
    return minute === 0 ? format(date, 'ha') : format(date, 'h:mm');
  };

  const currentTimeY = getCurrentTimePosition();
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border-b gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[250px] text-center">
            {dateTitle}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Today
        </Button>
      </div>

      {/* Trainers header */}
      <div className="flex bg-white border-b sticky top-0 z-10">
        <div className="w-12 sm:w-16 flex-shrink-0" /> {/* Time column spacer */}
        {trainers.map((trainer) => (
          <div
            key={trainer.id}
            className="flex-1 min-w-[100px] text-center py-3 px-2 border-l"
          >
            <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
              {trainer.firstName}
            </div>
            <div className="text-[10px] sm:text-xs text-foreground/80 truncate">
              {trainer.lastName}
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
                className="h-7 sm:h-14 flex items-start justify-center pt-1 text-[10px] sm:text-xs text-muted-foreground border-b border-border/30"
              >
                {slot.minute === 0 ? formatTimeSlot(slot.hour, slot.minute) : (
                  <span className="text-muted-foreground/60">{formatTimeSlot(slot.hour, slot.minute)}</span>
                )}
              </div>
            ))}
          </div>

          {/* Trainers columns */}
          <div className="flex-1 flex relative">
            {trainers.map((trainer) => {
              const { trainerBookings, trainerClasses, trainerAvailability } = getEventsForTrainer(trainer.id);
              
              return (
                <div
                  key={trainer.id}
                  className="flex-1 min-w-[100px] border-l relative"
                >
                  {/* Background grid cells */}
                  {timeSlots.map((slot, idx) => {
                    const hasEvents = slot.minute === 0 && hasEventsInHour(trainer.id, slot.hour);
                    const isCurrentTimeSlot = isToday && slot.hour === getHours(new Date()) && slot.minute === 0;
                    
                    return (
                      <div
                        key={idx}
                        ref={isCurrentTimeSlot ? currentTimeRef : undefined}
                        className={`h-7 sm:h-14 relative border-b border-border/30 ${
                          isCurrentTimeSlot ? 'bg-yellow-50/50' : ''
                        } ${
                          !hasEvents && slot.minute === 0 ? 'cursor-pointer hover:bg-accent/50' : ''
                        }`}
                        onClick={() => !hasEvents && slot.minute === 0 && onAddAvailability(trainer.id, selectedDate, slot.hour)}
                      />
                    );
                  })}

                  {/* Absolutely positioned events overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Availability slots */}
                    {trainerAvailability.map((slot) => {
                      const yOffset = getSlotYOffset(new Date(slot.startTime));
                      const height = getSlotHeight(new Date(slot.startTime), new Date(slot.endTime));
                      
                      return (
                        <div
                          key={slot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAvailabilityClick(slot);
                          }}
                          className={`absolute inset-x-1 rounded px-1 py-0.5 cursor-pointer transition-colors pointer-events-auto ${
                            slot.status === 'open'
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                          }`}
                          style={{
                            top: `${yOffset}px`,
                            height: `${Math.max(height, 20)}px`,
                          }}
                        >
                          <div className={`text-[9px] sm:text-[10px] font-medium truncate px-1 ${
                            slot.status === 'open' ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {slot.status === 'open' ? 'Available' : 'Unavailable'}
                          </div>
                          <div className={`text-[8px] sm:text-[9px] truncate px-1 ${
                            slot.status === 'open' ? 'text-green-600 opacity-90' : 'text-gray-600 opacity-75'
                          }`}>
                            {format(new Date(slot.startTime), 'h:mm')} - {format(new Date(slot.endTime), 'h:mm a')}
                          </div>
                        </div>
                      );
                    })}

                    {/* Bookings */}
                    {trainerBookings.map((booking) => {
                      const yOffset = getSlotYOffset(new Date(booking.startTime));
                      const height = getSlotHeight(new Date(booking.startTime), new Date(booking.endTime));
                      const isCompleted = new Date(booking.endTime) < new Date();
                      
                      return (
                        <div
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick(booking);
                          }}
                          className={`absolute inset-x-1 text-white rounded px-1 py-0.5 cursor-pointer transition-colors pointer-events-auto font-medium overflow-hidden ${
                            isCompleted 
                              ? 'bg-purple-500 hover:bg-purple-600' 
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                          style={{
                            top: `${yOffset}px`,
                            height: `${Math.max(height, 20)}px`,
                          }}
                        >
                          <div className="text-[9px] sm:text-[10px] font-medium truncate px-1">
                            {booking.clientName || 'Booking'}
                          </div>
                          <div className="text-[8px] sm:text-[9px] opacity-90 truncate px-1">
                            {format(new Date(booking.startTime), 'h:mm')} - {format(new Date(booking.endTime), 'h:mm a')}
                          </div>
                        </div>
                      );
                    })}

                    {/* Classes */}
                    {trainerClasses.map((classItem) => {
                      const yOffset = getSlotYOffset(new Date(classItem.startTime));
                      const height = getSlotHeight(new Date(classItem.startTime), new Date(classItem.endTime));
                      
                      return (
                        <div
                          key={classItem.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClassClick(classItem);
                          }}
                          className="absolute inset-x-1 bg-purple-500 hover:bg-purple-600 text-white rounded px-1 py-0.5 cursor-pointer transition-colors pointer-events-auto font-medium overflow-hidden"
                          style={{
                            top: `${yOffset}px`,
                            height: `${Math.max(height, 20)}px`,
                          }}
                        >
                          <div className="text-[9px] sm:text-[10px] font-medium truncate px-1">
                            {classItem.title}
                          </div>
                          <div className="text-[8px] sm:text-[9px] opacity-90 truncate px-1">
                            {classItem.currentParticipants}/{classItem.maxParticipants} • {format(new Date(classItem.startTime), 'h:mm a')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Current time indicator (red line) */}
            {currentTimeY !== null && isToday && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ top: `${currentTimeY}px` }}
              >
                <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
