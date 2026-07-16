import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://setready.site';

// Public, indexable pages only. Private/app routes (dashboard, work-log, etc.)
// are intentionally excluded and disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<[string, number, MetadataRoute.Sitemap[number]['changeFrequency']]> = [
    ['', 1.0, 'daily'],
    ['rate-calculator', 0.9, 'weekly'],
    ['glossary', 0.9, 'weekly'],
    ['whats-filming', 0.8, 'daily'],
    ['casting', 0.8, 'weekly'],
    ['a-list', 0.6, 'weekly'],
    ['residency', 0.6, 'monthly'],
    ['rights', 0.7, 'monthly'],
    ['games', 0.6, 'monthly'],
    ['install', 0.7, 'monthly'],
    ['membership', 0.8, 'weekly'],
    ['donate', 0.4, 'monthly'],
    ['signin', 0.5, 'monthly'],
    ['privacy', 0.3, 'yearly'],
    ['terms', 0.3, 'yearly'],
  ];
  return routes.map(([path, priority, changeFrequency]) => ({
    url: `${SITE}/${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
