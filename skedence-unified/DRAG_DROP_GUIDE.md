# Drag & Drop System - Usage Guide

This document explains how to use the drag and drop system in the Skedence admin portal.

## Overview

The drag and drop system provides intuitive visual feedback for moving items between locations, reordering lists, and rescheduling appointments.

## Core Hooks

### 1. `useDragAndDrop` - Flexible Drag & Drop

For dragging items between different zones (e.g., moving appointments between time slots):

```typescript
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableCard, DropZone } from '@/components/ui/drag-drop-feedback';

function ScheduleGrid() {
  const { getDraggableProps, getDropZoneProps, isDragging } = useDragAndDrop({
    onDrop: async (item, target) => {
      // Handle the drop
      await updateDoc(doc(db, 'bookings', item.id), {
        startTime: target.data.startTime,
        endTime: target.data.endTime,
      });
      toast.success('Appointment rescheduled');
    },
    canDrop: (item, target) => {
      // Check if drop is allowed
      return !target.data.isBooked;
    },
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {timeSlots.map((slot) => (
        <DropZone
          key={slot.id}
          {...getDropZoneProps({
            id: slot.id,
            accepts: ['booking'],
            data: slot,
          })}
          canDrop={!slot.isBooked}
        >
          {bookings
            .filter((b) => b.startTime === slot.startTime)
            .map((booking) => (
              <DraggableCard
                key={booking.id}
                {...getDraggableProps({
                  id: booking.id,
                  type: 'booking',
                  data: booking,
                })}
              >
                <BookingCard booking={booking} />
              </DraggableCard>
            ))}
        </DropZone>
      ))}
    </div>
  );
}
```

### 2. `useSortable` - Reorderable Lists

For simple list reordering:

```typescript
import { useSortable } from '@/hooks/useDragAndDrop';
import { SortableListItem, DragHandle } from '@/components/ui/drag-drop-feedback';

function TrainersList({ trainers, onReorder }) {
  const { getSortableProps, draggedIndex } = useSortable(trainers, onReorder);

  return (
    <div className="space-y-2">
      {trainers.map((trainer, index) => (
        <SortableListItem
          key={trainer.id}
          {...getSortableProps(index)}
          isDragging={draggedIndex === index}
        >
          <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
            <DragHandle />
            <div>
              <p className="font-medium">{trainer.name}</p>
              <p className="text-sm text-gray-500">{trainer.email}</p>
            </div>
          </div>
        </SortableListItem>
      ))}
    </div>
  );
}
```

## Visual Components

### DraggableCard

Card with drag handle and visual feedback:

```typescript
import { DraggableCard } from '@/components/ui/drag-drop-feedback';

<DraggableCard
  isDragging={isDragging}
  isDropTarget={isDropTarget}
  canDrop={canDrop}
  showHandle={true}
>
  <YourContent />
</DraggableCard>
```

**Props:**
- `isDragging` - Whether this card is currently being dragged
- `isDropTarget` - Whether this card is the current drop target
- `canDrop` - Whether drop is allowed (affects ring color)
- `showHandle` - Show grip icon on left side
- `className` - Additional CSS classes

**Visual States:**
- Normal: White background, hover shadow
- Dragging: 50% opacity, scaled down, grabbing cursor
- Drop target (valid): Blue ring
- Drop target (invalid): Red ring

### DropZone

Area that accepts dropped items:

```typescript
import { DropZone } from '@/components/ui/drag-drop-feedback';

<DropZone
  isActive={isActive}
  canDrop={canDrop}
  emptyText="Drop appointment here"
>
  <YourContent />
</DropZone>
```

**Props:**
- `isActive` - Whether user is currently hovering over this zone
- `canDrop` - Whether drop is allowed
- `emptyText` - Text shown when hovering
- `className` - Additional CSS classes

**Visual States:**
- Inactive: Dashed gray border
- Active (valid): Blue border, blue background
- Active (invalid): Red border, red background

### DragHandle

Standalone grip icon for custom layouts:

```typescript
import { DragHandle } from '@/components/ui/drag-drop-feedback';

<DragHandle className="mr-2" />
```

### SortableListItem

Wrapper for sortable list items:

```typescript
import { SortableListItem } from '@/components/ui/drag-drop-feedback';

<SortableListItem
  isDragging={draggedIndex === index}
  isDropTarget={dropIndex === index}
>
  <YourContent />
</SortableListItem>
```

## Complete Examples

### Example 1: Calendar Appointment Rescheduling

