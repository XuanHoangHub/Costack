'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Apexa route error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl dark:bg-rose-950/50">!</div>
        <h1 className="text-2xl font-black">Apexa gặp sự cố tạm thời</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Dữ liệu cục bộ của bạn vẫn được giữ nguyên. Hãy thử tải lại phần này.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Thử lại</button>
          <Link href="/" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Trang chủ</Link>
        </div>
      </div>
    </main>
  );
}
