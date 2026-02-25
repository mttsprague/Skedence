'use client';

import { useState, useCallback, useRef, DragEvent } from 'react';

export interface DragItem {
  id: string;
  type: string;
  data: any;
}

export interface DropZone {
  id: string;
  accepts: string[];
  data?: any;
}

interface UseDragAndDropOptions {
  onDrop?: (item: DragItem, target: DropZone) => void | Promise<void>;
  onDragStart?: (item: DragItem) => void;
  onDragEnd?: (item: DragItem) => void;
  canDrop?: (item: DragItem, target: DropZone) => boolean;
}

/**
 * Hook for drag and drop functionality with visual feedback
 */
export function useDragAndDrop(options: UseDragAndDropOptions = {}) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragImageRef = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback(
    (item: DragItem) => (e: DragEvent) => {
      setDraggedItem(item);
      setIsDragging(true);
      
      // Set drag data for native browser behavior
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      
      // Custom drag image if available
      if (dragImageRef.current) {
        e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
      }
      
      options.onDragStart?.(item);
    },
    [options]
  );

  const handleDragEnd = useCallback(
    (item: DragItem) => (e: DragEvent) => {
      setDraggedItem(null);
      setDropTarget(null);
      setIsDragging(false);
      options.onDragEnd?.(item);
    },
    [options]
  );

  const handleDragOver = useCallback(
    (zone: DropZone) => (e: DragEvent) => {
      e.preventDefault();
      
      if (!draggedItem) return;
      
      // Check if this drop zone accepts the dragged item type
      if (!zone.accepts.includes(draggedItem.type)) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      
      // Check custom canDrop logic
      if (options.canDrop && !options.canDrop(draggedItem, zone)) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(zone.id);
    },
    [draggedItem, options]
  );

  const handleDragLeave = useCallback(
    (zone: DropZone) => (e: DragEvent) => {
      // Only clear if we're actually leaving this element (not a child)
      if (e.currentTarget === e.target) {
        setDropTarget(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (zone: DropZone) => async (e: DragEvent) => {
      e.preventDefault();
      
      if (!draggedItem) return;
      
      // Check if drop is allowed
      if (!zone.accepts.includes(draggedItem.type)) return;
      if (options.canDrop && !options.canDrop(draggedItem, zone)) return;
      
      setDropTarget(null);
      setIsDragging(false);
      
      // Call the drop handler
      await options.onDrop?.(draggedItem, zone);
      
      setDraggedItem(null);
    },
    [draggedItem, options]
  );

  const getDraggableProps = useCallback(
    (item: DragItem) => ({
      draggable: true,
      onDragStart: handleDragStart(item),
      onDragEnd: handleDragEnd(item),
      'data-dragging': isDragging && draggedItem?.id === item.id,
    }),
    [handleDragStart, handleDragEnd, isDragging, draggedItem]
  );

  const getDropZoneProps = useCallback(
    (zone: DropZone) => ({
      onDragOver: handleDragOver(zone),
      onDragLeave: handleDragLeave(zone),
      onDrop: handleDrop(zone),
      'data-drop-active': dropTarget === zone.id,
      'data-can-drop': draggedItem ? zone.accepts.includes(draggedItem.type) : false,
    }),
    [handleDragOver, handleDragLeave, handleDrop, dropTarget, draggedItem]
  );

  return {
    draggedItem,
    dropTarget,
    isDragging,
    getDraggableProps,
    getDropZoneProps,
    setDragImageRef: (ref: HTMLElement | null) => {
      dragImageRef.current = ref;
    },
  };
}

/**
 * Hook for simple sortable lists
 */
export function useSortable<T extends { id: string }>(
  items: T[],
  onReorder: (items: T[]) => void
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (index: number) => (e: DragEvent) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    },
    []
  );

  const handleDragOver = useCallback(
    (index: number) => (e: DragEvent) => {
      e.preventDefault();
      if (draggedIndex === null) return;
      if (index !== draggedIndex) {
        setDropIndex(index);
      }
    },
    [draggedIndex]
  );

  const handleDrop = useCallback(
    (index: number) => (e: DragEvent) => {
      e.preventDefault();
      
      if (draggedIndex === null) return;
      if (draggedIndex === index) return;
      
      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, removed);
      
      onReorder(newItems);
      setDraggedIndex(null);
      setDropIndex(null);
    },
    [draggedIndex, items, onReorder]
  );

  const getSortableProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: handleDragStart(index),
      onDragOver: handleDragOver(index),
      onDrop: handleDrop(index),
      onDragEnd: () => {
        setDraggedIndex(null);
        setDropIndex(null);
      },
      'data-dragging': draggedIndex === index,
      'data-drop-target': dropIndex === index && draggedIndex !== null,
    }),
    [handleDragStart, handleDragOver, handleDrop, draggedIndex, dropIndex]
  );

  return {
    draggedIndex,
    dropIndex,
    getSortableProps,
  };
}
