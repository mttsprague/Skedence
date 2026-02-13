import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support - Skedence",
  description: "Get help with Skedence. Find answers to common questions and contact our support team.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="container mx-auto px-4 py-6 border-b">
        <a href="/" className="text-2xl font-bold text-blue-600">Skedence</a>
      </nav>
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">Support Center</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">How do I get started?</h3>
              <p className="text-foreground/80">
                Sign up for a free account, complete your profile, and start adding clients. 
                You can begin scheduling sessions right away.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-foreground/80">
                We integrate with Stripe to accept all major credit cards, debit cards, and digital wallets.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Is there a mobile app?</h3>
              <p className="text-foreground/80">
                Yes! We have iOS apps for both trainers and clients available on the App Store.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I cancel my subscription?</h3>
              <p className="text-foreground/80">
                Yes, you can cancel anytime from your account settings. No contracts or cancellation fees.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-foreground/80 mb-4">
            Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you within 24 hours.
          </p>
          <a 
            href="mailto:support@skedence.com" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Email Support
          </a>
        </section>
      </main>
    </div>
  );
}
