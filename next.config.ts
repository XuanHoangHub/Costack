import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@phosphor-icons/react',
      'recharts',
      'motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable'
    ],
  },
};

export default nextConfig;
