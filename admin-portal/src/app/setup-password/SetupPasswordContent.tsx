'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Eye, EyeOff, Download, Smartphone } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, Timestamp, deleteField } from 'firebase/firestore';

export default function SetupPasswordContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validatingLink, setValidatingLink] = useState(true);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    const trainerIdParam = searchParams.get('trainerId');

    if (!tokenParam || !emailParam || !trainerIdParam) {
      setError('Invalid setup link. Please check your email for the correct link.');
      setValidatingLink(false);
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam);
    setTrainerId(trainerIdParam);
    
    // Validate the link
    validateSetupLink(tokenParam, emailParam, trainerIdParam);
  }, [searchParams]);

  const validateSetupLink = async (token: string, email: string, trainerId: string) => {
    try {
      const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
      
      if (!trainerDoc.exists()) {
        setError('Invalid setup link. Trainer not found.');
        setValidatingLink(false);
        return;
      }

      const trainerData = trainerDoc.data();
      
      // Verify token matches
      if (trainerData.setupToken !== token) {
        setError('Invalid or expired setup link. Please request a new invitation.');
        setValidatingLink(false);
        return;
      }

      // Check if token is expired
      if (trainerData.setupTokenExpiry) {
        const expiryDate = trainerData.setupTokenExpiry.toDate();
        if (expiryDate < new Date()) {
          setError('This setup link has expired. Please contact your administrator for a new invitation.');
          setValidatingLink(false);
          return;
        }
      }

      // Verify email matches
      const storedEmail = trainerData.email || trainerData.emailAddress;
      if (storedEmail !== email) {
        setError('Email mismatch. Please use the correct setup link from your email.');
        setValidatingLink(false);
        return;
      }

      // Fetch organization name
      if (trainerData.orgId) {
        const orgDoc = await getDoc(doc(db, 'organizations', trainerData.orgId));
        if (orgDoc.exists()) {
          setOrgName(orgDoc.data().name || 'your organization');
        }
      }

      setValidatingLink(false);
    } catch (err) {
      console.error('Error validating setup link:', err);
      setError('Failed to validate setup link. Please try again.');
      setValidatingLink(false);
    }
  };

  const isPasswordValid = () => {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           password === confirmPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid()) {
      setError('Please ensure all password requirements are met.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create Firebase Auth account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUid = result.user.uid;

      console.log('✅ Created Firebase Auth account:', firebaseUid);

      // 2. Get trainer data for orgId
      const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
      const trainerData = trainerDoc.data();

      // 3. Update trainer document
      await updateDoc(doc(db, 'trainers', trainerId), {
        userId: firebaseUid,
        needsPasswordSetup: false,
        setupToken: deleteField(),
        setupTokenExpiry: deleteField(),
        passwordSetAt: Timestamp.now()
      });

      console.log('✅ Updated trainer document');

      // 4. Update orgMembers if needed
      if (trainerData?.orgId) {
        const oldMemberDocId = `${trainerId}_${trainerData.orgId}`;
        const newMemberDocId = `${firebaseUid}_${trainerData.orgId}`;
        
        const oldMemberDoc = await getDoc(doc(db, 'orgMembers', oldMemberDocId));
        
        if (oldMemberDoc.exists() && oldMemberDocId !== newMemberDocId) {
          const memberData = oldMemberDoc.data();
          
          // Create new orgMember with Firebase UID
          await setDoc(doc(db, 'orgMembers', newMemberDocId), {
            ...memberData,
            userId: firebaseUid,
            updatedAt: Timestamp.now()
          });
          
          // Delete old orgMember
          await deleteDoc(doc(db, 'orgMembers', oldMemberDocId));
          
          console.log('✅ Updated orgMember');
        }
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Error setting up password:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Try signing in to the app instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (validatingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Validating your setup link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                If you need a new invitation link, please contact your organization administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Password Created Successfully!</CardTitle>
            <p className="text-gray-600 mt-2">Your account is ready. Now download the app to get started.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Your Account Details</h3>
              <p className="text-sm text-blue-800">Email: <span className="font-mono font-semibold">{email}</span></p>
              {orgName && <p className="text-sm text-blue-800">Organization: <span className="font-semibold">{orgName}</span></p>}
            </div>

            {/* Next Steps */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-8 h-8 bg-[#3258A3] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-gray-900">Download Skedence Admin</p>
                    <p className="text-sm text-gray-600">Get the app from your device's app store</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-8 h-8 bg-[#3258A3] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-gray-900">Sign In</p>
                    <p className="text-sm text-gray-600">Use your email and the password you just created</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-8 h-8 bg-[#3258A3] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-gray-900">Start Managing</p>
                    <p className="text-sm text-gray-600">Access your schedule, clients, and training sessions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Download the App</h3>
              <div className="flex justify-center">
                <a
                  href="https://apps.apple.com/app/skedence-admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-lg font-semibold">App Store</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Help Text */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact your organization administrator or email{' '}
                <a href="mailto:support@skedence.com" className="text-[#3258A3] hover:underline">support@skedence.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-[#3258A3] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <CardTitle className="text-2xl">Set Up Your Password</CardTitle>
          <p className="text-gray-600 mt-2">Create a secure password for your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-mono"
              />
            </div>

            {orgName && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Organization:</span> {orgName}
                </p>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] pr-12"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Password must:</p>
              <PasswordRequirement met={password.length >= 8} text="Be at least 8 characters" />
              <PasswordRequirement met={/[A-Z]/.test(password) && /[a-z]/.test(password)} text="Contain uppercase and lowercase letters" />
              <PasswordRequirement met={/[0-9]/.test(password)} text="Contain a number" />
              <PasswordRequirement met={password === confirmPassword && password.length > 0} text="Passwords match" />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-red-600 text-lg">⚠️</span>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${met ? 'bg-green-100' : 'bg-gray-200'}`}>
        {met ? (
          <CheckCircle2 className="w-3 h-3 text-green-600" />
        ) : (
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        )}
      </div>
      <span className={`text-sm ${met ? 'text-green-700 font-medium' : 'text-gray-600'}`}>{text}</span>
    </div>
  );
}
