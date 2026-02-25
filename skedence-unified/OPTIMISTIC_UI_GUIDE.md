# Optimistic UI Updates - Usage Guide

This document explains how to use the optimistic UI system in the Skedence admin portal.

## Overview

Optimistic UI updates provide immediate visual feedback to users before server confirmation, creating a more responsive experience. If the server operation fails, the UI automatically rolls back to the previous state.

## Core Hooks

### 1. `useOptimistic` - Single Value Updates

For simple data mutations with immediate feedback:

```typescript
import { useOptimistic } from '@/hooks/useOptimistic';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/lib/toast';

function ClientActivationToggle({ client }) {
  const { data, mutate, isPending, isError } = useOptimistic(
    client.isActive,
    {
      onMutate: async (newValue) => {
        // Perform the actual server update
        await updateDoc(doc(db, 'users', client.id), {
          isActive: newValue
        });
      },
      onSuccess: () => {
        toast.success(`Client ${client.isActive ? 'activated' : 'deactivated'}`);
      },
      onError: (error) => {
        toast.error(`Failed to update: ${error.message}`);
      }
    }
  );

  return (
    <button
      onClick={() => mutate(!data)}
      disabled={isPending}
      className={cn(
        'px-4 py-2 rounded-lg transition-colors',
        data ? 'bg-green-500' : 'bg-gray-400',
        isPending && 'opacity-50 cursor-not-allowed'
      )}
    >
      {isPending ? 'Updating...' : data ? 'Active' : 'Inactive'}
    </button>
  );
}
```

### 2. `useOptimisticList` - List Operations

For adding, removing, or updating items in a list:

```typescript
import { useOptimisticList } from '@/hooks/useOptimistic';

function ClientsList({ initialClients }) {
  const {
    list: clients,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    confirmOptimistic,
    isOptimistic
  } = useOptimisticList(initialClients);

  const handleAddClient = async (newClient) => {
    const tempId = `temp-${Date.now()}`;
    const clientWithId = { ...newClient, id: tempId };

    // Immediately add to UI
    addOptimistic(clientWithId);

    try {
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'users'), newClient);
      
      // Replace temp ID with real ID
      updateOptimistic(tempId, { id: docRef.id });
      confirmOptimistic(docRef.id);
      
      toast.success('Client added successfully');
    } catch (error) {
      // Rollback on error
      removeOptimistic(tempId);
      toast.error('Failed to add client');
    }
  };

  const handleRemoveClient = async (clientId) => {
    // Immediately remove from UI
    removeOptimistic(clientId);

    try {
      await deleteDoc(doc(db, 'users', clientId));
      toast.success('Client removed');
    } catch (error) {
      // Would need to restore - in practice, reload the list
      toast.error('Failed to remove client');
    }
  };

  return (
    <div className="space-y-2">
      {clients.map((client) => (
        <OptimisticListItem
          key={client.id}
          isOptimistic={isOptimistic(client.id)}
        >
          <ClientCard client={client} onRemove={handleRemoveClient} />
        </OptimisticListItem>
      ))}
    </div>
  );
}
```

### 3. `useOptimisticToggle` - Boolean States

For simple on/off toggles:

```typescript
import { useOptimisticToggle } from '@/hooks/useOptimistic';

function NotificationToggle({ userId }) {
  const { value, toggle, isPending } = useOptimisticToggle(
    true, // initial value
    async (newValue) => {
      await updateDoc(doc(db, 'users', userId), {
        notificationsEnabled: newValue
      });
    }
  );

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        value ? 'bg-blue-600' : 'bg-gray-200',
        isPending && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          value ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
```

## Visual Components

### OptimisticIndicator

Shows pending/success/error state:

```typescript
import { OptimisticIndicator } from '@/components/ui/optimistic-feedback';

<OptimisticIndicator status={status} />
```

### OptimisticOverlay

Dims content during updates:

```typescript
import { OptimisticOverlay } from '@/components/ui/optimistic-feedback';

<OptimisticOverlay isPending={isPending}>
  <YourContent />
</OptimisticOverlay>
```

### OptimisticBadge

