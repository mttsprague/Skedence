'use client';

import { useState, useCallback } from 'react';

export type OptimisticStatus = 'idle' | 'pending' | 'success' | 'error';

interface OptimisticState<T> {
  data: T;
  status: OptimisticStatus;
  error: string | null;
}

interface UseOptimisticOptions<T, R> {
  onMutate: (newData: T) => Promise<R>;
  onSuccess?: (result: R, newData: T) => void;
  onError?: (error: Error, originalData: T) => void;
  onSettled?: () => void;
}

/**
 * Hook for optimistic UI updates
 * Immediately updates the UI, then rolls back if the mutation fails
 */
export function useOptimistic<T, R = void>(
  initialData: T,
  options: UseOptimisticOptions<T, R>
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    status: 'idle',
    error: null,
  });

  const mutate = useCallback(
    async (newData: T) => {
      const originalData = state.data;

      // Optimistically update the UI
      setState({
        data: newData,
        status: 'pending',
        error: null,
      });

      try {
        // Perform the actual mutation
        const result = await options.onMutate(newData);

        // Update state to success
        setState({
          data: newData,
          status: 'success',
          error: null,
        });

        options.onSuccess?.(result, newData);
      } catch (error) {
        // Roll back to original data on error
        setState({
          data: originalData,
          status: 'error',
          error: error instanceof Error ? error.message : 'An error occurred',
        });

        options.onError?.(error as Error, originalData);
      } finally {
        options.onSettled?.();
      }
    },
    [state.data, options]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      status: 'idle',
      error: null,
    });
  }, [initialData]);

  return {
    data: state.data,
    status: state.status,
    error: state.error,
    mutate,
    reset,
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}

/**
 * Hook for optimistic list updates (add/remove/update items)
 */
export function useOptimisticList<T extends { id: string }>(
  initialList: T[]
) {
  const [list, setList] = useState(initialList);
  const [optimisticItems, setOptimisticItems] = useState<Set<string>>(new Set());

  const addOptimistic = useCallback((item: T) => {
    setList((prev) => [...prev, item]);
    setOptimisticItems((prev) => new Set([...prev, item.id]));
  }, []);

  const removeOptimistic = useCallback((id: string) => {
    setList((prev) => prev.filter((item) => item.id !== id));
    setOptimisticItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateOptimistic = useCallback((id: string, updates: Partial<T>) => {
    setList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
    setOptimisticItems((prev) => new Set([...prev, id]));
  }, []);

  const confirmOptimistic = useCallback((id: string) => {
    setOptimisticItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const rollbackOptimistic = useCallback((id: string) => {
    // Remove the item and clear optimistic state
    setList((prev) => prev.filter((item) => item.id !== id));
    setOptimisticItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isOptimistic = useCallback(
    (id: string) => optimisticItems.has(id),
    [optimisticItems]
  );

  return {
    list,
    setList,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    confirmOptimistic,
    rollbackOptimistic,
    isOptimistic,
  };
}

/**
 * Hook for optimistic toggle (boolean state)
 */
export function useOptimisticToggle(
  initialValue: boolean,
  onToggle: (newValue: boolean) => Promise<void>
) {
  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const toggle = useCallback(async () => {
    const newValue = !value;
    const originalValue = value;

    // Optimistically update
    setValue(newValue);
    setIsPending(true);

    try {
      await onToggle(newValue);
      // Success - keep the new value
    } catch (error) {
      // Rollback on error
      setValue(originalValue);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [value, onToggle]);

  return {
    value,
    toggle,
    isPending,
  };
}
