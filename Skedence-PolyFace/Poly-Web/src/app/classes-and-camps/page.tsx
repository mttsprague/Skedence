'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { fetchPricingStructure, fetchGroupClasses } from '@/lib/firestore';
import { GroupClass, PricingStructure } from '@/types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Collapse all classes from Firestore into display entries.
 *  Series classes (same seriesId) are merged into one entry showing the full date range. */
function deduplicateClasses(all: GroupClass[]): { cls: GroupClass; seriesDates: Date[] | null }[] {
  const seen = new Set<string>();
  const result: { cls: GroupClass; seriesDates: Date[] | null }[] = [];

  for (const cls of all) {
    if (cls.isPartOfSeries && cls.seriesId) {
      if (seen.has(cls.seriesId)) continue;
      seen.add(cls.seriesId);
      const sibling = all.filter((c) => c.seriesId === cls.seriesId);
      result.push({ cls, seriesDates: sibling.map((c) => c.startTime) });
    } else {
      result.push({ cls, seriesDates: null });
    }
  }

  return result;
}

function formatSeriesDateRange(dates: Date[]): string {
  if (dates.length === 0) return '';
  if (dates.length === 1) return formatDate(dates[0]);
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  if (sameMonth) {
    return first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
      '–' + last.getDate() + ', ' + last.getFullYear();
  }
  return first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' + last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ClassCard({ cls, seriesDates, pricing }: { cls: GroupClass; seriesDates: Date[] | null; pricing: PricingStructure | null }) {
  const spotsLeft = cls.maxParticipants - cls.currentParticipants;
  const isFull = spotsLeft <= 0;
  const isSeries = seriesDates && seriesDates.length > 1;

  // Find the price of the specific pass required for this class
  const price = (() => {
    // Class has its own price set directly
    if (cls.priceInCents > 0) return `$${(cls.priceInCents / 100).toFixed(0)}`;
    if (!pricing) return 'See pricing';

    const allPackages = pricing.tiers.flatMap((t) => t.packages);

    // Match against eligiblePackageIds (array of packageType strings)
    if (cls.eligiblePackageIds.length > 0) {
      const matches = allPackages.filter((p) => cls.eligiblePackageIds.includes(p.packageType));
      if (matches.length > 0) {
        const prices = matches.map((p) => p.priceInCents);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min === max) return `$${(min / 100).toFixed(0)} class pass`;
        return `$${(min / 100).toFixed(0)}–$${(max / 100).toFixed(0)} class pass`;
      }
    }

    // Fall back: any classPass category package
    const classPacks = allPackages.filter(
      (p) => p.packageCategory === 'classPass' || p.packageType === 'class_pass' || p.packageType === 'class'
    );
    if (classPacks.length === 0) return 'See pricing';
    const prices = classPacks.map((p) => p.priceInCents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `$${(min / 100).toFixed(0)} class pass`;
    return `$${(min / 100).toFixed(0)}–$${(max / 100).toFixed(0)} class pass`;
  })();

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col border border-gray-100 hover:shadow-lg transition-shadow">
      {cls.imageUrl ? (
        <div className="h-48 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cls.imageUrl}
            alt={cls.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-pva-navy to-pva-teal flex items-center justify-center">
          <span className="text-white text-4xl font-black opacity-30">PVA</span>
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xl font-black text-pva-navy leading-tight">{cls.title}</h3>
          {isSeries && (
            <span className="shrink-0 text-xs font-bold bg-pva-navy/10 text-pva-navy px-2 py-1 rounded-full whitespace-nowrap">
              {seriesDates!.length}-Day Camp
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">with {cls.trainerName}</p>

        {cls.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{cls.description}</p>
        )}

        <div className="space-y-2 text-sm text-gray-600 mb-5">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-pva-teal shrink-0" />
            <span>
              {isSeries
                ? formatSeriesDateRange(seriesDates!)
                : formatDate(cls.startTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-pva-teal shrink-0" />
            <span>{formatTime(cls.startTime, cls.endTime)}</span>
          </div>
          {cls.location && (
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-pva-teal shrink-0" />
              <span>{cls.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users size={15} className="text-pva-teal shrink-0" />
            <span>
              {isFull ? (
                <span className="text-red-500 font-semibold">Class Full</span>
              ) : (
                <span>
                  <span className="font-semibold text-pva-navy">{spotsLeft}</span> spot{spotsLeft !== 1 ? 's' : ''} remaining
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-pva-teal shrink-0" />
            <span className="font-semibold text-pva-navy">{price}</span>
          </div>
        </div>

        <div className="mt-auto">
          {isFull ? (
            <button
              disabled
              className="w-full py-3 rounded-full font-bold text-sm bg-gray-200 text-gray-400 cursor-not-allowed"
            >
              Class Full
            </button>
          ) : (
            <Link
              href="/portal/book?tab=classes"
              className="block w-full text-center py-3 rounded-full font-bold text-sm bg-gradient-to-r from-pva-orange to-pva-orange/80 hover:opacity-90 text-white transition transform hover:scale-105 shadow"
            >
              Register Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClassesAndCampsPage() {
  const [displayClasses, setDisplayClasses] = useState<{ cls: GroupClass; seriesDates: Date[] | null }[]>([]);
  const [pricing, setPricing] = useState<PricingStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch pricing structure + classes in parallel
    fetchPricingStructure()
      .then(setPricing)
      .catch((err) => console.error('[Classes page] fetchPricingStructure error:', err));

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — may be a network or App Check issue on localhost')), 8000)
    );

    Promise.race([fetchGroupClasses(), timeout])
      .then((classes) => {
        setDisplayClasses(deduplicateClasses(classes as Awaited<ReturnType<typeof fetchGroupClasses>>));
      })
      .catch((err) => {
        console.error('[Classes page] fetchGroupClasses error:', err);
        setError(err?.message ?? 'Unable to load classes. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-24 pb-20">
        {/* Hero */}
        <section className="bg-pva-navy text-white py-16 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Classes &amp; Camps
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Train with Polyface Volleyball Academy's expert coaches. Register for upcoming group
            clinics, camps, and specialty sessions — all levels welcome.
          </p>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-6 py-14">
          {loading && (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-pva-teal border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="text-center py-24">
              <p className="text-red-500 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && displayClasses.length === 0 && (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">🏐</div>
              <h2 className="text-2xl font-black text-pva-navy mb-3">No Classes Scheduled Yet</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Check back soon — new group classes and camps are added regularly. In the meantime,
                book a private lesson or contact us to learn about upcoming sessions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/portal/book"
                  className="inline-block bg-pva-orange text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition"
                >
                  Book a Private Lesson
                </Link>
                <a
                  href="/#contact"
                  className="inline-block border-2 border-pva-navy text-pva-navy px-8 py-3 rounded-full font-bold text-sm hover:bg-pva-navy hover:text-white transition"
                >
                  Contact Us
                </a>
              </div>
            </div>
          )}

          {!loading && !error && displayClasses.length > 0 && (
            <>
              <p className="text-gray-500 mb-8 text-sm font-medium">
                {displayClasses.length} upcoming event{displayClasses.length !== 1 ? 's' : ''} available
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayClasses.map(({ cls, seriesDates }) => (
                  <ClassCard key={cls.id} cls={cls} seriesDates={seriesDates} pricing={pricing} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="bg-pva-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <Image src="/polyface-logo.webp" alt="Polyface" width={48} height={48} className="rounded-xl" />
              <div>
                <div className="text-xl font-black">
                  <span className="text-white">POLY</span>
                  <span className="text-pva-teal">FACE</span>
                </div>
                <div className="text-xs text-pva-orange tracking-widest">VOLLEYBALL ACADEMY</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm font-semibold text-gray-400">
              <a href="/#programs" className="hover:text-pva-orange transition">Training</a>
              <a href="/#about" className="hover:text-pva-orange transition">About</a>
              <Link href="/login" className="hover:text-pva-orange transition">Client Login</Link>
              <Link href="/privacy" className="hover:text-pva-orange transition">Privacy Policy</Link>
            </div>
            <div className="text-sm text-gray-400 text-center md:text-right">
              <div>© 2026 PolyFace Volleyball Academy</div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
