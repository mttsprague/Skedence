'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, BookOpen, Shield, Menu, X } from 'lucide-react';

export default function SupportPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/50">
                <span className="text-black font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">Skedence</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-10">
              <Link href="/#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Features</Link>
              <Link href="/#pricing" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</Link>
              <Link href="/blog" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Blog</Link>
              <Link href="/support" className="text-sm font-medium text-primary transition-colors uppercase tracking-wide">Support</Link>
              <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Sign In</Link>
              <Link href="/register" className="btn-premium text-sm">
                Start 14-Day Free Trial →
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="container mx-auto px-6 py-6 space-y-4">
            <Link href="/#features" className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">
              Features
            </Link>
            <Link href="/#pricing" className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">
              Pricing
            </Link>
            <Link href="/blog" className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">
              Blog
            </Link>
            <Link href="/support" className="block text-base font-medium text-primary transition-colors uppercase tracking-wide py-3 border-b border-border/30">
              Support
            </Link>
            <Link href="/login" className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30">
              Sign In
            </Link>
            <Link href="/register" className="block btn-premium text-center mt-4">
              Start 14-Day Free Trial →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"></div>
        
        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight uppercase mb-6">
            How Can We <span className="text-primary">Help You?</span>
          </h1>
          <p className="text-xl md:text-2xl text-foreground/60 font-light">
            Get the support you need to make the most of Skedence
          </p>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-20 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {/* Email Support */}
            <div className="premium-card p-8 text-center hover:shadow-premium-lg transition-all duration-300">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Email Support</h3>
              <p className="text-foreground/60 mb-4">Get help from our support team</p>
              <a href="mailto:support@skedence.com" className="text-primary font-bold text-lg hover:text-primary/80 transition-colors">
                support@skedence.com
              </a>
              <p className="text-sm text-foreground/50 mt-4">Response time: Within 24 hours</p>
            </div>

            {/* Documentation */}
            <div className="premium-card p-8 text-center hover:shadow-premium-lg transition-all duration-300">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Documentation</h3>
              <p className="text-foreground/60 mb-4">Comprehensive guides and tutorials</p>
              <p className="text-sm text-foreground/50">Coming soon - detailed setup guides, video tutorials, and best practices</p>
            </div>

            {/* Enterprise Support */}
            <div className="premium-card p-8 text-center hover:shadow-premium-lg transition-all duration-300">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Enterprise Support</h3>
              <p className="text-foreground/60 mb-4">Dedicated account manager</p>
              <a href="mailto:enterprise@skedence.com" className="text-primary font-bold text-lg hover:text-primary/80 transition-colors">
                enterprise@skedence.com
              </a>
              <p className="text-sm text-foreground/50 mt-4">Priority response & phone support</p>
            </div>
          </div>
        </div>
      </section>

      {/* How Skedence Works Video Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-muted/10 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">How Skedence Works</h2>
            <p className="text-lg text-foreground/60 font-light max-w-2xl mx-auto">
              Watch this quick overview to see how easy it is to manage your coaching business
            </p>
          </div>
          
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 bg-black">
            <video 
              className="w-full h-full object-contain"
              controls
              preload="auto"
              crossOrigin="anonymous"
              playsInline
            >
              <source src="https://storage.googleapis.com/polyface-ae6d3.firebasestorage.app/marketing-videos/skedence-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/register" className="btn-premium inline-flex items-center gap-3">
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Frequently Asked Questions</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="premium-card p-6">
                <h3 className="text-xl font-bold text-foreground mb-3">{faq.question}</h3>
                <p className="text-foreground/60 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16 px-6 bg-black">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/#features" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Pricing</Link></li>
                <li><Link href="/support" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">About</Link></li>
                <li><Link href="/support" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Legal</h4>
              <ul className="space-y-3">
                <li><a href="/privacy.html" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms.html" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Connect</h4>
              <p className="text-sm text-orange-500">support@skedence.com</p>
            </div>
          </div>
          
          <div className="border-t border-border/30 pt-8 text-center">
            <p className="text-sm text-foreground/40">&copy; 2026 Skedence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const faqs = [
  {
    question: "How do I get started?",
    answer: "Download the Skedence Admin app from the App Store, create an account, and follow the onboarding steps. You'll be scheduling sessions in minutes!"
  },
  {
    question: "What devices are supported?",
    answer: "Skedence is available as a native iOS app for both iPhone and iPad. Android support is coming soon."
  },
  {
    question: "How do my clients book sessions?",
    answer: "Your clients download the Skedence app, create an account, and use your unique booking code or link to access your schedule."
  },
  {
    question: "Can I import my existing client list?",
    answer: "Yes! You can manually add clients one by one, or email us a CSV file at support@skedence.com and we'll help with bulk import."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) via Stripe. For client payments, your clients can use credit/debit cards."
  },
  {
    question: "Is there a setup fee?",
    answer: "No! There are no setup fees, no contracts, and no hidden charges. You only pay the monthly subscription fee for your plan."
  },
  {
    question: "Can I try before I buy?",
    answer: "Absolutely! Every new account gets a 14-day free trial with full access to all features. No credit card required to start."
  },
  {
    question: "How secure is my data?",
    answer: "Very secure! We use bank-level encryption (SSL/TLS), secure cloud infrastructure (Firebase), and comply with GDPR and CCPA regulations."
  },
  {
    question: "What happens if I cancel?",
    answer: "You can cancel anytime with no penalties. You'll keep access until the end of your billing cycle. Your data is retained for 30 days in case you change your mind."
  },
  {
    question: "Do you offer phone support?",
    answer: "Email support is included with all plans. Phone support and dedicated account managers are available for Enterprise customers."
  },
  {
    question: "Can I customize my booking page?",
    answer: "Yes! Studio and higher plans include custom branding options. You can add your logo, choose colors, and customize your booking experience."
  },
  {
    question: "How do refunds work?",
    answer: "Client refunds are handled through your Stripe account. For subscription refunds, we offer prorated refunds for annual plans cancelled within 30 days."
  }
];
