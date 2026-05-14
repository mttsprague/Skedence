import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Skedence",
  description: "Read Skedence's privacy policy. Learn how we collect, use, and protect your personal data across our sports coaching scheduling platform.",
  alternates: {
    canonical: 'https://skedence.com/privacy',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="container mx-auto px-4 py-6 border-b border-border">
        <a href="/" className="text-2xl font-bold text-primary tracking-tight">Skedence</a>
      </nav>
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 4, 2026</p>
        
        <div className="prose prose-lg max-w-none">
          <p>
            Your privacy is important to us. This privacy policy explains how Skedence collects, 
            uses, and protects your personal information.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground tracking-tight">Information We Collect</h2>
          <p>We collect information that you provide directly to us, including:</p>
          <ul>
            <li>Account information (name, email, password)</li>
            <li>Profile information (photo, bio, credentials)</li>
            <li>Business information (schedule, clients, sessions)</li>
            <li>Payment information (processed securely through Stripe)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Process transactions and send notifications</li>
            <li>Communicate with you about our services</li>
            <li>Ensure the security of our platform</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Data Security</h2>
          <p>
            We use industry-standard encryption and security measures to protect your data. 
            All data is stored securely on Firebase servers with regular backups.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground tracking-tight">Contact Us</h2>
          <p>
            If you have any questions about this privacy policy, please contact us at{" "}
            <a href="mailto:privacy@skedence.com" className="text-primary hover:text-primary/80 transition-colors font-medium">
              privacy@skedence.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
