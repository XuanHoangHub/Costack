import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development';

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''} https://connect.facebook.net`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://www.facebook.com",
      "media-src 'self' data: blob: https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const adminSecurityHeaders = [
  {
    key: 'Cache-Control',
    value: 'private, no-store, max-age=0, must-revalidate',
  },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Robots-Tag',
    value: 'noindex, nofollow, noarchive',
  },
];

const privateApiHeaders = [
  {
    key: 'Cache-Control',
    value: 'private, no-store, max-age=0, must-revalidate',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  deploymentId: process.env.DEPLOYMENT_VERSION,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  devIndicators: {
    position: 'bottom-right',
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@phosphor-icons/react',
      'recharts',
      'motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@tiptap/react',
      '@tiptap/core',
      'zustand',
      '@supabase/supabase-js'
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/admin/:path*',
        headers: adminSecurityHeaders,
      },
      {
        source: '/api/admin/:path*',
        headers: adminSecurityHeaders,
      },
      {
        source: '/api/ai/:path*',
        headers: privateApiHeaders,
      },
      {
        source: '/api/billing/:path*',
        headers: privateApiHeaders,
      },
      {
        source: '/api/google-calendar',
        headers: privateApiHeaders,
      },
      {
        source: '/api/app/config',
        headers: privateApiHeaders,
      },
    ];
  },
};

export default nextConfig;
