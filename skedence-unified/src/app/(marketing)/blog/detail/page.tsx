'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, ArrowLeft, ArrowRight, Eye, Tag, Menu, X } from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES } from '@/types/blog';
import { getPostBySlug, incrementViews, getRelatedPosts } from '@/lib/blog-service';
import { format } from 'date-fns';
import { trackPageView, trackEvent } from '@/lib/analytics';

function BlogPostContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    } else {
      setNotFound(true);
      setLoading(false);
    }
  }, [slug]);

  async function loadPost(slug: string) {
    setLoading(true);
    try {
      const data = await getPostBySlug(slug);
      
      if (data) {
        setPost(data);
        setNotFound(false);
        
        // Update document title and meta tags for SEO and social sharing
        document.title = `${data.title} | Skedence Blog`;
        
        // Update or create meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.setAttribute('name', 'description');
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', data.excerpt);
        
        // Update Open Graph tags for social sharing
        updateMetaTag('og:title', data.title);
        updateMetaTag('og:description', data.excerpt);
        updateMetaTag('og:url', `https://skedence.com/blog/detail?slug=${data.slug}`);
        updateMetaTag('og:type', 'article');
        updateMetaTag('og:image', data.featuredImage || 'https://skedence.com/logo-nav.png');
        updateMetaTag('og:site_name', 'Skedence');
        
        // Update Twitter Card tags
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', data.title);
        updateMetaTag('twitter:description', data.excerpt);
        updateMetaTag('twitter:image', data.featuredImage || 'https://skedence.com/logo-nav.png');
        
        // Track blog post view
        trackPageView(`/blog/${data.slug}`, data.title);
        trackEvent('blog_post_view', {
          post_id: data.id,
          post_title: data.title,
          categories: data.categories?.join(', ') || 'none',
          sport: data.sport || 'all'
        });
        
        // Increment view count
        incrementViews(data.id);
        
        // Load related posts
        const related = await getRelatedPosts(data.id, data.categories || [], 3);
        setRelatedPosts(related);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to update or create meta tags
  function updateMetaTag(property: string, content: string) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.querySelector(`meta[name="${property}"]`);
    }
    if (!meta) {
      meta = document.createElement('meta');
      if (property.startsWith('og:') || property.startsWith('article:')) {
        meta.setAttribute('property', property);
      } else {
        meta.setAttribute('name', property);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-foreground/60">Loading article...</p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 px-6">
          <h1 className="text-4xl font-black text-foreground uppercase">Article Not Found</h1>
          <p className="text-xl text-foreground/60">The article you're looking for doesn't exist or has been removed.</p>
          <Link href="/blog" className="btn-premium inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/50">
                <span className="text-black font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">Skedence</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-10">
              <a href="/#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Features</a>
              <a href="/#pricing" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Pricing</a>
              <Link href="/blog" className="text-sm font-medium text-primary transition-colors uppercase tracking-wide">Blog</Link>
              <Link href="/support" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Support</Link>
              <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide">Sign In</Link>
              <Link href="/login" className="btn-premium text-sm">
                Start Free Trial →
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="container mx-auto px-6 py-6 space-y-4">
            <a
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Features
            </a>
            <a
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Pricing
            </a>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Blog
            </Link>
            <Link
              href="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Support
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block btn-premium text-center mt-4"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      </nav>

      {/* Back to Blog */}
      <div className="pt-32 pb-8 px-6">
        <div className="container mx-auto max-w-4xl">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Category & Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {post.categories && post.categories.filter(cat => BLOG_CATEGORIES[cat]).map(cat => (
              <span key={cat} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider">
                {BLOG_CATEGORIES[cat].icon} {BLOG_CATEGORIES[cat].title}
              </span>
            ))}
            <div className="flex items-center gap-4 text-sm text-foreground/40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{format(post.publishedAt || post.createdAt, 'MMMM d, yyyy')}</span>
              </div>
              {post.views && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{post.views.toLocaleString()} views</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-foreground/60 mb-8 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Author */}
          <div className="flex items-center gap-4 pb-8 mb-8 border-b border-border/50">
            {post.authorImage ? (
              <img 
                src={post.authorImage} 
                alt={post.authorName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {post.authorName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-bold text-foreground">{post.authorName}</p>
              {post.authorBio && (
                <p className="text-sm text-foreground/60">{post.authorBio}</p>
              )}
            </div>
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="relative w-full h-96 mb-12 rounded-xl overflow-hidden bg-muted">
              <img 
                src={post.featuredImage} 
                alt={post.featuredImageAlt || post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Content */}
          <div 
            className="prose prose-lg prose-invert max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 py-8 border-t border-b border-border/50 mb-12">
              <Tag className="w-4 h-4 text-foreground/40" />
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 rounded-lg bg-muted text-sm text-foreground/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA Box */}
          <div className="premium-card p-10 text-center space-y-6 my-16">
            <h3 className="text-3xl font-black text-foreground uppercase">
              {post.ctaText || 'Ready to Transform Your Coaching Business?'}
            </h3>
            <p className="text-foreground/60">
              Join hundreds of coaches using Skedence to save time and grow their business
            </p>
            <Link 
              href={post.ctaLink || '/login'} 
              className="btn-premium inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-sm text-foreground/40 uppercase tracking-wider">
              14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-20 px-6 bg-muted/20">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-foreground uppercase mb-12 text-center">
              Related Articles
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Link 
                  key={relatedPost.id} 
                  href={`/blog/detail?slug=${relatedPost.slug}`}
                  className="group premium-card p-6 hover:border-primary/50 transition-all duration-300"
                >
                  {relatedPost.featuredImage && (
                    <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={relatedPost.featuredImage} 
                        alt={relatedPost.featuredImageAlt || relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {relatedPost.title}
                  </h3>
                  
                  <p className="text-foreground/60 text-sm line-clamp-2 mb-4">
                    {relatedPost.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-foreground/40 pt-4 border-t border-border/50">
                    <span>{format(relatedPost.publishedAt || relatedPost.createdAt, 'MMM d')}</span>
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
              <p className="text-sm text-orange-500">support@skedence.com</p>
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

export default function BlogPostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <BlogPostContent />
    </Suspense>
  );
}
