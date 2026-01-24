'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Clock,
  Plus,
  GraduationCap,
  Menu,
  X,
  Package,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Trainers', href: '/trainers', icon: UserCog },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Book Session', href: '/bookings', icon: Plus },
  { name: 'Classes', href: '/classes', icon: GraduationCap },
  { name: 'Passes', href: '/passes', icon: Package },
  { name: 'Pricing', href: '/pricing', icon: DollarSign },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const ownerOnlyNavigation = [
  { name: 'Stripe Settings', href: '/settings/stripe', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { userData, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col h-full w-64 bg-[#3258A3] text-white transition-transform duration-300 ease-in-out",
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
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-manipulation',
                      'min-h-[44px]', // Minimum touch target size
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white active:bg-white/10'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}

            {/* Owner-Only Navigation */}
            {userData?.role === 'owner' && ownerOnlyNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-manipulation',
                      'min-h-[44px]', // Minimum touch target size
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white active:bg-white/10'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
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
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white active:bg-white/10 transition-colors touch-manipulation min-h-[44px]"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