```typescript
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableCard, DropZone } from '@/components/ui/drag-drop-feedback';
import { updateDoc, doc } from 'firebase/firestore';
import { toast } from '@/lib/toast';

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  trainerId: string;
}

interface Appointment {
  id: string;
  clientName: string;
  startTime: Date;
  endTime: Date;
  trainerId: string;
}

function WeeklySchedule({ timeSlots, appointments }) {
  const { getDraggableProps, getDropZoneProps, isDragging } = useDragAndDrop({
    onDrop: async (item, target) => {
      const appointment = item.data as Appointment;
      const newSlot = target.data as TimeSlot;
      
      // Update appointment time in Firestore
      await updateDoc(doc(db, 'bookings', appointment.id), {
        startTime: Timestamp.fromDate(newSlot.startTime),
        endTime: Timestamp.fromDate(newSlot.endTime),
      });
      
      toast.success(`Rescheduled appointment to ${formatTime(newSlot.startTime)}`);
    },
    
    canDrop: (item, target) => {
      const appointment = item.data as Appointment;
      const slot = target.data as TimeSlot;
      
      // Can only drop on same trainer's slots
      if (appointment.trainerId !== slot.trainerId) {
        return false;
      }
      
      // Can't drop on already booked slots
      if (slot.isBooked) {
        return false;
      }
      
      return true;
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Weekly Schedule</h2>
      <div className="grid grid-cols-7 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
          <div key={day} className="space-y-2">
            <h3 className="text-center font-semibold text-sm">{day}</h3>
            {timeSlots
              .filter((slot) => getDay(slot.startTime) === dayIndex)
              .map((slot) => {
                const slotAppointments = appointments.filter(
                  (apt) => isSameTime(apt.startTime, slot.startTime)
                );
                
                return (
                  <DropZone
                    key={slot.id}
                    {...getDropZoneProps({
                      id: slot.id,
                      accepts: ['appointment'],
                      data: slot,
                    })}
                    canDrop={!slot.isBooked}
                    emptyText={formatTime(slot.startTime)}
                  >
                    {slotAppointments.map((apt) => (
                      <DraggableCard
                        key={apt.id}
                        {...getDraggableProps({
                          id: apt.id,
                          type: 'appointment',
                          data: apt,
                        })}
                        showHandle={false}
                      >
                        <div className="p-2">
                          <p className="font-medium text-sm">{apt.clientName}</p>
                          <p className="text-xs text-gray-500">
                            {formatTime(apt.startTime)}
                          </p>
                        </div>
                      </DraggableCard>
                    ))}
                  </DropZone>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 2: Trainer Priority Order

```typescript
import { useSortable } from '@/hooks/useDragAndDrop';
import { SortableListItem, DragHandle } from '@/components/ui/drag-drop-feedback';

