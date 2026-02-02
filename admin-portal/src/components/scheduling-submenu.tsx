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
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

const submenuItems = [
  { name: 'Scheduling Page', href: '/scheduling', icon: CalendarIcon },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Trainers', href: '/trainers', icon: UserCog },
  { name: 'Book Session', href: '/bookings', icon: Plus },
  { name: 'Classes', href: '/classes', icon: GraduationCap },
  { name: 'Passes', href: '/passes', icon: Package },
  { name: 'Pricing', href: '/pricing', icon: DollarSign },
];

interface SchedulingSubmenuProps {
  children: ReactNode;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export function SchedulingSubmenu({ children, selectedDate, onDateSelect }: SchedulingSubmenuProps) {
  const pathname = usePathname();
  const { orgId } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayAbbrevs = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Load bookings for the current month
  useEffect(() => {
    if (!orgId) return;

    async function loadMonthData() {
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
    if (!date) return false;
    const today = new Date();
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

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 bg-[#3258A3] text-white border-r border-white/10 flex flex-col overflow-y-auto">
        {/* Back to Activity Feed */}
        <div className="p-4 border-b border-white/10">
          <Link
            href="/activity"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Activity Feed</span>
          </Link>
        </div>
        
        {/* Mini Calendar */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4 text-white/70" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4 text-white/70" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayAbbrevs.map(day => (
              <div key={day} className="text-xs text-center text-white/50 font-medium pb-1">
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
                    'relative aspect-square text-xs flex items-center justify-center rounded transition-colors',
                    'hover:bg-white/10',
                    today && 'bg-white text-[#3258A3] font-bold',
                    !today && selected && 'bg-white/30 text-white hover:bg-white/40 font-semibold',
                    !today && !selected && 'text-white/80'
                  )}
                >
                  {date.getDate()}
                  {/* Booking indicator - white circle */}
                  {hasBooking && !today && (
                    <div className="absolute bottom-0.5 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {submenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
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
