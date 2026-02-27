'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Eye, Search, Globe } from 'lucide-react';
import { BlogPost, BlogStatus, BlogCategory, BLOG_CATEGORIES } from '@/types/blog';
import { getAllPosts, deletePost } from '@/lib/blog-service';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase';

// Allowed Skedence team emails
const ALLOWED_EMAILS = [
  'mttsprague@gmail.com',
  'Matt.Sprague@skedence.com',
  // Add more team member emails here
];

export default function BlogAdminListPage() {
  const router = useRouter();
  
  const [authorized, setAuthorized] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlogStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<BlogCategory | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authorized) {
      loadPosts();
    }
  }, [authorized]);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, statusFilter, categoryFilter]);

  async function checkAuth() {
    const user = auth.currentUser;
    
    if (!user) {
      router.push('/login?redirect=/blog-admin');
      return;
    }

    if (!ALLOWED_EMAILS.includes(user.email || '')) {
      alert('Access denied. This page is only for Skedence team members.');
      router.push('/');
      return;
    }

    setAuthorized(true);
  }

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await getAllPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterPosts() {
    let filtered = [...posts];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(post => 
        post.categories && post.categories.includes(categoryFilter)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredPosts(filtered);
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  }

  function getStatusBadge(status: BlogStatus) {
    const styles = {
      published: 'bg-green-500/10 text-green-500 border-green-500/20',
      draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-foreground/60">
            {!authorized ? 'Checking authorization...' : 'Loading posts...'}
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
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
                  <span className="text-black font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-foreground tracking-tight">Skedence Blog Admin</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/blog" 
                target="_blank"
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                View Blog
              </Link>
              <button 
                onClick={() => router.push('/blog-admin/edit?mode=create')}
                className="btn-premium text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 py-12 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="premium-card p-6">
            <p className="text-sm text-foreground/60 mb-2 font-medium">Total Posts</p>
            <p className="text-3xl font-black text-foreground">{posts.length}</p>
          </div>
          <div className="premium-card p-6">
            <p className="text-sm text-foreground/60 mb-2 font-medium">Published</p>
            <p className="text-3xl font-black text-green-500">
              {posts.filter(p => p.status === 'published').length}
            </p>
          </div>
          <div className="premium-card p-6">
            <p className="text-sm text-foreground/60 mb-2 font-medium">Drafts</p>
            <p className="text-3xl font-black text-yellow-500">
              {posts.filter(p => p.status === 'draft').length}
            </p>
          </div>
          <div className="premium-card p-6">
            <p className="text-sm text-foreground/60 mb-2 font-medium">Total Views</p>
            <p className="text-3xl font-black text-primary">
              {posts.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="premium-card p-6 mb-8">
          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BlogStatus | 'all')}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as BlogCategory | 'all')}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {(Object.keys(BLOG_CATEGORIES) as BlogCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {BLOG_CATEGORIES[cat].title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <div className="premium-card p-20 text-center">
            <p className="text-xl text-foreground/60 mb-6">
              {posts.length === 0 
                ? 'No blog posts yet. Create your first post to get started!' 
                : 'No posts found matching your filters.'}
            </p>
            {posts.length === 0 && (
              <button 
                onClick={() => router.push('/blog-admin/edit?mode=create')}
                className="btn-premium inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div key={post.id} className="premium-card p-6 hover:border-primary/30 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(post.status)}
                      <span className="text-xs text-foreground/40 flex items-center gap-1 flex-wrap">
                        {post.categories && post.categories.filter(cat => BLOG_CATEGORIES[cat]).map(cat => (
                          <span key={cat}>
                            {BLOG_CATEGORIES[cat].icon} {BLOG_CATEGORIES[cat].title}
                          </span>
                        ))}
                      </span>
                      <span className="text-xs text-foreground/40">
                        {format(post.publishedAt || post.createdAt, 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-1">
                      {post.title}
                    </h3>
                    
                    <p className="text-foreground/60 line-clamp-2 mb-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-foreground/40">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{(post.views || 0).toLocaleString()} views</span>
                      </div>
                      {post.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span>Tags: {post.tags.slice(0, 3).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    {post.status === 'published' && (
                      <a
                        href={`/blog/detail?slug=${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm inline-flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </a>
                    )}
                    <button
                      onClick={() => router.push(`/blog-admin/edit?mode=edit&id=${post.id}`)}
                      className="btn-secondary text-sm inline-flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                        deleteConfirm === post.id
                          ? 'bg-red-500 text-white'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
