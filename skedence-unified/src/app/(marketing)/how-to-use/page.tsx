import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Set Up Sports Coaching Scheduling Software",
  description: "Learn how to set up Skedence for your coaching business in 4 steps: create your account, set up pricing, connect Stripe, and invite your clients.",
};

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    time: "~2 minutes",
    description: "Sign up with your email and basic business details. No credit card required — you get a full 14-day free trial with every plan.",
    details: [
      "Enter your name, email, and organization name",
      "Choose your subscription plan (you can change this later)",
      "Your admin dashboard is created immediately",
    ],
    cta: null,
  },
  {
    number: "02",
    title: "Set Your Pricing",
    time: "~5 minutes",
    description: "Define the lesson packages you sell. You can create custom pricing tiers — for example, one tier for private lessons and another for clinics — each with their own packages and prices.",
    details: [
      "Create tiers (e.g. \"Private Lessons\", \"Group Clinics\")",
      "Add packages within each tier — 1 athlete, 2 athletes, 10-pack classes, etc.",
      "Set your price per package in dollars",
      "Clients will see these options when purchasing passes in the app",
    ],
    cta: null,
  },
  {
    number: "03",
    title: "Connect Stripe & Accept Payments",
    time: "~5 minutes",
    description: "Connect your own Stripe account so payments go directly to you. Skedence doesn't take a cut — you keep 100% of client revenue and pay only the standard Stripe processing fee.",
    details: [
      "Click \"Connect Stripe\" in Settings → Billing",
      "You'll be redirected to Stripe to create or connect an Express account",
      "Add your business details, bank account, and verify your identity",
      "Once approved, clients can purchase passes with any credit or debit card",
    ],
    tip: "Stripe approval typically takes a few minutes for most accounts. Have your bank routing and account number ready.",
    cta: {
      text: "Start Free Trial — It's Free",
      href: "/register",
    },
  },
  {
    number: "04",
    title: "Add Trainers & Set Availability",
    time: "~3 minutes per trainer",
    description: "Invite your coaches or trainers. Each trainer gets their own login and manages their own schedule. As an owner, you can see and manage everyone's availability from the admin portal.",
    details: [
      "Go to Trainers → Add Trainer and enter their name and email",
      "They'll receive an email with a secure link to set up their password",
      "Once logged into the SkedenceAdmin iOS app, they can create their available time slots",
      "Availability slots show up instantly for clients to book",
    ],
    cta: null,
  },
  {
    number: "05",
    title: "Invite Your Clients",
    time: "~1 minute per client",
    description: "Add your existing clients to the system. They download the free Skedence iOS app, log in, and can immediately see your availability, purchase lesson passes, and book sessions.",
    details: [
      "Go to Clients → Add Client and enter their name and email",
      "They'll receive a welcome email with download instructions",
      "Clients purchase a lesson pass in-app (this charges their card via Stripe)",
      "With a pass, they can browse trainer availability and book sessions",
      "Both the client and trainer get an email confirmation",
    ],
    cta: {
      text: "Start Free Trial",
      href: "/register",
    },
  },
];

const faqs = [
  {
    q: "Do my clients need to download an app?",
    a: "Yes — clients use the free Skedence iOS app to book sessions, purchase passes, and view their schedule. It's available on the App Store.",
  },
  {
    q: "Can I import my existing clients?",
    a: "You can manually add clients one by one from the admin portal. Each client receives an email to set up their account.",
  },
  {
    q: "What if I'm the only trainer?",
    a: "That's fine — you can be both the owner and the trainer. You manage everything from the SkedenceAdmin app and web portal.",
  },
  {
    q: "When do I get paid?",
    a: "Stripe deposits funds on a standard payout schedule (typically 2 business days after a charge). Skedence never holds your money.",
  },
  {
    q: "Can I change my pricing after setup?",
    a: "Yes. You can update your pricing structure at any time in Settings → Pricing. Changes apply to new purchases immediately.",
  },
  {
    q: "What if a client has remaining lessons when they cancel?",
    a: "Lesson pass balances are tracked per client. You can manually adjust balances or issue refunds through the admin portal.",
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
};

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
              <Link href="/about" className="hidden md:block text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Who It&apos;s For</Link>
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
            <span className="text-xs font-bold text-primary tracking-widest uppercase">[ Getting Started ]</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight text-foreground leading-[0.95] uppercase">
            Up & Running<br />in <span className="text-primary">15 Minutes</span>
          </h1>
          <p className="text-xl text-foreground/70 max-w-2xl leading-relaxed font-light">
            Here&apos;s exactly what happens from the moment you sign up to your first client booking a session.
          </p>
          <Link href="/register" className="btn-premium inline-flex items-center gap-3">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl space-y-8">
          {steps.map((step) => (
            <div key={step.number} className="premium-card p-8 md:p-12 space-y-6">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-black flex items-center justify-center text-xl font-black flex-shrink-0 shadow-xl shadow-primary/30">
                  {step.number}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-wide">{step.title}</h2>
                    <span className="text-xs font-bold text-primary/70 bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">{step.time}</span>
                  </div>
                  <p className="text-foreground/60 leading-relaxed">{step.description}</p>
                </div>
              </div>

              <ul className="space-y-3 pl-4 border-l-2 border-primary/20 ml-8">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-3 text-sm text-foreground/70">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              {step.tip && (
                <div className="ml-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-sm text-foreground/60"><span className="text-primary font-bold">Tip: </span>{step.tip}</p>
                </div>
              )}

              {step.cta && (
                <div className="ml-8 pt-2">
                  <Link href={step.cta.href} className="btn-premium inline-flex items-center gap-3">
                    {step.cta.text}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-4 mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Common Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq) => (
              <div key={faq.q} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">{faq.q}</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-background"></div>
        <div className="container mx-auto max-w-3xl text-center space-y-8 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">Ready to Start?</h2>
          <p className="text-xl text-foreground/60 font-light">14-day free trial. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/register" className="btn-premium inline-flex items-center gap-3">
              Create Your Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/support" className="btn-secondary">Have Questions?</Link>
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
