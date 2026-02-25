# Batch Operations - Usage Guide

This document explains how to implement multi-select and bulk actions in the Skedence admin portal.

## Overview

The batch operations system allows users to select multiple items and perform actions on them simultaneously, improving efficiency for bulk tasks.

## Core Hook

### `useBatchOperations<T>`

Manages selection state and batch actions:

```typescript
import { useBatchOperations } from '@/hooks/useBatchOperations';

const {
  selectedIds,           // Set of selected item IDs
  selectedItems,         // Array of selected item objects
  isAllSelected,         // All items selected
  isSomeSelected,        // Some items selected
  toggleSelectAll,       // Select/deselect all
  toggleSelectItem,      // Toggle individual item
  clearSelection,        // Clear all selections
  selectItems,           // Set specific items as selected
  performBatchAction,    // Execute bulk action
  isProcessing,          // Processing state
} = useBatchOperations({
  items: clients,
  getId: (client) => client.id,
  onBatchAction: async (selectedIds, action) => {
    // Handle batch action
  },
});
```

## Visual Components

### 1. BatchActionsToolbar

Floating toolbar that appears when items are selected:

```typescript
import { BatchActionsToolbar } from '@/components/ui/batch-actions';

<BatchActionsToolbar
  selectedCount={selectedIds.size}
  onAction={performBatchAction}
  onClearSelection={clearSelection}
  actions={customActions} // Optional: custom action buttons
  isProcessing={isProcessing}
/>
```

**Features:**
- Fixed position at bottom of screen
- Shows selection count
- Action buttons with icons
- Confirmation dialogs for destructive actions
- Clear selection button
- Mobile optimized (above bottom nav)

### 2. SelectAllCheckbox

Header checkbox for selecting all items:

```typescript
import { SelectAllCheckbox } from '@/components/ui/batch-actions';

<SelectAllCheckbox
  isAllSelected={isAllSelected}
  isSomeSelected={isSomeSelected}
  onToggle={toggleSelectAll}
  label="Select all clients"
/>
```

**Visual States:**
- Unchecked: No items selected
- Indeterminate: Some items selected (blue background, lighter)
- Checked: All items selected (blue background)

### 3. SelectItemCheckbox

Individual item checkbox:

```typescript
import { SelectItemCheckbox } from '@/components/ui/batch-actions';

<SelectItemCheckbox
  id={item.id}
  isSelected={selectedIds.has(item.id)}
  onToggle={() => toggleSelectItem(item.id)}
  label={`Select ${item.name}`}
/>
```

