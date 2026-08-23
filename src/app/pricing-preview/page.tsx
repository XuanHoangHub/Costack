"use client";

import { PricingModal } from '@/components/PricingModal';

export default function PricingPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <PricingModal isOpen onClose={() => undefined} currentUser={{ isPremium: false }} />
    </main>
  );
}
