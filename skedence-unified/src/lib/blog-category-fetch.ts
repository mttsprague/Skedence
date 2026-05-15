/**
 * Server-side Firestore REST helpers for blog category pages.
 * Uses the public REST API (same pattern as blog/[slug]/page.tsx).
 */

const PROJECT_ID = 'polyface-ae6d3';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreField =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreField[] } }
  | { mapValue: { fields?: Record<string, FirestoreField> } }
  | Record<string, never>;

function extractValue(field: FirestoreField): unknown {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return new Date(field.timestampValue);
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map((v) => extractValue(v));
  }
  if ('mapValue' in field) {
    return extractDoc(field.mapValue.fields || {});
  }
  return null;
}

function extractDoc(fields: Record<string, FirestoreField>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) {
    result[key] = extractValue(fields[key]);
  }
  return result;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  sport?: string;
  categories?: string[];
  publishedAt?: Date;
}

export async function fetchPostsBySport(sport: string, limit = 30): Promise<BlogPostSummary[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(`${FIRESTORE_BASE}:runQuery?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'blogPosts' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'status' },
                    op: 'EQUAL',
                    value: { stringValue: 'published' },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'sport' },
                    op: 'EQUAL',
                    value: { stringValue: sport },
                  },
                },
              ],
            },
          },
          orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
          limit,
          select: {
            fields: [
              { fieldPath: 'slug' },
              { fieldPath: 'title' },
              { fieldPath: 'excerpt' },
              { fieldPath: 'featuredImage' },
              { fieldPath: 'featuredImageAlt' },
              { fieldPath: 'sport' },
              { fieldPath: 'categories' },
              { fieldPath: 'publishedAt' },
            ],
          },
        },
      }),
    });

    const results: {
      document?: {
        name: string;
        fields: Record<string, FirestoreField>;
      };
    }[] = await res.json();

    return results
      .filter((r) => r.document?.fields?.slug)
      .map((r) => {
        const id = r.document!.name.split('/').pop()!;
        const doc = extractDoc(r.document!.fields);
        return {
          id,
          slug: doc.slug as string,
          title: doc.title as string,
          excerpt: doc.excerpt as string,
          featuredImage: doc.featuredImage as string | undefined,
          featuredImageAlt: doc.featuredImageAlt as string | undefined,
          sport: doc.sport as string | undefined,
          categories: doc.categories as string[] | undefined,
          publishedAt: doc.publishedAt as Date | undefined,
        };
      });
  } catch {
    return [];
  }
}
