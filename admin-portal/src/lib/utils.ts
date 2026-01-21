import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPackageName(packageType: string): string {
  const names: { [key: string]: string } = {
    single: 'Single Lesson',
    five_pack: '5-Lesson Package',
    ten_pack: '10-Lesson Package',
    two_athlete: '2-Athlete Lesson',
    three_athlete: '3-Athlete Lesson',
    '2_athlete': '2-Athlete Lesson',
    '3_athlete': '3-Athlete Lesson',
    class_pass: 'Class Pass',
    private: 'Private Lesson',
  };
  return names[packageType] || packageType;
}
