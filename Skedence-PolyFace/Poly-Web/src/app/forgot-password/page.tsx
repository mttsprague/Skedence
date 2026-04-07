'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/AuthLayout';
import Spinner from '@/components/Spinner';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(
        msg.includes('user-not-found') || msg.includes('invalid-email')
          ? 'No account found with that email address.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout subtitle="Reset your password">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        {sent ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-pva-navy mb-2">Check Your Email</h2>
            <p className="text-gray-500 text-sm mb-6">
              Password reset instructions have been sent to <strong>{email}</strong>.
              Check your inbox and follow the link to reset your password.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-pva-teal font-bold hover:text-pva-navy transition text-sm"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-pva-navy mb-2">Forgot Password?</h1>
            <p className="text-gray-500 text-sm mb-6">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-pva-teal transition"
                />
              </div>

              <button
                type="submit"
                disabled={!email || loading}
                className="w-full bg-pva-navy hover:bg-pva-teal disabled:opacity-60 text-white py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                {loading
                  ? <Spinner size="sm" className="border-white/30 border-t-white" />
                  : <><Mail size={18} /> Send Reset Link</>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-pva-navy transition"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
