'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { 
  Search, 
  Calendar, 
  Users, 
  UserCog, 
  Plus, 
  BarChart3, 
  Settings,
  Activity,
  Package,
  DollarSign,
  GraduationCap,
  MapPin,
  FileText,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const commands = [
  // Primary Actions
  {
    group: 'Quick Actions',
    items: [
      { icon: Plus, label: 'Book Session', value: 'book-session', href: '/bookings', shortcut: 'Ctrl+B' },
      { icon: Users, label: 'Add Client', value: 'add-client', href: '/clients' },
      { icon: UserCog, label: 'Add Trainer', value: 'add-trainer', href: '/trainers' },
      { icon: GraduationCap, label: 'Create Class', value: 'create-class', href: '/classes' },
    ],
  },
  // Navigation
  {
    group: 'Navigation',
    items: [
      { icon: Activity, label: 'Activity Feed', value: 'activity', href: '/activity' },
      { icon: Calendar, label: 'Scheduling', value: 'scheduling', href: '/scheduling' },
      { icon: Users, label: 'Clients', value: 'clients', href: '/clients' },
      { icon: UserCog, label: 'Trainers', value: 'trainers', href: '/trainers' },
      { icon: Calendar, label: 'Schedule View', value: 'schedule', href: '/schedule' },
      { icon: GraduationCap, label: 'Classes', value: 'classes', href: '/classes' },
      { icon: BarChart3, label: 'Reports', value: 'reports', href: '/reports' },
    ],
  },
  // Settings
  {
    group: 'Settings & Configuration',
    items: [
      { icon: Package, label: 'Lesson Passes', value: 'passes', href: '/passes' },
      { icon: DollarSign, label: 'Pricing Structure', value: 'pricing', href: '/pricing' },
      { icon: MapPin, label: 'Locations', value: 'locations', href: '/locations' },
      { icon: FileText, label: 'Waiver Management', value: 'waiver', href: '/waiver' },
      { icon: Settings, label: 'Business Settings', value: 'settings', href: '/settings' },
      { icon: Crown, label: 'Subscription', value: 'subscription', href: '/subscription' },
    ],
  },
  // Reports
  {
    group: 'Reports & Analytics',
    items: [
      { icon: BarChart3, label: 'Appointments Report', value: 'report-appointments', href: '/reports/appointments' },
      { icon: DollarSign, label: 'Revenue Report', value: 'report-revenue', href: '/reports/revenue' },
      { icon: Users, label: 'User Sign-ups Report', value: 'report-users', href: '/reports/users' },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Command Palette Dialog */}
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
      >
        <Command
          className="rounded-lg border border-border bg-background shadow-lg"
          aria-label="Quick navigation and actions"
        >
          <div className="flex items-center border-b border-border px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              placeholder="Search commands or navigate..."
              value={search}
              onValueChange={setSearch}
              className="flex h-14 w-full bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Search commands"
            />
            <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2 scrollbar-premium" role="listbox">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {commands.map((group) => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.value}
                      value={item.value}
                      onSelect={() => handleSelect(item.href)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none",
                        "hover:bg-accent hover:text-accent-foreground",
                        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                        "transition-colors duration-150"
                      )}
                      role="option"
                      aria-label={item.label}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground ml-auto">
                          {item.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="border-t border-border p-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between px-2">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↓</kbd> to navigate</span>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">Enter</kbd> to select</span>
            </div>
          </div>
        </Command>
      </div>
    </>
  );
}
