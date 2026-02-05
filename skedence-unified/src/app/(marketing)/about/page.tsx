import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - Skedence",
  description: "Learn about Skedence and our mission to help personal trainers grow their businesses.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="container mx-auto px-4 py-6 border-b">
        <a href="/" className="text-2xl font-bold text-blue-600">Skedence</a>
      </nav>
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">About Skedence</h1>
        <div className="prose prose-lg">
          <p className="text-xl text-gray-600 mb-8">
            Skedence is designed to help personal trainers focus on what they do best: training clients and building relationships.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p>
            We believe that personal trainers should spend their time training, not managing spreadsheets and chasing payments. 
            Skedence automates the business side of personal training so you can focus on your clients.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">What We Offer</h2>
          <ul className="space-y-2">
            <li>Smart scheduling that syncs across all your devices</li>
            <li>Client management with progress tracking</li>
            <li>Integrated payment processing</li>
            <li>Group class management</li>
            <li>Business analytics and insights</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Get Started</h2>
          <p>
            Ready to streamline your personal training business? 
            <a href="/login" className="text-blue-600 hover:underline ml-1">Sign up today</a> and try Skedence free for 14 days.
          </p>
        </div>
      </main>
    </div>
  );
}
