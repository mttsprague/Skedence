'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Trash2,
  Download,
  Archive,
  Mail,
  Tag,
  Copy,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';

interface BatchAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

interface BatchActionsToolbarProps {
  selectedCount: number;
  onAction: (actionId: string) => Promise<void>;
  onClearSelection: () => void;
  actions?: BatchAction[];
  isProcessing?: boolean;
  className?: string;
}

const defaultActions: BatchAction[] = [
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Delete items',
    confirmationDescription: 'Are you sure you want to delete the selected items? This action cannot be undone.',
  },
  {
    id: 'export',
    label: 'Export',
    icon: Download,
    variant: 'outline',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    variant: 'outline',
    requiresConfirmation: true,
    confirmationTitle: 'Archive items',
    confirmationDescription: 'Are you sure you want to archive the selected items?',
  },
];

export function BatchActionsToolbar({
  selectedCount,
  onAction,
  onClearSelection,
  actions = defaultActions,
  isProcessing = false,
  className,
}: BatchActionsToolbarProps) {
  const [pendingAction, setPendingAction] = useState<BatchAction | null>(null);

  const handleActionClick = (action: BatchAction) => {
    if (action.requiresConfirmation) {
      setPendingAction(action);
    } else {
      onAction(action.id);
    }
  };

  const handleConfirm = async () => {
    if (pendingAction) {
      await onAction(pendingAction.id);
      setPendingAction(null);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-30',
          'bg-white border shadow-lg rounded-lg p-4',
          'flex items-center gap-3',
          'animate-in fade-in slide-in-from-bottom-4 duration-300',
          className
        )}
        role="toolbar"
        aria-label="Bulk actions toolbar"
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-sm">
            {selectedCount} selected
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => handleActionClick(action)}
                disabled={isProcessing}
                className="min-h-[36px] touch-manipulation whitespace-nowrap"
                aria-label={`${action.label} ${selectedCount} items`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Clear button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isProcessing}
          className="min-h-[36px]"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.confirmationTitle || 'Confirm action'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.confirmationDescription ||
                `You are about to ${pendingAction?.label.toLowerCase()} ${selectedCount} item${selectedCount > 1 ? 's' : ''}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isProcessing}
              className={cn(
                pendingAction?.variant === 'destructive' &&
                  'bg-red-600 hover:bg-red-700'
              )}
            >
              {isProcessing ? 'Processing...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SelectAllCheckboxProps {
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label?: string;
}

export function SelectAllCheckbox({
  isAllSelected,
  isSomeSelected,
  onToggle,
  disabled = false,
  label = 'Select all',
}: SelectAllCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="select-all"
        checked={isAllSelected}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-label={label}
        className={cn(
          isSomeSelected && !isAllSelected && 'data-[state=checked]:bg-blue-300'
        )}
      />
      <label
        htmlFor="select-all"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {label}
      </label>
    </div>
  );
}

interface SelectItemCheckboxProps {
  id: string;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label?: string;
}

export function SelectItemCheckbox({
  id,
  isSelected,
  onToggle,
  disabled = false,
  label,
}: SelectItemCheckboxProps) {
  return (
    <Checkbox
      id={`select-${id}`}
      checked={isSelected}
      onCheckedChange={onToggle}
      disabled={disabled}
      aria-label={label || `Select item ${id}`}
      className="touch-manipulation"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// Export action presets for common use cases
export const batchActionPresets = {
  clients: [
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Delete clients',
      confirmationDescription: 'Are you sure you want to delete the selected clients? This will also remove their bookings and packages.',
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline' as const,
    },
    {
      id: 'email',
      label: 'Send Email',
      icon: Mail,
      variant: 'outline' as const,
    },
    {
      id: 'tag',
      label: 'Add Tag',
      icon: Tag,
      variant: 'outline' as const,
    },
  ],
  passes: [
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Delete passes',
      confirmationDescription: 'Are you sure you want to delete the selected passes? This action cannot be undone.',
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline' as const,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      variant: 'outline' as const,
    },
  ],
  trainers: [
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'outline' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Archive trainers',
      confirmationDescription: 'Are you sure you want to archive the selected trainers? They will no longer appear in active lists.',
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline' as const,
    },
    {
      id: 'email',
      label: 'Send Email',
      icon: Mail,
      variant: 'outline' as const,
    },
  ],
};
