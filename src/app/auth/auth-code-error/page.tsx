'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const rawError = searchParams.get('error') || searchParams.get('error_description') || '';
  const decodedError = decodeURIComponent(rawError);

  const isCancelled =
    decodedError.toLowerCase().includes('access_denied') ||
    decodedError.toLowerCase().includes('cancel') ||
    decodedError.toLowerCase().includes('hủy');

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#07090e] text-white p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isCancelled
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              {isCancelled ? 'Đăng nhập đã bị hủy' : 'Lỗi xác thực tài khoản Google'}
            </h1>
            <p className="text-xs text-slate-400">
              {isCancelled
                ? 'Bạn đã từ chối cấp quyền hoặc đóng cửa sổ đăng nhập.'
                : 'Không thể hoàn tất quá trình xác thực với Google Auth qua Supabase.'}
            </p>
          </div>
        </div>

        {/* Error Detail Box */}
        {decodedError && (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300 break-words space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Chi tiết lỗi / Error Details
            </span>
            <p className="text-rose-300/90">{decodedError}</p>
          </div>
        )}

        {/* Standard Supabase Checklist */}
        {!isCancelled && (
          <div className="space-y-3 rounded-xl bg-white/[0.02] border border-white/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Tiêu chuẩn cấu hình Google OAuth trong Supabase:</span>
            </div>
            <ul className="space-y-2 text-slate-400 text-[11px] list-disc pl-4">
              <li>
                <strong className="text-slate-300">Authorized JavaScript origins:</strong> Đảm bảo địa chỉ ứng dụng (ví dụ: <code className="text-blue-300 font-mono">http://localhost:3000</code> hoặc domain chính) đã được thêm trong Google Cloud Console.
              </li>
              <li>
                <strong className="text-slate-300">Authorized redirect URIs:</strong> Đảm bảo URL callback của Supabase: <code className="text-blue-300 font-mono">https://&lt;project-ref&gt;.supabase.co/auth/v1/callback</code> đã được thêm vào Google Cloud Console.
              </li>
              <li>
                <strong className="text-slate-300">Data Access (Scopes):</strong> Đã bật các quyền <code className="text-blue-300 font-mono">openid</code>, <code className="text-blue-300 font-mono">.../auth/userinfo.email</code>, <code className="text-blue-300 font-mono">.../auth/userinfo.profile</code>.
              </li>
              <li>
                <strong className="text-slate-300">Supabase Provider:</strong> Đã bật Google Provider trong Supabase Dashboard và nhập đúng Client ID & Client Secret.
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử đăng nhập lại</span>
          </Link>
          <a
            href="https://supabase.com/docs/guides/auth/social-login/auth-google?queryGroups=platform&platform=web"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.98] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>Tài liệu Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </main>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07090e] text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
