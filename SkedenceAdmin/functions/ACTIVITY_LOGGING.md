# Centralized Activity Logging System

## Overview
This system provides a centralized way to log activities across all cloud functions, ensuring consistent schema and making it easy to add activity logging to any function.

## Files
- `utils/activityTypes.ts` - All activity type constants and TypeScript interfaces
- `utils/activityLogger.ts` - Core logging utilities and function wrapper

## Activity Types
All activity types are defined in `ActivityTypes` constant:
```typescript
ActivityTypes.LESSON_BOOKED
ActivityTypes.LESSON_CANCELLED
ActivityTypes.CLASS_REGISTERED
ActivityTypes.CLASS_CANCELLED
ActivityTypes.CLASS_ENROLLMENT
ActivityTypes.TRAINER_CREATED
ActivityTypes.CLIENT_REGISTERED
// ... and more
```

## Usage

### Method 1: Direct Activity Logging
For functions with transactions or special requirements:

```typescript
import {ActivityTypes} from "./utils/activityTypes";
import {logActivity} from "./utils/activityLogger";

// Inside your function
await logActivity({
  type: ActivityTypes.LESSON_BOOKED,
  actorId: userId,
  actorName: "John Doe",
  actorRole: "client",
  targetId: trainerId,
  targetName: "Jane Trainer",
  targetType: "trainer",
  description: "John Doe booked a lesson with Jane Trainer",
  metadata: {
    bookingId: "abc123",
    startTime: timestamp,
  },
  orgId: "org123",
});
```

### Method 2: Callable Function Wrapper
For new callable functions, use the wrapper for automatic activity logging:

```typescript
import {callableWithActivity} from "./utils/activityLogger";
import {ActivityTypes} from "./utils/activityTypes";
import {getUserDisplayName, getTrainerDisplayName} from "./utils/activityLogger";

interface MyFunctionData {
  someId: string;
}

export const myFunction = callableWithActivity<MyFunctionData>(
  // Main handler
  async (request) => {
    const userId = request.auth!.uid;
    const {someId} = request.data;
    
    // Your function logic here
    // ...
    
    return {message: "Success!"};
  },
  // Activity configuration
  {
    getActivity: async (request, result) => {
      const userId = request.auth!.uid;
      const userName = await getUserDisplayName(userId);
      
      return {
        type: ActivityTypes.SOME_ACTION,
        actorId: userId,
        actorName: userName,
        actorRole: "client",
        targetId: request.data.someId,
        targetName: "Something",
        targetType: "some_type",
        description: `${userName} performed some action`,
        metadata: {
          someId: request.data.someId,
        },
        orgId: request.data.orgId,
      };
    },
    logOnError: false, // Set to true if you want to log failed attempts
  }
);
```

### Helper Functions

#### getUserDisplayName
Fetches a user's display name from Firestore:
```typescript
const clientName = await getUserDisplayName(userId); // from users collection
const trainerName = await getTrainerDisplayName(trainerId); // from trainers collection
```

## Activity Schema
All activities must include:
- `type` - Activity type from ActivityTypes constant
- `actorId` - User ID performing the action
- `actorName` - Display name of actor
- `actorRole` - Role: "client" | "trainer" | "admin" | "system"
- `description` - Human-readable description
- `timestamp` - Auto-added by system

Optional fields:
- `targetId` - ID of the target resource
- `targetName` - Display name of target
- `targetType` - Type: "trainer" | "client" | "booking" | "class" | etc.
- `metadata` - Any additional structured data
- `orgId` - Organization ID for filtering

## Benefits
- ✅ **Consistency** - All activities use the same schema
- ✅ **Type Safety** - TypeScript ensures correct activity types
- ✅ **Less Code** - Wrapper handles common patterns
- ✅ **Easy to Extend** - Add new activity types in one place
- ✅ **Error Handling** - Activity logging never breaks main functionality
- ✅ **Centralized** - Easy to add features like batching, retries, analytics

## Migration Strategy
1. ✅ Created centralized system (activityTypes.ts, activityLogger.ts)
2. ✅ Updated existing functions to use ActivityTypes constants
3. ⏳ Future: Gradually refactor functions to use callableWithActivity wrapper
4. ⏳ Future: Add advanced features (batching, analytics, search)

## Examples in Codebase
- `cancelLesson` - Uses ActivityTypes.LESSON_CANCELLED
- `bookLesson` - Uses ActivityTypes.LESSON_BOOKED
- `registerForClass` - Uses ActivityTypes.CLASS_REGISTERED
- `cancelClass` - Uses ActivityTypes.CLASS_CANCELLED
