'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { fetchAllBlogPosts, createBlogPost, updateBlogPost } from '@/lib/firestore';
import type { BlogPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const ALLOWED_EMAILS = ['admin@polyfacevolleyball.com', 'mttsprague@gmail.com'];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const CATEGORY_OPTIONS = [
  'volleyball',
  'basketball',
  'soccer',
  'baseball',
  'training-tips',
  'camps',
  'news',
  'nutrition',
  'mental-game',
];

function BlogEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const postId = searchParams.get('id');
  const isEdit = !!postId;

  const [form, setForm] = useState<Omit<BlogPost, 'id'>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    categories: [],
    tags: [],
    sport: 'all',
    featuredImage: '',
    featuredImageAlt: '',
    ctaText: '',
    ctaLink: '',
    status: 'draft',
    authorName: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const isAdmin = user && ALLOWED_EMAILS.includes(user.email ?? '');

  // Load post if editing
  useEffect(() => {
    if (!postId) return;
    fetchAllBlogPosts()
      .then(posts => {
        const post = posts.find(p => p.id === postId);
        if (!post) { setError('Post not found.'); setLoading(false); return; }
        const { id: _, ...rest } = post;
        setForm({
          ...rest,
          metaTitle: rest.metaTitle ?? '',
          metaDescription: rest.metaDescription ?? '',
          keywords: rest.keywords ?? '',
          featuredImage: rest.featuredImage ?? '',
          featuredImageAlt: rest.featuredImageAlt ?? '',
          ctaText: rest.ctaText ?? '',
          ctaLink: rest.ctaLink ?? '',
          authorName: rest.authorName ?? '',
        });
        setAutoSlug(false);
      })
      .catch(() => setError('Failed to load post.'))
      .finally(() => setLoading(false));
  }, [postId]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setForm(f => ({ ...f, title, ...(autoSlug ? { slug: slugify(title) } : {}) }));
  }

  function toggleCategory(cat: string) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  }

  async function handleSave(status: BlogPost['status']) {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.slug.trim()) { setError('Slug is required.'); return; }
    if (!form.content.trim()) { setError('Content is required.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEdit && postId) {
        await updateBlogPost(postId, { ...form, status });
        setSuccess('Post updated!');
        setForm(f => ({ ...f, status }));
      } else {
        const newId = await createBlogPost({ ...form, status });
        setSuccess('Post created!');
        router.replace(`/blog-admin/edit?id=${newId}`);
      }
    } catch (err) {
      console.error(err);
      setError('Save failed. Check console for details.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="pt-16 text-center px-6">
        <h1 className="text-2xl font-bold text-pva-navy mb-4">Access Denied</h1>
        <Link href="/login" className="bg-pva-orange text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold text-pva-navy">{isEdit ? 'Edit Post' : 'New Post'}</h1>
        <Link href="/blog-admin" className="text-gray-500 hover:text-gray-700 text-sm font-semibold">
          ← All Posts
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">{success}</div>}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
          <input
            value={form.title}
            onChange={handleTitleChange}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
            placeholder="Post title..."
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">URL Slug *</label>
          <input
            value={form.slug}
            onChange={e => { setAutoSlug(false); setForm(f => ({ ...f, slug: e.target.value })); }}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
            placeholder="my-post-slug"
          />
          <p className="text-xs text-gray-400 mt-1">URL: /blog/detail?slug={form.slug || 'my-post-slug'}</p>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30 resize-none"
            placeholder="Short summary of the post (shown in blog listing)..."
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Content * <span className="font-normal text-gray-400">(HTML supported)</span></label>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={20}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pva-orange/30 resize-y"
            placeholder="<p>Start writing...</p>"
          />
        </div>

        {/* Featured Image */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Featured Image URL</label>
          <input
            value={form.featuredImage}
            onChange={e => setForm(f => ({ ...f, featuredImage: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
            placeholder="https://..."
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition capitalize ${
                  form.categories.includes(cat)
                    ? 'bg-pva-orange text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-pva-orange'
                }`}
              >
                {cat.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Author */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Author Name</label>
          <input
            value={form.authorName}
            onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pva-orange/30"
            placeholder="e.g. Polyface Staff"
          />
        </div>

        {/* SEO */}
        <details className="border border-gray-200 rounded-xl overflow-hidden">
          <summary className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
            SEO & Advanced Options
          </summary>
          <div className="px-4 pb-4 space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Meta Title</label>
              <input
                value={form.metaTitle}
                onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Defaults to title"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Meta Description</label>
              <textarea
                value={form.metaDescription}
                onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="Defaults to excerpt"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Keywords</label>
              <input
                value={form.keywords}
                onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="training, volleyball, camps (comma-separated)"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">CTA Button Text</label>
              <input
                value={form.ctaText}
                onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="e.g. Book a Session"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">CTA Link</label>
              <input
                value={form.ctaLink}
                onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="/portal/book"
              />
            </div>
          </div>
        </details>

        {/* Save Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="flex-1 bg-pva-orange text-white font-bold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Publish'}
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-full hover:bg-gray-200 transition disabled:opacity-50"
          >
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BlogEditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense fallback={
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <BlogEditorContent />
      </Suspense>
    </div>
  );
}
