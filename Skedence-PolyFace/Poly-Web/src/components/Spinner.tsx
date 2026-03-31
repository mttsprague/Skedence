interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-10 h-10 border-4',
};

/** Reusable loading spinner with PVA navy colour. */
export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`${SIZES[size]} border-pva-navy/20 border-t-pva-navy rounded-full animate-spin ${className}`} />
  );
}
