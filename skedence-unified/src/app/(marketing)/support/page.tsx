import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support - Skedence",
  description: "Get help with Skedence. Find answers to common questions and contact our support team.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="container mx-auto px-4 py-6 border-b border-border">
        <Link href="/" className="text-2xl font-bold text-primary tracking-tight">Skedence</Link>
      </nav>
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground tracking-tight">Support Center</h1>
        
        {/* How Skedence Works Video Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4 text-foreground tracking-tight">How Skedence Works</h2>
          <p className="text-foreground/80 mb-6">
            Watch this quick overview to see how easy it is to manage your coaching business
          </p>
          
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
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
        </section>
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-foreground tracking-tight">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">How do I get started?</h3>
              <p className="text-foreground/80">
                Download the Skedence Admin app from the App Store, create an account, and follow the onboarding steps. You&apos;ll be scheduling sessions in minutes!
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-foreground/80">
                We accept all major credit cards (Visa, Mastercard, American Express, Discover) via Stripe. For client payments, your clients can use credit/debit cards.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Is there a mobile app?</h3>
              <p className="text-foreground/80">
                Yes! We have native iOS apps for both trainers (Skedence Admin) and clients (Skedence) available on the App Store. Android support is coming soon.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I cancel my subscription?</h3>
              <p className="text-foreground/80">
                Yes, you can cancel anytime with no penalties. You&apos;ll keep access until the end of your billing cycle. Your data is retained for 30 days in case you change your mind.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I try before I buy?</h3>
              <p className="text-foreground/80">
                Absolutely! Every new account gets a 14-day free trial with full access to all features. No credit card required to start.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">How secure is my data?</h3>
              <p className="text-foreground/80">
                Very secure! We use bank-level encryption (SSL/TLS), secure cloud infrastructure (Firebase), and comply with GDPR and CCPA regulations.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground tracking-tight">Contact Us</h2>
          <p className="text-foreground/80 mb-4">
            Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you within 24 hours.
          </p>
          <a 
            href="mailto:support@skedence.com" 
            className="btn-premium inline-block"
          >
            Email Support
          </a>
        </section>
      </main>
    </div>
  );
}
