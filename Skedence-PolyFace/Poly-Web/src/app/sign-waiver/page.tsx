'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchOrgSettings, saveGuestWaiver, saveWaiver, findUserDocIdByEmail } from '@/lib/firestore';

type Step = 'form' | 'waiver' | 'success';

export default function SignWaiverPage() {
  const [waiverText, setWaiverText] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    athleteName: '',
  });

  useEffect(() => {
    fetchOrgSettings()
      .then(s => setWaiverText(s.waiverText))
      .catch(console.error)
      .finally(() => setLoadingSettings(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStep('waiver');
  }

  async function handleSubmit() {
    if (!agreed) { setError('Please check the agreement box before submitting.'); return; }
    setSaving(true);
    setError('');
    try {
      const email = form.email.trim().toLowerCase();
      // Look up whether this person already has a Skedence account
      const userDocId = await findUserDocIdByEmail(email);

      if (userDocId) {
        // Known user — save to users/{userId}/documents/ exactly as the iOS app does
        await saveWaiver(userDocId, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email,
          phoneNumber: form.phoneNumber.trim(),
          athleteName: form.athleteName.trim() || undefined,
        });
      } else {
        // Guest without an account — save to waivers/ with iOS-matching field names
        await saveGuestWaiver({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email,
          phoneNumber: form.phoneNumber.trim(),
          athleteName: form.athleteName.trim() || undefined,
        });
      }

      setStep('success');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again or contact us directly.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-12 bg-gradient-to-br from-pva-navy to-pva-navy/90 text-white text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Sign the Waiver</h1>
        <p className="text-white/70 max-w-xl mx-auto text-sm">
          Complete the liability waiver before your first session. This only takes a minute.
        </p>
      </section>

      <div className="max-w-xl mx-auto px-6 py-14">

        {/* ─── SUCCESS ─── */}
        {step === 'success' && (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-extrabold text-pva-navy mb-3">Waiver Signed!</h2>
            <p className="text-gray-600 mb-8">
              Thank you, {form.firstName}! Your waiver has been recorded. You&apos;re all set to train.
            </p>
            <a
              href="/portal/book"
              className="inline-block bg-pva-orange text-white font-bold px-10 py-4 rounded-full hover:opacity-90 transition"
            >
              Book a Session
            </a>
          </div>
        )}

        {/* ─── FORM STEP ─── */}
        {step === 'form' && (
          <>
            <h2 className="text-lg font-bold text-pva-navy mb-6">Your Information</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>
            )}
            <form onSubmit={handleContinue} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name *</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                <input
                  name="phoneNumber"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
                  placeholder="(555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Athlete&apos;s Name <span className="font-normal text-gray-400">(optional — if signing for a minor)</span>
                </label>
                <input
                  name="athleteName"
                  value={form.athleteName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
                  placeholder="Athlete first and last name"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-pva-orange text-white font-bold py-4 rounded-full hover:opacity-90 transition mt-2"
              >
                Continue to Waiver →
              </button>
            </form>
          </>
        )}

        {/* ─── WAIVER STEP ─── */}
        {step === 'waiver' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-pva-navy">Release of Liability</h2>
              <button
                onClick={() => { setStep('form'); setAgreed(false); setError(''); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
            </div>

            {loadingSettings ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Waiver Text */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 h-72 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
                  {waiverText || (
                    <span className="text-gray-400 italic">
                      Waiver text not configured. Please contact us to complete this process.
                    </span>
                  )}
                </div>

                {/* Signing summary */}
                <div className="bg-pva-navy/5 border border-pva-navy/20 rounded-xl px-4 py-3 text-sm mb-5">
                  <p className="text-pva-navy font-medium">
                    Signing as: <span className="font-bold">{form.firstName} {form.lastName}</span>
                    {form.athleteName && (
                      <span className="text-gray-500"> · Athlete: <strong>{form.athleteName}</strong></span>
                    )}
                  </p>
                </div>

                {/* Agreement Check */}
                <label className="flex items-start gap-3 cursor-pointer mb-6">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-pva-orange"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the Release of Liability Waiver. I understand the risks involved in volleyball training activities.
                  </span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={saving || !agreed}
                  className="w-full bg-pva-orange text-white font-bold py-4 rounded-full hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Submit Signed Waiver'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
