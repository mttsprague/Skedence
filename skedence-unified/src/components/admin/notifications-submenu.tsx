'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell,
  Mail,
  BellRing,
  ArrowLeft,
  Menu,
  X,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarMiniCalendar } from '@/components/admin/sidebar-mini-calendar';

const submenuItems = [
  { name: 'Client Emails', href: '/settings/client-emails', icon: Mail },
  { name: 'Booking Alerts', href: '/settings/notifications/booking-alerts', icon: BellRing },
  { name: 'Review Collection', href: '/settings/reviews', icon: Star },
];

interface NotificationsSubmenuProps {
  children: ReactNode;
}

export function NotificationsSubmenu({ children }: NotificationsSubmenuProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 bg-primary text-primary-foreground border-b border-border/10">
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-16"
          onClick={closeMobileMenu}
        />
      )}

      <div className="flex h-screen bg-gray-50 pt-16 lg:pt-0">
        {/* Left Sidebar */}
        <div
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-40 w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-y-auto scrollbar-premium shadow-premium-lg transition-transform duration-300 ease-in-out mt-16 lg:mt-0",
            "lg:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
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

        {/* Mini Calendar */}
        <SidebarMiniCalendar onDayClick={closeMobileMenu} />

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
                  onClick={closeMobileMenu}
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
    </>
  );
}
