import { GripVertical, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableCardProps {
  isDragging?: boolean;
  isDropTarget?: boolean;
  canDrop?: boolean;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
}

/**
 * Card wrapper with drag and drop visual feedback
 */
export function DraggableCard({
  isDragging = false,
  isDropTarget = false,
  canDrop = false,
  children,
  className = '',
  showHandle = true,
}: DraggableCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border bg-white transition-all duration-200',
        {
          'opacity-50 scale-95 cursor-grabbing': isDragging,
          'ring-2 ring-blue-500 ring-offset-2': isDropTarget && canDrop,
          'ring-2 ring-red-500 ring-offset-2': isDropTarget && !canDrop,
          'cursor-grab hover:shadow-md': !isDragging,
        },
        className
      )}
    >
      {showHandle && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
          <GripVertical className="w-4 h-4" aria-hidden="true" />
        </div>
      )}
      <div className={cn(showHandle && 'pl-8')}>{children}</div>
    </div>
  );
}

interface DropZoneProps {
  isActive?: boolean;
  canDrop?: boolean;
  children: React.ReactNode;
  className?: string;
  emptyText?: string;
}

/**
 * Drop zone with visual feedback
 */
export function DropZone({
  isActive = false,
  canDrop = true,
  children,
  className = '',
  emptyText = 'Drop here',
}: DropZoneProps) {
  return (
    <div
      className={cn(
        'relative min-h-[80px] rounded-lg border-2 border-dashed transition-all duration-200',
        {
          'border-blue-500 bg-blue-50': isActive && canDrop,
          'border-red-500 bg-red-50': isActive && !canDrop,
          'border-gray-300 bg-gray-50': !isActive,
        },
        className
      )}
    >
      {children}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm',
              canDrop ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            )}
          >
            {canDrop ? (
              <>
                <Move className="inline w-4 h-4 mr-2" aria-hidden="true" />
                {emptyText}
              </>
            ) : (
              'Cannot drop here'
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DragHandleProps {
  className?: string;
}

/**
 * Visual drag handle
 */
export function DragHandle({ className = '' }: DragHandleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing transition-colors',
        className
      )}
      aria-label="Drag handle"
    >
      <GripVertical className="w-4 h-4 text-gray-400" aria-hidden="true" />
    </div>
  );
}

interface DragOverlayProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Ghost image shown during drag
 */
export function DragOverlay({ children, className = '' }: DragOverlayProps) {
  return (
    <div
      className={cn(
        'fixed pointer-events-none z-50 opacity-80 rotate-3 scale-105',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SortableListItemProps {
  isDragging?: boolean;
  isDropTarget?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * List item with sortable drag feedback
 */
export function SortableListItem({
  isDragging = false,
  isDropTarget = false,
  children,
  className = '',
}: SortableListItemProps) {
  return (
    <div
      className={cn(
        'relative transition-all duration-200',
        {
          'opacity-40': isDragging,
          'before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:bg-blue-500':
            isDropTarget,
        },
        className
      )}
    >
      {children}
    </div>
  );
}
