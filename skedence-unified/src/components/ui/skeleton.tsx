import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * Skeleton loader for client cards
 */
function ClientCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            {/* Name */}
            <Skeleton className="h-4 w-32" />
            {/* Email */}
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        {/* Action button */}
        <Skeleton className="h-8 w-20" />
      </div>
      
      {/* Stats row */}
      <div className="flex gap-4 pt-2 border-t border-border">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for booking rows
 */
function BookingRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-4 flex-1">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for trainer cards
 */
function TrainerCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-border">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for schedule slots
 */
function ScheduleSlotSkeleton() {
  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-2 w-16" />
    </div>
  )
}

/**
 * Skeleton loader for data table
 */
function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for stats cards
 */
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

export { 
  Skeleton, 
  ClientCardSkeleton,
  BookingRowSkeleton,
  TrainerCardSkeleton,
  ScheduleSlotSkeleton,
  TableSkeleton,
  StatCardSkeleton
}
