'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  UserCog, 
  Plus, 
  GraduationCap, 
  Package, 
  DollarSign,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

const submenuItems = [
  { name: 'Scheduling Page', href: '/scheduling', icon: CalendarIcon },
  { name: 'Availability', href: '/availability', icon: CalendarIcon },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Trainers', href: '/trainers', icon: UserCog },
  { name: 'Book Session', href: '/bookings', icon: Plus },
  { name: 'Classes', href: '/classes', icon: GraduationCap },
];

interface SchedulingSubmenuProps {
  children: ReactNode;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export function SchedulingSubmenu({ children, selectedDate, onDateSelect }: SchedulingSubmenuProps) {
  const pathname = usePathname();
  const { orgId } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());
  const [today, setToday] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayAbbrevs = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Initialize dates client-side
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setToday(now);
    setCurrentMonth(selectedDate || now);
  }, [selectedDate]);

  // Load bookings for the current month
  useEffect(() => {
    if (!orgId || !currentMonth) return;

    async function loadMonthData() {
      if (!currentMonth) return;
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      try {
        // Load bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(startDate)),
          where('startTime', '<=', Timestamp.fromDate(endDate))
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        const bookingDays = new Set<string>();
        bookingsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.startTime.toDate();
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          bookingDays.add(dateKey);
        });
        
        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(startDate)),
          where('startTime', '<=', Timestamp.fromDate(endDate))
        );
        const classesSnapshot = await getDocs(classesQuery);
        
        classesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.startTime.toDate();
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          bookingDays.add(dateKey);
        });
        
        setDaysWithBookings(bookingDays);
      } catch (error) {
        console.error('Error loading month data:', error);
      }
    }

    loadMonthData();
  }, [orgId, currentMonth]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevDate => {
      if (!prevDate) return prevDate;
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(prevDate.getMonth() - 1);
      } else {
        newDate.setMonth(prevDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date | null) => {
    if (!date || !today) return false;
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDayClick = (date: Date | null) => {
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  const days = currentMonth ? getDaysInMonth(currentMonth) : [];

  if (!isMounted || !currentMonth) {
    return <div className="flex h-screen bg-gray-50 items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-y-auto scrollbar-premium shadow-premium-lg">
        {/* Back to Activity Feed */}
        <div className="p-6 border-b border-sidebar-border">
          <Link
            href="/activity"
            className="flex items-center gap-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-all duration-200 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Activity Feed</span>
          </Link>
        </div>
        
        {/* Mini Calendar */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-sidebar-foreground tracking-tight">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1.5 hover:bg-sidebar-accent/50 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1.5 hover:bg-sidebar-accent/50 rounded-lg transition-all duration-200 active:scale-95"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Day headers */}
            {dayAbbrevs.map((day, index) => (
              <div key={`day-header-${index}`} className="text-xs text-center text-sidebar-foreground/40 font-semibold pb-1.5 tracking-wider">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="invisible" />;
              }
              
              const today = isToday(date);
              const selected = isSelected(date);
              const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const hasBooking = daysWithBookings.has(dateKey);
              
              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    'relative aspect-square text-xs flex items-center justify-center rounded-lg transition-all duration-200',
                    'hover:bg-sidebar-accent/50',
                    today && 'bg-sidebar-foreground text-sidebar font-bold shadow-premium',
                    !today && selected && 'bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent font-semibold',
                    !today && !selected && 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  )}
                >
                  {date.getDate()}
                  {/* Booking indicator - elegant dot */}
                  {hasBooking && !today && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-sidebar-foreground/60 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-1.5">
            {submenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground shadow-premium'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground active:scale-[0.98]'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
