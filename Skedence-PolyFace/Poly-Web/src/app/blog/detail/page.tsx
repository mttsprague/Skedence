'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchBlogPostBySlug, incrementBlogViews } from '@/lib/firestore';
import type { BlogPost } from '@/types';

function formatDate(d?: Date): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function BlogDetailContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') ?? '';
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    fetchBlogPostBySlug(slug)
      .then(p => {
        if (!p || p.status !== 'published') { setNotFound(true); }
        else {
          setPost(p);
          if (p.id) incrementBlogViews(p.id).catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="text-center py-32 px-6">
        <h1 className="text-2xl font-bold text-pva-navy mb-4">Post not found</h1>
        <p className="text-gray-500 mb-8">This article may have been moved or deleted.</p>
        <Link href="/blog" className="bg-pva-orange text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-12 bg-gradient-to-br from-pva-navy to-pva-navy/90 text-white px-6">
        <div className="max-w-3xl mx-auto">
          {post.categories?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map(cat => (
                <span key={cat} className="text-xs font-bold bg-pva-orange/20 text-orange-300 px-3 py-1 rounded-full capitalize">
                  {cat.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">{post.title}</h1>
          <p className="text-white/70 text-sm">
            {post.authorName && <span>{post.authorName} · </span>}
            {formatDate(post.publishedAt)}
          </p>
        </div>
      </section>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="max-w-3xl mx-auto px-6 -mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.featuredImage}
            alt={post.featuredImageAlt ?? post.title}
            className="w-full rounded-2xl shadow-lg object-cover max-h-96"
          />
        </div>
      )}

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-gray-600 font-medium mb-8 pb-8 border-b border-gray-200 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Body */}
        <div
          className="prose prose-lg prose-pva max-w-none text-gray-700 leading-relaxed
            [&_h2]:text-pva-navy [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-4
            [&_h3]:text-pva-navy [&_h3]:font-bold [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-3
            [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2
            [&_strong]:text-pva-navy [&_a]:text-pva-orange [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        {post.ctaText && post.ctaLink && (
          <div className="mt-12 bg-pva-navy text-white rounded-2xl p-8 text-center">
            <a
              href={post.ctaLink}
              className="inline-block bg-pva-orange text-white font-bold px-10 py-4 rounded-full hover:opacity-90 transition"
            >
              {post.ctaText}
            </a>
          </div>
        )}

        {/* Back */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/blog" className="text-pva-orange font-semibold hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </article>
    </>
  );
}

export default function BlogDetailPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Suspense fallback={
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <BlogDetailContent />
      </Suspense>
      <Footer />
    </div>
  );
}
