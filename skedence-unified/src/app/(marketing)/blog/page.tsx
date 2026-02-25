'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Clock, ArrowRight, Tag, Menu, X } from 'lucide-react';
import { BlogPost, BlogCategory, BLOG_CATEGORIES } from '@/types/blog';
import { getPublishedPosts, getPostsByCategory } from '@/lib/blog-service';
import { format } from 'date-fns';
import { trackPageView, trackEvent } from '@/lib/analytics';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadPosts();
    // Track blog listing page view
    trackPageView('/blog', 'Skedence Blog - Coaching Business Tips');
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, selectedCategory, selectedSport]);

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await getPublishedPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterPosts() {
    let filtered = [...posts];

    // Filter by sport
    if (selectedSport !== 'all') {
      filtered = filtered.filter(post => post.sport === selectedSport);
      trackEvent('blog_filter_sport', {
        sport: selectedSport,
        result_count: filtered.length
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => 
        post.categories && post.categories.includes(selectedCategory)
      );
      // Track category filter usage
      trackEvent('blog_filter_category', {
        category: selectedCategory,
        result_count: filtered.length
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
      // Track search usage
      trackEvent('blog_search', {
        search_query: searchQuery,
        result_count: filtered.length
      });
    }

    setFilteredPosts(filtered);
  }

  // Get unique sports from posts
  const availableSports = Array.from(new Set(posts.map(post => post.sport || 'all')))
    .filter(sport => sport !== 'all')
    .sort();

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
              className="block text-base font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Features
            </a>
            <a
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Pricing
            </a>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-primary transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Blog
            </Link>
            <Link
              href="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide py-3 border-b border-border/30"
            >
              Support
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wide py-3 border-b border-border/30"
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

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent"></div>
        
        <div className="container mx-auto max-w-5xl space-y-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-black shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                All Posts
              </button>
              {(Object.keys(BLOG_CATEGORIES) as BlogCategory[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedCategory === category
                      ? 'bg-primary text-black shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {BLOG_CATEGORIES[category].icon} {BLOG_CATEGORIES[category].title}
                </button>
              ))}
            </div>
          </div>

          {/* Sport Filter */}
          {availableSports.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center items-center">
              <span className="text-sm font-medium text-foreground uppercase tracking-wider">Filter by Sport:</span>
              <button
                onClick={() => setSelectedSport('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedSport === 'all'
                    ? 'bg-primary text-black shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                All Sports
              </button>
              {availableSports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                    selectedSport === sport
                      ? 'bg-primary text-black shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {sport === 'volleyball' && '🏐'}
                  {sport === 'basketball' && '🏀'}
                  {sport === 'soccer' && '⚽'}
                  {sport === 'baseball' && '⚾'}
                  {' '}{sport.charAt(0).toUpperCase() + sport.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-foreground/60">Loading articles...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-foreground/60">
                {searchQuery || selectedCategory !== 'all' || selectedSport !== 'all'
                  ? 'No articles found matching your filters.' 
                  : 'No articles published yet. Check back soon!'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <Link 
                  key={post.id} 
                  href={`/blog/detail?slug=${post.slug}`}
                  className="group premium-card p-6 hover:border-primary/50 transition-all duration-300 flex flex-col"
                >
                  {/* Featured Image */}
                  {post.featuredImage && (
                    <div className="relative w-full h-48 mb-6 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={post.featuredImage} 
                        alt={post.featuredImageAlt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Category & Sport Badges */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {post.categories && post.categories.filter(cat => BLOG_CATEGORIES[cat]).map(cat => (
                      <span key={cat} className="text-xs font-bold text-primary uppercase tracking-wider">
                        {BLOG_CATEGORIES[cat].icon} {BLOG_CATEGORIES[cat].title}
                      </span>
                    ))}
                    {post.sport && post.sport !== 'all' && (
                      <span className="text-xs font-medium bg-muted text-foreground/70 px-2 py-1 rounded uppercase tracking-wider">
                        {post.sport === 'volleyball' && '🏐'}
                        {post.sport === 'basketball' && '🏀'}
                        {post.sport === 'soccer' && '⚽'}
                        {post.sport === 'baseball' && '⚾'}
                        {' '}{post.sport}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-foreground/60 mb-4 line-clamp-3 flex-1">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-foreground/40 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{format(post.publishedAt || post.createdAt, 'MMM d, yyyy')}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">
            Ready to Grow Your Coaching Business?
          </h2>
          <p className="text-xl text-foreground/60">
            Join hundreds of coaches using Skedence to save time and scale
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <Link href="/login" className="btn-premium">Start Free Trial</Link>
            <Link href="/support" className="btn-secondary">Contact Sales</Link>
          </div>
        </div>
      </section>

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
