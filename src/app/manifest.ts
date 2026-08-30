import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apexa — AI Productivity Workspace',
    short_name: 'Apexa',
    description: 'Không gian làm việc hợp nhất cho tasks, docs, chat, CRM, ERP, finance và AI.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07090e',
    theme_color: '#2563eb',
    orientation: 'any',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}

