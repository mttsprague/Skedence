'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { fetchAllBlogPosts, deleteBlogPost } from '@/lib/firestore';
import type { BlogPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const ALLOWED_EMAILS = ['admin@polyfacevolleyball.com', 'mttsprague@gmail.com'];

function formatDate(d?: Date): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = user && ALLOWED_EMAILS.includes(user.email ?? '');

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return; // don't load if not admin
    fetchAllBlogPosts()
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin]);

  async function handleDelete(post: BlogPost) {
    if (!post.id) return;
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(post.id);
    try {
      await deleteBlogPost(post.id);
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete post.');
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-32 text-center px-6">
          <h1 className="text-2xl font-bold text-pva-navy mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-8">You must be signed in as an admin to manage blog posts.</p>
          <Link href="/login" className="bg-pva-orange text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-pva-navy">Blog Admin</h1>
          <Link
            href="/blog-admin/edit"
            className="bg-pva-orange text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition"
          >
            + New Post
          </Link>
        </div>

        {/* Posts Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-pva-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No posts yet. <Link href="/blog-admin/edit" className="text-pva-orange underline">Create the first one</Link>.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Title</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Published</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Views</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-pva-navy line-clamp-1">{post.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">/{post.slug}</div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{formatDate(post.publishedAt)}</td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{post.views ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/blog-admin/edit?id=${post.id}`}
                          className="text-pva-orange font-semibold hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(post)}
                          disabled={deleting === post.id}
                          className="text-red-500 font-semibold hover:underline disabled:opacity-50"
                        >
                          {deleting === post.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
