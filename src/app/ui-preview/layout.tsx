import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Workspace UI preview', robots: { index: false, follow: false } };
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_UI_PREVIEW !== 'true') notFound();
  return children;
}