Shows "Pending" badge on unconfirmed items:

```typescript
import { OptimisticBadge } from '@/components/ui/optimistic-feedback';

<OptimisticBadge isOptimistic={isOptimistic(item.id)} />
```

### OptimisticListItem

Wrapper for list items with visual feedback:

```typescript
import { OptimisticListItem } from '@/components/ui/optimistic-feedback';

<OptimisticListItem
  isOptimistic={isOptimistic(item.id)}
  isPending={status === 'pending'}
  isError={status === 'error'}
>
  <YourItemContent />
</OptimisticListItem>
```

## Best Practices

### 1. Use Temporary IDs for New Items

```typescript
const tempId = `temp-${Date.now()}-${Math.random()}`;
```

### 2. Always Handle Errors

```typescript
try {
  await serverOperation();
} catch (error) {
  rollbackOptimistic(id);
  toast.error('Operation failed');
}
```

### 3. Provide Visual Feedback

```typescript
// Show pending state
if (isPending) {
  return <Spinner />;
}

// Show success briefly
if (isSuccess) {
  setTimeout(() => reset(), 2000);
}
```

### 4. Disable Interactions During Updates

```typescript
<button
  disabled={isPending}
  onClick={handleClick}
>
  {isPending ? 'Saving...' : 'Save'}
</button>
```

## Complete Example: Client Card with Optimistic Updates

```typescript
import { useState } from 'react';
import { useOptimistic } from '@/hooks/useOptimistic';
import { OptimisticOverlay, OptimisticIndicator } from '@/components/ui/optimistic-feedback';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ClientCardProps {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
}

function ClientCard({ client }: ClientCardProps) {
  const [notes, setNotes] = useState(client.notes || '');
  
  const activeToggle = useOptimisticToggle(
    client.isActive,
    async (newValue) => {
      await updateDoc(doc(db, 'users', client.id), {
        isActive: newValue
      });
    }
  );

  const notesUpdate = useOptimistic(notes, {
    onMutate: async (newNotes) => {
      await updateDoc(doc(db, 'users', client.id), {
        notes: newNotes
      });
    },
    onSuccess: () => {
      toast.success('Notes saved');
    },
    onError: () => {
      toast.error('Failed to save notes');
    }
  });

  const handleSaveNotes = () => {
    notesUpdate.mutate(notes);
  };

  return (
    <OptimisticOverlay isPending={activeToggle.isPending}>
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {client.firstName} {client.lastName}
            </h3>
            <p className="text-sm text-gray-600">{client.email}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={activeToggle.toggle}
              disabled={activeToggle.isPending}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                activeToggle.value 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              )}
            >
              {activeToggle.value ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            disabled={notesUpdate.isPending}
          />
          <div className="flex items-center justify-between">
            <OptimisticIndicator status={notesUpdate.status} />
            <button
              onClick={handleSaveNotes}
              disabled={notesUpdate.isPending || notes === client.notes}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {notesUpdate.isPending ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </OptimisticOverlay>
  );
}
```

## Keyboard Shortcut Integration

Optimistic updates work seamlessly with keyboard shortcuts:

```typescript
useEffect(() => {
  const handleSaveShortcut = () => {
    if (!notesUpdate.isPending) {
      notesUpdate.mutate(notes);
    }
  };

  window.addEventListener('trigger-save', handleSaveShortcut);
  return () => window.removeEventListener('trigger-save', handleSaveShortcut);
}, [notes, notesUpdate]);
```

## Accessibility

All optimistic UI components include proper ARIA attributes:

- Loading spinners: `aria-label="Updating..."`
- Status indicators: `role="status"` and `aria-live="polite"`
- Disabled buttons: `disabled` attribute and `aria-disabled="true"`

## Performance Considerations

1. **Debounce rapid updates**: Use debouncing for text inputs
2. **Batch operations**: Group multiple updates when possible
3. **Limit pending items**: Show warnings if too many pending items
4. **Clean up on unmount**: Always cleanup listeners and timers

---

*This system provides immediate feedback while maintaining data integrity through automatic rollbacks on failure.*
