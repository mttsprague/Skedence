'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings,
  CreditCard,
  Bell,
  FileText,
  ArrowLeft,
  Megaphone,
  MapPin,
  Package,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const submenuItems = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Billboard', href: '/settings/billboard', icon: Megaphone },
  { name: 'Waiver', href: '/waiver', icon: FileText },
  { name: 'Intake Forms', href: '/settings/intake-forms', icon: FileText },
  { name: 'Stripe Settings', href: '/settings/stripe', icon: CreditCard },
  { name: 'Client Emails', href: '/settings/client-emails', icon: Bell },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Passes', href: '/passes', icon: Package },
  { name: 'Pricing', href: '/pricing', icon: DollarSign },
];

interface BusinessSettingsSubmenuProps {
  children: ReactNode;
}

export function BusinessSettingsSubmenu({ children }: BusinessSettingsSubmenuProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-y-auto scrollbar-premium shadow-premium-lg">
        {/* Back to Activity Feed */}
        <div className="p-6 border-b border-sidebar-border">
          <Link
            href="/activity"
            className="flex items-center gap-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-all duration-200 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Activity Feed</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-1.5">
            {submenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground shadow-premium'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground active:scale-[0.98]'
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
      <div className="flex-1 overflow-y-auto scrollbar-premium">
        <div className="p-8 lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
