'use client';

import { Activity, Zap, Clock, Users, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  isLive?: boolean;
  count?: number;
  label?: string;
  className?: string;
  showPulse?: boolean;
}

/**
 * Badge showing live status with optional count
 */
export function LiveBadge({ 
  isLive = false, 
  count, 
  label = 'Live', 
  className = '',
  showPulse = true 
}: LiveBadgeProps) {
  if (!isLive) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200",
        className
      )}
      aria-label="Data connection offline"
      >
        <WifiOff className="w-3 h-3" aria-hidden="true" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200",
      className
    )}
    aria-label={count !== undefined ? `${label}: ${count} items` : `${label} - real-time updates active`}
    >
      <div className="relative flex items-center justify-center">
        <Activity className="w-3 h-3" aria-hidden="true" />
        {showPulse && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" aria-hidden="true"></span>
        )}
      </div>
      <span>{label}</span>
      {count !== undefined && (
        <span className="font-semibold">{count}</span>
      )}
    </div>
  );
}

interface UpdateIndicatorProps {
  show: boolean;
  message?: string;
  className?: string;
}

/**
 * Flash indicator shown when data updates
 */
export function UpdateIndicator({ 
  show, 
  message = 'Updated', 
  className = '' 
}: UpdateIndicatorProps) {
  if (!show) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-in fade-in-0 slide-in-from-top-1 duration-200",
      className
    )}
    role="status"
    aria-live="polite"
    aria-label={message}
    >
      <Zap className="w-4 h-4 animate-pulse" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

interface StaleIndicatorProps {
  isStale: boolean;
  lastUpdate: Date;
  className?: string;
}

/**
 * Warning indicator for stale data
 */
export function StaleIndicator({ 
  isStale, 
  lastUpdate, 
  className = '' 
}: StaleIndicatorProps) {
  if (!isStale) return null;

  const minutesAgo = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 60000);

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200",
      className
    )}
    role="status"
    aria-label={`Data last updated ${minutesAgo} minutes ago`}
    >
      <Clock className="w-3 h-3" aria-hidden="true" />
      <span>{minutesAgo}m ago</span>
    </div>
  );
}

interface ViewersIndicatorProps {
  count: number;
  editors?: string[];
  className?: string;
}

/**
 * Shows who's currently viewing/editing
 */
export function ViewersIndicator({ 
  count, 
  editors = [], 
  className = '' 
}: ViewersIndicatorProps) {
  if (count === 0 && editors.length === 0) return null;

  const hasEditors = editors.length > 0;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      hasEditors 
        ? "bg-orange-50 text-orange-700 border border-orange-200" 
        : "bg-gray-50 text-gray-600 border border-gray-200",
      className
    )}
    aria-label={
      hasEditors 
        ? `${editors.length} user${editors.length > 1 ? 's' : ''} editing: ${editors.join(', ')}`
        : `${count} viewer${count > 1 ? 's' : ''}`
    }
    >
      <Users className="w-3 h-3" aria-hidden="true" />
      <span>{hasEditors ? 'Editing' : 'Viewing'}</span>
      <span className="font-semibold">{hasEditors ? editors.length : count}</span>
    </div>
  );
}

interface RealTimeStatsCardProps {
  title: string;
  count: number;
  isLive: boolean;
  lastUpdate: Date;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Card component showing real-time statistics
 */
export function RealTimeStatsCard({
  title,
  count,
  isLive,
  lastUpdate,
  icon,
  className = ''
}: RealTimeStatsCardProps) {
  const minutesAgo = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 60000);
  const isRecent = minutesAgo < 1;

  return (
    <div className={cn(
      "p-4 rounded-lg border bg-white shadow-sm",
      isLive && "border-green-200 bg-green-50/50",
      className
    )}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-gray-900">
          {count}
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <LiveBadge isLive={isLive} showPulse={isRecent} />
          {!isRecent && minutesAgo < 60 && (
            <span className="text-xs text-gray-500">
              {minutesAgo}m ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
