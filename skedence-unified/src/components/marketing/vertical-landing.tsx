'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Check, ArrowRight, Star } from 'lucide-react';

interface Benefit {
  title: string;
  description: string;
}

interface Feature {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface VerticalLandingProps {
  sportName: string;
  headline: string;
  subheadline: string;
  primaryKeyword: string;
  secondaryKeyword: string;
  benefits: Benefit[];
  features: Feature[];
  faqs: FaqItem[];
  videoUrl?: string;
  videoTitle?: string;
}

export default function VerticalLanding({
  sportName,
  headline,
  subheadline,
  benefits,
  features,
  faqs,
  videoUrl,
  videoTitle,
}: VerticalLandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Features</Link>
              <Link href="/#pricing" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</Link>
              <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Sign In</Link>
              <Link href="/register" className="btn-premium text-sm">Start Free Trial →</Link>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <div className={`md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300 ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="container mx-auto px-6 py-6 space-y-4">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-orange-500 hover:text-orange-400 uppercase tracking-wide py-3 border-b border-border/30">Sign In</Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block btn-premium text-center mt-4">Start 14-Day Free Trial →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent"></div>
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">[ {sportName} Coaches ]</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[0.95] uppercase">
              {headline}
            </h1>
            <p className="text-xl md:text-2xl text-foreground/70 max-w-2xl leading-relaxed font-light">
              {subheadline}
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-5 pt-4">
              <Link href="/register" className="btn-premium inline-flex items-center gap-3 text-base">
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/how-to-use" className="btn-secondary inline-flex items-center gap-3 text-base">
                See How It Works
              </Link>
            </div>
            <div className="flex items-center gap-8 text-sm text-foreground/50 pt-4 font-medium">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /><span>14-day free trial</span></div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /><span>Cancel anytime</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Video */}
      {videoUrl && (
        <section className="py-24 px-6 bg-gradient-to-b from-background via-muted/10 to-background">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center space-y-4 mb-10">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">
                {videoTitle || `See ${sportName} Training in Action`}
              </h2>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 bg-black">
              <video controls preload="metadata" poster="/Screenshots/WebApp1.png" className="w-full h-full object-contain">
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="text-center mt-10">
              <Link href="/register" className="btn-premium inline-flex items-center gap-3">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Why {sportName} Coaches Choose Skedence</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300">
                <Check className="w-6 h-6 text-primary mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-3 uppercase tracking-wide">{benefit.title}</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Up & Running in 15 Minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: '1', title: 'Set your availability', desc: 'Add your training times, locations, and lesson package pricing.' },
              { n: '2', title: 'Invite your clients', desc: 'Clients download the free Skedence iPhone app and purchase a lesson pass.' },
              { n: '3', title: 'Start training', desc: 'Clients book directly from the app. Payments land in your Stripe account.' },
            ].map((step) => (
              <div key={step.n} className="text-center space-y-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-black flex items-center justify-center text-3xl font-black mx-auto shadow-xl shadow-primary/30">{step.n}</div>
                <h3 className="text-xl font-bold text-foreground uppercase tracking-wide">{step.title}</h3>
                <p className="text-foreground/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/how-to-use" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              Full setup guide →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Everything You Need</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="premium-card p-8">
                <h3 className="text-base font-bold text-foreground mb-2 uppercase tracking-wide">{feature.title}</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="premium-card p-10 md:p-14 space-y-8">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-primary text-primary" />)}
            </div>
            <p className="text-foreground/80 leading-relaxed text-xl font-light">&quot;Before Skedence, I was managing lesson passes in spreadsheets and scheduling through text chains. Now our clients purchase passes in the app, book their own sessions, and our coaches get notified automatically. It&apos;s saved us hours every week.&quot;</p>
            <div className="pt-6 border-t border-border flex items-center justify-between flex-wrap gap-6">
              <div>
                <p className="font-bold text-foreground">Jeffrey Schmitz</p>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">Owner · PolyFace Volleyball Academy</p>
                <a href="https://polyfacevolleyball.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary/80 transition-colors mt-1 inline-block">polyfacevolleyball.com →</a>
              </div>
              <a href="https://polyfacevolleyball.com" target="_blank" rel="noopener noreferrer">
                <img src="/polyface-logo.png" alt="PolyFace Volleyball Academy" className="h-16 w-auto opacity-90 hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">FAQ</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq) => (
              <div key={faq.question} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">{faq.question}</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-background"></div>
        <div className="container mx-auto max-w-5xl text-center space-y-8 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">Run Your {sportName} Business Like a Business</h2>
          <p className="text-xl text-foreground/60 font-light">Sell packages, automate booking, and stop chasing payments.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/register" className="btn-premium inline-flex items-center gap-3">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/support" className="btn-secondary">Contact Us</Link>
          </div>
          <p className="text-sm text-foreground/40 uppercase tracking-wider">14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-6 bg-black text-center">
        <p className="text-sm text-foreground/40 uppercase tracking-wider">&copy; 2026 Skedence. All rights reserved.</p>
      </footer>
    </div>
  );
}

