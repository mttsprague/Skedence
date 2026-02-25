import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptimisticStatus } from '@/hooks/useOptimistic';

interface OptimisticIndicatorProps {
  status: OptimisticStatus;
  className?: string;
}

/**
 * Visual indicator for optimistic update status
 */
export function OptimisticIndicator({ status, className }: OptimisticIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      {status === 'pending' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" aria-hidden="true" />
          <span className="text-blue-600">Saving...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <Check className="w-3 h-3 text-green-600" aria-hidden="true" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-600" aria-hidden="true" />
          <span className="text-red-600">Failed</span>
        </>
      )}
    </div>
  );
}

interface OptimisticOverlayProps {
  isPending: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Overlay that dims content during optimistic update
 */
export function OptimisticOverlay({ 
  isPending, 
  children, 
  className 
}: OptimisticOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'transition-opacity duration-200',
        isPending && 'opacity-50 pointer-events-none'
      )}>
        {children}
      </div>
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" aria-label="Updating..." />
        </div>
      )}
    </div>
  );
}

interface OptimisticBadgeProps {
  isOptimistic: boolean;
  className?: string;
}

/**
 * Badge to mark items that haven't been confirmed by the server
 */
export function OptimisticBadge({ isOptimistic, className }: OptimisticBadgeProps) {
  if (!isOptimistic) return null;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200',
        className
      )}
      aria-label="Pending confirmation"
    >
      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
      <span>Pending</span>
    </span>
  );
}

interface OptimisticListItemProps {
  isOptimistic: boolean;
  isPending?: boolean;
  isError?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper for list items with optimistic state
 */
export function OptimisticListItem({ 
  isOptimistic, 
  isPending,
  isError,
  children, 
  className 
}: OptimisticListItemProps) {
  return (
    <div className={cn(
      'relative transition-all duration-200',
      {
        'opacity-70': isPending,
        'border-blue-200 bg-blue-50/30': isOptimistic && !isError,
        'border-red-200 bg-red-50/30': isError,
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300': isOptimistic
      },
      className
    )}>
      {children}
      {isOptimistic && !isError && (
        <div className="absolute top-2 right-2">
          <OptimisticBadge isOptimistic={true} />
        </div>
      )}
      {isError && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
            <span>Failed</span>
          </span>
        </div>
      )}
    </div>
  );
}
