'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  onDaySelect?: (date: Date) => void;
  selectedDate?: Date;
}

export function CalendarView({ onDaySelect, selectedDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const dayOfWeek = date.getDay();
    const firstDayOfWeek = new Date(date);
    firstDayOfWeek.setDate(date.getDate() - dayOfWeek);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(prevDate.getMonth() - 1);
      } else {
        newDate.setMonth(prevDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setDate(prevDate.getDate() - 7);
      } else {
        newDate.setDate(prevDate.getDate() + 7);
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
    if (date && onDaySelect) {
      onDaySelect(date);
    }
  };

  const days = view === 'month' ? getDaysInMonth(currentDate) : getWeekDays(currentDate);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => view === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => view === 'month' ? navigateMonth('next') : navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('month')}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors touch-manipulation',
              view === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors touch-manipulation',
              view === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Day Names */}
        {dayNames.map(day => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-500 uppercase py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => handleDayClick(date)}
            disabled={!date}
            className={cn(
              'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all touch-manipulation min-h-[44px]',
              !date && 'invisible',
              date && 'hover:bg-gray-100 active:bg-gray-200',
              isToday(date) && 'bg-blue-50 text-blue-600 font-bold',
              isSelected(date) && 'bg-[#3258A3] text-white hover:bg-[#274785]',
              !isToday(date) && !isSelected(date) && date && 'text-gray-900'
            )}
          >
            {date?.getDate()}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200"></div>
          <span className="text-sm text-gray-600">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#3258A3]"></div>
          <span className="text-sm text-gray-600">Selected</span>
        </div>
      </div>
    </div>
  );
}
