'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from '@/contexts/TranslationContext';

type Receipt = { status: 'paid'; plan: string; amount: number; currency: string; reference: string; periodEnd: string };

export default function PayPalReturnPage() {
  const { isVietnamese: vi } = useTranslation();
  const inFlight = useRef(false);
  const attempts = useRef(0);
  const [state, setState] = useState<'checking' | 'pending' | 'error' | 'cancelled' | 'paid'>('checking');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const checkPayment = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    attempts.current += 1;
    setState('checking');
    setMessage('');
    try {
      const orderId = new URL(window.location.href).searchParams.get('order');
      if (!orderId) throw new Error(vi ? 'Thiếu mã đơn PayPal. Vui lòng mở lại liên kết thanh toán.' : 'Missing PayPal order. Please reopen your checkout link.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(vi ? 'Vui lòng đăng nhập đúng tài khoản Upgen đã mua gói, sau đó quay lại trang này để kiểm tra.' : 'Sign in to the Upgen account used for this purchase, then return here to check your payment.');
      const response = await fetch('/api/billing/paypal-checkout', {
        method: 'PUT', cache: 'no-store', signal: AbortSignal.timeout(60_000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể kiểm tra thanh toán.');
      if (data.status === 'paid') {
        setReceipt(data);
        setState('paid');
      } else {
        setState('pending');
        setMessage(vi ? 'PayPal chưa xác nhận thu tiền. Nếu đã thanh toán, vui lòng chờ rồi kiểm tra lại; không thanh toán thêm lần nữa.' : 'PayPal has not confirmed the payment yet. If you have paid, wait and check again; do not pay twice.');
      }
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Không thể kết nối PayPal. Vui lòng kiểm tra lại.');
    } finally { inFlight.current = false; }
  }, [vi]);

  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('cancelled') === '1') setState('cancelled');
    else void checkPayment();
  }, [checkPayment]);

  useEffect(() => {
    if (state !== 'pending' || attempts.current >= 6) return;
    const timer = setTimeout(() => void checkPayment(), 10_000);
    return () => clearTimeout(timer);
  }, [state, checkPayment]);

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
    <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900" aria-labelledby="paypal-result-title">
      <div className="mb-6 flex items-center gap-2 text-xl font-black text-blue-800 dark:text-blue-300"><Wallet /> Upgen · PayPal</div>
      <div aria-live="polite" aria-busy={state === 'checking'}>
        {state === 'checking' && <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />}
        {state === 'paid' && <CheckCircle2 className="mb-4 h-10 w-10 text-emerald-500" />}
        <h1 id="paypal-result-title" className="text-2xl font-bold text-slate-950 dark:text-white">
          {state === 'paid' ? (vi ? 'Gói đã được kích hoạt' : 'Your plan is active') : state === 'checking' ? (vi ? 'Đang xác nhận thanh toán' : 'Confirming payment') : state === 'cancelled' ? (vi ? 'Bạn đã quay lại từ PayPal' : 'You returned from PayPal') : (vi ? 'Chờ xác nhận thanh toán' : 'Awaiting payment confirmation')}
        </h1>
        {state === 'cancelled' && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{vi ? 'Bạn đã rời trang thanh toán. Nếu đã xác nhận trả tiền trên PayPal, hãy kiểm tra giao dịch trước khi tạo đơn mới.' : 'You left checkout. If you already approved payment on PayPal, check this transaction before starting a new one.'}</p>}
        {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
        {receipt && <dl className="my-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800 dark:text-slate-200">
          <div className="flex justify-between"><dt>{vi ? 'Gói' : 'Plan'}</dt><dd className="font-bold capitalize">{receipt.plan}</dd></div>
          <div className="flex justify-between"><dt>{vi ? 'Đã thanh toán' : 'Amount paid'}</dt><dd>{new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US', { style: 'currency', currency: receipt.currency }).format(receipt.amount / 100)}</dd></div>
          <div className="flex justify-between"><dt>{vi ? 'Hiệu lực đến' : 'Valid until'}</dt><dd>{new Date(receipt.periodEnd).toLocaleDateString(vi ? 'vi-VN' : 'en-US')}</dd></div>
          <div><dt>{vi ? 'Mã giao dịch' : 'Payment reference'}</dt><dd className="mt-1 break-all font-mono text-xs">{receipt.reference}</dd></div>
        </dl>}
      </div>
      {state !== 'checking' && state !== 'paid' && <button type="button" onClick={() => void checkPayment()} className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800">{vi ? 'Kiểm tra thanh toán' : 'Check payment'}</button>}
      <Link href="/" className="mt-4 block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">{state === 'paid' ? (vi ? 'Vào không gian làm việc' : 'Open workspace') : (vi ? 'Về Upgen' : 'Back to Upgen')}</Link>
      <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />{vi ? 'Gói trả trước, không tự động gia hạn.' : 'Prepaid plan. No automatic renewal.'}</p>
    </section>
  </main>;
}
