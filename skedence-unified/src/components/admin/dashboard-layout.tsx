'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider, useCommandPalette } from '@/hooks/useCommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ShortcutsHelpDialog } from '@/components/shortcuts-help-dialog';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/ui/mobile-bottom-nav';

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { open, setOpen } = useCommandPalette();
  
  // Enable global keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });
  
  // Routes that use their own submenu sidebars
  const hasSubmenuSidebar = 
    pathname.startsWith('/scheduling') ||
    pathname.startsWith('/availability') ||
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
    return (
      <>
        {children}
        <MobileBottomNavSpacer />
        <CommandPalette open={open} onOpenChange={setOpen} />
        <ShortcutsHelpDialog />
        <MobileBottomNav />
      </>
    );
  }

  // Otherwise, render with the main sidebar
  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="container mx-auto p-6 lg:p-10 max-w-7xl">
            {children}
            <MobileBottomNavSpacer />
          </div>
        </main>
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} />
      <ShortcutsHelpDialog />
      <MobileBottomNav />
    </>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <CommandPaletteProvider>
      <LayoutContent>{children}</LayoutContent>
    </CommandPaletteProvider>
  );
}
