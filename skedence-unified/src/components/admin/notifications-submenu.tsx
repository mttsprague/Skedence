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
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-y-auto scrollbar-premium shadow-premium-lg">
        {/* Back to Business Settings */}
        <div className="p-6 border-b border-sidebar-border">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-all duration-200 font-medium"
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
                      ? 'bg-sidebar-accent text-sidebar-foreground shadow-lg'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
