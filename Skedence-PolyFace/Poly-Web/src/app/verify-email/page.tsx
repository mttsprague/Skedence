'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import AuthLayout from '@/components/AuthLayout';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [autoChecking, setAutoChecking] = useState(true);

  const email = auth.currentUser?.email ?? '';

  // Auto-detect: Firebase redirects here after clicking the link.
  // Reload auth state immediately — if already verified, skip the button.
  useEffect(() => {
    (async () => {
      try {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          router.replace('/portal');
          return;
        }
      } catch {
        // ignore — user may not be signed in yet
      }
      setAutoChecking(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleContinue() {
    setChecking(true);
    setError('');
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        router.replace('/portal');
      } else {
        setError("Email not yet verified. Click the link in your inbox and try again.");
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    setResent(false);
    try {
      const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
      await sendVerificationEmail({ email });
      setResent(true);
    } catch {
      setError('Failed to resend. Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  }

  if (autoChecking) {
    return (
      <AuthLayout subtitle="">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center flex flex-col items-center gap-4">
          <Loader2 size={36} className="text-pva-teal animate-spin" />
          <p className="text-pva-navy font-bold text-sm">Checking verification…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden text-center">

        {/* Branded header banner */}
        <div className="bg-pva-navy px-8 pt-8 pb-10 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-pva-teal/20" />
          <div className="w-16 h-16 bg-pva-teal/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-pva-teal/30">
            <MailCheck size={30} className="text-pva-teal" />
          </div>
          <h1 className="text-white font-black text-2xl leading-tight mb-1">Check your inbox</h1>
          <p className="text-gray-400 text-sm">One step left to access your account</p>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 py-7">
          {/* Step list */}
          <div className="text-left space-y-4 mb-7">
            {[
              { n: '1', text: 'Open the email from PolyFace Volleyball Academy' },
              { n: '2', text: 'Click the "Verify Email Address" button inside' },
              { n: '3', text: 'Come back here — we\'ll log you in automatically' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-pva-navy text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {n}
                </span>
                <p className="text-gray-600 text-sm leading-snug pt-1">{text}</p>
              </div>
            ))}
          </div>

          {email && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
              <MailCheck size={15} className="text-pva-teal flex-shrink-0" />
              <span className="text-pva-navy font-bold text-sm truncate">{email}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
              {error}
            </div>
          )}
          {resent && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm mb-4">
              Verification email resent — check your inbox!
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={checking}
            className="w-full bg-pva-navy text-white py-4 rounded-xl font-black hover:bg-pva-teal transition mb-3 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {checking
              ? <><Loader2 size={16} className="animate-spin" /> Checking…</>
              : <><ArrowRight size={16} /> I&apos;ve clicked the link</>}
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full text-sm text-gray-400 hover:text-pva-navy transition py-2 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Sending…' : "Didn't get it? Resend email"}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
