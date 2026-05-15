import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Clock, ArrowLeft, ArrowRight, Eye, Tag } from 'lucide-react';
import { BLOG_CATEGORIES, BlogCategory } from '@/types/blog';
import BlogNav from './blog-nav';
import ViewCounter from './view-counter';
import AuthorAvatar from './author-avatar';
import '../detail/blog-detail.css';

const PROJECT_ID = 'polyface-ae6d3';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ---------------------------------------------------------------------------
// Firestore REST helpers (no SDK needed at build time)
// ---------------------------------------------------------------------------

function extractValue(field: Record<string, unknown>): unknown {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue as string);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return new Date(field.timestampValue as string);
  if ('arrayValue' in field) {
    const av = field.arrayValue as { values?: Record<string, unknown>[] };
    return (av.values || []).map((v) => extractValue(v));
  }
  if ('mapValue' in field) {
    const mv = field.mapValue as { fields?: Record<string, Record<string, unknown>> };
    return extractDoc(mv.fields || {});
  }
  return null;
}

function extractDoc(fields: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) {
    result[key] = extractValue(fields[key]);
  }
  return result;
}

async function firestoreQuery(body: unknown): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(`${FIRESTORE_BASE}:runQuery?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const results: { document?: { name: string; fields: Record<string, Record<string, unknown>> } }[] =
    await res.json();
  return results
    .filter((r) => r.document)
    .map((r) => {
      const id = r.document!.name.split('/').pop()!;
      return { id, ...extractDoc(r.document!.fields) };
    });
}

async function fetchPostBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const results = await firestoreQuery({
    structuredQuery: {
      from: [{ collectionId: 'blogPosts' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: slug } } },
            { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
          ],
        },
      },
      limit: 1,
    },
  });
  return results[0] ?? null;
}

async function fetchRecentPosts(excludeId: string, limit = 3): Promise<Record<string, unknown>[]> {
  const results = await firestoreQuery({
    structuredQuery: {
      from: [{ collectionId: 'blogPosts' }],
      where: {
        fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } },
      },
      orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
      limit: limit + 1,
    },
  });
  return results.filter((p) => p.id !== excludeId).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(`${FIRESTORE_BASE}:runQuery?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'blogPosts' }],
        where: {
          fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } },
        },
        select: { fields: [{ fieldPath: 'slug' }] },
      },
    }),
  });
  const results: { document?: { fields: Record<string, Record<string, unknown>> } }[] = await res.json();
  return results
    .filter((r) => r.document)
    .map((r) => ({ slug: (r.document!.fields.slug as { stringValue: string }).stringValue }))
    .filter((p) => p.slug);
}

