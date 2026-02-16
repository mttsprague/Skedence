import Link from 'next/link';

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
}

export default function VerticalLanding({
  sportName,
  headline,
  subheadline,
  primaryKeyword,
  secondaryKeyword,
  benefits,
  features,
  faqs,
}: VerticalLandingProps) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="container mx-auto px-4 py-6 border-b border-border">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
            Skedence
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="px-4 py-2 text-sm font-semibold bg-primary text-black rounded-md hover:bg-primary/90 transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <section className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-4">
              {sportName} Coaches
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {headline}
            </h1>
            <p className="text-lg text-foreground/80 mt-5 leading-relaxed">
              {subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/login" className="px-6 py-3 text-sm font-semibold bg-primary text-black rounded-md hover:bg-primary/90 transition-colors">
                Book a Demo
              </Link>
              <Link href="/login" className="px-6 py-3 text-sm font-semibold border border-border rounded-md hover:bg-muted/40 transition-colors">
                See It in Action
              </Link>
            </div>
            <p className="text-sm text-foreground/60 mt-6">
              14-day free trial. No credit card required.
            </p>
          </div>
          <div className="bg-muted/30 border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Built for {sportName} training businesses
            </h2>
            <p className="text-foreground/70 leading-relaxed">
              Skedence is {primaryKeyword} that helps {sportName.toLowerCase()} coaches sell lesson packages,
              manage clients, and keep schedules full. If you are looking for {secondaryKeyword},
              this is built specifically for you.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm text-foreground/70">
              <div>
                <p className="font-semibold text-foreground">Lesson Packages</p>
                <p>Sell bundles and track usage</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Automated Booking</p>
                <p>Clients book online 24/7</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Payments</p>
                <p>Get paid before sessions</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Reminders</p>
                <p>Reduce no-shows fast</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold text-foreground mb-8">Why {sportName} coaches choose Skedence</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="border border-border rounded-xl p-6 bg-background">
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold text-foreground mb-8">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-border rounded-xl p-6 bg-background">
              <p className="text-sm font-semibold text-primary mb-2">Step 1</p>
              <h3 className="text-lg font-semibold text-foreground mb-2">Set your availability</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">Add training times, locations, and lesson types.</p>
            </div>
            <div className="border border-border rounded-xl p-6 bg-background">
              <p className="text-sm font-semibold text-primary mb-2">Step 2</p>
              <h3 className="text-lg font-semibold text-foreground mb-2">Share your booking link</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">Athletes and parents book and pay online.</p>
            </div>
            <div className="border border-border rounded-xl p-6 bg-background">
              <p className="text-sm font-semibold text-primary mb-2">Step 3</p>
              <h3 className="text-lg font-semibold text-foreground mb-2">Run sessions with confidence</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">Track packages, notes, and attendance in one place.</p>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold text-foreground mb-8">Everything you need</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="border border-border rounded-xl p-6 bg-background">
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold text-foreground mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="border border-border rounded-xl p-6 bg-background">
                <h3 className="text-base font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border border-border rounded-2xl p-10 bg-muted/30 text-center">
          <h2 className="text-3xl font-bold text-foreground">Run your {sportName.toLowerCase()} training like a business</h2>
          <p className="text-foreground/70 mt-3">Sell packages, automate booking, and stop chasing payments.</p>
          <div className="flex justify-center mt-6">
            <Link href="/login" className="px-6 py-3 text-sm font-semibold bg-primary text-black rounded-md hover:bg-primary/90 transition-colors">
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
