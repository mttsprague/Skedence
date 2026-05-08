'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchOrgTrainers } from '@/lib/firestore';
import type { Trainer } from '@/types';
import Image from 'next/image';

function TrainerBio({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = description.split(/\n+/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-3">About</p>
      <div className={expanded ? '' : 'line-clamp-[8]'}>
        {paragraphs.map((para, i) => (
          <p key={i} className="text-gray-600 text-sm leading-relaxed mb-2">{para}</p>
        ))}
      </div>
      <div className="flex justify-end mt-1">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold text-pva-orange hover:underline"
        >
          {expanded ? 'Show less ↑' : 'Show more ↓'}
        </button>
      </div>
    </div>
  );
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — may be a network or App Check issue on localhost')), 8000)
    );

    Promise.race([fetchOrgTrainers(), timeout])
      .then(data => setTrainers(data as Trainer[]))
      .catch(err => {
        console.error('[Trainers page]', err);
        setError(err?.message ?? 'Failed to load trainers.');
      })
      .finally(() => setLoading(false));
  }, []);

  function trainerImage(t: Trainer): string | null {
    return t.avatarUrl ?? t.photoURL ?? t.imageUrl ?? t.profileImageUrl ?? null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-gradient-to-br from-pva-navy via-pva-navy/90 to-pva-teal/80 text-white text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Meet Our Trainers</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Expert coaches dedicated to developing every athlete&apos;s game — from fundamentals to elite performance.
        </p>
      </section>

      {/* Trainer Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-red-500 font-semibold">Failed to load trainers</p>
            <p className="text-gray-400 text-sm font-mono">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-pva-orange text-white rounded-full text-sm font-bold hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : trainers.length === 0 ? (
          <p className="text-center text-gray-500 py-20">No trainers found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {trainers.map((trainer) => {
              const imgSrc = trainerImage(trainer);
              const initials = `${trainer.firstName[0] ?? ''}${trainer.lastName[0] ?? ''}`.toUpperCase();
              return (
                <div
                  key={trainer.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow"
                >
                  {/* Photo */}
                  <div className="relative h-64 bg-gradient-to-br from-pva-navy to-pva-teal flex items-center justify-center">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={`${trainer.firstName} ${trainer.lastName}`}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <span className="text-5xl font-extrabold text-white/70">{initials}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-pva-navy">
                      {trainer.firstName} {trainer.lastName}
                    </h2>
                    {trainer.pricingTierName && (
                      <span className="inline-block mt-1 text-xs font-semibold bg-pva-orange/10 text-pva-orange px-3 py-1 rounded-full">
                        {trainer.pricingTierName}
                      </span>
                    )}
                    {trainer.trainerDescription ? (
                      <TrainerBio description={trainer.trainerDescription} />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-pva-navy text-white text-center py-16 px-6">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Ready to train with us?</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">Book a private lesson or group class with one of our trainers today.</p>
        <a
          href="/portal/book"
          className="inline-block bg-pva-orange text-white font-bold px-10 py-4 rounded-full hover:opacity-90 transition"
        >
          Book a Session
        </a>
      </section>

      <Footer />
    </div>
  );
}