// ---------------------------------------------------------------------------
// Metadata (OG tags baked into static HTML)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (!post) return { title: 'Blog | Skedence' };

  const title = (post.metaTitle as string) || (post.title as string);
  const description = (post.metaDescription as string) || (post.excerpt as string);
  const image = (post.featuredImage as string) || 'https://skedence.com/logo-nav.png';
  const url = `https://skedence.com/blog/${slug}`;
  const keywordsRaw = post.keywords;
  const keywords = Array.isArray(keywordsRaw)
    ? keywordsRaw.join(', ')
    : typeof keywordsRaw === 'string'
    ? keywordsRaw
    : undefined;

  return {
    title: `${title} | Skedence Blog`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      siteName: 'Skedence',
      images: [{ url: image, alt: (post.featuredImageAlt as string) || title }],
      publishedTime: post.publishedAt ? (post.publishedAt as Date).toISOString() : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

// ---------------------------------------------------------------------------
// Sanitize HTML for server-side rendering (strips scripts/styles only)
// Blog content is admin-authored so this is sufficient
// ---------------------------------------------------------------------------
function sanitize(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

function formatDate(value: unknown): string {
  if (!value) return 'Recently published';
  try {
    return format(value as Date, 'MMMM d, yyyy');
  } catch {
    return 'Recently published';
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 px-6">
          <h1 className="text-4xl font-black text-foreground uppercase">Article Not Found</h1>
          <p className="text-xl text-foreground/60">This article doesn&apos;t exist or has been removed.</p>
          <Link href="/blog" className="btn-premium inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = await fetchRecentPosts(post.id as string, 3);
  const categories = (post.categories as BlogCategory[]) || [];
  const tags = (post.tags as string[]) || [];

  // Typed locals to satisfy JSX ReactNode requirements
  const title = String(post.title ?? '');
  const excerpt = String(post.excerpt ?? '');
  const authorName = post.authorName ? String(post.authorName) : 'Matt Sprague';
  const authorBio = post.authorBio ? String(post.authorBio) : 'Founder & Head Coach, Skedence';
  const authorImage = post.authorImage ? String(post.authorImage) : null;
  const featuredImage = post.featuredImage ? String(post.featuredImage) : null;
  const featuredImageAlt = post.featuredImageAlt ? String(post.featuredImageAlt) : title;
  const content = String(post.content ?? '');
  const ctaText = post.ctaText ? String(post.ctaText) : 'Ready to Transform Your Coaching Business?';
  const ctaLink = post.ctaLink ? String(post.ctaLink) : '/register';
  const views = post.views as number | undefined;

  const blogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt,
    image: (post.featuredImage as string) || 'https://skedence.com/og-image.png',
    url: `https://skedence.com/blog/${slug}`,
    datePublished: post.publishedAt ? (post.publishedAt as Date).toISOString() : undefined,
    dateModified: (post.updatedAt as Date | undefined)?.toISOString() ?? (post.publishedAt ? (post.publishedAt as Date).toISOString() : undefined),
    author: { '@type': 'Person', name: authorName || 'Skedence' },
    publisher: {
      '@type': 'Organization',
      name: 'Skedence',
      logo: { '@type': 'ImageObject', url: 'https://skedence.com/logo-nav.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://skedence.com/blog/${slug}` },
    keywords: Array.isArray(post.keywords) ? (post.keywords as string[]).join(', ') : (post.keywords as string | undefined),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      {/* View counter (client-side, invisible) */}
      <ViewCounter postId={post.id as string} />

      {/* Nav (client component for mobile toggle) */}
      <BlogNav />

      {/* Back to Blog */}
      <div className="pt-32 pb-8 px-6">
        <div className="container mx-auto max-w-4xl">
          <nav className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-foreground/80 line-clamp-1">{title}</span>
          </nav>
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Category & Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {categories.filter((cat) => BLOG_CATEGORIES[cat]).map((cat) => (
              <span key={cat} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider">
                {BLOG_CATEGORIES[cat].icon} {BLOG_CATEGORIES[cat].title}
              </span>
            ))}
            <div className="flex items-center gap-4 text-sm text-foreground/40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {formatDate(post.publishedAt || post.createdAt)}
                </span>
              </div>
              {views != null && views > 0 && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{views.toLocaleString()} views</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight">
            {title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-foreground/60 mb-8 leading-relaxed">{excerpt}</p>

          {/* Featured Image */}
          {featuredImage && (
            <div className="relative w-full h-64 md:h-96 mb-10 rounded-2xl overflow-hidden bg-muted">
              <Image
                src={featuredImage}
                alt={featuredImageAlt}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          )}

          {/* Author */}
          <div className="flex items-center gap-4 pb-8 mb-8 border-b border-border/50">
            {authorImage ? (
              <AuthorAvatar
                src={authorImage}
                alt={authorName}
                initial={authorName.charAt(0).toUpperCase() || 'S'}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {authorName.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
            )}
            <div>
              <p className="font-bold text-foreground">{authorName}</p>
              {authorBio && (
                <p className="text-sm text-foreground/60">{authorBio}</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div dangerouslySetInnerHTML={{ __html: sanitize(content) }} />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 py-8 border-t border-b border-border/50 mb-12">
              <Tag className="w-4 h-4 text-foreground/40" />
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-lg bg-muted text-sm text-foreground/60">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="premium-card p-10 text-center space-y-6 my-16">
            <h3 className="text-3xl font-black text-foreground uppercase">
              {ctaText}
            </h3>
            <p className="text-foreground/60">
              Join hundreds of coaches using Skedence to save time and grow their business
            </p>
            <Link href={ctaLink} className="btn-premium inline-flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-sm text-foreground/40 uppercase tracking-wider">14-day free trial • Cancel anytime</p>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-20 px-6 bg-muted/20">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-foreground uppercase mb-12 text-center">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((related) => (
                <Link
                  key={String(related.id ?? '')}
                  href={`/blog/${String(related.slug ?? '')}`}
                  className="group premium-card p-6 hover:border-primary/50 transition-all duration-300"
                >
                  {related.featuredImage ? (
                    <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={String(related.featuredImage)}
                        alt={related.featuredImageAlt ? String(related.featuredImageAlt) : String(related.title ?? '')}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                  ) : null}
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {String(related.title ?? '')}
                  </h3>
                  <p className="text-foreground/60 text-sm line-clamp-2 mb-4">{String(related.excerpt ?? '')}</p>
                  <div className="flex items-center justify-between text-xs text-foreground/40 pt-4 border-t border-border/50">
                    <span>{formatDate(related.publishedAt || related.createdAt)}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 py-16 px-6 bg-black">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Product</h4>
              <ul className="space-y-3">
                <li><a href="/#features" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Features</a></li>
                <li><a href="/#pricing" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Pricing</a></li>
                <li><Link href="/support" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">About</Link></li>
                <li><Link href="/blog" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">Blog</Link></li>
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
              <a href="mailto:support@skedence.com" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">support@skedence.com</a>
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
