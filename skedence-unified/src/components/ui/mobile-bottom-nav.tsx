'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Activity,
  Tag,
  Settings,
  Award,
  Building,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  ariaLabel: string;
}

const primaryNavItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Home',
    href: '/dashboard',
    ariaLabel: 'Navigate to dashboard',
  },
  {
    icon: Users,
    label: 'Clients',
    href: '/clients',
    ariaLabel: 'View and manage clients',
  },
  {
    icon: Calendar,
    label: 'Schedule',
    href: '/schedule',
    ariaLabel: 'View and manage schedule',
  },
  {
    icon: TrendingUp,
    label: 'Reports',
    href: '/reports/appointments',
    ariaLabel: 'View analytics and reports',
  },
];

const secondaryNavItems: NavItem[] = [
  {
    icon: Activity,
    label: 'Activity',
    href: '/activity',
    ariaLabel: 'View activity feed',
  },
  {
    icon: Users,
    label: 'Trainers',
    href: '/trainers',
    ariaLabel: 'Manage trainers',
  },
  {
    icon: Tag,
    label: 'Passes',
    href: '/passes',
    ariaLabel: 'Manage lesson passes',
  },
  {
    icon: Award,
    label: 'Classes',
    href: '/classes',
    ariaLabel: 'Manage group classes',
  },
  {
    icon: Building,
    label: 'Pricing',
    href: '/pricing',
    ariaLabel: 'Configure pricing structure',
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    ariaLabel: 'Organization settings',
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (href === '/reports/appointments') {
      return pathname?.startsWith('/reports');
    }
    return pathname?.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSheetOpen(false);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation',
                'min-h-[48px] active:bg-gray-100',
                active
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
              aria-label={item.ariaLabel}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform',
                  active && 'scale-110'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  active && 'font-semibold'
                )}
              >
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-t-full" />
              )}
            </button>
          );
        })}

        {/* More menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation',
                'min-h-[48px] active:bg-gray-100',
                'text-gray-600 hover:text-gray-900'
              )}
              aria-label="Open more menu"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 mt-6 pb-4">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg transition-colors touch-manipulation',
                      'min-h-[48px]',
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'hover:bg-gray-50 text-gray-700'
                    )}
                    aria-label={item.ariaLabel}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

// Spacer component to prevent content from being hidden behind bottom nav
export function MobileBottomNavSpacer() {
  return <div className="h-16 md:hidden" aria-hidden="true" />;
}
