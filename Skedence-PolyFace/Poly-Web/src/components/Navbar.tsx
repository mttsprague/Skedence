'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <BrandLogo theme="light" size="md" showTagline href="/" />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-bold text-gray-700">
            <a href="#programs" className="hover:text-pva-orange transition">TRAINING</a>
            <a href="#about" className="hover:text-pva-orange transition">ABOUT</a>
            <a href="#contact" className="hover:text-pva-orange transition">CONTACT</a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <Link
                  href="/portal"
                  className="bg-white hover:bg-gray-50 text-pva-navy border-2 border-pva-navy px-6 py-2.5 rounded-full font-bold text-sm transition"
                >
                  My Portal
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-500 hover:text-gray-700 text-sm font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-pva-navy border-2 border-pva-navy px-6 py-2.5 rounded-full font-bold text-sm transition"
                >
                  <LogIn size={15} />
                  Client Login
                </Link>
                <Link
                  href="/portal/book"
                  className="bg-gradient-to-r from-pva-orange to-pva-orange/80 hover:opacity-90 text-white px-8 py-3 rounded-full font-bold text-sm transition transform hover:scale-105 shadow-lg"
                >
                  BOOK NOW
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-pva-navy"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
          <a href="#programs" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>TRAINING</a>
          <a href="#about" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>ABOUT</a>
          <a href="#contact" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>CONTACT</a>
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {user ? (
              <>
                <Link href="/portal" className="block w-full text-center bg-pva-navy text-white py-3 rounded-full font-bold text-sm" onClick={() => setMobileOpen(false)}>
                  My Portal
                </Link>
                <button onClick={handleSignOut} className="block w-full text-center text-gray-500 py-2 font-semibold text-sm">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block w-full text-center border-2 border-pva-navy text-pva-navy py-3 rounded-full font-bold text-sm" onClick={() => setMobileOpen(false)}>
                  Client Login
                </Link>
                <Link href="/portal/book" className="block w-full text-center bg-pva-orange text-white py-3 rounded-full font-bold text-sm" onClick={() => setMobileOpen(false)}>
                  Book Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
