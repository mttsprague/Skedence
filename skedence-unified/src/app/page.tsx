'use client';

import Link from 'next/link';
import { 
  Calendar, 
  CreditCard, 
  Users, 
  Dumbbell, 
  BarChart3, 
  Smartphone, 
  Building2, 
  FileText,
  Check,
  ArrowRight,
  Star
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">Skedence</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Pricing</a>
              <a href="/support" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Support</a>
              <Link href="/login" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/login" className="btn-premium text-sm">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <span className="text-xs font-semibold text-primary tracking-wide">TRUSTED BY 500+ COACHES</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-tight">
              Run Your Coaching<br />Business With <span className="text-primary">Confidence</span>
            </h1>
            
            <p className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
              All-in-one platform to schedule classes, manage clients, process payments, and grow your coaching business. No more juggling multiple tools.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login" className="btn-premium text-lg px-8 py-4 inline-flex items-center gap-2">
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features" className="px-8 py-4 rounded-lg font-medium text-lg text-foreground border border-input hover:bg-accent transition-all duration-200">
                See How It Works
              </a>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-sm text-foreground/60 pt-4">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Full access during trial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Everything You Need to Succeed</h2>
            <p className="text-xl text-foreground/60">Powerful features designed specifically for coaches, trainers, and studios</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Smart Scheduling</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Automated booking system with real-time availability. Clients book directly while you stay in control.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Built-in Payments</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Secure payment processing powered by Stripe. Sell packages, manage subscriptions, get paid automatically.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Client Management</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Complete client profiles with booking history, attendance tracking, payment records, and custom notes.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Group Classes</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Create and manage group classes with capacity limits, waitlists, and recurring schedules.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Business Analytics</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Track revenue, attendance rates, popular time slots, and client retention with powerful dashboards.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Mobile Apps</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Native iOS apps for both coaches and clients. Manage your business and book sessions on the go.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Multi-Location</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Manage multiple studios or training locations from one account. Perfect for growing businesses.</p>
            </div>
            
            <div className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Digital Waivers</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">Custom waiver forms with e-signatures. Clients sign electronically before their first session.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Simple Setup, Powerful Results</h2>
            <p className="text-xl text-foreground/60">Get up and running in minutes, not days</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground">Create Your Account</h3>
              <p className="text-foreground/60 leading-relaxed">Sign up in 60 seconds. Add your business details, services, and availability.</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground">Invite Your Clients</h3>
              <p className="text-foreground/60 leading-relaxed">Share your booking link or import existing clients. They download the app and book instantly.</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground">Start Training</h3>
              <p className="text-foreground/60 leading-relaxed">Accept bookings, process payments, and focus on what you do best—coaching.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Trusted by Coaches Worldwide</h2>
            <p className="text-xl text-foreground/60">See what trainers are saying about Skedence</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="premium-card p-8 space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/80 leading-relaxed">&quot;Skedence has completely transformed how I run my personal training business. No more back-and-forth texts trying to schedule sessions!&quot;</p>
              <div className="pt-4 border-t border-border">
                <p className="font-semibold text-foreground">Sarah Johnson</p>
                <p className="text-sm text-foreground/60">Personal Trainer, Los Angeles</p>
              </div>
            </div>
            
            <div className="premium-card p-8 space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/80 leading-relaxed">&quot;The payment processing is seamless. I love that clients can purchase packages right from the app. My revenue has increased 40% since switching.&quot;</p>
              <div className="pt-4 border-t border-border">
                <p className="font-semibold text-foreground">Mike Chen</p>
                <p className="text-sm text-foreground/60">CrossFit Coach, San Francisco</p>
              </div>
            </div>
            
            <div className="premium-card p-8 space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/80 leading-relaxed">&quot;Managing three studio locations used to be a nightmare. Now everything is organized in one place. Game changer for our business.&quot;</p>
              <div className="pt-4 border-t border-border">
                <p className="font-semibold text-foreground">Jessica Martinez</p>
                <p className="text-sm text-foreground/60">Yoga Studio Owner, Austin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-xl text-foreground/60">Choose the plan that fits your business. All plans include a 14-day free trial.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter */}
            <div className="premium-card p-8 space-y-6 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Starter</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">$29</span>
                  <span className="text-foreground/60">/month</span>
                </div>
                <p className="text-sm text-foreground/60">Perfect for solo coaches</p>
              </div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">1 trainer account</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">1 location</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Unlimited clients</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Payment processing</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Email support</span>
                </li>
              </ul>
              <Link href="/login" className="btn-premium w-full text-center">Start Free Trial</Link>
            </div>
            
            {/* Studio */}
            <div className="premium-card p-8 space-y-6 flex flex-col relative border-2 border-primary">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold">MOST POPULAR</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Studio</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">$99</span>
                  <span className="text-foreground/60">/month</span>
                </div>
                <p className="text-sm text-foreground/60">For growing businesses</p>
              </div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Up to 5 trainers</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">3 locations</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Everything in Starter</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Group classes</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Priority support</span>
                </li>
              </ul>
              <Link href="/login" className="btn-premium w-full text-center">Start Free Trial</Link>
            </div>
            
            {/* Academy */}
            <div className="premium-card p-8 space-y-6 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Academy</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">$249</span>
                  <span className="text-foreground/60">/month</span>
                </div>
                <p className="text-sm text-foreground/60">For large facilities</p>
              </div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Up to 15 trainers</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">10 locations</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Everything in Studio</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">API access</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Dedicated support</span>
                </li>
              </ul>
              <Link href="/login" className="btn-premium w-full text-center">Start Free Trial</Link>
            </div>
            
            {/* Enterprise */}
            <div className="premium-card p-8 space-y-6 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Enterprise</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">Custom</span>
                </div>
                <p className="text-sm text-foreground/60">For franchises</p>
              </div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Unlimited trainers</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Unlimited locations</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">White-label solution</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">SLA guarantee</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">Account manager</span>
                </li>
              </ul>
              <Link href="/support" className="w-full text-center px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors font-medium">Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">How does the free trial work?</h3>
              <p className="text-foreground/60 leading-relaxed">Start with a 14-day free trial with full access to all features. No credit card required to start.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Can I cancel anytime?</h3>
              <p className="text-foreground/60 leading-relaxed">Yes! Cancel anytime with no penalties or cancellation fees. Your data remains accessible for 30 days.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">How does payment processing work?</h3>
              <p className="text-foreground/60 leading-relaxed">We use Stripe for secure payment processing. Stripe charges 2.9% + $0.30 per transaction.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Do my clients need to download an app?</h3>
              <p className="text-foreground/60 leading-relaxed">Yes, your clients download the free Skedence app (iOS) to book sessions and manage their schedule.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Can I import my existing clients?</h3>
              <p className="text-foreground/60 leading-relaxed">Absolutely! You can manually add clients or import them via CSV. We offer migration assistance too.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Is my data secure?</h3>
              <p className="text-foreground/60 leading-relaxed">Yes. We use bank-level encryption, secure cloud infrastructure, and comply with GDPR and CCPA regulations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Ready to Transform Your Coaching Business?</h2>
          <p className="text-xl text-foreground/60">Join hundreds of coaches using Skedence to save time and grow their business</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="btn-premium text-lg px-8 py-4">Start Free Trial</Link>
            <Link href="/support" className="px-8 py-4 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors font-medium text-lg">Contact Sales</Link>
          </div>
          <p className="text-sm text-foreground/60">14-day free trial • No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link href="/support" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-foreground/60 hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/support" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Connect</h4>
              <p className="text-sm text-foreground/60">support@skedence.com</p>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border text-center">
            <p className="text-sm text-foreground/60">&copy; 2026 Skedence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