function TrainerPriorityList({ trainers, orgId }) {
  const { getSortableProps, draggedIndex } = useSortable(trainers, async (reorderedTrainers) => {
    // Update order in Firestore
    const updates = reorderedTrainers.map((trainer, index) => 
      updateDoc(doc(db, 'trainers', trainer.id), { displayOrder: index })
    );
    
    await Promise.all(updates);
    toast.success('Trainer order updated');
  });

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Trainer Display Order</h3>
      <p className="text-sm text-gray-600">Drag to reorder how trainers appear in the app</p>
      
      {trainers.map((trainer, index) => (
        <SortableListItem
          key={trainer.id}
          {...getSortableProps(index)}
          isDragging={draggedIndex === index}
          className="bg-white border rounded-lg"
        >
          <div className="flex items-center gap-3 p-4">
            <DragHandle />
            <div className="flex-1">
              <p className="font-medium">{trainer.firstName} {trainer.lastName}</p>
              <p className="text-sm text-gray-500">{trainer.email}</p>
            </div>
            <span className="text-sm text-gray-400">#{index + 1}</span>
          </div>
        </SortableListItem>
      ))}
    </div>
  );
}
```

### Example 3: Client Assignment Between Trainers

```typescript
function ClientAssignment({ clients, trainers }) {
  const { getDraggableProps, getDropZoneProps } = useDragAndDrop({
    onDrop: async (item, target) => {
      const client = item.data;
      const newTrainer = target.data;
      
      // Assign client to new trainer
      await updateDoc(doc(db, 'users', client.id), {
        assignedTrainerId: newTrainer.id,
      });
      
      toast.success(`${client.name} assigned to ${newTrainer.name}`);
    },
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Unassigned clients */}
      <div className="space-y-2">
        <h3 className="font-semibold">Unassigned Clients</h3>
        {clients
          .filter((c) => !c.assignedTrainerId)
          .map((client) => (
            <DraggableCard
              key={client.id}
              {...getDraggableProps({
                id: client.id,
                type: 'client',
                data: client,
              })}
            >
              <div className="p-3">
                <p>{client.name}</p>
              </div>
            </DraggableCard>
          ))}
      </div>

      {/* Trainer columns */}
      {trainers.map((trainer) => (
        <DropZone
          key={trainer.id}
          {...getDropZoneProps({
            id: trainer.id,
            accepts: ['client'],
            data: trainer,
          })}
          className="min-h-[200px]"
          emptyText={`Assign to ${trainer.name}`}
        >
          <h3 className="font-semibold p-2">{trainer.name}</h3>
          {clients
            .filter((c) => c.assignedTrainerId === trainer.id)
            .map((client) => (
              <DraggableCard
                key={client.id}
                {...getDraggableProps({
                  id: client.id,
                  type: 'client',
                  data: client,
                })}
              >
                <div className="p-3">
                  <p>{client.name}</p>
                </div>
              </DraggableCard>
            ))}
        </DropZone>
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Validate Drops

Always check if a drop is valid before performing the action:

```typescript
canDrop: (item, target) => {
  // Check business rules
  if (item.data.trainerId !== target.data.trainerId) {
    return false; // Can't move between trainers
  }
  
  if (target.data.isBooked) {
    return false; // Slot already taken
  }
  
  return true;
}
```

### 2. Provide Visual Feedback

Use the visual components to show drag state:

```typescript
<DraggableCard
  isDragging={draggedItem?.id === item.id}
  isDropTarget={dropTarget === zone.id}
  canDrop={canDrop}
>
```

### 3. Handle Errors Gracefully

Wrap drop handlers in try/catch:

```typescript
onDrop: async (item, target) => {
  try {
    await updateDoc(...);
    toast.success('Updated');
  } catch (error) {
    toast.error('Failed to update');
    console.error(error);
  }
}
```

### 4. Show Loading States

Disable dragging during updates:

```typescript
const [isUpdating, setIsUpdating] = useState(false);

<DraggableCard
  {...getDraggableProps(item)}
  className={isUpdating ? 'pointer-events-none opacity-50' : ''}
>
```

### 5. Keyboard Alternative

Always provide keyboard alternatives for accessibility:

```typescript
<Button
  onClick={() => moveToNextSlot(appointment)}
  className="sr-only"
>
  Reschedule appointment
</Button>
```

## Accessibility

### ARIA Attributes

```typescript
<div
  {...getDraggableProps(item)}
  role="button"
  aria-label={`Drag ${item.data.clientName} appointment`}
  tabIndex={0}
>
```

### Keyboard Support

The drag and drop system supports native HTML5 drag and drop, which includes:
- Tab navigation to draggable items
- Space/Enter to initiate drag (browser-dependent)
- Arrow keys to move (with additional implementation)

### Screen Reader Announcements

```typescript
onDrop: async (item, target) => {
  await updateDoc(...);
  
  // Announce to screen readers
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = `Appointment moved to ${formatTime(target.data.startTime)}`;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}
```

## Performance

### Optimize Large Lists

For lists with 100+ items, use virtualization:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// Only render visible items
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
});
```

### Debounce Drop Actions

For frequent drops (e.g., scrubbing through time slots):

```typescript
import { debounce } from 'lodash';

const debouncedDrop = debounce(async (item, target) => {
  await updateDoc(...);
}, 300);
```

## Integration with Other Phase 3 Features

### With Optimistic UI

```typescript
const { mutate, isPending } = useOptimistic(appointment, {
  onMutate: async (newData) => {
    await updateDoc(doc(db, 'bookings', newData.id), newData);
  },
});

onDrop: async (item, target) => {
  mutate({
    ...item.data,
    startTime: target.data.startTime,
    endTime: target.data.endTime,
  });
}
```

### With Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleMoveAppointment = () => {
    if (selectedAppointment) {
      // Trigger move dialog
    }
  };
  
  window.addEventListener('trigger-move-appointment', handleMoveAppointment);
  return () => window.removeEventListener('trigger-move-appointment', handleMoveAppointment);
}, [selectedAppointment]);
```

---

*This drag and drop system provides intuitive visual feedback while maintaining accessibility and performance.*
