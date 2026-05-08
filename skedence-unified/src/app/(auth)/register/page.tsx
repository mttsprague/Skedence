"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { generateOrganizationId, generateTrainerId } from "@/lib/id-generator";
import { trackAuth, setUserProperties } from "@/lib/analytics";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Step 1: Account basics
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Step 2: Owner details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!businessName.trim()) {
      setError("Business name is required");
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

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required");
      return;
    }

    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUserId = userCredential.user.uid;

      const orgId = await generateOrganizationId(db, businessName);
      const trainerId = await generateTrainerId(db, firstName, lastName);

      const idToken = await userCredential.user.getIdToken(true);

      const createOrgFunction = httpsCallable(functions, 'createOrganizationFromWeb');
      
      try {
        const result = await createOrgFunction({
          idToken,
          orgId,
          trainerId,
          businessName,
          firstName,
          lastName,
          email,
          phone,
          timezone: "America/New_York",
          currency: "USD",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          zipCode: "",
          contactEmail: email
        });
        
        console.log('✅ Organization created via Cloud Function:', result);
        
      } catch (cloudFunctionError: any) {
        console.error('❌ Cloud Function error:', cloudFunctionError);
        throw new Error(`Failed to create organization: ${cloudFunctionError.message}`);
      }

      sessionStorage.setItem('newOrgId', orgId);

      trackAuth.signUp(email, orgId);
      setUserProperties({
        userId: authUserId,
        orgId: orgId,
        role: 'owner'
      });

      setStep(3);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      
      let errorMessage = err.message || "Failed to create account";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please sign in instead.";
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
    console.log('⏳ Waiting for database sync before navigating...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await auth.currentUser?.reload();
    sessionStorage.removeItem('newOrgId');
    router.push("/activity");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Skedence</span>
          </a>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {step === 1 && "Create Your Account"}
              {step === 2 && "About Your Business"}
              {step === 3 && "You&apos;re All Set!"}
            </h2>
            <p className="text-white/50 mt-1 text-sm">
              {step === 1 && "Start your 14-day free trial"}
              {step === 2 && "Almost done — one more step"}
              {step === 3 && "Welcome to Skedence"}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-white/40">Step {step} of 3</span>
              <span className="text-xs text-white/40">{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Account Basics */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-white/80 mb-1.5">
                  Business Name <span className="text-primary">*</span>
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Elite Training Studio"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">
                  Email <span className="text-primary">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">
                  Password <span className="text-primary">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Min 6 characters"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full py-3 text-base font-semibold rounded-xl mt-2">
                Continue →
              </Button>

              <p className="text-center text-xs text-white/30 mt-3">
                No credit card required · 14-day free trial
              </p>
            </form>
          )}

          {/* Step 2: Owner Details */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-white/80 mb-1.5">
                    First Name <span className="text-primary">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-white/80 mb-1.5">
                    Last Name <span className="text-primary">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-1.5">
                  Business Phone <span className="text-primary">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(1); setError(''); }}
                  disabled={loading}
                  className="flex-1 border-white/10 text-white/70 hover:bg-white/5 rounded-xl"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-semibold">
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Mobile App Download */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-1.5">
                      Download the Skedence Admin App
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      Manage your schedule, clients, and bookings from your phone. Available on iPhone.
                    </p>
                    <a
                      href="https://apps.apple.com/us/app/skedenceadmin/id6757625868"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Download on App Store
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-white/30">
                You can download the app later from your account settings
              </p>

              <Button onClick={handleComplete} className="w-full py-3 rounded-xl font-semibold text-base">
                Take me to my dashboard →
              </Button>
            </div>
          )}

          {/* Footer link to login */}
          {step === 1 && (
            <div className="mt-5 text-center text-sm text-white/40">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
