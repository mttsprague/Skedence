'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchPublishedBlogPosts } from '@/lib/firestore';
import type { BlogPost } from '@/types';

function formatDate(d?: Date): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPublishedBlogPosts()
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(posts.flatMap(p => p.categories ?? []))).sort();
  const filtered = filter === 'all' ? posts : posts.filter(p => p.categories?.includes(filter));

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-14 bg-gradient-to-br from-pva-navy to-pva-teal/80 text-white text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Polyface Blog</h1>
        <p className="text-white/80 max-w-xl mx-auto">
          Training tips, program updates, and stories from the court.
        </p>
      </section>

      {/* Filter */}
      {categories.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pt-10 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              filter === 'all'
                ? 'bg-pva-orange text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-pva-orange'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition capitalize ${
                filter === cat
                  ? 'bg-pva-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-pva-orange'
              }`}
            >
              {cat.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Posts */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-20">No posts yet — check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(post => (
              <Link
                key={post.id}
                href={`/blog/detail?slug=${encodeURIComponent(post.slug)}`}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                {post.featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImage}
                    alt={post.featuredImageAlt ?? post.title}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="h-48 bg-gradient-to-br from-pva-navy to-pva-teal flex items-center justify-center">
                    <span className="text-4xl">🏐</span>
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  {/* Categories */}
                  {post.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.categories.slice(0, 2).map(cat => (
                        <span key={cat} className="text-xs font-semibold bg-orange-50 text-pva-orange px-2 py-0.5 rounded-full capitalize">
                          {cat.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-base font-bold text-pva-navy group-hover:text-pva-orange transition line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-3 flex-1">{post.excerpt}</p>
                  <p className="text-xs text-gray-400 mt-4">{formatDate(post.publishedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
