/**
 * Blog Post Types
 * For SEO-optimized content marketing system
 */

export type BlogCategory = 
  | 'revenue-growth'          // How to get more clients, pricing, packages
  | 'operations'              // Scheduling, payments, no-shows
  | 'getting-started'         // How to start a coaching business
  | 'tools'                   // Software comparisons, best apps
  | 'volleyball'              // Volleyball coaching tips
  | 'basketball'              // Basketball coaching tips
  | 'soccer'                  // Soccer coaching tips
  | 'baseball'                // Baseball coaching tips
  | 'business-tips';          // General coaching business advice

export type BlogStatus = 
  | 'draft'                   // Not published, only visible to admins
  | 'published'               // Live on the website
  | 'archived';               // No longer shown but still accessible via direct link

export interface BlogPost {
  id: string;
  
  // Content
  title: string;                      // "How to Get More Private Volleyball Lesson Clients"
  slug: string;                       // "get-more-volleyball-lesson-clients"
  excerpt: string;                    // Short summary for listing page
  content: string;                    // Full blog post content (HTML/Markdown)
  
  // SEO
  metaTitle: string;                  // SEO title (can differ from display title)
  metaDescription: string;            // SEO description
  keywords: string[];                 // Target keywords
  
  // Organization
  categories: BlogCategory[];         // Multiple categories per post
  tags: string[];                     // Additional tags (volleyball, pricing, scheduling, etc.)
  
  // Media
  featuredImage?: string;             // URL to header image
  featuredImageAlt?: string;          // Alt text for accessibility
  
  // Publishing
  status: BlogStatus;
  authorId: string;                   // Firebase user ID of author
  authorName: string;                 // Display name
  authorBio?: string;                 // Short author bio
  authorImage?: string;               // Author avatar URL
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;                 // When it went live
  
  // Engagement
  views?: number;                     // Page view count
  
  // Internal Admin
  orgId?: string;                     // Optional: if you want per-org blog posts
  internalNotes?: string;             // Admin-only notes
  
  // CTA
  ctaText?: string;                   // Call to action text (default: "Start 14-Day Free Trial")
  ctaLink?: string;                   // Call to action link (default: "/login")
  
  // Sport-specific (for filtering sport landing pages)
  sport?: 'volleyball' | 'basketball' | 'soccer' | 'baseball' | 'all';
}

export interface BlogPostFormData extends Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> {
  // Form version for creating/editing
}

/**
 * SEO-optimized blog post categories with descriptions
 */
export const BLOG_CATEGORIES: Record<BlogCategory, { title: string; description: string; icon: string }> = {
  'revenue-growth': {
    title: 'Revenue Growth',
    description: 'Strategies to get more clients and increase income',
    icon: '💰'
  },
  'operations': {
    title: 'Operations',
    description: 'Scheduling, payments, and business management',
    icon: '⚙️'
  },
  'getting-started': {
    title: 'Getting Started',
    description: 'How to launch and build your coaching business',
    icon: '🚀'
  },
  'tools': {
    title: 'Tools & Software',
    description: 'Compare coaching software and find the best tools',
    icon: '🛠️'
  },
  'volleyball': {
    title: 'Volleyball',
    description: 'Tips and strategies for volleyball coaches',
    icon: '🏐'
  },
  'basketball': {
    title: 'Basketball',
    description: 'Tips and strategies for basketball coaches',
    icon: '🏀'
  },
  'soccer': {
    title: 'Soccer',
    description: 'Tips and strategies for soccer coaches',
    icon: '⚽'
  },
  'baseball': {
    title: 'Baseball',
    description: 'Tips and strategies for baseball coaches',
    icon: '⚾'
  },
  'business-tips': {
    title: 'Business Tips',
    description: 'General advice for running a successful coaching business',
    icon: '💡'
  }
};

/**
 * Example target blog posts based on SEO strategy
 */
export const BLOG_POST_IDEAS = [
  // Revenue Growth
  "How to Get More Private Volleyball Lesson Clients",
  "How to Sell Volleyball Lesson Packages",
  "How to Price Private Volleyball Lessons",
  "How Much Should You Charge for Volleyball Lessons?",
  "How to Build a Private Coaching Business",
  
  // Operations
  "How to Schedule Private Lessons Without Back-and-Forth Texting",
  "Best Way to Manage Private Lesson Bookings",
  "How to Organize Private Coaching Sessions",
  "How to Accept Payments for Private Lessons",
  "How to Track Lesson Packages for Clients",
  "How to Reduce No-Shows for Private Lessons",
  
  // Tools (Bottom of Funnel)
  "Best Scheduling Software for Volleyball Coaches",
  "Volleyball Lesson Booking App",
  "Private Coaching Scheduling App",
  "Best App for Managing Private Lessons",
  "Scheduling Software for Sports Coaches",
  
  // Getting Started
  "How to Start a Private Volleyball Coaching Business",
  "How to Start Giving Private Basketball Lessons",
  "What You Need to Start a Private Sports Training Business",
  "Private Volleyball Lesson Policies You Should Have",
  
  // Sport-Specific Operations
  "How to Organize Multiple Trainers in a Volleyball Academy",
  "How to Transition from Venmo to Online Booking",
  "Should You Sell Volleyball Lessons in Packages?",
];
