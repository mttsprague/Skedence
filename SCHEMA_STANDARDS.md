# Skedence Schema Standards

## Overview
This document defines the standard schema patterns used consistently across the Skedence/CoachFlow platform.

---

## User Organization Field

### Standard: `orgId`
**Primary field:** `orgId` (string)  
**Legacy field:** `organizationId` (string) - kept for backwards compatibility

### Usage Pattern
```typescript
// Cloud Functions - Always check both fields
let orgId = userData.orgId as string | undefined;
if (!orgId) {
  orgId = userData.organizationId as string | undefined;
}
```

```swift
// Swift/iOS - Use orgId field
let orgId = data["orgId"] as? String
```

### Files Updated
- ✅ `SkedenceAdmin/functions/src/index.ts` - bookLesson, registerForClass, manualRegisterForClass
- ✅ `SkedenceAdmin/SkedenceAdmin/AdminService.swift` - All functions use orgId
- ✅ `Skedence/Skedence/UsersService.swift` - Expects orgId in user documents

---

## Package/Pass Storage Paths

### Standard: Organizations Path (Primary)
**Primary path:** `organizations/{orgId}/users/{userId}/packages/{packageId}`  
**Legacy path:** `users/{userId}/lessonPackages/{packageId}` - kept for backwards compatibility

### Usage Pattern

#### Reading Packages
```typescript
// Cloud Functions - Try new path first, fallback to old
let packageDoc;
if (orgId) {
  const newPathRef = db.collection("organizations")
    .doc(orgId)
    .collection("users")
    .doc(userId)
    .collection("packages")
    .doc(packageId);
  packageDoc = await transaction.get(newPathRef);
}

if (!packageDoc || !packageDoc.exists) {
  const oldPathRef = db.collection("users")
    .doc(userId)
    .collection("lessonPackages")
    .doc(packageId);
  packageDoc = await transaction.get(oldPathRef);
}
```

```swift
// Swift/iOS - PackagesService uses new path first
if let orgId = orgId {
    let newPath = db.collection("organizations")
        .document(orgId)
        .collection("users")
        .document(uid)
        .collection("packages")
    let snapshot = try await newPath.getDocuments()
    // ... process packages
}
```

#### Writing Packages (Admin Functions)
```swift
// AdminService - Write to BOTH paths for compatibility
// 1. Old path (backward compatibility)
try await db.collection("users")
    .document(clientId)
    .collection("lessonPackages")
    .addDocument(data: passData)

// 2. New path (primary location)
try await db.collection("organizations")
    .document(orgId)
    .collection("users")
    .document(clientId)
    .collection("packages")
    .addDocument(data: passData)
```

### Files Using Standard Paths
- ✅ `SkedenceAdmin/functions/src/index.ts` - bookLesson, registerForClass, manualRegisterForClass
- ✅ `SkedenceAdmin/SkedenceAdmin/AdminService.swift` - addPassToClient writes to both paths
- ✅ `SkedenceAdmin/SkedenceAdmin/FirestoreService.swift` - fetchClientPackages uses new path first
- ✅ `Skedence/Skedence/PackagesService.swift` - loadMyPackages uses new path first

---

## Package Schema

### Standard Fields
```typescript
{
  packageType: string,        // e.g., "private", "2_athlete", "class_10_pack"
  packageCategory: string,    // "pass" or "class"
  packageName?: string,       // Optional display title
  totalLessons: number,       
  lessonsUsed: number,
  purchaseDate: Timestamp,
  expirationDate: Timestamp,
  transactionId: string,
  orgId: string              // Required for multi-tenant isolation
}
```

### Usage
- **packageType**: Unique identifier for package (e.g., "private", "2_athlete")
- **packageCategory**: Determines usage context ("pass" for lessons, "class" for group classes)
- **packageName**: Display-friendly title (fallback to packageType if not present)

---

## Booking/Registration Schema

### Standard Fields
```typescript
{
  orgId: string,              // Required for all bookings/registrations
  userId: string,             // Client user ID
  trainerId?: string,         // For 1-on-1 lessons
  classId?: string,           // For group classes
  startTime: Timestamp,
  endTime: Timestamp,
  status: string,             // "booked", "cancelled", "completed"
  packageId: string,          // Reference to package used
  createdAt: Timestamp
}
```

---

## Migration Status

### Completed ✅
1. **User orgId field**: All Cloud Functions check `orgId` first, then `organizationId`
2. **Package paths**: All services read from new path first, fallback to old path
3. **Admin writes**: AdminService writes packages to both locations
4. **Registration functions**: registerForClass and manualRegisterForClass use consistent orgId lookup

### Backwards Compatibility
- Old `organizationId` field still supported in user documents
- Old `users/{userId}/lessonPackages` path still supported for reading
- Admin functions write to both paths to support older client versions

---

## Best Practices

### For New Code
1. **Always use `orgId` field** when reading/writing user organization
2. **Read from new path first**, fallback to old path
3. **Admin functions should write to both paths** until all clients upgraded
4. **Include orgId in all documents** for proper multi-tenant isolation

### For Existing Code
1. Check both `orgId` and `organizationId` when reading user data
2. Support both package paths when querying
3. Don't break old paths until usage metrics show zero usage

---

## Testing Checklist

- [ ] User registration works for new users
- [ ] Existing users can book lessons
- [ ] Class registration works for all users
- [ ] Admin can assign passes to clients
- [ ] Packages visible in both admin and client apps
- [ ] Bookings work for users with old schema
- [ ] Bookings work for users with new schema

---

Last Updated: January 28, 2026
