import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Support - Skedence",
  description: "Get help with Skedence. Find answers to common questions and contact our support team.",
};

const faqs = [
  {
    q: "How do I get started?",
    a: "Create a free account at skedence.com/register. The setup guide walks you through adding your pricing, connecting Stripe, and inviting your first clients — usually under 15 minutes.",
  },
  {
    q: "How do client payments work?",
    a: "Clients purchase lesson passes directly in the Skedence iPhone app using a credit or debit card. Payments go straight to your connected Stripe account. Skedence never holds your money.",
  },
  {
    q: "Do my clients need to download an app?",
    a: "Yes. Clients download the free Skedence app on the App Store for iPhone. They use it to purchase lesson passes, book sessions, and view their schedule.",
  },
  {
    q: "Is there a mobile app for coaches?",
    a: "Yes. The SkedenceAdmin iOS app lets trainers manage their schedule, view bookings, and communicate with clients on the go. Available free on the App Store.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, cancel anytime with no penalties. You keep full access through the end of your billing period. Your data is retained for 30 days in case you change your mind.",
  },
  {
    q: "Is there a free trial?",
    a: "Every new account gets a 14-day free trial with full access to all features. No credit card required to start.",
  },
  {
    q: "How secure is my data?",
    a: "We use bank-level encryption (SSL/TLS), secure cloud infrastructure via Google Firebase, and comply with GDPR and CCPA regulations.",
  },
  {
    q: "Can I use Skedence for group classes?",
    a: "Yes. You can create group class sessions with a maximum participant count, and clients can register using a class pass purchased in the app.",
  },
];

export default function SupportPage() {
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
              <Link href="/#pricing" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</Link>
              <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Sign In</Link>
              <Link href="/register" className="btn-premium text-sm">Start Free Trial →</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background"></div>
        <div className="container mx-auto max-w-4xl relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">[ Support ]</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">How Can We Help?</h1>
          <p className="text-xl text-foreground/60 font-light max-w-2xl mx-auto">Browse common questions below or reach out directly. We typically respond within a few hours.</p>
          <a href="mailto:support@skedence.com" className="btn-premium inline-flex items-center gap-3 mt-4">
            <Mail className="w-4 h-4" />
            support@skedence.com
          </a>
        </div>
      </section>

      {/* Video */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-4 mb-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">See How It Works</h2>
            <p className="text-foreground/50">A quick walkthrough of the Skedence platform</p>
          </div>
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 bg-black">
            <video className="w-full h-full object-contain" controls preload="metadata" poster="/Screenshots/WebApp1.png" playsInline>
              <source src="https://storage.googleapis.com/polyface-ae6d3.firebasestorage.app/marketing-videos/skedence-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq) => (
              <div key={faq.q} className="premium-card p-8 space-y-3">
                <h3 className="text-base font-bold text-foreground">{faq.q}</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="premium-card p-12 text-center space-y-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">Still Need Help?</h2>
              <p className="text-foreground/50 leading-relaxed max-w-lg mx-auto">Send us an email and we&apos;ll get back to you typically within a few hours during business hours.</p>
            </div>
            <a href="mailto:support@skedence.com" className="btn-premium inline-flex items-center gap-3">
              <Mail className="w-4 h-4" />
              Email support@skedence.com
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-foreground/30 uppercase tracking-wider">We respond within a few hours · Mon–Fri</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-6 bg-black">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-foreground/40 uppercase tracking-wider">&copy; 2026 Skedence. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-foreground/40 hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="text-foreground/40 hover:text-primary transition-colors">Terms</Link>
            <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-medium">Start Free Trial →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
