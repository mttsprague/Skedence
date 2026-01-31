# Reference Code System

## Overview
This system adds human-readable reference codes to users, trainers, and organizations while keeping Firebase's secure UUIDs for internal use.

## Reference Code Formats

### Users (Clients)
- **Format**: `LASTNAME-F-###`
- **Example**: `SMITH-J-001`, `GARCIA-M-042`
- **Generated from**: Last name (up to 5 chars) + First initial + Sequential number

### Trainers
- **Format**: `TR-FIRSTNAME-###`
- **Example**: `TR-MIKE-001`, `TR-SARAH-012`
- **Generated from**: "TR" prefix + First name (up to 8 chars) + Sequential number

### Organizations
- **Format**: `ORG-NAME-###`
- **Example**: `ORG-POLYFACE-001`, `ORG-FITNESS-001`
- **Generated from**: "ORG" prefix + Organization name (up to 10 chars) + Sequential number

## Implementation

### 1. Data Model Updates
Added `referenceCode` field to:
- `UserProfile.swift` - Client users
- `Trainer.swift` - Trainer profiles
- `Client.swift` - Admin app client model

### 2. Code Generation
Created `ReferenceCodeGenerator.swift` with functions:
- `generateUserCode(firstName:lastName:)` - For clients
- `generateTrainerCode(firstName:lastName:)` - For trainers
- `generateOrganizationCode(name:)` - For organizations
- `generateSequentialCode(prefix:collection:)` - Generic sequential codes

### 3. Automatic Code Assignment
Reference codes are automatically generated when:
- New users sign up (AuthManager.swift)
- New owners are created (SuperAdminViewModel.swift)
- *Future*: When trainers are added to the system

### 4. UI Display
Reference codes are now displayed in:
- **SessionDetailView**: Shows below client name in header
- **ClientsView**: Shows as badge next to client name in list
- Falls back to email if no reference code exists (backward compatibility)

### 5. Migration Script
**Location**: `SkedenceAdmin/migrations/generate-reference-codes.js`

**Purpose**: Generates reference codes for existing users/trainers

**Usage**:
```bash
cd SkedenceAdmin/migrations
node generate-reference-codes.js
```

**Requirements**:
- Node.js installed
- Firebase Admin SDK
- Service account key file (`serviceAccountKey.json`)

**What it does**:
- Scans all users without `referenceCode`
- Generates unique codes based on names
- Updates Firestore documents
- Reports progress and any errors

## Benefits

### Security
✅ Keeps Firebase Auth UIDs secure (still used internally)  
✅ Reference codes are non-sensitive identifiers  
✅ No security vulnerabilities from exposing codes  

### Usability
✅ Easy to communicate: "Check client SMITH-J-001"  
✅ Memorable and meaningful  
✅ Quick visual identification  
✅ Professional appearance  

### Technical
✅ Backward compatible (works without codes)  
✅ Automatic collision prevention  
✅ Sequential numbering per base code  
✅ Efficient Firestore queries  

## Database Structure

### Before
```javascript
{
  "users": {
    "79y7kY4tRsNG0oTviaZ2IFGTwR63": {
      "firstName": "John",
      "lastName": "Smith",
      "emailAddress": "john@example.com"
      // ... other fields
    }
  }
}
```

### After
```javascript
{
  "users": {
    "79y7kY4tRsNG0oTviaZ2IFGTwR63": {  // UUID still used as document ID
      "referenceCode": "SMITH-J-001",    // Human-readable code added
      "firstName": "John",
      "lastName": "Smith",
      "emailAddress": "john@example.com"
      // ... other fields
    }
  }
}
```

## Future Enhancements

### Planned
- [ ] Add reference codes to trainer creation flow
- [ ] Search by reference code in admin UI
- [ ] Display codes in booking confirmations/emails
- [ ] Add to printed documents and reports
- [ ] Quick copy-to-clipboard for reference codes
- [ ] Reference code history/audit trail

### Possible
- [ ] Custom code formats per organization
- [ ] QR codes based on reference codes
- [ ] Reference code-based URL shortcuts
- [ ] Integration with payment systems (invoices)

## Troubleshooting

### No reference codes showing
1. Run the migration script for existing users
2. New users should get codes automatically
3. Check Firestore rules allow reading `referenceCode` field

### Duplicate codes
- Should never happen (sequential generation prevents this)
- If it does, check for concurrent writes during migration
- Re-run migration script to fix

### Missing codes for new users
- Check AuthManager.swift has ReferenceCodeGenerator import
- Verify Firestore write permissions
- Check console logs for generation errors

## Files Modified

### Swift Files
- `Skedence/Skedence/ReferenceCodeGenerator.swift` (new)
- `Skedence/Skedence/UserProfile.swift`
- `Skedence/Skedence/Trainer.swift`
- `Skedence/Skedence/AuthManager.swift`
- `SkedenceAdmin/SkedenceAdmin/Client.swift`
- `SkedenceAdmin/SkedenceAdmin/SessionDetailView.swift`
- `SkedenceAdmin/SkedenceAdmin/ClientsView.swift`
- `SkedenceAdmin/SkedenceAdmin/SuperAdminViewModel.swift`

### Migration Scripts
- `SkedenceAdmin/migrations/generate-reference-codes.js` (new)

## Notes

- **Do not change existing UUIDs**: They are Firebase Auth user IDs and cannot be modified
- **Reference codes are additive**: They supplement UUIDs, not replace them
- **Backward compatible**: All code works with or without reference codes
- **Safe to deploy**: No breaking changes to existing functionality
