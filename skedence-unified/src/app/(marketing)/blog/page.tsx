'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Clock, ArrowRight, Tag, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { BlogPost, BlogCategory, BLOG_CATEGORIES } from '@/types/blog';
import { getPublishedPosts, getPostsByCategory } from '@/lib/blog-service';
import { format } from 'date-fns';
import { trackPageView, trackEvent } from '@/lib/analytics';

const POSTS_PER_PAGE = 6;

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadPosts();
    
    // Update document title and meta tags for SEO
    document.title = 'Skedence Blog - Coaching Business Tips & Resources'
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Expert tips and resources for coaching businesses. Learn how to grow your training business, manage clients, and optimize your scheduling.');
    
    // Update Open Graph tags
    updateMetaTag('og:title', 'Skedence Blog - Coaching Business Tips & Resources');
    updateMetaTag('og:description', 'Expert tips and resources for coaching businesses. Learn how to grow your training business, manage clients, and optimize your scheduling.');
    updateMetaTag('og:url', 'https://skedence.com/blog');
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:image', 'https://skedence.com/og-image.png');
    
    // Track blog listing page view
    trackPageView('/blog', 'Skedence Blog - Coaching Business Tips');
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, selectedCategory, selectedSport]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSport]);

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

  // Get unique sports from posts
  const availableSports = Array.from(new Set(posts.map(post => post.sport || 'all')))
    .filter(sport => sport !== 'all')
    .sort();

  // Pagination calculations
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
              <Link href="/register" className="btn-premium text-sm">
                Start 14-Day Free Trial →
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
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="block btn-premium text-center mt-4"
            >
              Start 14-Day Free Trial →
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
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentPosts.map((post) => (
                  <a
                    key={post.id} 
                    href={`/blog/${post.slug}`}
                    className="group premium-card p-6 hover:border-primary/50 transition-all duration-300 flex flex-col cursor-pointer"
                  >
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
                  </a>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-16">
                  {/* Previous Button */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      currentPage === 1
                        ? 'bg-muted text-foreground/40 cursor-not-allowed'
                        : 'bg-primary text-black hover:shadow-lg hover:shadow-primary/30'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1);
                      
                      // Show ellipsis
                      const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return <span key={page} className="text-foreground/40 px-2">...</span>;
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`min-w-[40px] h-10 rounded-lg font-semibold transition-all ${
                            currentPage === page
                              ? 'bg-primary text-black shadow-md shadow-primary/30'
                              : 'bg-muted text-foreground/70 hover:bg-primary/20 hover:text-primary'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      currentPage === totalPages
                        ? 'bg-muted text-foreground/40 cursor-not-allowed'
                        : 'bg-primary text-black hover:shadow-lg hover:shadow-primary/30'
                    }`}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
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
            <Link href="/register" className="btn-premium">Start 14-Day Free Trial</Link>
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
              <p className="text-sm text-orange-500">Matt.Sprague@skedence.com</p>
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
