import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Sports Coaching Scheduling Software",
  description: "Skedence pricing plans starting at $29/month. All plans include a 14-day free trial, unlimited clients, payment processing, and lesson pass tracking for sports coaches.",
  openGraph: {
    title: "Skedence Pricing — Sports Coaching Scheduling Software",
    description: "Plans starting at $29/month. Unlimited clients, payment processing, and lesson pass tracking for sports coaches. 14-day free trial on all plans.",
    url: "https://skedence.com/pricing-plans",
    siteName: "Skedence",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skedence Pricing — Sports Coaching Scheduling Software",
    description: "Plans starting at $29/month. Unlimited clients, payment processing, and lesson pass tracking for sports coaches.",
  },
  alternates: {
    canonical: "https://skedence.com/pricing-plans",
  },
};

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Skedence",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS",
  "description": "Scheduling software for sports coaches — booking, lesson passes, and payments in one platform.",
  "url": "https://skedence.com",
  "offers": [
    {
      "@type": "Offer",
      "name": "Starter",
      "price": "29",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "29",
        "priceCurrency": "USD",
        "unitText": "MONTH"
      },
      "description": "Perfect for solo coaches. 1 trainer, 1 location, unlimited clients, payment processing."
    },
    {
      "@type": "Offer",
      "name": "Studio",
      "price": "99",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "99",
        "priceCurrency": "USD",
        "unitText": "MONTH"
      },
      "description": "For growing businesses. Up to 5 trainers, 3 locations, group classes, priority support."
    },
    {
      "@type": "Offer",
      "name": "Academy",
      "price": "249",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "249",
        "priceCurrency": "USD",
        "unitText": "MONTH"
      },
      "description": "For large facilities. Up to 15 trainers, 10 locations, API access, dedicated support."
    }
  ]
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does Skedence cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Skedence plans start at $29/month for solo coaches (Starter), $99/month for growing teams (Studio), and $249/month for large academies. Enterprise pricing is custom. All plans include a 14-day free trial."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Every plan includes a 14-day free trial with no credit card required. You get full access to all features during the trial."
      }
    },
    {
      "@type": "Question",
      "name": "Does Skedence take a percentage of payments?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Skedence never takes a cut of your client payments. You connect your own Stripe account and keep 100% of revenue. You only pay the monthly subscription fee plus standard Stripe processing fees."
      }
    },
    {
      "@type": "Question",
      "name": "Can I change plans later?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. You can upgrade or downgrade your plan at any time from your account settings. Changes take effect on your next billing cycle."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods do clients use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Clients pay with any major credit or debit card through the Skedence iPhone app. Payments go directly to your Stripe account — Skedence never holds your money."
      }
    }
  ]
};

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    tagline: "Perfect for solo coaches",
    features: [
      "1 trainer account",
      "1 location",
      "Unlimited clients",
      "Lesson pass tracking",
      "Payment processing via Stripe",
      "iOS client app included",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: false,
  },
  {
    name: "Studio",
    price: "$99",
    period: "/month",
    tagline: "For growing businesses",
    features: [
      "Up to 5 trainers",
      "3 locations",
      "Everything in Starter",
      "Group classes",
      "Custom pricing tiers",
      "Booking notifications",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: true,
  },
  {
    name: "Academy",
    price: "$249",
    period: "/month",
    tagline: "For large facilities",
    features: [
      "Up to 15 trainers",
      "10 locations",
      "Everything in Studio",
      "API access",
      "Advanced analytics",
      "Intake forms",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For franchises & large orgs",
    features: [
      "Unlimited trainers",
      "Unlimited locations",
      "White-label solution",
      "SLA guarantee",
      "Custom integrations",
      "Account manager",
      "Volume pricing",
    ],
    cta: "Contact Sales",
    href: "/support",
    popular: false,
  },
];

const faqs = [
  {
    q: "Does Skedence take a cut of my payments?",
    a: "No. You connect your own Stripe account and keep 100% of client payments. You only pay the monthly subscription fee plus standard Stripe processing fees (~2.9% + 30¢ per transaction).",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — every plan includes a 14-day free trial with no credit card required. Full access to all features from day one.",
  },
  {
    q: "What do my clients need to use Skedence?",
    a: "Clients download the free Skedence iPhone app to book sessions, purchase lesson passes, and view their schedule. No web login required for clients.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrade or downgrade anytime from your account settings. Changes apply on your next billing cycle.",
  },
  {
    q: "What sports does Skedence support?",
    a: "Any sport with private or group lessons — volleyball, basketball, soccer, baseball, tennis, gymnastics, martial arts, and more. Skedence is sport-agnostic.",
  },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="py-24 px-6 text-center">
          <div className="container mx-auto max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Simple Pricing</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground uppercase">
              Transparent<br /><span className="text-primary">Pricing</span>
            </h1>
            <p className="text-xl text-foreground/60 font-light max-w-2xl mx-auto">
              All plans include a 14-day free trial. No credit card required. No hidden fees. You keep 100% of your client payments.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`premium-card p-10 space-y-8 flex flex-col relative ${
                    plan.popular ? "border-2 border-primary shadow-[0_0_40px_rgba(255,107,53,0.3)]" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-black px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-xl shadow-primary/50 whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-3 uppercase tracking-wide">{plan.name}</h2>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-black text-foreground">{plan.price}</span>
                      {plan.period && <span className="text-foreground/50 font-medium">{plan.period}</span>}
                    </div>
                    <p className="text-sm text-foreground/50 uppercase tracking-wide">{plan.tagline}</p>
                  </div>
                  <ul className="space-y-4 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/70">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={plan.popular ? "btn-premium w-full text-center" : "btn-secondary w-full text-center"}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-6 bg-muted/20">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase text-center mb-16">
              Pricing FAQ
            </h2>
            <div className="space-y-8">
              {faqs.map((faq) => (
                <div key={faq.q} className="space-y-3">
                  <h3 className="text-lg font-bold text-foreground">{faq.q}</h3>
                  <p className="text-foreground/60 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center">
          <div className="container mx-auto max-w-2xl space-y-8">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">
              Start Your Free Trial
            </h2>
            <p className="text-xl text-foreground/60 font-light">
              14 days free. No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-premium inline-flex items-center gap-3">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/support" className="btn-secondary inline-flex items-center gap-3">
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
