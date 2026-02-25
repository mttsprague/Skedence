'use client';

import { useState, useCallback } from 'react';

export interface BatchOperationOptions<T> {
  items: T[];
  getId: (item: T) => string;
  onBatchAction?: (selectedIds: string[], action: string) => Promise<void>;
}

export interface BatchOperationResult<T> {
  selectedIds: Set<string>;
  selectedItems: T[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelectItem: (id: string) => void;
  clearSelection: () => void;
  selectItems: (ids: string[]) => void;
  performBatchAction: (action: string) => Promise<void>;
  isProcessing: boolean;
}

/**
 * Hook for managing bulk selection and batch operations
 * 
 * @example
 * ```tsx
 * const { 
 *   selectedIds, 
 *   toggleSelectAll, 
 *   toggleSelectItem,
 *   performBatchAction 
 * } = useBatchOperations({
 *   items: clients,
 *   getId: (client) => client.id,
 *   onBatchAction: async (ids, action) => {
 *     if (action === 'delete') {
 *       await deleteClients(ids);
 *     }
 *   }
 * });
 * ```
 */
export function useBatchOperations<T>({
  items,
  getId,
  onBatchAction,
}: BatchOperationOptions<T>): BatchOperationResult<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedItems = items.filter((item) => selectedIds.has(getId(item)));
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(getId)));
    }
  }, [isAllSelected, items, getId]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const performBatchAction = useCallback(async (action: string) => {
    if (selectedIds.size === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      if (onBatchAction) {
        await onBatchAction(Array.from(selectedIds), action);
      }
      setSelectedIds(new Set());
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, onBatchAction]);

  return {
    selectedIds,
    selectedItems,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
    toggleSelectItem,
    clearSelection,
    selectItems,
    performBatchAction,
    isProcessing,
  };
}
