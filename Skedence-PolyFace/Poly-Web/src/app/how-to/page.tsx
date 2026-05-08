'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserPlus, CreditCard, CalendarDays, LayoutDashboard, Download, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ─── Phone mockup wrapper ─────────────────────────────────────────────────────
function PhoneMockup({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-[220px] sm:w-[260px]">
      {/* Outer shell */}
      <div className="relative rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-b-2xl z-10" />
        {/* Screen */}
        <Image
          src={src}
          alt={alt}
          width={390}
          height={844}
          className="w-full object-contain"
        />
      </div>
      {/* Glow */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-pva-navy/10 blur-2xl -z-10 scale-110" />
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────
function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pva-orange text-white font-black text-sm flex-shrink-0">
      {n}
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 bg-pva-orange/10 text-pva-orange px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
        {icon}
        {label}
      </div>
      <h2 className="text-3xl sm:text-4xl font-black text-pva-navy mb-3">{title}</h2>
      <p className="text-gray-500 text-lg max-w-xl mx-auto">{subtitle}</p>
    </div>
  );
}

export default function HowToPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        {/* ── Hero ── */}
        <section className="bg-pva-navy py-20 px-6 text-center">
          <p className="text-pva-orange font-bold uppercase tracking-widest text-sm mb-3">
            Getting Started
          </p>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-5">
            How to Use the<br className="hidden sm:block" /> Polyface App
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto mb-10">
            Everything you need to create your account, load up passes, and get on the court — right from your phone.
          </p>
          {/* App Store CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://apps.apple.com/us/app/polyface-volleyball/id6752781077"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-pva-navy px-7 py-4 rounded-xl font-bold text-base hover:bg-gray-100 transition shadow-lg"
            >
              <Download size={20} />
              Download on the App Store
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-pva-orange text-white px-7 py-4 rounded-xl font-bold text-base hover:bg-pva-orange/90 transition shadow-lg"
            >
              Already have an account? Log In
              <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        {/* ── Quick Nav ── */}
        <section className="bg-white border-b border-gray-100 sticky top-[64px] z-40">
          <div className="max-w-5xl mx-auto px-6 py-3 flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar text-sm font-bold">
            {[
              { href: '#create-profile', label: '1. Create Your Profile' },
              { href: '#purchase-passes', label: '2. Purchase Passes' },
              { href: '#book', label: '3. Book a Session' },
              { href: '#schedule', label: '4. View Your Schedule' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap px-4 py-2 rounded-full text-gray-500 hover:text-pva-orange hover:bg-orange-50 transition"
              >
                {label}
              </a>
            ))}
          </div>
        </section>

        {/* ─────────────────────────────────────
            STEP 1 — CREATE YOUR PROFILE
        ───────────────────────────────────── */}
        <section id="create-profile" className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <SectionHeader
              icon={<UserPlus size={16} />}
              label="Step 1"
              title="Create Your Profile"
              subtitle="Set up your account in under 2 minutes. All you need is an email."
            />
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Steps */}
              <div className="flex-1 space-y-6">
                {[
                  {
                    n: 1,
                    title: 'Download the app',
                    desc: 'Search "Polyface Volleyball" on the App Store, or tap the Download button above.',
                  },
                  {
                    n: 2,
                    title: 'Tap "Create Account"',
                    desc: 'Enter your name and email address on the sign-up screen.',
                  },
                  {
                    n: 3,
                    title: 'Verify your email',
                    desc: 'Check your inbox for a verification link and confirm your address.',
                  },
                  {
                    n: 4,
                    title: 'You\'re in!',
                    desc: 'The app opens to your Home screen — ready to purchase passes and book.',
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <StepBadge n={n} />
                    <div>
                      <div className="font-bold text-pva-navy text-base">{title}</div>
                      <div className="text-gray-500 text-sm mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  <span className="font-bold">Tip:</span> Your profile lives under the <span className="font-semibold">More</span> tab in the app — you can edit your info, access documents, and reset your password there anytime.
                </div>
              </div>
              {/* Screenshot */}
              <div className="flex-shrink-0">
                <PhoneMockup src="/app-screenshots/settings.png" alt="App More / Profile screen" />
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
            STEP 2 — PURCHASE PASSES
        ───────────────────────────────────── */}
        <section id="purchase-passes" className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <SectionHeader
              icon={<CreditCard size={16} />}
              label="Step 2"
              title="Purchase Passes"
              subtitle="Load up your account with lesson passes — then book whenever you want."
            />
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              {/* Steps */}
              <div className="flex-1 space-y-6">
                {[
                  {
                    n: 1,
                    title: 'Go to the Profile tab',
                    desc: 'Tap the person icon at the bottom of the app.',
                  },
                  {
                    n: 2,
                    title: 'Tap "Purchase Passes"',
                    desc: 'The blue button at the bottom of your Passes screen.',
                  },
                  {
                    n: 3,
                    title: 'Choose your pass type',
                    desc: 'Private (1 athlete), 2-athlete, 3-athlete, or Class Pass — pick what fits.',
                  },
                  {
                    n: 4,
                    title: 'Complete payment securely',
                    desc: 'Check out with Apple Pay or a credit card. Your passes appear instantly.',
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <StepBadge n={n} />
                    <div>
                      <div className="font-bold text-pva-navy text-base">{title}</div>
                      <div className="text-gray-500 text-sm mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                  <span className="font-bold">Pass types:</span> Each pass has a remaining lesson count and an expiration date, visible right on the Passes screen.
                </div>
              </div>
              {/* Screenshot */}
              <div className="flex-shrink-0">
                <PhoneMockup src="/app-screenshots/passes.png" alt="App Passes screen" />
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
            STEP 3 — BOOK A SESSION
        ───────────────────────────────────── */}
        <section id="book" className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <SectionHeader
              icon={<CalendarDays size={16} />}
              label="Step 3"
              title="Book at Your Convenience"
              subtitle="Open availability is shown live — browse open slots and book in seconds."
            />

            {/* Two screenshots side by side on desktop */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Steps */}
              <div className="flex-1 space-y-6">
                {[
                  {
                    n: 1,
                    title: 'Tap the "Book" tab',
                    desc: 'The calendar-plus icon at the bottom of the app.',
                  },
                  {
                    n: 2,
                    title: 'Select a trainer',
                    desc: 'Pick from your organization\'s available coaches.',
                  },
                  {
                    n: 3,
                    title: 'Choose a date',
                    desc: 'Dots on the calendar show days with open availability.',
                  },
                  {
                    n: 4,
                    title: 'Pick a time slot',
                    desc: 'Available times appear below the calendar — select the one that works for you.',
                  },
                  {
                    n: 5,
                    title: 'Confirm & you\'re booked!',
                    desc: 'Select which pass to use, review the details, and confirm. Done.',
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <StepBadge n={n} />
                    <div>
                      <div className="font-bold text-pva-navy text-base">{title}</div>
                      <div className="text-gray-500 text-sm mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                  <span className="font-bold">Private or Group?</span> Toggle between <span className="font-semibold">Privates</span> and <span className="font-semibold">Classes</span> at the top of the Book tab.
                </div>
              </div>
              {/* Screenshots */}
              <div className="flex-shrink-0 flex gap-6 items-center">
                <div className="hidden sm:block">
                  <PhoneMockup src="/app-screenshots/home.png" alt="App home screen" />
                </div>
                <PhoneMockup src="/app-screenshots/book.png" alt="App book screen" />
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
            STEP 4 — VIEW YOUR SCHEDULE
        ───────────────────────────────────── */}
        <section id="schedule" className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <SectionHeader
              icon={<LayoutDashboard size={16} />}
              label="Step 4"
              title="View Your Schedule"
              subtitle="Everything you have coming up, in one clean list."
            />
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              {/* Steps */}
              <div className="flex-1 space-y-6">
                {[
                  {
                    n: 1,
                    title: 'Open the Profile tab',
                    desc: 'Tap the person icon at the bottom of the screen.',
                  },
                  {
                    n: 2,
                    title: 'Switch to the "Schedule" tab',
                    desc: 'Tap Schedule — just to the right of Passes at the top.',
                  },
                  {
                    n: 3,
                    title: 'See your next event',
                    desc: 'Your upcoming session is highlighted at the top with trainer, location, and pass type.',
                  },
                  {
                    n: 4,
                    title: 'Scroll for all upcoming events',
                    desc: 'All future privates and classes are listed in order — nothing to miss.',
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <StepBadge n={n} />
                    <div>
                      <div className="font-bold text-pva-navy text-base">{title}</div>
                      <div className="text-gray-500 text-sm mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  <span className="font-bold">Need to cancel?</span> Check the{' '}
                  <Link href="/cancellation-policy" className="underline">Cancellation Policy</Link>{' '}
                  to understand the 48-hour window before reaching out.
                </div>
              </div>
              {/* Screenshot */}
              <div className="flex-shrink-0">
                <PhoneMockup src="/app-screenshots/schedule.png" alt="App schedule screen" />
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
            FINAL CTA
        ───────────────────────────────────── */}
        <section className="bg-pva-navy py-20 px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Download the app, create your account, and book your first session today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://apps.apple.com/us/app/polyface-volleyball/id6752781077"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-pva-navy px-8 py-4 rounded-xl font-bold text-base hover:bg-gray-100 transition shadow-lg"
            >
              <Download size={20} />
              Download on the App Store
            </a>
            <Link
              href="/register"
              className="inline-flex items-center gap-3 bg-pva-orange text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-pva-orange/90 transition shadow-lg"
            >
              Create Account
              <ChevronRight size={18} />
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-6">
            Have questions?{' '}
            <a href="/#contact" className="text-pva-orange hover:underline">Contact us</a> and we&apos;ll help you get set up.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
