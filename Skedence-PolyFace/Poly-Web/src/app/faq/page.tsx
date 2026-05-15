import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, ChevronRight, CalendarDays, Users, Dumbbell, Star, BookOpen } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Volleyball FAQ | PolyFace Volleyball Academy',
  description:
    'Common questions about youth volleyball — when to start, what age group is right, and how to set your athlete up for long-term success. Answered by PolyFace Volleyball Academy.',
  keywords: [
    'when to start volleyball',
    'what age to start volleyball',
    'youth volleyball age groups',
    'volleyball for kids',
    'volleyball training for beginners',
    'polyface volleyball faq',
    'volleyball academy FAQ',
    'long beach youth volleyball',
  ].join(', '),
  openGraph: {
    title: "What's the Right Age to Start Volleyball? | PolyFace FAQ",
    description:
      'A parent\'s guide to youth volleyball ages, readiness signs, and how to give your athlete the best first experience.',
    url: 'https://polyfacevolleyball.com/faq',
    siteName: 'PolyFace Volleyball Academy',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: "What's the Right Age to Start Volleyball? | PolyFace FAQ",
    description:
      'A parent\'s guide to youth volleyball ages, readiness signs, and how to give your athlete the best first experience.',
  },
  alternates: {
    canonical: 'https://polyfacevolleyball.com/faq',
  },
};

