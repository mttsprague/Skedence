# Cloud Functions Audit & Fix Report

## Summary of Issues Found

### Missing Functions (Need to be created)
1. `registerTrainer` - Called from Admin app auth
2. `manualRegisterForClass` - Called from Admin class management  
3. `attachPaymentMethod` - Called from Client app wallet
4. `chargeWithSavedMethod` - Called from Client app payments

### Function Name Mismatches (Swift code needs updating)
1. Client calls `confirmPaymentIntent` → Should use `confirmPaymentAndCreatePackageDirect`
2. Admin calls `adminChargeClient` → Actually exists, but Swift uses different service name

---

## Functions to Add to index.ts

### 1. registerTrainer (trainerInvitations.ts or new file)

**Called from:** `SkedenceAdmin/Services/Authentication/AuthManager.swift`

**Parameters:**
```typescript
{
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}
```

**Implementation** (Add to `functions/src/trainerInvitations.ts` or create new file):

```typescript
export const registerTrainer = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const { uid, email, firstName, lastName } = request.data;

    if (!uid || !email || !firstName || !lastName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    try {
      const db = admin.firestore();
      
      // Create trainer profile
      await db.collection("trainers").doc(uid).set({
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error("Error registering trainer:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to register trainer"
      );
    }
  }
);
```

---

### 2. manualRegisterForClass

**Called from:** `SkedenceAdmin/Components/Sheets/ClassParticipantsView.swift`

**Parameters:**
```typescript
// For existing client:
{
  classId: string;
  userId: string;
  classPassPackageId: string;
}

// For manual entry:
{
  classId: string;
  firstName: string;
  lastName: string;
  email: string | null;
}
```

**Implementation** (Add to `functions/src/index.ts` or classes.ts):

```typescript
export const manualRegisterForClass = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    classId: string;
    userId?: string;
    classPassPackageId?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const { classId, userId, classPassPackageId, firstName, lastName, email } = request.data;

    if (!classId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "classId is required"
      );
    }

    const db = admin.firestore();

    try {
      // Get class document
      const classDoc = await db.collection("classes").doc(classId).get();
      if (!classDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Class not found");
      }

      const classData = classDoc.data()!;
      const orgId = classData.orgId;

      // Check if admin
      const adminMember = await db
        .collection("orgMembers")
        .doc(`${request.auth.uid}_${orgId}`)
        .get();

      if (!adminMember.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not authorized"
        );
      }

      const role = adminMember.data()?.role;
      if (role !== "admin" && role !== "owner") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Must be admin or owner"
        );
      }

      let registrationData: any;

      if (userId) {
        // Existing client registration
        if (!classPassPackageId) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "classPassPackageId required for existing client"
          );
        }

        // Verify package exists and has credits
        const packageDoc = await db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(classPassPackageId)
          .get();

        if (!packageDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Package not found");
        }

        const packageData = packageDoc.data()!;
        if ((packageData.lessonsRemaining || 0) <= 0) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Package has no remaining credits"
          );
        }

        registrationData = {
          clientId: userId,
          classId,
          classPassPackageId,
          orgId,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          registeredBy: request.auth.uid,
          status: "confirmed"
        };

        // Decrement package
        await db
          .collection("users")
          .doc(userId)
          .collection("lessonPackages")
          .doc(classPassPackageId)
          .update({
            lessonsRemaining: admin.firestore.FieldValue.increment(-1)
          });
      } else {
        // Manual entry registration
        if (!firstName || !lastName) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "firstName and lastName required for manual entry"
          );
        }

        registrationData = {
          firstName,
          lastName,
          email: email || null,
          classId,
          orgId,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          registeredBy: request.auth.uid,
          status: "manual",
          isManualEntry: true
        };
      }

      // Create registration
      await db.collection("classRegistrations").add(registrationData);

      // Increment current participants
      await db.collection("classes").doc(classId).update({
        currentParticipants: admin.firestore.FieldValue.increment(1)
      });

      return { success: true };
    } catch (error) {
      console.error("Error in manualRegisterForClass:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to register for class"
      );
    }
  }
);
```

---

### 3. attachPaymentMethod (wallet.ts)

**Called from:** `Skedence/Services/Repositories/CloudFunctionsRepository.swift`

**Parameters:**
```typescript
{
  paymentMethodId: string;
  customerId: string;
}
```

**Implementation** (Add to `functions/src/wallet.ts`):

```typescript
export const attachPaymentMethod = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    paymentMethodId: string;
    customerId: string;
    orgId?: string;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const { paymentMethodId, customerId, orgId } = request.data;

    if (!paymentMethodId || !customerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing paymentMethodId or customerId"
      );
    }

    try {
      const db = admin.firestore();
      
      // Get Stripe config
      let stripeSecretKey: string;
      
      if (orgId) {
        const stripeDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("stripe")
          .doc("config")
          .get();
        
        stripeSecretKey = stripeDoc.data()?.secretKey;
      } else {
        // Legacy single-tenant
        const configDoc = await db.collection("stripeConfig").doc("keys").get();
        stripeSecretKey = configDoc.data()?.secretKey;
      }

      if (!stripeSecretKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Stripe not configured"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error attaching payment method:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to attach payment method"
      );
    }
  }
);
```

