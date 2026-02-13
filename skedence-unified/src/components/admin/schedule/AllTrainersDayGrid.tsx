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
  
  // Hours to display (6 AM to 11 PM)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

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

  // Get events for a specific hour/trainer cell
  const getEventsForCell = (trainerId: string, hour: number) => {
    const cellStart = setMinutes(setHours(selectedDate, hour), 0);
    const cellEnd = setMinutes(setHours(selectedDate, hour + 1), 0);

    const cellBookings = bookings.filter(b => 
      b.trainerId === trainerId &&
      isBefore(new Date(b.startTime), cellEnd) &&
      isAfter(new Date(b.endTime), cellStart)
    );

    const cellClasses = classes.filter(c => {
      const classTrainerId = (c as any).trainerId;
      return classTrainerId === trainerId &&
        isBefore(new Date(c.startTime), cellEnd) &&
        isAfter(new Date(c.endTime), cellStart);
    });

    const cellAvailability = availabilitySlots.filter(s => {
      const slotStart = new Date(s.startTime);
      const slotEnd = new Date(s.endTime);
      return s.trainerId === trainerId &&
        isBefore(slotStart, cellEnd) && 
        isAfter(slotEnd, cellStart);
    });

    return { cellBookings, cellClasses, cellAvailability };
  };

  const formatHour = (hour: number) => {
    const date = setHours(new Date(), hour);
    return format(date, 'ha');
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
          <div className="w-12 sm:w-16 flex-shrink-0 bg-gray-100 border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-14 flex items-center justify-center text-[10px] sm:text-xs text-foreground/80 border-b"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Trainers columns */}
          <div className="flex-1 flex relative">
            {trainers.map((trainer, trainerIndex) => (
              <div
                key={trainer.id}
                className="flex-1 min-w-[100px] border-l relative"
              >
                {hours.map((hour, hourIndex) => {
                  const { cellBookings, cellClasses, cellAvailability } = getEventsForCell(trainer.id, hour);
                  const hasEvents = cellBookings.length > 0 || cellClasses.length > 0 || cellAvailability.length > 0;

                  return (
                    <div
                      key={hour}
                      className={`h-14 border-b relative ${
                        !hasEvents ? 'cursor-pointer hover:bg-background' : ''
                      }`}
                      onClick={() => !hasEvents && onAddAvailability(trainer.id, selectedDate, hour)}
                      ref={isToday && hour === getHours(new Date()) ? currentTimeRef : null}
                    >
                      {/* Availability slots */}
                      {cellAvailability.map((slot) => (
                        <div
                          key={slot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAvailabilityClick(slot);
                          }}
                          className={`absolute inset-x-1 rounded cursor-pointer transition-colors ${
                            slot.status === 'open'
                              ? 'bg-gray-200 hover:bg-gray-300'
                              : 'bg-gray-400 hover:bg-background0'
                          }`}
                          style={{
                            top: '2px',
                            bottom: '2px',
                          }}
                        >
                          <div className="text-[9px] sm:text-[10px] text-foreground font-medium text-center py-1 truncate px-1">
                            {slot.status === 'open' ? 'Open' : 'Unavailable'}
                          </div>
                        </div>
                      ))}

                      {/* Bookings */}
                      {cellBookings.map((booking) => {
                        const isCompleted = new Date(booking.endTime) < new Date();
                        return (
                          <div
                            key={booking.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(booking);
                            }}
                            className={`absolute inset-x-1 text-white rounded cursor-pointer transition-colors ${
                              isCompleted 
                                ? 'bg-purple-500 hover:bg-purple-600' 
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                            style={{
                              top: '2px',
                              bottom: '2px',
                            }}
                          >
                            <div className="text-[9px] sm:text-[10px] font-medium text-center py-1 truncate px-1">
                              {booking.clientName || 'Booking'}
                            </div>
                          </div>
                        );
                      })}

                      {/* Classes */}
                      {cellClasses.map((classItem) => (
                        <div
                          key={classItem.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClassClick(classItem);
                          }}
                          className="absolute inset-x-1 bg-purple-500 hover:bg-purple-600 text-white rounded cursor-pointer transition-colors"
                          style={{
                            top: '2px',
                            bottom: '2px',
                          }}
                        >
                          <div className="text-[9px] sm:text-[10px] font-medium text-center py-1 truncate px-1">
                            {classItem.title}
                          </div>
                          <div className="text-[8px] sm:text-[9px] text-center text-white/80 truncate px-1">
                            {classItem.currentParticipants}/{classItem.maxParticipants}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}

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
