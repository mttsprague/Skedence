'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider, useCommandPalette } from '@/hooks/useCommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ShortcutsHelpDialog } from '@/components/shortcuts-help-dialog';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/ui/mobile-bottom-nav';
import { QuickActionModal } from '@/components/admin/quick-action-modal';
import { Plus } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { open, setOpen } = useCommandPalette();
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  
  // Enable global keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });
  
  // Routes that use their own submenu sidebars
  const hasSubmenuSidebar = 
    pathname.startsWith('/scheduling') ||
    pathname.startsWith('/availability') ||
    pathname.startsWith('/import-schedule') ||
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

  // Floating Quick Action button — shown on all admin pages
  const QuickActionButton = (
    <button
      onClick={() => setQuickActionOpen(true)}
      aria-label="Quick action"
      className="fixed bottom-20 right-5 z-40 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all duration-150 flex items-center justify-center lg:bottom-8 lg:right-8"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );

  // If the page has its own submenu sidebar, don't render the main sidebar
  if (hasSubmenuSidebar) {
    return (
      <>
        {children}
        <MobileBottomNavSpacer />
        <CommandPalette open={open} onOpenChange={setOpen} />
        <ShortcutsHelpDialog />
        <MobileBottomNav />
        {QuickActionButton}
        <QuickActionModal open={quickActionOpen} onClose={() => setQuickActionOpen(false)} />
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
      {QuickActionButton}
      <QuickActionModal open={quickActionOpen} onClose={() => setQuickActionOpen(false)} />
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
