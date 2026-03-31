import Link from 'next/link';

interface BrandLogoProps {
  /** 'dark' = white POLY on dark bg (portal/auth), 'light' = navy POLY on white bg (navbar) */
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  href?: string;
}

const IMG_SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-16 w-16' };
const TEXT_SIZES = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' };
const TAGLINE_SIZES = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' };

/** Shared POLYFACE brand logo block used across Navbar, auth pages, and portal sidebar. */
export default function BrandLogo({
  theme = 'light',
  size = 'md',
  showTagline = false,
  href = '/',
}: BrandLogoProps) {
  const polyColor = theme === 'dark' ? 'text-white' : 'text-pva-navy';
  const taglineColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const inner = (
    <div className="flex items-center gap-3">
      <img
        src="/polyface-logo.png"
        alt="PolyFace Volleyball Academy"
        className={`${IMG_SIZES[size]} rounded-xl ${size === 'lg' ? 'shadow-xl' : 'shadow-lg'}`}
      />
      <div>
        <div className={`${TEXT_SIZES[size]} font-black leading-none`}>
          <span className={polyColor}>POLY</span>
          <span className="text-pva-teal">FACE</span>
        </div>
        {showTagline && (
          <div className={`${TAGLINE_SIZES[size]} ${taglineColor} tracking-widest font-semibold`}>
            VOLLEYBALL ACADEMY
          </div>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
