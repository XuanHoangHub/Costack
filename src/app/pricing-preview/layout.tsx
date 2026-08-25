import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Pricing preview',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function PricingPreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PRICING_PREVIEW !== 'true') {
    notFound();
  }

  return children;
}
