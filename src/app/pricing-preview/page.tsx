"use client";

import { useEffect, useState } from 'react';
import { PricingModal } from '@/components/PricingModal';
import { PaymentSuccess } from '@/components/billing/PaymentSuccess';
import { CardPaymentSuccess } from '@/components/billing/CardPaymentSuccess';

export default function PricingPreviewPage() {
  const [mode, setMode] = useState<'pricing' | 'success' | 'card-success'>('pricing');
  useEffect(() => {
    const state = new URL(window.location.href).searchParams.get('state');
    if (state === 'success' || state === 'card-success') setMode(state);
  }, []);

  if (mode === 'success') {
    return (
      <main className="min-h-screen bg-slate-950 p-3 sm:p-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-slate-800">
          <PaymentSuccess
            checkout={{
              url: '', returnUrl: '', orderCode: 26083111852, plan: 'pro', cycle: 'yearly', amount: 3_590_000,
              description: 'APX118852', expiresAt: new Date(Date.now() + 900_000).toISOString(), qrCode: '',
              accountNumber: '•••• 6868', accountName: 'APEXA TECHNOLOGY', bin: '970422', method: 'vietqr',
            }}
            receipt={{
              orderCode: 26083111852, plan: 'pro', cycle: 'yearly', amount: 3_590_000, currency: 'VND',
              paidAt: new Date().toISOString(), reference: 'FT260831118852',
              periodEnd: new Date(Date.now() + 365 * 86_400_000).toISOString(), subscriptionStatus: 'active', provider: 'payos',
            }}
            planName="Pro"
            isVietnamese
            onClose={() => setMode('pricing')}
          />
        </div>
      </main>
    );
  }

  if (mode === 'card-success') {
    return (
      <main className="min-h-screen bg-slate-950 p-3 sm:p-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-slate-800">
          <CardPaymentSuccess plan="business" cycle="yearly" periodEnd={new Date(Date.now() + 365 * 86_400_000).toISOString()} isVietnamese onClose={() => setMode('pricing')} onManage={() => undefined} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <PricingModal isOpen onClose={() => undefined} currentUser={{ isPremium: false }} />
    </main>
  );
}
