import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Skedence",
  description: "Read Skedence's terms of service. Understand your rights and responsibilities when using our sports coaching scheduling and payment platform.",
  alternates: {
    canonical: 'https://skedence.com/terms',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="container mx-auto px-4 py-6 border-b border-border">
        <a href="/" className="text-2xl font-bold text-primary tracking-tight">Skedence</a>
      </nav>
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 4, 2026</p>
        
        <div className="prose prose-lg max-w-none">
          <p>
            Welcome to Skedence. By using our services, you agree to these terms. 
            Please read them carefully.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground tracking-tight">Using Our Services</h2>
          <p>
            You must follow any policies made available to you within the Services. 
            You may use our Services only as permitted by law.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Your Account</h2>
          <p>
            You are responsible for safeguarding your account and for all activities 
            that occur under your account. You must notify us immediately of any 
            unauthorized use of your account.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Payments and Billing</h2>
          <ul>
            <li>Subscription fees are billed monthly or annually in advance</li>
            <li>All fees are non-refundable except as required by law</li>
            <li>We may change our fees with 30 days notice</li>
            <li>Payment processing is handled securely through Stripe</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Termination</h2>
          <p>
            You may cancel your subscription at any time. We reserve the right to 
            suspend or terminate accounts that violate these terms.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Disclaimer</h2>
          <p>
            Our services are provided &quot;as is&quot; without warranties of any kind. 
            We do not guarantee that our services will always be available or error-free.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground tracking-tight">Contact</h2>
          <p>
            Questions about the Terms of Service? Contact us at{" "}
            <a href="mailto:legal@skedence.com" className="text-primary hover:text-primary/80 transition-colors font-medium">
              legal@skedence.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