// ─── Age group card ───────────────────────────────────────────────────────────
function AgeCard({
  range,
  title,
  icon,
  accentColor,
  children,
}: {
  range: string;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`px-6 py-5 ${accentColor} flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{range}</p>
          <h3 className="text-white font-black text-lg leading-tight">{title}</h3>
        </div>
      </div>
      <div className="px-6 py-5 text-gray-600 text-base leading-relaxed">{children}</div>
    </article>
  );
}

// ─── Checklist item ───────────────────────────────────────────────────────────
function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-pva-orange/10 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-pva-orange block" />
      </span>
      <span className="text-gray-700 text-base leading-relaxed">{children}</span>
    </li>
  );
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FAQ({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 py-5">
      <h3 className="text-pva-navy font-bold text-base mb-2">{question}</h3>
      <div className="text-gray-600 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FAQPage() {
  return (
    <>
      <Navbar />

      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is the right age to start volleyball?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Earlier than most parents think. Ages 5–8 benefit from movement and play-based programs. Ages 8–11 is the sweet spot for foundational skills. Ages 11–14 introduces competition concepts, and 14+ focuses on specialization and high school prep.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do I know if my child is ready for volleyball?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Ask whether your child can follow instructions for 30–45 minutes, track a moving ball, enjoy being active with other kids, and whether they are showing curiosity about volleyball specifically. If most of those are yes, they are ready to try.',
                },
              },
              {
                '@type': 'Question',
                name: 'When should kids start private volleyball lessons?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Most families consider private lessons or skill-specific clinics between ages 11 and 14, when players are ready to apply skills in live play. By ages 14 and up, private training has the highest return for high school and club prep.',
                },
              },
              {
                '@type': 'Question',
                name: 'Does starting volleyball earlier guarantee better results?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Not necessarily. The best predictor of long-term success is whether the athlete falls in love with the game. A younger player who loves a fun intro class will go further than an older player pushed into competitive practices too early.',
                },
              },
            ],
          }),
        }}
      />

      <main className="pt-20">

        {/* ── Hero ── */}
        <section className="bg-pva-navy py-20 px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-pva-orange/20 text-pva-orange px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-5">
            <HelpCircle size={15} />
            Parent&apos;s Guide
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5 max-w-4xl mx-auto">
            What&apos;s the Right Age to<br className="hidden sm:block" /> Start Volleyball?
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            It&apos;s one of the questions we hear every week from parents. The answer is simpler
            than you think — and earlier than most expect.
          </p>
        </section>

        {/* ── Quick-nav ── */}
        <div className="bg-white border-b border-gray-100 sticky top-[64px] z-40">
          <div className="max-w-5xl mx-auto px-6 py-3 flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar text-sm font-bold">
            {[
              { href: '#age-groups', label: 'Age Groups' },
              { href: '#readiness', label: 'Is My Child Ready?' },
              { href: '#what-matters', label: 'What Actually Matters' },
              { href: '#faq', label: 'More FAQs' },
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
        </div>

        {/* ── Intro ── */}
        <section className="max-w-3xl mx-auto px-6 py-14">
          <p className="text-gray-600 text-lg leading-relaxed">
            If your child has shown interest in volleyball, you&apos;re probably asking the same
            question we hear from parents every week at PolyFace Volleyball Academy:{' '}
            <em>when is the right time to start?</em>
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mt-4">
            The short answer? <strong className="text-pva-navy">Earlier than most parents think.</strong>{' '}
            The longer answer takes into account your child&apos;s coordination, attention span,
            and what kind of experience you want them to have.
          </p>
        </section>

        {/* ── Age Groups ── */}
        <section id="age-groups" className="bg-gray-50 py-16 px-6 scroll-mt-28">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-pva-navy/10 text-pva-navy px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
                <CalendarDays size={15} />
                Age Groups
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-pva-navy mb-3">
                A Breakdown by Age
              </h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Every stage of development calls for a different approach. Here&apos;s what to
                look for — and what to expect — at each level.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <AgeCard
                range="Ages 5–8"
                title="Movement &amp; Play"
                icon={<Star size={20} className="text-white" />}
                accentColor="bg-gradient-to-r from-sky-500 to-sky-600"
              >
                At this age, the goal isn&apos;t volleyball — it&apos;s{' '}
                <strong>body awareness</strong>. Young kids benefit from learning how to move,
                jump, balance, and chase a ball without any pressure to perform. Look for fun,
                play-based programs that introduce the very basics through games and hand-eye
                coordination drills. A foam or soft volleyball is your best friend at this stage.
              </AgeCard>

              <AgeCard
                range="Ages 8–11"
                title="Foundational Skills"
                icon={<BookOpen size={20} className="text-white" />}
                accentColor="bg-gradient-to-r from-pva-navy to-blue-700"
              >
                This is the <strong>sweet spot for getting started</strong>. Kids this age can
                pick up the basics of serving, passing, and setting, and they have the focus to
                handle structured instruction in short doses. Programs like our{' '}
                <strong>PeeWees Camp</strong> (3rd–5th graders) keep things light, encouraging,
                and rep-based. The goal is to leave loving the sport.
              </AgeCard>

              <AgeCard
                range="Ages 11–14"
                title="Skill Building &amp; Competition"
                icon={<Users size={20} className="text-white" />}
                accentColor="bg-gradient-to-r from-violet-500 to-violet-600"
              >
                Most club programs start at age 11 or 12, and 14U is one of the most popular
                age groups in club volleyball. By middle school, players are ready to add
                competition concepts: court awareness, communication, transitions, and applying
                skills in live play. This is also the age where many families consider their
                first <strong>private lessons</strong> or skill-specific clinics.
              </AgeCard>

              <AgeCard
                range="Ages 14+"
                title="Specialization &amp; High School Prep"
                icon={<Dumbbell size={20} className="text-white" />}
                accentColor="bg-gradient-to-r from-pva-orange to-amber-500"
              >
                High school tryouts change everything. Players this age benefit from focused
                training on the skills coaches evaluate: serving, passing, attacking, and
                defense. <strong>Position specialization</strong> typically starts here. If
                your athlete plans to play in high school or club at a competitive level, this
                is the age to invest in skill development and consistent reps.
              </AgeCard>
            </div>
          </div>
        </section>

        {/* ── Readiness ── */}
        <section id="readiness" className="py-16 px-6 scroll-mt-28">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-pva-orange/10 text-pva-orange px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
                <HelpCircle size={15} />
                Readiness Check
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-pva-navy mb-3">
                How to Know If Your Child Is Ready
              </h2>
              <p className="text-gray-500 text-lg">
                Forget the calendar for a moment — ask these questions instead.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <ul className="space-y-4">
                <CheckItem>Can they follow instructions for 30–45 minutes?</CheckItem>
                <CheckItem>Are they coordinated enough to track a moving ball?</CheckItem>
                <CheckItem>Do they enjoy being active and playing with other kids?</CheckItem>
                <CheckItem>Are they showing curiosity about volleyball specifically?</CheckItem>
              </ul>
              <p className="mt-6 text-gray-600 text-base leading-relaxed border-t border-gray-100 pt-6">
                If you answered <strong className="text-pva-navy">yes to most of these</strong>,
                they&apos;re ready to try. Don&apos;t overthink it — a single fun session tells you
                more than any checklist.
              </p>
            </div>
          </div>
        </section>

        {/* ── What matters ── */}
        <section id="what-matters" className="bg-gray-50 py-16 px-6 scroll-mt-28">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-pva-navy/10 text-pva-navy px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
                <Star size={15} />
                The Big Picture
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-pva-navy mb-3">
                What Matters More Than Age
              </h2>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                The best predictor of long-term success in volleyball isn&apos;t{' '}
                <em>when</em> a player starts. It&apos;s whether they{' '}
                <strong className="text-pva-navy">fall in love with the game.</strong>
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                A 6-year-old who loves a movement-based intro class will go further than a
                10-year-old pushed into competitive practices too early.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 justify-center text-base font-black text-pva-navy">
                <span className="bg-pva-navy/5 px-5 py-2.5 rounded-full">Start with fun.</span>
                <span className="bg-pva-orange/10 px-5 py-2.5 rounded-full text-pva-orange">Build skill.</span>
                <span className="bg-pva-navy/5 px-5 py-2.5 rounded-full">Let the love grow.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Additional FAQ ── */}
        <section id="faq" className="py-16 px-6 scroll-mt-28">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-pva-orange/10 text-pva-orange px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
                <HelpCircle size={15} />
                More Questions
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-pva-navy mb-3">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-2">
              <FAQ question="When should we consider private lessons?">
                Most families begin thinking about private lessons or skill-specific clinics
                between ages 11 and 14, when players are learning to apply skills in live play.
                By ages 14+, private training has the highest return for athletes preparing for
                high school or club tryouts.
              </FAQ>
              <FAQ question="Does starting earlier guarantee a better player?">
                Not automatically. Early starts help, but the quality and fun of the experience
                matters far more than the starting age. A player who falls in love with volleyball
                at 9 will often outpace one who started formally at 7 but burned out.
              </FAQ>
              <FAQ question="What's the difference between a camp and private lessons?">
                Camps are group-based and great for getting lots of reps, meeting other athletes,
                and building a feel for the game in a low-stakes environment. Private lessons
                provide focused, individual attention on specific skills. Many families use
                camps to find what needs work, then use private sessions to fix it.
              </FAQ>
              <FAQ question="What should my child wear to their first session?">
                Athletic shorts or spandex, a fitted shirt, and athletic shoes with good lateral
                support. Knee pads are optional for younger beginners but highly recommended once
                they start diving and playing defense regularly.
              </FAQ>
              <FAQ question="Do you offer trials or intro sessions?">
                Yes — our camps are a great intro, and we also offer individual private sessions
                you can book on a one-off basis before committing to a package. Check{' '}
                <Link href="/classes-and-camps" className="text-pva-orange font-semibold hover:underline">
                  our camps and classes page
                </Link>{' '}
                for current offerings.
              </FAQ>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-pva-navy py-20 px-6 text-center">
          <p className="text-pva-orange font-bold uppercase tracking-widest text-sm mb-4">
            Ready to get started?
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-5 max-w-2xl mx-auto">
            Give Your Athlete a Great First Experience
          </h2>
          <p className="text-gray-300 text-lg max-w-xl mx-auto mb-10">
            Our PeeWees Summer Camp for 3rd–5th graders is built exactly for athletes at the
            foundational stage — fun, encouraging, and rep-based.
          </p>
          <Link
            href="/classes-and-camps"
            className="inline-flex items-center gap-2 bg-pva-orange text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-pva-orange/90 transition shadow-lg"
          >
            Check Out Upcoming Camps &amp; Classes
            <ChevronRight size={18} />
          </Link>
        </section>

      </main>
      <Footer />
    </>
  );
}
