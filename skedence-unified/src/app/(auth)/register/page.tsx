"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, initializeFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { generateOrganizationId, generateTrainerId } from "@/lib/id-generator";
import { trackAuth, setUserProperties } from "@/lib/analytics";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Step 1: Account Creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [currency, setCurrency] = useState("USD");
  
  // Step 2: Business Contact Details
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Auth user - MATCH iOS APP PATTERN
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUserId = userCredential.user.uid;
      
      console.log('✅ Created Firebase Auth user:', authUserId);

      // Generate human-readable organization ID from business name
      console.log('🔧 Generating orgId from businessName:', businessName);
      const orgId = await generateOrganizationId(db, businessName);
      console.log('✅ Generated orgId:', orgId);

      // Generate human-readable trainer ID from name
      console.log('🔧 Generating trainerId from:', firstName, lastName);
      const trainerId = await generateTrainerId(db, firstName, lastName);
      console.log('✅ Generated trainerId:', trainerId);

      // CRITICAL: Get fresh ID token from the user we just created
      // Pass it explicitly to Cloud Function (Next.js static export workaround)
      console.log('🔑 Getting ID token for Cloud Function authentication...');
      const idToken = await userCredential.user.getIdToken(true); // Force fresh token
      console.log('✅ ID token obtained, length:', idToken.length);

      // Call Cloud Function to create organization server-side
      // Pass idToken explicitly instead of relying on Firebase SDK's automatic auth attachment
      console.log('📝 Calling Cloud Function to create organization...');
      const createOrgFunction = httpsCallable(functions, 'createOrganizationFromWeb');
      
      try {
        const result = await createOrgFunction({
          idToken, // Pass token explicitly for static export compatibility
          orgId,
          trainerId,
          businessName,
          firstName,
          lastName,
          email,
          phone,
          timezone,
          currency,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          contactEmail: contactEmail || email
        });
        
        console.log('✅ Organization created via Cloud Function:', result);
        
      } catch (cloudFunctionError: any) {
        console.error('❌ Cloud Function error:', cloudFunctionError);
        throw new Error(`Failed to create organization: ${cloudFunctionError.message}`);
      }

      // Store orgId for step 3
      sessionStorage.setItem('newOrgId', orgId);

      // Track successful sign up
      trackAuth.signUp(email, orgId);
      setUserProperties({
        userId: authUserId,
        orgId: orgId,
        role: 'owner'
      });

      // Move to mobile app notification step
      setStep(3);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      // Provide user-friendly error messages
      let errorMessage = err.message || "Failed to create account";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please use a different email or try logging in.";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address format.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // Wait 5 seconds for Cloud Function transaction to fully commit
    // This ensures orgMembers docs are available when useAuth queries them
    console.log('⏳ Waiting for database sync before navigating...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Force auth to reload to pick up new orgMembers
    console.log('🔄 Reloading auth state...');
    await auth.currentUser?.reload();
    
    // Clean up
    sessionStorage.removeItem('newOrgId');
    console.log('✅ Navigating to activity page...');
    console.log('ℹ️  Note: If activity page shows loading spinner, check console logs from useAuth for retry status');

    // Navigate to activity feed
    router.push("/activity");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-2xl shadow-black/50 p-8 border border-border">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold text-blue-600">Skedence</a>
          <h2 className="mt-4 text-2xl font-semibold">
            {step === 1 && "Create Your Account"}
            {step === 2 && "Tell Us About Your Business"}
            {step === 3 && "You're All Set!"}
          </h2>
          <p className="text-foreground/80 mt-2">
            {step === 1 && "Start your 14-day free trial"}
            {step === 2 && "Just a few more details"}
            {step === 3 && "Welcome to Skedence"}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Step {step} of 3</span>
            <span className="text-xs text-muted-foreground">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Account Creation */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-foreground mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Elite Training Studio"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter password"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-foreground mb-1">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                </select>
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        )}

        {/* Step 2: Business Contact Details */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-foreground mb-1">Contact Information</h3>
                <p className="text-xs text-muted-foreground">Help clients reach you</p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                  Business Phone <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-foreground mb-1">
                  Contact Email <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@yourbusiness.com"
                />
              </div>

              <div className="border-b pb-3 mt-6">
                <h3 className="font-semibold text-foreground mb-1">Business Address</h3>
                <p className="text-xs text-muted-foreground">Optional - shown to clients when booking</p>
              </div>

              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium text-foreground mb-1">
                  Address Line 1
                </label>
                <input
                  id="addressLine1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label htmlFor="addressLine2" className="block text-sm font-medium text-foreground mb-1">
                  Address Line 2 <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  id="addressLine2"
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Suite 100"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New York"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-foreground mb-1">
                    State
                  </label>
                  <input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-foreground mb-1">
                    ZIP Code
                  </label>
                  <input
                    id="zipCode"
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-border sticky bottom-0 bg-card">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Mobile App Download */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-primary/10 border-2 border-primary/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Download the Skedence Admin App
                  </h3>
                  <p className="text-foreground/80 text-sm mb-4">
                    Manage your business on the go with our mobile app. View your schedule, check client details, and get real-time notifications—all from your phone.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Available on:</p>
                    <div className="flex gap-3">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white/60 rounded-lg text-sm font-medium cursor-not-allowed relative">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        App Store
                        <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-foreground/80">
              <p>You can download the app later from your account settings</p>
            </div>

            <Button onClick={handleComplete} className="w-full">
              Got it! Take me to my dashboard
            </Button>
          </div>
        )}

        {/* Footer link to login */}
        {step === 1 && (
          <div className="mt-6 text-center text-sm text-foreground/80">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Sign in
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
