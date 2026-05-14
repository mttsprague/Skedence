import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const PROJECT_ID = 'polyface-ae6d3';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getPublishedBlogPosts(): Promise<{ slug: string; updatedAt?: string }[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(`${FIRESTORE_BASE}:runQuery?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'blogPosts' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'published' },
            },
          },
          select: {
            fields: [
              { fieldPath: 'slug' },
              { fieldPath: 'updatedAt' },
              { fieldPath: 'publishedAt' },
            ],
          },
        },
      }),
    });

    const results: {
      document?: {
        fields: Record<string, { stringValue?: string; timestampValue?: string }>;
      };
    }[] = await res.json();

    return results
      .filter((r) => r.document?.fields?.slug?.stringValue)
      .map((r) => ({
        slug: r.document!.fields.slug.stringValue!,
        updatedAt:
          r.document!.fields.updatedAt?.timestampValue ??
          r.document!.fields.publishedAt?.timestampValue,
      }));
  } catch {
    // Don't crash the build if Firestore is unreachable — just skip blog URLs
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedBlogPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://skedence.com/', changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://skedence.com/blog', changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://skedence.com/pricing-plans', changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://skedence.com/volleyball', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://skedence.com/basketball', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://skedence.com/soccer', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://skedence.com/baseball', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://skedence.com/about', changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://skedence.com/how-to-use', changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://skedence.com/support', changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://skedence.com/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://skedence.com/terms', changeFrequency: 'yearly', priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `https://skedence.com/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages];
}
