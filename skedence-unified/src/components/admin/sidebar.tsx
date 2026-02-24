'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Activity,
  ChevronRight,
  Crown,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackAuth } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const navigation = [
  { 
    name: 'Activity Feed', 
    href: '/activity', 
    icon: Activity,
    description: 'Track recent activity and changes'
  },
  { 
    name: 'Scheduling', 
    href: '/scheduling', 
    icon: Calendar, 
    hasSubmenu: true,
    description: 'Manage calendar, clients, trainers, and bookings'
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: BarChart3,
    hasSubmenu: true,
    description: 'View analytics and business insights'
  },
  { 
    name: 'Business Settings', 
    href: '/settings', 
    icon: Settings, 
    hasSubmenu: true,
    description: 'Configure business and account settings'
  },
  { 
    name: 'Subscription', 
    href: '/subscription', 
    icon: Crown,
    description: 'Manage your billing and subscription'
  },
  { 
    name: 'Getting Started', 
    href: '/getting-started', 
    icon: BookOpen,
    description: 'Setup guides and FAQs'
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { userData, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const isSchedulingActive = () => {
    return pathname === '/scheduling' || 
           pathname.startsWith('/clients') ||
           pathname.startsWith('/trainers') ||
           pathname.startsWith('/bookings') ||
           pathname.startsWith('/classes') ||
           pathname.startsWith('/schedule');
  };

  const isReportsActive = () => {
    return pathname.startsWith('/reports') || pathname === '/analytics';
  };

  const isBusinessSettingsActive = () => {
    return pathname.startsWith('/settings') || 
           pathname === '/waiver' ||
           pathname.startsWith('/locations') ||
           pathname.startsWith('/passes') ||
           pathname.startsWith('/pricing');
  };

  // Check if we should show a submenu instead of the main menu
  const shouldShowSubmenu = () => {
    return isSchedulingActive() || isReportsActive() || isBusinessSettingsActive();
  };

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 bg-primary text-primary-foreground border-b border-border/10">
        <h1 className="text-xl font-semibold tracking-tight">Skedence</h1>
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar - Desktop (always visible) & Mobile (slide in) */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col h-full w-80 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out shadow-premium-lg",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo - Desktop only */}
        <div className="hidden lg:flex items-center justify-center h-16 border-b border-sidebar-border">
          <h1 className="text-2xl font-semibold tracking-tight">Skedence</h1>
        </div>

        {/* User Info */}
        {userData && (
          <div className="px-6 py-4 border-b border-sidebar-border mt-16 lg:mt-0">
            <p className="text-sm font-medium truncate">{userData.firstName} {userData.lastName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate mt-0.5">{userData.email}</p>
            {userData.role && (
              <p className="text-xs text-sidebar-foreground/40 uppercase mt-2 tracking-wider">{userData.role}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-premium">
          <ul className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              let isActive = false;
              
              if (item.name === 'Scheduling') {
                isActive = isSchedulingActive();
              } else if (item.name === 'Reports') {
                isActive = isReportsActive();
              } else if (item.name === 'Business Settings') {
                isActive = isBusinessSettingsActive();
              } else {
                isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              }
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 touch-manipulation group relative',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-premium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground active:scale-[0.98]'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className={cn(
                        'text-xs mt-0.5 line-clamp-1 leading-relaxed',
                        isActive ? 'text-sidebar-accent-foreground/70' : 'text-sidebar-foreground/50'
                      )}>
                        {item.description}
                      </div>
                    </div>
                    {item.hasSubmenu && (
                      <ChevronRight className={cn(
                        'h-4 w-4 flex-shrink-0 transition-transform',
                        isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/40'
                      )} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={() => {
              trackAuth.logout();
              signOut();
              closeMobileMenu();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground active:scale-[0.98] transition-all duration-200 touch-manipulation"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
