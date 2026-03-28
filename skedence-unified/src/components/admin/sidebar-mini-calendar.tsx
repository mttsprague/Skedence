'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_ABBREVS = ['S','M','T','W','T','F','S'];

export function SidebarMiniCalendar({ onDayClick }: { onDayClick?: () => void }) {
  const router = useRouter();
  const { orgId } = useAuth();
  // Lazy initializers run on client mount only (static export — no SSR hydration concern)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [today] = useState<Date>(() => new Date());
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!orgId || !currentMonth) return;
    async function loadDots() {
      if (!currentMonth) return;
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      try {
        const snap = await getDocs(query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(new Date(year, month, 1))),
          where('startTime', '<=', Timestamp.fromDate(new Date(year, month + 1, 0)))
        ));
        const days = new Set<string>();
        snap.docs.forEach(d => {
          const date = d.data().startTime.toDate();
          days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
        });
        setDaysWithBookings(days);
      } catch {}
    }
    loadDots();
  }, [orgId, currentMonth]);

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      if (!prev) return prev;
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  const getCalendarDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let dd = 1; dd <= daysInMonth; dd++) days.push(new Date(year, month, dd));
    return days;
  };

  const handleDayClick = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    router.push(`/scheduling?date=${y}-${m}-${d}`);
    onDayClick?.();
  };

  if (!currentMonth) return null;
  const days = getCalendarDays(currentMonth);

  return (
    <div className="px-5 py-4 border-b border-sidebar-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-sidebar-foreground tracking-tight">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => navigate('prev')}
            className="p-1 hover:bg-sidebar-accent/50 rounded-md transition-all duration-200 active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-sidebar-foreground/60" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-1 hover:bg-sidebar-accent/50 rounded-md transition-all duration-200 active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_ABBREVS.map((d, i) => (
          <div key={`ch-${i}`} className="text-[10px] text-center text-sidebar-foreground/40 font-semibold pb-1 tracking-wider">
            {d}
          </div>
        ))}
        {days.map((date, index) => {
          if (!date) return <div key={index} className="invisible aspect-square" />;
          const isToday = today ? date.toDateString() === today.toDateString() : false;
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const hasBooking = daysWithBookings.has(dateKey);
          return (
            <button
              key={index}
              onClick={() => handleDayClick(date)}
              className={cn(
                'relative aspect-square text-[10px] flex items-center justify-center rounded-md transition-all duration-200 hover:bg-sidebar-accent/50',
                isToday && 'bg-sidebar-foreground text-sidebar font-bold shadow-sm',
                !isToday && 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              {date.getDate()}
              {hasBooking && !isToday && (
                <div className="absolute bottom-0.5 w-1 h-1 bg-sidebar-foreground/50 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
