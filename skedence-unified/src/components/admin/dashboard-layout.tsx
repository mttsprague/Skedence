'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  
  // Routes that use their own submenu sidebars
  const hasSubmenuSidebar = 
    pathname.startsWith('/scheduling') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/trainers') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/classes') ||
    pathname.startsWith('/passes') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/locations') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname === '/waiver';

  // If the page has its own submenu sidebar, don't render the main sidebar
  if (hasSubmenuSidebar) {
    return <>{children}</>;
  }

  // Otherwise, render with the main sidebar
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
