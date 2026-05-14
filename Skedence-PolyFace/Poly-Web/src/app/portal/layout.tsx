'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  Ticket,
  LogOut,
  Menu,
  X,
  UserCircle,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import BrandLogo from '@/components/BrandLogo';
import Spinner from '@/components/Spinner';
import ErrorBoundary from '@/components/ErrorBoundary';

const NAV_ITEMS = [
  { href: '/portal', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { href: '/portal/book', icon: <BookOpen size={20} />, label: 'Book a Lesson' },
  { href: '/portal/schedule', icon: <CalendarCheck size={20} />, label: 'My Schedule' },
  { href: '/portal/passes', icon: <Ticket size={20} />, label: 'My Passes' },
  { href: '/portal/documents', icon: <FileText size={20} />, label: 'Documents' },
  { href: '/portal/profile', icon: <UserCircle size={20} />, label: 'My Profile' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !user.emailVerified) {
      router.push('/verify-email');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-gray-500 text-sm font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : user.email || 'Athlete';
  const initials = profile
    ? `${(profile.firstName?.[0] || '?')}${(profile.lastName?.[0] || '?')}`.toUpperCase()
    : (user.email?.[0] || 'A').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-pva-navy flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <BrandLogo theme="dark" size="sm" showTagline href="/" />
          <div className="text-[10px] text-gray-400 tracking-widest mt-1 pl-1">CLIENT PORTAL</div>
        </div>

        {/* User */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pva-orange rounded-full flex items-center justify-center font-black text-white text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{displayName}</div>
              <div className="text-gray-400 text-xs truncate">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition
                  ${active
                    ? 'bg-pva-teal text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 font-semibold text-sm transition"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-pva-navy"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="text-sm font-black text-pva-navy">
            POLY<span className="text-pva-teal">FACE</span> Portal
          </div>
          <div className="w-10 h-10 bg-pva-orange rounded-full flex items-center justify-center font-black text-white text-xs">
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-10">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
