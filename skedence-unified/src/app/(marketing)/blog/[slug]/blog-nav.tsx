'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function BlogNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/50">
              <span className="text-black font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">Skedence</span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <a href="/#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Features</a>
            <a href="/#pricing" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</a>
            <Link href="/blog" className="text-sm font-medium text-primary transition-colors uppercase tracking-wide">Blog</Link>
            <Link href="/support" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Support</Link>
            <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Sign In</Link>
            <Link href="/register" className="btn-premium text-sm">
              Start 14-Day Free Trial →
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="container mx-auto px-6 py-6 space-y-4">
          <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">Features</a>
          <a href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">Pricing</a>
          <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">Blog</Link>
          <Link href="/support" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">Support</Link>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">Sign In</Link>
          <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block btn-premium text-center mt-4">Start 14-Day Free Trial →</Link>
        </div>
      </div>
    </nav>
  );
}