---

### 4. chargeWithSavedMethod (stripe.ts or stripe-direct.ts)

**Called from:** `Skedence/Services/Repositories/CloudFunctionsRepository.swift`

**Parameters:**
```typescript
{
  clientId: string;
  paymentMethodId: string;
  amount: number;
  description: string;
}
```

**Implementation** (Add to appropriate stripe file):

```typescript
export const chargeWithSavedMethod = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    clientId: string;
    paymentMethodId: string;
    amount: number;
    description: string;
    orgId?: string;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const { clientId, paymentMethodId, amount, description, orgId } = request.data;

    if (!clientId || !paymentMethodId || !amount) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    if (request.auth.uid !== clientId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Can only charge your own card"
      );
    }

    try {
      const db = admin.firestore();
      
      // Get user and Stripe customer ID
      const userDoc = await db.collection("users").doc(clientId).get();
      const stripeCustomerId = userDoc.data()?.stripeCustomerId;

      if (!stripeCustomerId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No Stripe customer found"
        );
      }

      // Get Stripe config
      let stripeSecretKey: string;
      
      if (orgId) {
        const stripeDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("stripe")
          .doc("config")
          .get();
        
        stripeSecretKey = stripeDoc.data()?.secretKey;
      } else {
        const configDoc = await db.collection("stripeConfig").doc("keys").get();
        stripeSecretKey = configDoc.data()?.secretKey;
      }

      if (!stripeSecretKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Stripe not configured"
        );
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        description,
        confirm: true,
        off_session: true,
      });

      // Record transaction
      await db.collection("transactions").add({
        userId: clientId,
        amount,
        description,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        orgId: orgId || null
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error("Error charging with saved method:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to charge payment method"
      );
    }
  }
);
```

---

## Swift Code Updates Needed

### Fix #1: confirmPaymentIntent → confirmPaymentAndCreatePackageDirect

**File:** `Skedence/Skedence/Services/Repositories/CloudFunctionsRepository.swift`

**Current:**
```swift
func confirmPaymentIntent(
    paymentIntentId: String,
    packageId: String
) async throws {
    _ = try await callFunction(
        name: "confirmPaymentIntent",
        data: [
            "paymentIntentId": paymentIntentId,
            "packageId": packageId
        ]
    )
}
```

**Should be:**
```swift
func confirmPaymentIntent(
    paymentIntentId: String,
    packageId: String
) async throws {
    _ = try await callFunction(
        name: "confirmPaymentAndCreatePackageDirect",
        data: [
            "paymentIntentId": paymentIntentId,
            "packageId": packageId
        ]
    )
}
```

---

## Verification Checklist

After implementing fixes:

- [ ] Deploy functions: `cd SkedenceAdmin/functions && npm run deploy`
- [ ] Test `registerTrainer` from admin app signup
- [ ] Test `manualRegisterForClass` from admin class management
- [ ] Test `attachPaymentMethod` from client wallet
- [ ] Test `chargeWithSavedMethod` from client app
- [ ] Test payment confirmation flow after Swift update
- [ ] Verify no console errors in Firebase Functions logs

---

## Functions That Exist and Are Working

✅ `bookLesson` - Lesson booking
✅ `registerForClass` - Class registration  
✅ `adminCancelLesson` - Cancel lessons
✅ `processTrainerAvailability` - Availability management
✅ `adminProcessPayment` - Admin payments
✅ `confirmAdminPayment` - Confirm admin payments
✅ `adminChargeWithSavedCard` - Charge saved cards (admin)
✅ `adminChargeClient` - Charge clients (admin)
✅ `adminConfirmCharge` - Confirm charges (admin)
✅ `getPaymentMethodsDirect` - Get payment methods
✅ `getPaymentMethodsDirectAdmin` - Get payment methods (admin)
✅ `createSetupIntentDirect` - Setup payment intent
✅ `detachPaymentMethod` - Remove payment method
✅ `createPaymentIntentDirect` - Create payment intent
✅ `createAndConfirmPaymentDirect` - Create and confirm
✅ `confirmPaymentAndCreatePackageDirect` - Confirm and create package
✅ `sendPasswordResetEmail` - Password reset
✅ `deleteUserAccount` - Delete account
✅ `getBillingStatus` - Get billing status
✅ `cancelSubscription` - Cancel subscription
✅ `syncBillingFromStripe` - Sync billing
✅ `createConnectAccount` - Stripe Connect
✅ `createConnectAccountLink` - Stripe Connect link
✅ `refreshConnectAccountStatus` - Refresh Connect status
✅ `validateAppleReceipt` - Apple IAP validation
