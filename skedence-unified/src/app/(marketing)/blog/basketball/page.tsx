import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fetchPostsBySport } from '@/lib/blog-category-fetch';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Basketball Coaching Articles & Tips | Skedence Blog',
  description:
    'Basketball training tips, skill development drills, scheduling strategies, and business advice for private basketball trainers and coaches.',
  keywords: [
    'basketball coaching tips',
    'basketball training drills',
    'basketball lesson scheduling',
    'basketball trainer software',
    'basketball coach business',
  ],
  alternates: { canonical: 'https://skedence.com/blog/basketball' },
  openGraph: {
    title: 'Basketball Coaching Articles & Tips | Skedence Blog',
    description:
      'Basketball training tips, skill development drills, and business advice for private basketball trainers.',
    url: 'https://skedence.com/blog/basketball',
    siteName: 'Skedence',
    type: 'website',
    images: [{ url: 'https://skedence.com/og-basketball.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Basketball Coaching Articles & Tips | Skedence Blog',
    description:
      'Basketball training tips, skill development drills, and business advice for private basketball trainers.',
    images: ['https://skedence.com/og-basketball.png'],
  },
};

export default async function BasketballBlogPage() {
  const posts = await fetchPostsBySport('basketball');

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Basketball Coaching Articles | Skedence Blog',
    description:
      'Basketball training tips, skill development drills, and business advice for private basketball trainers.',
    url: 'https://skedence.com/blog/basketball',
    isPartOf: { '@type': 'Blog', url: 'https://skedence.com/blog' },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/50">
                <span className="text-black font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">Skedence</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/blog" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Blog</Link>
              <Link href="/register" className="btn-premium text-sm">Start Free Trial →</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            All Articles
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">🏀 Basketball</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase leading-tight mb-4">
            Basketball<br />Coaching Articles
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl">
            Training drills, scheduling tips, and business advice for private basketball trainers.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-foreground/60">No basketball articles yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group premium-card p-6 hover:border-primary/50 transition-all duration-300 flex flex-col"
                >
                  {post.featuredImage && (
                    <div className="relative w-full h-44 mb-4 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={post.featuredImage}
                        alt={post.featuredImageAlt || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-foreground/60 mb-4 line-clamp-3 flex-1 text-sm">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-foreground/40 pt-4 border-t border-border/50">
                    <span>{post.publishedAt ? format(post.publishedAt, 'MMM d, yyyy') : 'Recently published'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-4xl font-black text-foreground uppercase">Manage Your Basketball Business</h2>
          <p className="text-lg text-foreground/60">Scheduling, training packages, and payments — all in one app built for basketball trainers.</p>
          <Link href="/basketball" className="btn-premium inline-flex items-center gap-2">
            See Basketball Features <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-6 bg-black text-center">
        <p className="text-sm text-foreground/40 uppercase tracking-wider">&copy; 2026 Skedence. All rights reserved.</p>
      </footer>
    </div>
  );
}
