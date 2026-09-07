"use client";

import { useEffect, useState } from 'react';
import { PricingModal } from '@/components/PricingModal';
import { PaymentSuccess } from '@/components/billing/PaymentSuccess';
import { CardPaymentSuccess } from '@/components/billing/CardPaymentSuccess';
import { PayOSCheckout } from '@/components/billing/PayOSCheckout';

export default function PricingPreviewPage() {
  const [mode, setMode] = useState<'pricing' | 'checkout' | 'success' | 'card-success'>('pricing');
  const [checkoutStatus, setCheckoutStatus] = useState<'pending' | 'checking' | 'expired' | 'cancelled' | 'failed'>('pending');
  const [expiresAt] = useState(() => new Date(Date.now() + 900_000).toISOString());
  useEffect(() => {
    const state = new URL(window.location.href).searchParams.get('state');
    if (state === 'success' || state === 'card-success' || state === 'checkout') setMode(state);
  }, []);

  if (mode === 'checkout') return <main className="min-h-screen bg-slate-100 p-3 dark:bg-slate-900 sm:p-8">
    <div className="mx-auto mb-4 flex max-w-[1060px] flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-slate-500">DEMO · Không chuyển tiền</span>
      {(['pending', 'checking', 'expired', 'cancelled', 'failed'] as const).map(state => <button key={state} onClick={() => setCheckoutStatus(state)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">{state}</button>)}
    </div>
    <div className="mx-auto max-w-[1060px] overflow-hidden rounded-3xl border border-slate-200 shadow-xl dark:border-slate-800">
      <PayOSCheckout checkout={{ url: '#demo', returnUrl: '', orderCode: 26090611852, plan: 'pro', cycle: 'yearly', amount: 3_590_000, description: 'APX118852', expiresAt, qrCode: 'APEXA PREVIEW ONLY - NOT A PAYMENT CODE', accountNumber: '0123456789', accountName: 'APEXA DEMO', bin: '970422' }}
        status={checkoutStatus} planName="Pro" isVietnamese onBack={() => setMode('pricing')} onClose={() => setMode('pricing')} onCheck={() => setCheckoutStatus('checking')} onCancel={() => setCheckoutStatus('cancelled')} onExpired={() => setCheckoutStatus('expired')} />
    </div>
  </main>;

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
