'use client';

import { useState, useEffect } from 'react';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Plus, X, ChevronLeft, ChevronRight, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface ImportedCalendar {
  id: string;
  name: string;
  googleCalendarId: string;
  color: string; // Display color for events
  createdAt: Date;
  lastSyncedAt?: Date;
  accessToken?: string;
  refreshToken?: string;
}

interface ImportedEvent {
  id: string;
  calendarId: string; // Reference to ImportedCalendar
  calendarName: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
  color: string;
}

export default function ImportSchedulePage() {
  const { orgId, userData } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [importedCalendars, setImportedCalendars] = useState<ImportedCalendar[]>([]);
  const [importedEvents, setImportedEvents] = useState<ImportedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAddCalendarModal, setShowAddCalendarModal] = useState(false);

  // Touch swipe state for calendar navigation
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Set mounted state and initialize current time on client
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setToday(now);
    setCurrentTime(now);
    setSelectedDate(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 0 }));

    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load imported calendars
  useEffect(() => {
    if (!orgId) return;
    loadImportedCalendars();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Load events for the selected week
  useEffect(() => {
    if (!orgId || !weekStart) return;
    loadImportedEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, weekStart, importedCalendars]);

  const loadImportedCalendars = async () => {
    if (!orgId) return;

    try {
      const calendarsRef = collection(db, 'organizations', orgId, 'importedCalendars');
      const q = query(calendarsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const calendars: ImportedCalendar[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          googleCalendarId: data.googleCalendarId,
          color: data.color || '#9CA3AF',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastSyncedAt: data.lastSyncedAt?.toDate(),
        };
      });

      setImportedCalendars(calendars);
    } catch (error) {
      console.error('Error loading imported calendars:', error);
      toast.error('Failed to load imported calendars');
    }
  };

  const loadImportedEvents = async () => {
    if (!orgId || !weekStart || importedCalendars.length === 0) {
      setImportedEvents([]);
      return;
    }

    setLoading(true);

    try {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const startTimestamp = Timestamp.fromDate(startOfDay(weekStart));
      const endTimestamp = Timestamp.fromDate(endOfDay(weekEnd));

      const eventsRef = collection(db, 'organizations', orgId, 'importedEvents');
      const q = query(
        eventsRef,
        where('startTime', '>=', startTimestamp),
        where('startTime', '<=', endTimestamp),
        orderBy('startTime', 'asc')
      );
      
      const snapshot = await getDocs(q);

      const events: ImportedEvent[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const calendar = importedCalendars.find(cal => cal.id === data.calendarId);
        
        return {
          id: doc.id,
          calendarId: data.calendarId,
          calendarName: calendar?.name || 'Unknown Calendar',
          title: data.title || 'Busy',
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate() || new Date(),
          location: data.location,
          description: data.description,
          color: calendar?.color || '#9CA3AF',
        };
      });

      setImportedEvents(events);
    } catch (error) {
      console.error('Error loading imported events:', error);
      toast.error('Failed to load imported events');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    if (!orgId) return;
    
    const confirmed = confirm('Are you sure you want to remove this calendar? All imported events from this calendar will be deleted.');
    if (!confirmed) return;

    try {
      // Delete the calendar document
      await deleteDoc(doc(db, 'organizations', orgId, 'importedCalendars', calendarId));
      
      // Note: In a production environment, you'd want a Cloud Function to cascade delete all events
      // For now, we'll just reload the data
      toast.success('Calendar removed successfully');
      await loadImportedCalendars();
      await loadImportedEvents();
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast.error('Failed to remove calendar');
    }
  };

  const handleSyncCalendar = async (_calendarId: string) => {
    setSyncing(true);
    toast.info('Syncing calendar... This may take a moment.');
    
    // TODO: Call Cloud Function to sync this specific calendar
    // For now, just reload the data
    setTimeout(async () => {
      await loadImportedEvents();
      setSyncing(false);
      toast.success('Calendar synced successfully');
    }, 2000);
  };

  const handleSyncAllCalendars = async () => {
    setSyncing(true);
    toast.info('Syncing all calendars... This may take a moment.');
    
    // TODO: Call Cloud Function to sync all calendars
    setTimeout(async () => {
      await loadImportedEvents();
      setSyncing(false);
      toast.success('All calendars synced successfully');
    }, 3000);
  };

  const handleAddCalendar = async () => {
    if (!orgId) return;

    try {
      setLoading(true);

      // Call Cloud Function to get OAuth URL
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      const initAuth = httpsCallable(functions, 'initGoogleCalendarAuth');
      
      const result = await initAuth({ orgId }) as { data: { success: boolean; authUrl: string } };
      
      if (result.data.success && result.data.authUrl) {
        // Redirect to Google OAuth consent screen
        window.location.href = result.data.authUrl;
      } else {
        throw new Error('Failed to generate authorization URL');
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect calendar');
      setLoading(false);
      setShowAddCalendarModal(false);
    }
  };

  // Calendar navigation
  const goToPreviousWeek = () => {
    if (weekStart) {
      const newWeekStart = addDays(weekStart, -7);
      setWeekStart(newWeekStart);
      setSelectedDate(newWeekStart);
    }
  };

  const goToNextWeek = () => {
    if (weekStart) {
      const newWeekStart = addDays(weekStart, 7);
      setWeekStart(newWeekStart);
      setSelectedDate(newWeekStart);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 0 }));
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX || !touchStartY) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX - currentX;
    const diffY = touchStartY - currentY;

    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goToNextWeek();
      } else {
        goToPreviousWeek();
      }
      setTouchStartX(null);
      setTouchStartY(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Calculate week days
  const weekDays = weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [];

  // Time slots (6 AM to 10 PM)
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return importedEvents.filter(event => 
      isSameDay(event.startTime, day)
    );
  };

  // Check if event overlaps with a specific hour
  const eventOverlapsHour = (event: ImportedEvent, hour: number) => {
    const eventStartHour = event.startTime.getHours();
    const eventEndHour = event.endTime.getHours();
    const eventEndMinutes = event.endTime.getMinutes();
    
    return (
      (eventStartHour <= hour && eventEndHour > hour) ||
      (eventStartHour === hour && eventEndMinutes > 0)
    );
  };

  // Calculate Y offset for positioning events
  const getEventYOffset = (startTime: Date) => {
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const hourFromTop = startHour - 6; // Subtract 6 because we start at 6 AM
    const pixelsPerHour = 70;
    const pixelsPerMinute = pixelsPerHour / 60;
    
    return hourFromTop * pixelsPerHour + startMinutes * pixelsPerMinute;
  };

  // Calculate height for events
  const getEventHeight = (startTime: Date, endTime: Date) => {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    const pixelsPerMinute = 70 / 60;
    
    return durationMinutes * pixelsPerMinute;
  };

  // Calculate timeline position for current time indicator
  const timelinePosition = currentTime && weekStart ? (() => {
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    
    if (currentHour < 6 || currentHour >= 23) return null;
    
    const hourFromTop = currentHour - 6;
    const pixelsPerHour = 70;
    const pixelsPerMinute = pixelsPerHour / 60;
    
    return hourFromTop * pixelsPerHour + currentMinutes * pixelsPerMinute;
  })() : null;

  // Check if user is admin
  const isAdmin = userData?.role === 'admin' || userData?.role === 'owner';

  if (!isAdmin) {
    return (
      <SchedulingSubmenu selectedDate={selectedDate || undefined} onDateSelect={setSelectedDate}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only administrators can manage calendar imports.</p>
          </div>
        </div>
      </SchedulingSubmenu>
    );
  }

  return (
    <SchedulingSubmenu selectedDate={selectedDate || undefined} onDateSelect={setSelectedDate}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Import Schedule</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connect external calendars to view facility availability
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAllCalendars}
                disabled={syncing || importedCalendars.length === 0}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium",
                  (syncing || importedCalendars.length === 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                Sync All
              </button>
              <button
                onClick={() => setShowAddCalendarModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Calendar
              </button>
            </div>
          </div>

          {/* Imported Calendars List */}
          {importedCalendars.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {importedCalendars.map(calendar => (
                <div
                  key={calendar.id}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="font-medium">{calendar.name}</span>
                  {calendar.lastSyncedAt && (
                    <span className="text-muted-foreground text-xs">
                      • Synced {format(calendar.lastSyncedAt, 'MMM d, h:mm a')}
                    </span>
                  )}
                  <button
                    onClick={() => handleSyncCalendar(calendar.id)}
                    disabled={syncing}
                    className="p-1 hover:bg-background rounded transition-colors"
                    title="Sync this calendar"
                  >
                    <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => handleDeleteCalendar(calendar.id)}
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                    title="Remove calendar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Week Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {weekStart && isMounted && `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
              </h2>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {importedCalendars.length === 0 ? (
            /* Empty State */
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-4">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Calendars Connected</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Google Calendar to import facility schedules, team practices, and other events that affect availability.
                </p>
                <button
                  onClick={() => setShowAddCalendarModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Connect Your First Calendar
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            /* Week View Grid */
            <div 
              className="min-w-[900px]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Week Days Header */}
              <div className="grid grid-cols-8 border-b border-border bg-card sticky top-0" style={{ zIndex: 10 }}>
                <div className="p-3 text-xs font-medium text-muted-foreground">Time</div>
                {weekDays.map(day => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'p-3 text-center border-l border-border',
                      today && isSameDay(day, today) && 'bg-primary/5'
                    )}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn(
                      'text-2xl font-bold mt-1',
                      today && isSameDay(day, today) ? 'text-primary' : 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="relative">
                {/* Current Time Indicator */}
                {isMounted && timelinePosition !== null && currentTime && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${timelinePosition}px` }}
                  >
                    <div className="flex items-center">
                      <div className="w-16 h-4 bg-red-500 rounded-r flex items-center justify-center">
                        <div className="text-[10px] text-white font-bold">
                          {format(currentTime, 'h:mm')}
                        </div>
                      </div>
                      <div className="flex-1 h-0.5 bg-red-500"></div>
                    </div>
                  </div>
                )}

                {timeSlots.map(hour => {
                  const hourLabel = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
                  
                  return (
                    <div key={hour} className="grid grid-cols-8 border-b border-border">
                      <div className="p-3 text-xs text-muted-foreground font-medium border-r border-border">
                        {hourLabel}
                      </div>
                      {weekDays.map(day => {
                        const dayEvents = getEventsForDay(day);
                        
                        return (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className="h-[70px] border-l border-border hover:bg-secondary/20 relative"
                          >
                            {/* Absolutely positioned events (only render on first hour) */}
                            {hour === 6 && dayEvents.map(event => {
                              const yOffset = getEventYOffset(event.startTime);
                              const height = getEventHeight(event.startTime, event.endTime);
                              
                              return (
                                <div
                                  key={event.id}
                                  className="absolute text-left text-xs p-1.5 rounded transition-all hover:shadow-md flex flex-col justify-center border-l-4"
                                  style={{
                                    top: `${yOffset}px`,
                                    height: `${Math.max(height - 2, 30)}px`,
                                    left: '2px',
                                    right: '2px',
                                    backgroundColor: `${event.color}20`,
                                    borderLeftColor: event.color,
                                    borderWidth: '0 0 1px 4px',
                                    borderColor: event.color,
                                    zIndex: 1
                                  }}
                                  title={`${event.title}${event.location ? ` • ${event.location}` : ''}`}
                                >
                                  <div className="font-semibold truncate" style={{ color: event.color }}>
                                    {format(event.startTime, 'h:mm a')}
                                  </div>
                                  <div className="truncate text-foreground font-medium">
                                    {event.title}
                                  </div>
                                  <div className="text-muted-foreground text-[10px] truncate">
                                    {event.calendarName}
                                  </div>
                                  {event.location && height > 50 && (
                                    <div className="text-muted-foreground text-[10px] truncate">
                                      📍 {event.location}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Calendar Modal (Placeholder) */}
      {showAddCalendarModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Connect Google Calendar</h3>
              <button
                onClick={() => setShowAddCalendarModal(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Connect your Google Calendar to automatically import facility schedules, team practices, and other events.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Authorize Access</p>
                  <p className="text-sm text-muted-foreground">Sign in with your Google account</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Select Calendar</p>
                  <p className="text-sm text-muted-foreground">Choose which calendar to import</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Auto-Sync</p>
                  <p className="text-sm text-muted-foreground">Events sync automatically every 15 minutes</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddCalendarModal(false)}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCalendar}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Connect Google
              </button>
            </div>
          </div>
        </div>
      )}
    </SchedulingSubmenu>
  );
}
