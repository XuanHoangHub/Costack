import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const entries: Array<{ path: string; priority: number }> = [
    { path: '', priority: 1 },
    { path: '/legal/terms', priority: 0.3 },
    { path: '/legal/privacy', priority: 0.3 },
    { path: '/legal/security', priority: 0.4 },
  ];
  return entries.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date('2026-08-25'),
    changeFrequency: path ? 'yearly' : 'weekly',
    priority,
  }));
}
