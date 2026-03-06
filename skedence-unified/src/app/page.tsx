'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Star,
  Menu,
  X
} from 'lucide-react';
import ROICalculator from '@/components/roi-calculator';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userData, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to activity feed
  useEffect(() => {
    if (!loading && userData) {
      router.push('/activity');
    }
  }, [userData, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if we're about to redirect
  if (userData) {
    return null;
  }

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
              <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Features</a>
              <a href="#pricing" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</a>
              <Link href="/blog" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Blog</Link>
              <Link href="/support" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Support</Link>
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
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Pricing
            </a>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Blog
            </Link>
            <Link
              href="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Support
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="block btn-premium text-center mt-4"
            >
              Start 14-Day Free Trial →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent"></div>
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="max-w-4xl space-y-10">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">[ We Are Skedence ]</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-foreground leading-[0.95] uppercase">
              Transform Your<br />Coaching <span className="text-primary">Business</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/70 max-w-2xl leading-relaxed font-light">
              Skedence builds comprehensive coaching platforms, unifying scheduling, payments, and client management into a single evolving execution.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start gap-5 pt-4">
              <Link href="/register" className="btn-premium inline-flex items-center gap-3 text-base">
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features" className="btn-secondary inline-flex items-center gap-3 text-base">
                View Features
              </a>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-foreground/50 pt-8 font-medium">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-6 text-primary text-sm font-medium uppercase tracking-wide flex items-center gap-2">
          <span>Scroll for more</span>
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* Product Video Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-background via-muted/10 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">The Complete Journey</h2>
            <p className="text-lg text-foreground/60 font-light max-w-2xl mx-auto">
              From setup to bookings: Watch how coaches set pricing, clients purchase passes, and sessions get booked—all in one platform
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
              <source src="https://firebasestorage.googleapis.com/v0/b/polyface-ae6d3.firebasestorage.app/o/marketing-videos%2Fthe-journey.mp4?alt=media" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/register" className="btn-premium inline-flex items-center gap-3">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Sport Landing Pages */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">Built For Your Sport</h2>
            <p className="text-lg text-foreground/60">Explore Skedence pages tailored to your coaching business</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/volleyball" className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-foreground mb-2">Volleyball</h3>
              <p className="text-sm text-foreground/60">Scheduling and packages for volleyball lessons.</p>
            </Link>
            <Link href="/basketball" className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-foreground mb-2">Basketball</h3>
              <p className="text-sm text-foreground/60">Built for private basketball trainers and clubs.</p>
            </Link>
            <Link href="/baseball" className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-foreground mb-2">Baseball</h3>
              <p className="text-sm text-foreground/60">Lesson packages and booking for baseball coaches.</p>
            </Link>
            <Link href="/soccer" className="premium-card p-6 hover:shadow-premium-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-foreground mb-2">Soccer</h3>
              <p className="text-sm text-foreground/60">Scheduling built for soccer training businesses.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">Everything You Need</h2>
            <p className="text-xl text-foreground/60 font-light">Powerful features designed specifically for coaches, trainers, and studios</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Calendar className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Smart Scheduling</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Automated booking system with real-time availability. Clients book directly while you stay in control.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <CreditCard className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Built-in Payments</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Secure payment processing powered by Stripe. Sell packages, manage subscriptions, get paid automatically.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Users className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Client Management</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Complete client profiles with booking history, attendance tracking, payment records, and custom notes.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Dumbbell className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Group Classes</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Create and manage group classes with capacity limits, waitlists, and recurring schedules.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <BarChart3 className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Business Analytics</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Track revenue, attendance rates, popular time slots, and client retention with powerful dashboards.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Smartphone className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Mobile Apps</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Native iOS apps for both coaches and clients. Manage your business and book sessions on the go.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Building2 className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Multi-Location</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Manage multiple studios or training locations from one account. Perfect for growing businesses.</p>
            </div>
            
            <div className="premium-card p-8 hover:shadow-premium-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <FileText className="w-7 h-7 text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-wide">Digital Waivers</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">Custom waiver forms with e-signatures. Clients sign electronically before their first session.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">How It Works</h2>
            <p className="text-xl text-foreground/60 font-light">Get up and running in minutes, not days</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-black flex items-center justify-center text-3xl font-black mx-auto shadow-xl shadow-primary/30">
                1
              </div>
              <h3 className="text-2xl font-bold text-foreground uppercase tracking-wide">Create Your Account</h3>
              <p className="text-foreground/50 leading-relaxed">Sign up in 60 seconds. Add your business details, services, and availability.</p>
            </div>
            
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-black flex items-center justify-center text-3xl font-black mx-auto shadow-xl shadow-primary/30">
                2
              </div>
              <h3 className="text-2xl font-bold text-foreground uppercase tracking-wide">Invite Your Clients</h3>
              <p className="text-foreground/50 leading-relaxed">Share your booking link or import existing clients. They download the app and book instantly.</p>
            </div>
            
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-black flex items-center justify-center text-3xl font-black mx-auto shadow-xl shadow-primary/30">
                3
              </div>
              <h3 className="text-2xl font-bold text-foreground uppercase tracking-wide">Start Training</h3>
              <p className="text-foreground/50 leading-relaxed">Accept bookings, process payments, and focus on what you do best—coaching.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">Trusted Worldwide</h2>
            <p className="text-xl text-foreground/60 font-light">See what trainers are saying about Skedence</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="premium-card p-10 space-y-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/70 leading-relaxed text-lg">&quot;Skedence has completely transformed how I run my personal training business. No more back-and-forth texts trying to schedule sessions!&quot;</p>
              <div className="pt-6 border-t border-border">
                <p className="font-bold text-foreground text-lg">Sarah Johnson</p>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">Personal Trainer, Los Angeles</p>
              </div>
            </div>
            
            <div className="premium-card p-10 space-y-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/70 leading-relaxed text-lg">&quot;The payment processing is seamless. I love that clients can purchase packages right from the app. My revenue has increased 40% since switching.&quot;</p>
              <div className="pt-6 border-t border-border">
                <p className="font-bold text-foreground text-lg">Mike Chen</p>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">CrossFit Coach, San Francisco</p>
              </div>
            </div>
            
            <div className="premium-card p-10 space-y-6">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/70 leading-relaxed text-lg">&quot;Managing three studio locations used to be a nightmare. Now everything is organized in one place. Game changer for our business.&quot;</p>
              <div className="pt-6 border-t border-border">
                <p className="font-bold text-foreground text-lg">Jessica Martinez</p>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">Yoga Studio Owner, Austin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-32 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl">
          <ROICalculator />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">Transparent Pricing</h2>
            <p className="text-xl text-foreground/60 font-light">Choose the plan that fits your business. All plans include a 14-day free trial.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Starter */}
            <div className="premium-card p-10 space-y-8 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Starter</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-black text-foreground">$29</span>
                  <span className="text-foreground/50 font-medium">/month</span>
                </div>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">Perfect for solo coaches</p>
              </div>
              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">1 trainer account</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">1 location</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Unlimited clients</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Payment processing</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Email support</span>
                </li>
              </ul>
              <Link href="/register" className="btn-premium w-full text-center">Start Free Trial</Link>
            </div>
            
            {/* Studio */}
            <div className="premium-card p-10 space-y-8 flex flex-col relative border-2 border-primary shadow-[0_0_40px_rgba(255,107,53,0.3)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-black px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-xl shadow-primary/50 whitespace-nowrap">Most Popular</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Studio</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-black text-foreground">$99</span>
                  <span className="text-foreground/50 font-medium">/month</span>
                </div>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">For growing businesses</p>
              </div>
              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Up to 5 trainers</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">3 locations</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Everything in Starter</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Group classes</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Priority support</span>
                </li>
              </ul>
              <Link href="/register" className="btn-premium w-full text-center">Start Free Trial</Link>
            </div>
            
            {/* Academy */}
            <div className="premium-card p-10 space-y-8 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Academy</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-black text-foreground">$249</span>
                  <span className="text-foreground/50 font-medium">/month</span>
                </div>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">For large facilities</p>
              </div>
              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Up to 15 trainers</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">10 locations</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Everything in Studio</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">API access</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Dedicated support</span>
                </li>
              </ul>
              <Link href="/register" className="btn-premium w-full text-center">Start Free Trial</Link>
            </div>
            
            {/* Enterprise */}
            <div className="premium-card p-10 space-y-8 flex flex-col">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">Enterprise</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-black text-foreground">Custom</span>
                </div>
                <p className="text-sm text-foreground/50 uppercase tracking-wide">For franchises</p>
              </div>
              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Unlimited trainers</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Unlimited locations</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">White-label solution</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">SLA guarantee</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">Account manager</span>
                </li>
              </ul>
              <Link href="/support" className="btn-secondary w-full text-center">Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-6 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">FAQ</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-foreground">How does the free trial work?</h3>
              <p className="text-foreground/50 leading-relaxed">Start with a 14-day free trial with full access to all features.</p>
            </div>
            
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-foreground">Can I cancel anytime?</h3>
              <p className="text-foreground/50 leading-relaxed">Yes! Cancel anytime with no penalties or cancellation fees. Your data remains accessible for 30 days.</p>
            </div>
            
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-foreground">How does payment processing work?</h3>
              <p className="text-foreground/50 leading-relaxed">We use Stripe for secure payment processing. Stripe charges 2.9% + $0.30 per transaction.</p>
            </div>
            
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-foreground">Do my clients need to download an app?</h3>
              <p className="text-foreground/50 leading-relaxed">Yes, your clients download the free Skedence app (iOS) to book sessions and manage their schedule.</p>
            </div>
            
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-foreground">Can I import my existing clients?</h3>
              <p className="text-foreground/50 leading-relaxed">Absolutely! You can manually add clients or import them via CSV. We offer migration assistance too.</p>
            </div>
            
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-foreground">Is my data secure?</h3>
              <p className="text-foreground/50 leading-relaxed">Yes. We use bank-level encryption, secure cloud infrastructure, and comply with GDPR and CCPA regulations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent"></div>
        
        <div className="container mx-auto max-w-5xl text-center space-y-10 relative z-10">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-foreground uppercase leading-tight">Ready to Transform<br />Your Business?</h2>
          <p className="text-xl md:text-2xl text-foreground/60 font-light">Join hundreds of coaches using Skedence to save time and grow</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <Link href="/register" className="btn-premium">Start 14-Day Free Trial</Link>
            <Link href="/support" className="btn-secondary">Contact Sales</Link>
          </div>
          <p className="text-sm text-foreground/40 uppercase tracking-wider font-medium">14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16 px-6 bg-black">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Pricing</a></li>
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
                <li><Link href="/privacy" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Connect</h4>
              <p className="text-sm text-orange-500">Matt.Sprague@skedence.com</p>
            </div>
          </div>
          
          <div className="pt-10 border-t border-border/50 text-center">
            <p className="text-sm text-foreground/40 uppercase tracking-wider">&copy; 2026 Skedence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
