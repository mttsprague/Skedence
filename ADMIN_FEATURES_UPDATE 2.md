# Admin Panel Features Update

## Overview
Enhanced the Skedence client app Admin Panel with pass removal functionality and a new Wallet tab for future payment processing.

## Features Implemented

### 1. Pass Removal Feature ✅
- **Location**: Admin Panel → Passes Tab
- **Functionality**: 
  - Added "Action" picker with "Add Passes" and "Remove Passes" options
  - Positioned between "Pass Type" and "Number of Passes" fields
  - Remove logic removes passes starting with closest-to-expiration packages first
  - Prevents removal of more passes than available
  - Updates or deletes packages as needed
  - Shows appropriate success/error messages

- **Code Changes**:
  - `AdminPanelView.swift`: Added `PassAction` enum and action picker UI
  - `AdminService.swift`: Added `removePassFromClient()` function with smart removal logic

### 2. Wallet Tab ✅
- **Location**: Admin Panel → Third tab alongside Passes and Classes
- **Current State**: Basic structure implemented with client selection
- **Placeholder Message**: "Payment processing will be available in the next update."

## Technical Details

### Pass Removal Logic
The `removePassFromClient()` function in `AdminService.swift`:
1. Validates admin permissions
2. Queries all lesson packages for the specified pass type
3. Sorts packages by expiration date (oldest first)
4. Removes lessons from packages sequentially:
   - If removal would make `totalLessons <= lessonsUsed`, deletes the entire package
   - Otherwise, reduces `totalLessons` by the amount removed
5. Returns error if client doesn't have enough available passes

### UI Components
- **AdminTab enum**: Added `wallet` case
- **PassAction enum**: Added `add` and `remove` cases
- **Segmented Picker**: Toggle between Add/Remove actions
- **Dynamic Button**: Shows "Add Pass" or "Remove Pass" based on action
- **Dynamic Description**: Updates based on selected action

## Future Enhancements (Wallet Tab)

### Planned Features
1. **Payment Form**:
   - Amount input field with currency formatting
   - Stripe payment sheet integration for secure card input
   - "Save card on file" checkbox
   - "Charge Card" button

2. **Saved Cards Display**:
   - List of client's saved payment methods
   - Show last 4 digits, brand, expiry date
   - Option to select saved card or enter new one
   - Delete saved cards functionality

3. **Backend Integration**:
   - Cloud Function: `createPaymentIntent` (amount-based)
   - Stripe customer creation/retrieval
   - Payment method attachment
   - Transaction record creation in Firestore

4. **Firestore Schema**:
   ```
   clients/{clientId}/paymentMethods/{pmId}
   - stripePaymentMethodId: string
   - last4: string
   - brand: string
   - expiryMonth: int
   - expiryYear: int
   - isDefault: bool
   
   transactions/{txnId}
   - clientId: string
   - amount: double
   - currency: string
   - status: string
   - paymentMethodId: string
   - createdAt: timestamp
   - organizationId: string
   ```

## Testing Checklist

### Pass Removal
- [ ] Can remove passes from client account
- [ ] Cannot remove more passes than available
- [ ] Error shown when insufficient passes
- [ ] Packages with closest expiration removed first
- [ ] Packages deleted when fully consumed
- [ ] Success message displays correct info
- [ ] Admin permissions enforced

### Wallet Tab
- [ ] Third tab appears in Admin Panel
- [ ] Client selection works
- [ ] Placeholder message displays

## Notes
- All code compiled without errors
- Maintains existing design system (AppTheme, spacing, etc.)
- Admin permissions checked on all operations
- Error handling implemented throughout
- Success/error alerts provide clear feedback

## Files Modified
1. `/Skedence/Skedence/AdminPanelView.swift` - UI updates for both features
2. `/Skedence/Skedence/AdminService.swift` - Backend logic for pass removal

---
**Status**: Phase 1 Complete ✅  
**Next Phase**: Stripe payment integration for Wallet tab
**Updated**: January 2026
