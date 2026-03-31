// @ts-nocheck — full file rewrite below
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/AuthLayout';
import Spinner from '@/components/Spinner';

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-black uppercase tracking-widest text-pva-teal mb-3 pt-2">
      {title}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pva-teal transition ${className}`}
    />
  );
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <Check size={12} className={met ? 'text-green-500' : 'text-gray-300'} />
      {label}
    </li>
  );
}

function formatBirthday(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += '/';
    out += digits[i];
  }
  return out;
}

function isValidBirthday(b: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(b)) return false;
  const [m, d, y] = b.split('/').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2030;
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <Check size={12} className={met ? 'text-green-500' : 'text-gray-300'} />
      {label}
    </li>
  );
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  // Account credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Parent / Guardian
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Athlete
  const [athleteFirst, setAthleteFirst] = useState('');
  const [athleteLast, setAthleteLast] = useState('');
  const [athleteBirthday, setAthleteBirthday] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requirements = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(requirements).every(Boolean);
  const passwordsMatch = password === confirm && password.length > 0;

  const formValid =
    email && passwordValid && passwordsMatch &&
    firstName && lastName && phone &&
    athleteFirst && athleteLast && isValidBirthday(athleteBirthday);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, firstName, lastName, phone, athleteFirst, athleteLast, athleteBirthday);
      router.push('/portal');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(
        msg.includes('email-already-in-use')
          ? 'An account with this email already exists. Try signing in.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout subtitle="Create your client account">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-black text-pva-navy mb-6">Create Account</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Account Credentials ── */}
          <SectionHeader title="Account Credentials" />

          <Field label="Email Address">
            <TextInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-pva-teal transition"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <ul className="mt-2 space-y-1 pl-1">
                <PasswordRequirement met={requirements.length} label="At least 8 characters" />
                <PasswordRequirement met={requirements.upper} label="Uppercase letter" />
                <PasswordRequirement met={requirements.lower} label="Lowercase letter" />
                <PasswordRequirement met={requirements.number} label="Contains a number" />
              </ul>
            )}
          </Field>

          <Field label="Confirm Password">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                confirm && !passwordsMatch ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-pva-teal'
              }`}
            />
            {confirm && !passwordsMatch && (
              <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
            )}
          </Field>

          {/* ── Parent / Guardian ── */}
          <SectionHeader title="Parent / Guardian Information" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <TextInput value={firstName} onChange={setFirstName} placeholder="Alex" />
            </Field>
            <Field label="Last Name">
              <TextInput value={lastName} onChange={setLastName} placeholder="Smith" />
            </Field>
          </div>

          <Field label="Phone Number">
            <TextInput type="tel" value={phone} onChange={setPhone} placeholder="(555) 000-0000" />
          </Field>

          {/* ── Athlete Information ── */}
          <SectionHeader title="Athlete Information" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <TextInput value={athleteFirst} onChange={setAthleteFirst} placeholder="Jordan" />
            </Field>
            <Field label="Last Name">
              <TextInput value={athleteLast} onChange={setAthleteLast} placeholder="Smith" />
            </Field>
          </div>

          <Field label="Birthday">
            <TextInput
              value={athleteBirthday}
              onChange={(v) => setAthleteBirthday(formatBirthday(v))}
              placeholder="MM/DD/YYYY"
            />
            {athleteBirthday.length > 0 && !isValidBirthday(athleteBirthday) && (
              <p className="text-amber-500 text-xs mt-1">Enter date as MM/DD/YYYY</p>
            )}
          </Field>

          <button
            type="submit"
            disabled={!formValid || loading}
            className="w-full bg-pva-navy hover:bg-pva-teal disabled:opacity-50 text-white py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 mt-2"
          >
            {loading
              ? <Spinner size="sm" className="border-white/30 border-t-white" />
              : <><UserPlus size={18} /> Complete Registration</>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-pva-orange font-bold hover:text-pva-navy transition">Sign in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
