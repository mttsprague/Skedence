'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, CheckCircle, ArrowLeft, CreditCard, ChevronRight, Star, Users, Info } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/hooks/useAuth';
import { fetchPricingStructure, fetchOrgStripeInfo, fetchOrgTrainers } from '@/lib/firestore';
import { getCategoryDisplayName, formatCurrency } from '@/types';
import type { PackageOption, PricingTier, Trainer } from '@/types';
import { functions } from '@/lib/firebase';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['oneAthlete', 'twoAthlete', 'threeAthlete', 'fourAthlete', 'classPass'];
const isClassPkg = (p: PackageOption) => p.packageCategory === 'classPass' || p.packageCategory === 'class';

// ─── Tier Row ─────────────────────────────────────────────────────────────────

function TierRow({ tier, trainers, selected, onSelect }: {
  tier: PricingTier;
  trainers: Trainer[];
  selected: boolean;
  onSelect: () => void;
}) {
  const tierTrainers = trainers.filter((t) => t.pricingTierId === tier.id);
  const trainerNames = tierTrainers.map((t) => `${t.firstName} ${t.lastName}`).join(', ');
  const lessonPkgs = tier.packages.filter((p) => !isClassPkg(p));
  const cheapest = lessonPkgs.length
    ? Math.min(...lessonPkgs.map((p) => Math.round(p.priceInCents / (p.lessonCount || 1))))
    : null;

  return (
    <button type="button" onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center gap-4 ${
        selected ? 'border-pva-navy bg-pva-navy/5 shadow-md' : 'border-gray-200 bg-white hover:border-pva-navy/40'
      }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-pva-navy' : 'bg-gray-100'}`}>
        <Star size={18} className={selected ? 'text-white' : 'text-gray-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${selected ? 'text-pva-navy' : 'text-gray-800'}`}>{tier.tierName}</p>
        {trainerNames && <p className="text-xs text-gray-500 truncate mt-0.5">{trainerNames}</p>}
        {cheapest && <p className="text-xs text-pva-teal font-bold mt-0.5">from {formatCurrency(cheapest)} / lesson</p>}
      </div>
      {selected && <CheckCircle size={20} className="text-pva-teal flex-shrink-0" />}
    </button>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg, selected, onSelect }: {
  pkg: PackageOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const [showDesc, setShowDesc] = useState(false);
  const perLesson = pkg.lessonCount > 1 ? Math.round(pkg.priceInCents / pkg.lessonCount) : null;
  const expiryMonths = pkg.expirationDays ? Math.round(pkg.expirationDays / 30) : 12;

  return (
    <div className={`rounded-2xl border-2 transition overflow-hidden ${selected ? 'border-pva-navy shadow-md' : 'border-gray-200 bg-white'}`}>
      <button type="button" onClick={onSelect} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {selected && <CheckCircle size={14} className="text-pva-teal flex-shrink-0" />}
              <p className={`font-bold text-sm leading-tight ${selected ? 'text-pva-navy' : 'text-gray-800'}`}>{pkg.title}</p>
            </div>
            <p className="text-xs text-gray-500">
              {pkg.lessonCount} {pkg.lessonCount === 1 ? 'lesson' : 'lessons'} · Expires {expiryMonths} months
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-black text-pva-navy">{formatCurrency(pkg.priceInCents)}</p>
            {perLesson && <p className="text-xs text-gray-400">{formatCurrency(perLesson)} / ea</p>}
          </div>
        </div>
      </button>
      {pkg.description && (
        <div className="border-t border-gray-100">
          <button type="button" onClick={() => setShowDesc((v) => !v)}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400 hover:text-pva-navy transition">
            <Info size={12} />{showDesc ? 'Hide details' : 'Show details'}
          </button>
          {showDesc && <p className="px-4 pb-3 text-xs text-gray-600 leading-relaxed">{pkg.description}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Payment Form ─────────────────────────────────────────────────────────────

function PaymentForm({ selectedPackage, userDocId, onSuccess, onCancel }: {
  selectedPackage: PackageOption;
  userDocId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState('');
  const expiryMonths = selectedPackage.expirationDays ? Math.round(selectedPackage.expirationDays / 30) : 12;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setCardError('');
    setProcessing(true);
    try {
      const createIntent = httpsCallable<
        { amount: number; packageType: string; orgId: string; userId: string },
        { clientSecret: string }
      >(functions, 'createPaymentIntentConnect');
      const { data } = await createIntent({
        amount: selectedPackage.priceInCents,
        packageType: selectedPackage.packageType,
        orgId: process.env.NEXT_PUBLIC_ORG_ID!,
        userId: userDocId,
      });
      const { error } = await stripe.confirmCardPayment(data.clientSecret, { payment_method: { card } });
      if (error) setCardError(error.message ?? 'Payment failed. Please try again.');
      else onSuccess();
    } catch (err: unknown) {
      setCardError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      {/* Summary */}
      <div className="bg-pva-navy rounded-2xl p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Purchasing</p>
        <p className="font-black text-lg leading-tight">{selectedPackage.title}</p>
        <p className="text-sm text-white/70 mt-1">
          {selectedPackage.lessonCount} {selectedPackage.lessonCount === 1 ? 'lesson' : 'lessons'} · expires in {expiryMonths} months
        </p>
        <p className="text-3xl font-black mt-3">{formatCurrency(selectedPackage.priceInCents)}</p>
      </div>
      {/* Card */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <CreditCard size={14} className="inline mr-1.5 mb-0.5" />Card Details
        </label>
        <div className="border-2 border-gray-200 rounded-xl px-4 py-4 focus-within:border-pva-teal transition bg-white">
          <CardElement options={{ style: { base: { fontSize: '16px', color: '#1a1a2e', fontFamily: 'system-ui, sans-serif', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } } }} />
        </div>
        {cardError && <p className="text-red-500 text-xs mt-2">{cardError}</p>}
      </div>
      <p className="text-xs text-gray-400 text-center">🔒 Secured by Stripe. Your card is never stored on our servers.</p>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 border-2 border-gray-200 text-gray-600 py-4 rounded-xl font-bold text-sm hover:border-gray-300 transition">
          Back
        </button>
        <button type="submit" disabled={!stripe || processing}
          className="flex-1 bg-pva-navy hover:bg-pva-teal disabled:opacity-60 text-white py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
          {processing ? <Spinner size="sm" className="border-white/30 border-t-white" /> : `Pay ${formatCurrency(selectedPackage.priceInCents)}`}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Step = 'select' | 'pay' | 'success';

export default function BuyPassesPage() {
  const { user, userDocId } = useAuth();
  const router = useRouter();

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [stripeInfo, setStripeInfo] = useState<{ publishableKey: string; connectAccountId: string | null } | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [step, setStep] = useState<Step>('select');

  const load = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setDataError('');
    try {
      const [pricing, stripe, loadedTrainers] = await Promise.all([
        fetchPricingStructure(),
        fetchOrgStripeInfo(),
        fetchOrgTrainers(),
      ]);
      if (!pricing?.tiers?.length) {
        setDataError('No passes are available yet. Please contact your coach to set up pricing.');
        return;
      }
      setTiers(pricing.tiers);
      setTrainers(loadedTrainers);
      if (stripe) {
        setStripeInfo(stripe);
        setStripePromise(loadStripe(stripe.publishableKey));
      }
    } catch {
      setDataError('Failed to load pricing. Please try again.');
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Packages visible for selected tier (class passes are universal — always shown)
  const visiblePackages = (() => {
    if (!tiers.length) return [];
    if (!selectedTierId) return tiers.flatMap((t) => t.packages);
    const selectedTier = tiers.find((t) => t.id === selectedTierId);
    if (!selectedTier) return [];
    const lessonPkgs = selectedTier.packages.filter((p) => !isClassPkg(p));
    const classPkgs = tiers.flatMap((t) => t.packages.filter(isClassPkg));
    const uniqueClass = classPkgs.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
    return [...lessonPkgs, ...uniqueClass];
  })();

  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      label: getCategoryDisplayName(cat),
      isClass: cat === 'classPass',
      pkgs: visiblePackages.filter((p) => p.packageCategory === cat).sort((a, b) => a.lessonCount - b.lessonCount),
    }))
    .filter((g) => g.pkgs.length > 0);

  const hasMultipleTiers = tiers.length > 1;

  if (!user || !userDocId) return null;

  if (loadingData) {
    return <div className="flex justify-center items-center py-24"><Spinner size="lg" /></div>;
  }

  if (dataError) {
    return (
      <div className="max-w-xl mx-auto py-8 space-y-4">
        <EmptyState icon={<ShoppingBag size={40} />} title="Unable to Load Passes" description={dataError} />
        <button onClick={load} className="w-full border-2 border-pva-navy text-pva-navy py-3 rounded-xl font-bold text-sm hover:bg-pva-navy hover:text-white transition">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => step === 'pay' ? setStep('select') : router.push('/portal/passes')}
          className="text-gray-400 hover:text-pva-navy transition">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-pva-navy">Purchase Passes</h1>
          <p className="text-sm text-gray-500">Select a package for your athlete</p>
        </div>
      </div>

      {/* ── Success ── */}
      {step === 'success' && (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-pva-navy mb-2">Purchase Successful!</h2>
          <p className="text-gray-500 text-sm mb-6">Your pass has been added. You can now book lessons.</p>
          <div className="flex gap-3">
            <button onClick={() => { setStep('select'); setSelectedPackage(null); }}
              className="flex-1 border-2 border-pva-navy text-pva-navy py-3.5 rounded-xl font-bold text-sm hover:bg-pva-navy hover:text-white transition">
              Buy Another
            </button>
            <button onClick={() => router.push('/portal/book')}
              className="flex-1 bg-pva-navy text-white py-3.5 rounded-xl font-bold text-sm hover:bg-pva-teal transition flex items-center justify-center gap-1.5">
              Book a Lesson <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Payment ── */}
      {step === 'pay' && selectedPackage && stripePromise && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <Elements stripe={stripePromise}>
            <PaymentForm
              selectedPackage={selectedPackage}
              userDocId={userDocId}
              onSuccess={() => setStep('success')}
              onCancel={() => setStep('select')}
            />
          </Elements>
        </div>
      )}

      {/* ── Package Selection ── */}
      {step === 'select' && (
        <div className="space-y-8">
          {/* Tier selection (only when multiple tiers) */}
          {hasMultipleTiers && (
            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-pva-navy mb-1">Select Trainer Tier</h2>
              <p className="text-xs text-gray-500 mb-3">Choose which trainers you want to book with</p>
              <div className="space-y-2">
                {tiers.map((tier) => (
                  <TierRow key={tier.id} tier={tier} trainers={trainers} selected={selectedTierId === tier.id}
                    onSelect={() => { setSelectedTierId((prev) => prev === tier.id ? null : tier.id); setSelectedPackage(null); }} />
                ))}
              </div>
            </section>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-pva-navy inline-block" />
              <span className="text-xs text-gray-500 font-medium">Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-pva-teal inline-block" />
              <span className="text-xs text-gray-500 font-medium">Class</span>
            </div>
          </div>

          {/* Package groups */}
          <div className="space-y-6">
              {grouped.map(({ category, label, isClass, pkgs }) => (
                <section key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isClass ? 'bg-pva-teal/15' : 'bg-pva-navy/10'}`}>
                      {isClass
                        ? <Users size={14} className="text-pva-teal" />
                        : <span className="text-pva-navy font-black text-xs">
                            {category === 'twoAthlete' ? 2 : category === 'threeAthlete' ? 3 : category === 'fourAthlete' ? 4 : 1}
                          </span>}
                    </div>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isClass ? 'text-pva-teal' : 'text-pva-navy'}`}>
                      {label} {isClass ? 'Classes' : 'Lessons'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {pkgs.map((pkg) => (
                      <PackageCard key={pkg.id} pkg={pkg}
                        selected={selectedPackage?.id === pkg.id}
                        onSelect={() => setSelectedPackage(selectedPackage?.id === pkg.id ? null : pkg)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

          {/* No Stripe warning */}
          {!stripeInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-800 text-sm mb-1">Payments Not Yet Configured</p>
              <p className="text-xs text-amber-700">Online payments are being set up. Please contact your coach to purchase a pass.</p>
            </div>
          )}

          {/* Purchase button */}
          {stripeInfo && (
            <button disabled={!selectedPackage} onClick={() => setStep('pay')}
              className="w-full bg-pva-navy hover:bg-pva-teal disabled:opacity-40 text-white py-4 rounded-2xl font-bold text-base transition flex items-center justify-center gap-2 shadow-lg">
              {selectedPackage
                ? <><CreditCard size={18} />Purchase · {formatCurrency(selectedPackage.priceInCents)}</>
                : 'Select a Pass to Continue'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}


