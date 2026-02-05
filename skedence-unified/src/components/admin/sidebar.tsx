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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
    href: '/reports/dashboard', 
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
           pathname.startsWith('/passes') ||
           pathname.startsWith('/pricing') ||
           pathname.startsWith('/schedule') ||
           pathname.startsWith('/locations');
  };

  const isReportsActive = () => {
    return pathname.startsWith('/reports') || pathname === '/analytics';
  };

  const isBusinessSettingsActive = () => {
    return pathname.startsWith('/settings') || pathname === '/waiver';
  };

  // Check if we should show a submenu instead of the main menu
  const shouldShowSubmenu = () => {
    return isSchedulingActive() || isReportsActive() || isBusinessSettingsActive();
  };

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-[#3258A3] text-white border-b border-white/10">
        <h1 className="text-xl font-bold">Skedence</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col h-full w-80 bg-[#3258A3] text-white transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo - Desktop only */}
        <div className="hidden lg:flex items-center justify-center h-16 border-b border-white/10">
          <h1 className="text-2xl font-bold">Skedence</h1>
        </div>

        {/* User Info */}
        {userData && (
          <div className="p-4 border-b border-white/10 mt-16 lg:mt-0">
            <p className="text-sm font-medium truncate">{userData.firstName} {userData.lastName}</p>
            <p className="text-xs text-white/60 truncate">{userData.email}</p>
            {userData.role && (
              <p className="text-xs text-white/40 uppercase mt-1">{userData.role}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
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
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-manipulation group relative',
                      'min-h-[56px]',
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white active:bg-white/15'
                    )}
                  >
                    <Icon className="h-6 w-6 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className={cn(
                        'text-xs mt-0.5 line-clamp-1',
                        isActive ? 'text-white/80' : 'text-white/50'
                      )}>
                        {item.description}
                      </div>
                    </div>
                    {item.hasSubmenu && (
                      <ChevronRight className={cn(
                        'h-5 w-5 flex-shrink-0 transition-transform',
                        isActive ? 'text-white' : 'text-white/40'
                      )} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => {
              signOut();
              closeMobileMenu();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white active:bg-white/15 transition-colors touch-manipulation min-h-[56px]"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
