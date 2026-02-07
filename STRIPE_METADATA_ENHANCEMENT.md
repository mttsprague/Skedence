# Stripe Metadata Enhancement - Acuity-Style Format

**Date:** February 6, 2026  
**Status:** Implemented  

## Overview

Enhanced Stripe payment metadata and descriptions to match the comprehensive format used by Acuity Scheduling. This provides better transaction visibility in Stripe dashboard and receipt emails.

## Screenshot Reference

From Acuity's Stripe receipt format:
- **Payment**: `$40.00 — 1631614433 - Leanora Brown - Private Session (1 Athlete) - February 8, 2026 9:00am`
- **Customer**: `Acuity: Leanora Brown (7907) — leanora@example.com`
- **Metadata**:
  - `source` — Acuity Scheduling
  - `user_id` — 29176678

## Implementation Changes

### Files Modified

1. **`SkedenceAdmin/functions/src/stripe-direct.ts`**
   - Enhanced `createAndConfirmPaymentDirect` function
   - Updated customer creation with enhanced metadata
   - Added rich payment descriptions

2. **`SkedenceAdmin/functions/src/stripe-connect.ts`** 
   - Enhanced `createPaymentIntentConnect` function
   - Added comprehensive metadata for Connect payments

### Enhanced Fields

#### Payment Intent Description
**Before:**
```
"Skedence: John Doe"
```

**After:**
```
"1738849200000 - John Doe - Private Session (1 Athlete) - February 6, 2026 3:00 PM"
```

Format: `{transactionId} - {clientName} - {packageName} - {purchaseDate}`

#### Customer Name
**Before:**
```
"Skedence: John Doe (a1b2)"
```

**After (unchanged but consistent):**
```
"Skedence: John Doe (a1b2)"
```

Format: `Skedence: {firstName} {lastName} ({userIdLast4})`

#### Metadata Fields

**Before:**
```typescript
{
  orgId: "org123",
  trainerId: "trainer456",
  userId: "user789",
  packageType: "private"
}
```

**After:**
```typescript
{
  source: "Skedence",
  user_id: "user789",
  client_name: "John Doe",
  package_name: "Private Session (1 Athlete)",
  package_type: "private",
  trainer_id: "trainer456",
  org_id: "org123",
  org_name: "PolyFace Volleyball Academy",
  transaction_id: "1738849200000",
  purchase_date: "February 6, 2026 3:00 PM"
}
```

### Package Display Names

Mapping of internal package types to human-readable names:

| Package Type | Display Name |
|-------------|--------------|
| `private` | Private Session (1 Athlete) |
| `2_athlete` | Private Session (2 Athletes) |
| `3_athlete` | Private Session (3 Athletes) |
| `class_pass` | Class Pass |
| `class_10_pack` | Class 10-Pack |

### Transaction ID Format

- Generated using `Date.now().toString()`
- Example: `1738849200000` (Unix timestamp in milliseconds)
- Matches Acuity's numerical transaction ID format

### Date Format

```typescript
new Date().toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})
```

Output: `February 6, 2026 3:00 PM`

## Benefits

### 1. **Stripe Dashboard Clarity**
- Payments are easily identifiable by client name and service type
- Transaction IDs provide unique identifiers
- Timestamps show when purchase was made

### 2. **Receipt Emails**
- Customers receive detailed information in Stripe receipts
- Human-readable service descriptions
- Clear transaction details

### 3. **Reporting & Analytics**
- Metadata enables advanced filtering in Stripe
- Can filter by:
  - `source: "Skedence"` (vs other platforms)
  - `package_type` (specific service types)
  - `org_name` (specific organizations)
  - `client_name` (specific clients)

### 4. **Support & Debugging**
- Support team can quickly identify transactions
- Easy correlation between Firestore records and Stripe payments
- Comprehensive audit trail

### 5. **Customer Experience**
- Professional receipt format
- Clear service descriptions
- Transparent transaction details

## Example Stripe Receipt

When a customer makes a payment, they'll see in their Stripe receipt:

```
Congratulations, POLYFACE VOLLEYBALL ACADEMY LLC!

You've just received a payment through Stripe.

PAYMENT
$80.00 — 1738849200000 - John Doe - Private Session (1 Athlete) - February 6, 2026 3:00 PM

CUSTOMER
Skedence: John Doe (a1b2) — john.doe@example.com

METADATA
source — Skedence
user_id — abc123xyz789
client_name — John Doe
package_name — Private Session (1 Athlete)
transaction_id — 1738849200000
purchase_date — February 6, 2026 3:00 PM
org_name — PolyFace Volleyball Academy

PAYMENT ID
pi_3SxzXRAky5ebHyts0X7UrswG
```

## Deployment

To deploy these changes:

```bash
cd SkedenceAdmin/functions
npm run build
firebase deploy --only functions:createPaymentIntentDirect,functions:createAndConfirmPaymentDirect,functions:createPaymentIntentConnect
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

## Testing

### Test Payment Flow

1. **Client App**: Purchase a lesson package
2. **Check Stripe Dashboard**: 
   - Go to Payments
   - Verify description format
   - Check metadata fields
3. **Email Receipt**: Customer should receive enhanced receipt
4. **Firestore**: Verify package created correctly with transaction ID

### Expected Results

- ✅ Payment description shows: `{timestamp} - {name} - {service} - {date}`
- ✅ Customer name shows: `Skedence: {name} ({id})`
- ✅ Metadata includes all 10 fields
- ✅ Transaction ID matches between Stripe and Firestore
- ✅ Receipt email shows human-readable information

## Backwards Compatibility

✅ **Fully backwards compatible**

- Existing code continues to work
- No breaking changes to function signatures
- Enhanced metadata is additive only
- Old payments still visible and functional

## Future Enhancements

Possible future improvements:

1. **Add Booking Reference**: Include future booking date/time if known
2. **Trainer Name**: Add trainer name to metadata
3. **Invoice Number**: Generate sequential invoice numbers
4. **Tax Information**: Add tax breakdown if applicable
5. **Discount Codes**: Track if promotion codes were used

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Full project documentation
- [STRIPE_SETUP.md](./Skedence/STRIPE_SETUP.md) - Stripe integration guide
- Acuity Receipt Screenshot - Reference implementation

---

**Updated by:** GitHub Copilot  
**Date:** February 6, 2026
