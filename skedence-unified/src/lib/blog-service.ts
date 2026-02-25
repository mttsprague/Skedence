/**
 * Blog Service
 * Firestore operations for blog posts
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BlogPost, BlogStatus, BlogCategory } from '@/types/blog';

const COLLECTION_NAME = 'blogPosts';

/**
 * Generate URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get all published blog posts (public)
 */
export async function getPublishedPosts(limitCount?: number): Promise<BlogPost[]> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    let q = query(
      postsRef,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || undefined,
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching published posts:', error);
    return [];
  }
}

/**
 * Get published posts by category
 */
export async function getPostsByCategory(category: BlogCategory, limitCount?: number): Promise<BlogPost[]> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    let q = query(
      postsRef,
      where('status', '==', 'published'),
      where('category', '==', category),
      orderBy('publishedAt', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || undefined,
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    return [];
  }
}

/**
 * Get published posts by sport
 */
export async function getPostsBySport(sport: string, limitCount?: number): Promise<BlogPost[]> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    let q = query(
      postsRef,
      where('status', '==', 'published'),
      where('sport', 'in', [sport, 'all']),
      orderBy('publishedAt', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || undefined,
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching posts by sport:', error);
    return [];
  }
}

/**
 * Get single blog post by slug (public)
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    const q = query(
      postsRef,
      where('slug', '==', slug),
      where('status', '==', 'published'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || undefined,
    } as BlogPost;
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return null;
  }
}

/**
 * Get single blog post by ID (admin)
 */
export async function getPostById(id: string): Promise<BlogPost | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      publishedAt: docSnap.data().publishedAt?.toDate() || undefined,
    } as BlogPost;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    return null;
  }
}

/**
 * Get all blog posts regardless of status (admin only)
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    const q = query(postsRef, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate() || undefined,
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }
}

/**
 * Create new blog post (admin only)
 */
export async function createPost(postData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...postData,
      createdAt: now,
      updatedAt: now,
      publishedAt: postData.status === 'published' ? now : null,
      views: 0,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Update existing blog post (admin only)
 */
export async function updatePost(id: string, updates: Partial<BlogPost>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const now = Timestamp.now();
    
    // If publishing for the first time, set publishedAt
    const updateData: any = {
      ...updates,
      updatedAt: now,
    };
    
    // If status changed to published and no publishedAt, set it
    if (updates.status === 'published') {
      const currentDoc = await getDoc(docRef);
      if (currentDoc.exists() && !currentDoc.data().publishedAt) {
        updateData.publishedAt = now;
      }
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
}

/**
 * Delete blog post (admin only)
 */
export async function deletePost(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Increment view count
 */
export async function incrementViews(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing views:', error);
    // Don't throw - view tracking shouldn't break the page
  }
}

/**
 * Check if slug is unique
 */
export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    const q = query(postsRef, where('slug', '==', slug));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;
    
    // If editing existing post, ignore its own slug
    if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking slug uniqueness:', error);
    return false;
  }
}

/**
 * Get related posts based on shared categories
 */
export async function getRelatedPosts(postId: string, categories: BlogCategory[], limitCount: number = 3): Promise<BlogPost[]> {
  try {
    const postsRef = collection(db, COLLECTION_NAME);
    
    // Get all published posts
    const q = query(
      postsRef,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const allPosts = snapshot.docs
      .filter(doc => doc.id !== postId) // Exclude current post
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        publishedAt: doc.data().publishedAt?.toDate() || undefined,
      })) as BlogPost[];
    
    // Filter posts that share at least one category
    const relatedPosts = allPosts.filter(post => {
      if (!post.categories || post.categories.length === 0) return false;
      return post.categories.some(cat => categories.includes(cat));
    });
    
    // Return limited number of related posts
    return relatedPosts.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }
}