## Complete Example: Clients List

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import {
  BatchActionsToolbar,
  SelectAllCheckbox,
  SelectItemCheckbox,
  batchActionPresets,
} from '@/components/ui/batch-actions';
import { collection, query, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/lib/toast';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // ... other fields
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize batch operations
  const {
    selectedIds,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
    toggleSelectItem,
    clearSelection,
    performBatchAction,
    isProcessing,
  } = useBatchOperations({
    items: clients,
    getId: (client) => client.id,
    onBatchAction: async (selectedIds, action) => {
      switch (action) {
        case 'delete':
          await handleBatchDelete(selectedIds);
          break;
        case 'export':
          await handleBatchExport(selectedIds);
          break;
        case 'email':
          await handleBatchEmail(selectedIds);
          break;
        case 'tag':
          await handleBatchTag(selectedIds);
          break;
      }
    },
  });

  // Load clients
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      setClients(data);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Batch action handlers
  const handleBatchDelete = async (ids: string[]) => {
    try {
      const deletePromises = ids.map(id => 
        deleteDoc(doc(db, 'users', id))
      );
      await Promise.all(deletePromises);
      
      // Update local state
      setClients(prev => prev.filter(c => !ids.includes(c.id)));
      
      toast.success(`Deleted ${ids.length} client${ids.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error('Failed to delete clients');
    }
  };

  const handleBatchExport = async (ids: string[]) => {
    const selectedClients = clients.filter(c => ids.includes(c.id));
    
    // Create CSV
    const csv = [
      ['Name', 'Email', 'Phone'],
      ...selectedClients.map(c => [
        `${c.firstName} ${c.lastName}`,
        c.email,
        c.phoneNumber || '',
      ]),
    ].map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success(`Exported ${ids.length} client${ids.length > 1 ? 's' : ''}`);
  };

  const handleBatchEmail = async (ids: string[]) => {
    // Open email compose dialog with selected clients
    // Implementation depends on email system
    toast.success('Email compose opened');
  };

  const handleBatchTag = async (ids: string[]) => {
    // Open tag selection dialog
    // Implementation depends on tag system
    toast.success('Tag dialog opened');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        {selectedIds.size > 0 && (
          <SelectAllCheckbox
            isAllSelected={isAllSelected}
            isSomeSelected={isSomeSelected}
            onToggle={toggleSelectAll}
            label={`Select all ${clients.length}`}
          />
        )}
      </div>

      {/* Clients table */}
      <div className="bg-white border rounded-lg">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left w-12">
                <SelectAllCheckbox
                  isAllSelected={isAllSelected}
                  isSomeSelected={isSomeSelected}
                  onToggle={toggleSelectAll}
                  label="Select all"
                />
              </th>
              <th className="p-4 text-left font-semibold">Name</th>
              <th className="p-4 text-left font-semibold">Email</th>
              <th className="p-4 text-left font-semibold">Phone</th>
              <th className="p-4 text-left font-semibold">Passes</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr 
                key={client.id}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="p-4">
                  <SelectItemCheckbox
                    id={client.id}
                    isSelected={selectedIds.has(client.id)}
                    onToggle={() => toggleSelectItem(client.id)}
                    label={`Select ${client.firstName} ${client.lastName}`}
                  />
                </td>
                <td className="p-4">
                  <p className="font-medium">
                    {client.firstName} {client.lastName}
                  </p>
                </td>
                <td className="p-4 text-gray-600">{client.email}</td>
                <td className="p-4 text-gray-600">{client.phoneNumber || '-'}</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                    {client.passCount || 0} passes
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Batch actions toolbar */}
      <BatchActionsToolbar
        selectedCount={selectedIds.size}
        onAction={performBatchAction}
        onClearSelection={clearSelection}
        actions={batchActionPresets.clients}
        isProcessing={isProcessing}
      />
    </div>
  );
}
```

## Custom Actions

Define custom actions for specific needs:

```typescript
const customActions = [
  {
    id: 'activate',
    label: 'Activate',
    icon: CheckCircle,
    variant: 'default' as const,
  },
  {
    id: 'deactivate',
    label: 'Deactivate',
    icon: XCircle,
    variant: 'outline' as const,
    requiresConfirmation: true,
    confirmationTitle: 'Deactivate items',
    confirmationDescription: 'Items will be hidden from active view.',
  },
  {
    id: 'merge',
    label: 'Merge',
    icon: Combine,
    variant: 'outline' as const,
    requiresConfirmation: true,
    confirmationTitle: 'Merge items',
    confirmationDescription: 'This will combine the selected items into one.',
  },
];

<BatchActionsToolbar
  selectedCount={selectedIds.size}
  onAction={performBatchAction}
  onClearSelection={clearSelection}
  actions={customActions}
/>
```

## Action Presets

Pre-built action sets for common use cases:

```typescript
import { batchActionPresets } from '@/components/ui/batch-actions';

// For clients
<BatchActionsToolbar actions={batchActionPresets.clients} />
// Actions: Delete, Export, Send Email, Add Tag

// For passes
<BatchActionsToolbar actions={batchActionPresets.passes} />
// Actions: Delete, Export, Duplicate

// For trainers
<BatchActionsToolbar actions={batchActionPresets.trainers} />
// Actions: Archive, Export, Send Email
```

## Integration with Optimistic UI

Combine batch operations with optimistic updates:

```typescript
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { useOptimisticList } from '@/hooks/useOptimistic';

const { optimisticDelete } = useOptimisticList(clients, setClients);

const { performBatchAction } = useBatchOperations({
  items: clients,
  getId: (c) => c.id,
  onBatchAction: async (ids, action) => {
    if (action === 'delete') {
      // Optimistic delete
      ids.forEach(id => optimisticDelete(id));
      
      // Actual delete
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'users', id))));
    }
  },
});
```

## Card/Grid Layout Example

Batch operations work with card layouts too:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {clients.map((client) => (
    <div
      key={client.id}
      className="relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      {/* Checkbox in top-right corner */}
      <div className="absolute top-3 right-3">
        <SelectItemCheckbox
          id={client.id}
          isSelected={selectedIds.has(client.id)}
          onToggle={() => toggleSelectItem(client.id)}
        />
      </div>

      {/* Card content */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          {client.firstName} {client.lastName}
        </h3>
        <p className="text-sm text-gray-600">{client.email}</p>
      </div>
    </div>
  ))}
</div>
```

## Best Practices

### 1. Clear Selection After Actions

```typescript
onBatchAction: async (ids, action) => {
  await performAction(ids, action);
  // Selection cleared automatically by useBatchOperations
}
```

### 2. Show Progress for Long Operations

```typescript
const handleBatchDelete = async (ids: string[]) => {
  let completed = 0;
  
  for (const id of ids) {
    await deleteDoc(doc(db, 'users', id));
    completed++;
    toast.loading(`Deleting ${completed}/${ids.length}...`);
  }
  
  toast.success(`Deleted ${ids.length} items`);
};
```

### 3. Validate Before Actions

```typescript
onBatchAction: async (ids, action) => {
  if (action === 'delete') {
    // Check if items can be deleted
    const hasBookings = await checkForBookings(ids);
    if (hasBookings) {
      toast.error('Cannot delete clients with active bookings');
      return;
    }
  }
  
  await performAction(ids, action);
}
```

### 4. Provide Undo Functionality

```typescript
const [deletedClients, setDeletedClients] = useState<Client[]>([]);

const handleBatchDelete = async (ids: string[]) => {
  const deleted = clients.filter(c => ids.includes(c.id));
  setDeletedClients(deleted);
  
  setClients(prev => prev.filter(c => !ids.includes(c.id)));
  
  toast.success(
    `Deleted ${ids.length} clients`,
    {
      action: {
        label: 'Undo',
        onClick: () => handleUndo(deleted),
      },
      duration: 10000,
    }
  );
  
  // Delay actual deletion
  setTimeout(() => {
    ids.forEach(id => deleteDoc(doc(db, 'users', id)));
  }, 10000);
};

const handleUndo = (deleted: Client[]) => {
  setClients(prev => [...prev, ...deleted]);
  setDeletedClients([]);
  toast.success('Deletion cancelled');
};
```

### 5. Keyboard Shortcuts

```typescript
import { useEffect } from 'react';

useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl+A to select all
    if (e.ctrlKey && e.key === 'a' && !e.shiftKey) {
      e.preventDefault();
      toggleSelectAll();
    }
    
    // Escape to clear selection
    if (e.key === 'Escape') {
      clearSelection();
    }
    
    // Delete key for batch delete
    if (e.key === 'Delete' && selectedIds.size > 0) {
      performBatchAction('delete');
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [toggleSelectAll, clearSelection, selectedIds, performBatchAction]);
```

## Accessibility

### ARIA Attributes

```typescript
<BatchActionsToolbar
  role="toolbar"
  aria-label="Bulk actions toolbar"
  aria-describedby="selection-count"
/>

<SelectAllCheckbox
  aria-label="Select all items in list"
/>

<SelectItemCheckbox
  aria-label={`Select ${item.name}`}
/>
```

### Screen Reader Announcements

```typescript
// Announce selection changes
useEffect(() => {
  const announcement = `${selectedIds.size} items selected`;
  const liveRegion = document.getElementById('selection-announcer');
  if (liveRegion) {
    liveRegion.textContent = announcement;
  }
}, [selectedIds.size]);

// Live region in component
<div
  id="selection-announcer"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
/>
```

## Mobile Optimizations

### Touch-Friendly Checkboxes

```typescript
<SelectItemCheckbox
  className="min-h-[44px] min-w-[44px]" // iOS minimum touch target
/>
```

### Floating Toolbar Position

The toolbar automatically positions above the mobile bottom navigation:

```typescript
className="fixed bottom-20 md:bottom-4"
// 80px = height of mobile bottom nav + spacing
```

### Swipe Gestures (Optional)

```typescript
import { useSwipe } from '@/hooks/useSwipe';

const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
  onSwipeLeft: () => toggleSelectItem(item.id),
  onSwipeRight: () => toggleSelectItem(item.id),
});

<div
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
>
  {/* Item content */}
</div>
```

---

*This batch operations system provides efficient bulk management while maintaining accessibility and mobile usability.*
