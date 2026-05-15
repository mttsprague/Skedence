/**
 * Proxies external image URLs through images.weserv.nl for free resize + WebP conversion.
 * No account or API key required.
 */
export function optimizeImage(url: string | null | undefined, width = 1200, quality = 80): string | null {
  if (!url) return null;
  // Skip local assets and already-proxied URLs
  if (url.startsWith('/') || url.includes('images.weserv.nl')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
}
