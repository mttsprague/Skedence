import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Who It's For - Skedence",
  description: "Skedence is built for sports coaches, private trainers, and athletic academies who sell lesson packages and manage client schedules. See if it's right for you.",
};

const fits = [
  { label: "Volleyball clubs & academies", detail: "Multi-trainer setup, group classes, and private lesson packages all in one place." },
  { label: "Private sports trainers", detail: "One-on-one scheduling, lesson pass tracking, and in-app payments for solo coaches." },
  { label: "Baseball & softball coaches", detail: "Sell hitting, pitching, and fielding lesson packages with expiration dates and usage tracking." },
  { label: "Basketball trainers", detail: "Manage individual and group sessions, sell multi-session packs, track who's used what." },
  { label: "Soccer academies", detail: "Handle group classes and private skill sessions with the same platform." },
  { label: "Tennis & racquet clubs", detail: "Set flexible pricing tiers for different lesson types and athlete counts." },
];

const notFits = [
  "Large gym chains or franchise operations",
  "Yoga or pilates studios (we're sports-focused)",
  "Personal trainers looking for a workout programming tool",
  "Businesses that don't sell lesson packages or time blocks",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/50">
                <span className="text-black font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">Skedence</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/#features" className="hidden md:block text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Features</Link>
              <Link href="/#pricing" className="hidden md:block text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</Link>
              <Link href="/register" className="btn-premium text-sm">Start Free Trial →</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"></div>
        <div className="container mx-auto max-w-4xl relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">[ Who It&apos;s For ]</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight text-foreground leading-[0.95] uppercase">
            Built For<br />Sports <span className="text-primary">Coaches</span>
          </h1>
          <p className="text-xl text-foreground/70 max-w-2xl leading-relaxed font-light">
            Skedence was built by a developer who coaches athletes — and got frustrated with the lack of tools built specifically for sports training businesses. It&apos;s not a generic booking app. It&apos;s designed around how coaches actually work: lesson packages, multi-athlete sessions, seasonal availability, and clients who book on their phones.
          </p>
        </div>
      </section>

      {/* Good Fit */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-5xl">
          <div className="space-y-4 mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">A Good Fit If You&hellip;</h2>
            <p className="text-lg text-foreground/60">Skedence is purpose-built for these types of businesses</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {fits.map((item) => (
              <div key={item.label} className="premium-card p-7 flex gap-5">
                <Check className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground mb-1">{item.label}</p>
                  <p className="text-sm text-foreground/50 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not a Fit */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Probably Not Right If&hellip;</h2>
            <p className="text-lg text-foreground/60">We&apos;d rather be honest than sell you the wrong tool</p>
          </div>
          <div className="space-y-4">
            {notFits.map((item) => (
              <div key={item} className="flex items-center gap-4 py-4 border-b border-border/30">
                <span className="text-foreground/30 text-xl font-bold">✕</span>
                <p className="text-foreground/60">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What makes it different */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-5xl space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">What Makes It Different</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-wide">Lesson Pass System</h3>
              <p className="text-foreground/50 leading-relaxed text-sm">Clients purchase packs of sessions — 5 privates, 10 group classes, etc. — and the app tracks remaining lessons automatically. No manual spreadsheet updates.</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-wide">Multi-Athlete Sessions</h3>
              <p className="text-foreground/50 leading-relaxed text-sm">One booking can cover 1, 2, 3, or 4 athletes sharing a session. Pricing tiers reflect the athlete count. Built-in — not bolted on.</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-wide">Your Own Stripe Account</h3>
              <p className="text-foreground/50 leading-relaxed text-sm">You connect your own Stripe. Payments go directly to you — Skedence doesn&apos;t take a cut of revenue. You pay a flat monthly subscription, that&apos;s it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-background"></div>
        <div className="container mx-auto max-w-3xl text-center space-y-8 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">Sound Like You?</h2>
          <p className="text-xl text-foreground/60 font-light">Try it free for 14 days. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/register" className="btn-premium inline-flex items-center gap-3">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/support" className="btn-secondary">Talk to Us First</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-6 bg-black text-center">
        <p className="text-sm text-foreground/40 uppercase tracking-wider">&copy; 2026 Skedence. All rights reserved.</p>
      </footer>
    </div>
  );
}
