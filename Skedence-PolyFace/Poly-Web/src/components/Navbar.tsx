'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogIn, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BrandLogo from './BrandLogo';

const MORE_LINKS = [
  { label: 'How To', href: '/how-to' },
  { label: 'Our Trainers', href: '/trainers' },
  { label: 'Blog', href: '/blog' },
  { label: 'Cancellation Policy', href: '/cancellation-policy' },
  { label: 'Sign Waiver', href: '/sign-waiver' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md overflow-visible">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <BrandLogo theme="light" size="md" showTagline href="/" />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-bold text-gray-700">
            <a href="/#programs" className="hover:text-pva-orange transition">TRAINING</a>
            <Link href="/classes-and-camps" className="hover:text-pva-orange transition">CLASSES &amp; CAMPS</Link>
            <Link href="/about" className="hover:text-pva-orange transition">ABOUT POLYFACE</Link>
            <a href="/#contact" className="hover:text-pva-orange transition">CONTACT</a>

            {/* More dropdown — hover open, leave closes */}
            <div
              ref={moreRef}
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                className="flex items-center gap-1 hover:text-pva-orange transition select-none"
              >
                MORE <ChevronDown size={14} className={`transition-transform duration-150 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <div className="absolute top-full right-0 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 pt-3 pb-1 z-[999]">
                  {MORE_LINKS.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-pva-orange transition"
                      onClick={() => setMoreOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a
              href="https://www.instagram.com/polyface_volleyball_academy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-pva-orange transition"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
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
          <a href="/#programs" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>TRAINING</a>
          <Link href="/classes-and-camps" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>CLASSES &amp; CAMPS</Link>
          <Link href="/about" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>ABOUT POLYFACE</Link>
          <a href="/#contact" className="block py-2 font-bold text-gray-700 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>CONTACT</a>
          {MORE_LINKS.map(link => (
            <Link key={link.href} href={link.href} className="block py-2 font-bold text-gray-600 hover:text-pva-orange" onClick={() => setMobileOpen(false)}>
              {link.label.toUpperCase()}
            </Link>
          ))}
          <a
            href="https://www.instagram.com/polyface_volleyball_academy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 font-bold text-gray-700 hover:text-pva-orange"
            onClick={() => setMobileOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> Instagram
          </a>
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
