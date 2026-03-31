import type { ReactNode } from 'react';
import Link from 'next/link';
import BrandLogo from './BrandLogo';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 60px),' +
    'repeating-linear-gradient(90deg,#fff,#fff 1px,transparent 1px,transparent 60px)',
};

interface AuthLayoutProps {
  children: ReactNode;
  subtitle: string;
}

/** Shared wrapper for login and register pages. */
export default function AuthLayout({ children, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pva-navy via-pva-navy/95 to-pva-teal/80 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={GRID_BG} />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <BrandLogo theme="dark" size="lg" showTagline href="/" />
          </div>
          <p className="text-gray-300 mt-4">{subtitle}</p>
        </div>

        {children}

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
