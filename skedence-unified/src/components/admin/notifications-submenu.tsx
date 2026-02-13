'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell,
  Mail,
  BellRing,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

const submenuItems = [
  { name: 'Client Emails', href: '/settings/client-emails', icon: Mail },
  { name: 'Booking Alerts', href: '/settings/notifications/booking-alerts', icon: BellRing },
];

interface NotificationsSubmenuProps {
  children: ReactNode;
}

export function NotificationsSubmenu({ children }: NotificationsSubmenuProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-64 bg-primary text-white border-r border-white/10 flex flex-col overflow-y-auto">
        {/* Back to Business Settings */}
        <div className="p-4 border-b border-white/10">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Business Settings</span>
          </Link>
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
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
