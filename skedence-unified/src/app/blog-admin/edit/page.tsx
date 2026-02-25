'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowLeft, Eye, Globe, FileText } from 'lucide-react';
import { BlogPost, BlogStatus, BlogCategory, BLOG_CATEGORIES } from '@/types/blog';
import { 
  createPost, 
  updatePost, 
  getPostById, 
  generateSlug, 
  isSlugUnique 
} from '@/lib/blog-service';
import { auth } from '@/lib/firebase';

// Allowed Skedence team emails
const ALLOWED_EMAILS = [
  'mttsprague@gmail.com',
  'support@skedence.com',
  // Add more team member emails here
];

function BlogEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'create';
  const postId = searchParams.get('id');

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [categories, setCategories] = useState<BlogCategory[]>(['revenue-growth']);
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<BlogStatus>('draft');
  const [sport, setSport] = useState<'volleyball' | 'basketball' | 'soccer' | 'baseball' | 'all'>('all');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('/login');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authorized && mode === 'edit' && postId) {
      loadPost(postId);
    } else if (authorized) {
      setLoading(false);
    }
  }, [authorized, mode, postId]);

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === 'create' && title && !slug) {
      setSlug(generateSlug(title));
    }
  }, [title, mode]);

  // Auto-generate meta title if empty
  useEffect(() => {
    if (title && !metaTitle) {
      setMetaTitle(title);
    }
  }, [title]);

  async function checkAuth() {
    const user = auth.currentUser;
    
    if (!user) {
      // Not signed in - redirect to login
      router.push('/login?redirect=/blog-admin');
      return;
    }

    if (!ALLOWED_EMAILS.includes(user.email || '')) {
      // Not authorized
      alert('Access denied. This page is only for Skedence team members.');
      router.push('/');
      return;
    }

    setAuthorized(true);
  }

  async function loadPost(id: string) {
    setLoading(true);
    try {
      const post = await getPostById(id);
      if (post) {
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt);
        setContent(post.content);
        setMetaTitle(post.metaTitle);
        setMetaDescription(post.metaDescription);
        setKeywords(post.keywords.join(', '));
        setCategories(post.categories || []);
        setTags(post.tags.join(', '));
        setStatus(post.status);
        setSport(post.sport || 'all');
        setFeaturedImage(post.featuredImage || '');
        setFeaturedImageAlt(post.featuredImageAlt || '');
        setCtaText(post.ctaText || '');
        setCtaLink(post.ctaLink || '/login');
      }
    } catch (error) {
      console.error('Error loading post:', error);
      alert('Failed to load post');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(newStatus?: BlogStatus) {
    if (!title.trim() || !slug.trim() || !excerpt.trim() || !content.trim()) {
      alert('Please fill in all required fields (title, slug, excerpt, content)');
      return;
    }

    // Validate slug is unique
    const slugUnique = await isSlugUnique(slug, postId || undefined);
    if (!slugUnique) {
      alert('This slug is already in use. Please choose a different one.');
      return;
    }

    setSaving(true);
    const user = auth.currentUser;

    try {
      const postData = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        metaTitle: metaTitle.trim() || title.trim(),
        metaDescription: metaDescription.trim() || excerpt.trim(),
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        categories: categories.length > 0 ? categories : ['business-tips'],
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        status: newStatus || status,
        sport,
        featuredImage: featuredImage.trim() || undefined,
        featuredImageAlt: featuredImageAlt.trim() || undefined,
        ctaText: ctaText.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
        authorId: user?.uid || '',
        authorName: user?.displayName || user?.email?.split('@')[0] || 'Admin',
        authorBio: 'Skedence Team',
        authorImage: user?.photoURL || undefined,
      };

      if (mode === 'edit' && postId) {
        await updatePost(postId, postData as any);
        alert('Post updated successfully!');
      } else {
        const newPostId = await createPost(postData as any);
        alert('Post created successfully!');
        router.push(`/blog-admin/edit?mode=edit&id=${newPostId}`);
      }
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post. Check console for details.');
    } finally {
      setSaving(false);
    }
  }

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-foreground/60">
            {!authorized ? 'Checking authorization...' : 'Loading post...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/blog-admin" className="flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Posts</span>
              </Link>
              <div className="h-6 w-px bg-border"></div>
              <h1 className="text-lg font-bold text-foreground">
                {mode === 'edit' ? 'Edit Post' : 'New Post'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSave('published')}
                disabled={saving}
                className="btn-premium text-sm inline-flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                {status === 'published' ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="container mx-auto px-6 lg:px-12 py-12 max-w-7xl">
        {previewMode ? (
          /* Preview Mode */
          <div className="max-w-4xl mx-auto">
            <article className="premium-card p-12">
              {featuredImage && (
                <img src={featuredImage} alt={featuredImageAlt} className="w-full h-96 object-cover rounded-lg mb-8" />
              )}
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-4">
                {categories.filter(cat => BLOG_CATEGORIES[cat]).map(cat => BLOG_CATEGORIES[cat].icon).join(' ')} {categories.filter(cat => BLOG_CATEGORIES[cat]).map(cat => BLOG_CATEGORIES[cat].title).join(', ')}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 leading-tight">{title}</h1>
              <p className="text-xl text-foreground/60 mb-8">{excerpt}</p>
              <div 
                className="prose prose-lg prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </article>
          </div>
        ) : (
          /* Edit Mode */
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div className="premium-card p-6">
                <label className="block text-sm font-bold text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="How to Get More Private Volleyball Lesson Clients"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground text-2xl font-bold placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Slug */}
              <div className="premium-card p-6">
                <label className="block text-sm font-bold text-foreground mb-2">URL Slug *</label>
                <div className="flex items-center gap-2">
                  <span className="text-foreground/40 text-sm">skedence.com/blog/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="get-more-volleyball-lesson-clients"
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div className="premium-card p-6">
                <label className="block text-sm font-bold text-foreground mb-2">Excerpt *</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  placeholder="Short summary for the blog listing page (160 chars max)"
                  maxLength={160}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-xs text-foreground/40 mt-1">{excerpt.length}/160 characters</p>
              </div>

              {/* Content */}
              <div className="premium-card p-6">
                <label className="block text-sm font-bold text-foreground mb-2">Content (HTML) *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  placeholder="<h2>Your heading here</h2><p>Your content here...</p>"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                />
                <p className="text-xs text-foreground/40 mt-2">
                  Use HTML tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, etc.
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Publish Settings */}
              <div className="premium-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Publish Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as BlogStatus)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Categories (Select Multiple)</label>
                    <div className="space-y-2">
                      {(Object.keys(BLOG_CATEGORIES) as BlogCategory[]).map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={categories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCategories([...categories, cat]);
                              } else {
                                setCategories(categories.filter(c => c !== cat));
                              }
                            }}
                            className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-sm">
                            {BLOG_CATEGORIES[cat].icon} {BLOG_CATEGORIES[cat].title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Sport</label>
                    <select
                      value={sport}
                      onChange={(e) => setSport(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Sports</option>
                      <option value="volleyball">Volleyball</option>
                      <option value="basketball">Basketball</option>
                      <option value="soccer">Soccer</option>
                      <option value="baseball">Baseball</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="volleyball, coaching, pricing"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* SEO */}
              <div className="premium-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">SEO</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Meta Title</label>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="Auto-filled from title"
                      maxLength={60}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <p className="text-xs text-foreground/40 mt-1">{metaTitle.length}/60</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Meta Description</label>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      rows={3}
                      maxLength={160}
                      placeholder="Auto-filled from excerpt"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    />
                    <p className="text-xs text-foreground/40 mt-1">{metaDescription.length}/160</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="volleyball coaching, private lessons, pricing"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Featured Image */}
              <div className="premium-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Featured Image</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Image URL</label>
                    <input
                      type="text"
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>

                  {featuredImage && (
                    <img src={featuredImage} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">Alt Text</label>
                    <input
                      type="text"
                      value={featuredImageAlt}
                      onChange={(e) => setFeaturedImageAlt(e.target.value)}
                      placeholder="Describe the image for accessibility"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="premium-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Call to Action</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">CTA Text</label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Ready to Transform Your Coaching Business?"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/60 mb-2">CTA Link</label>
                    <input
                      type="text"
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      placeholder="/login"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <BlogEditorContent />
    </Suspense>
  );
}
