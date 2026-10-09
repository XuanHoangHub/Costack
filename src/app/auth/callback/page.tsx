'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { resolveAppRole } from '@/lib/authRole';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Đang kết nối tài khoản Google…');

  useEffect(() => {
    let isCancelled = false;

    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error || errorDescription) {
          const message = errorDescription || error || 'OAuth authentication failed';
          router.replace(`/auth/auth-code-error?error=${encodeURIComponent(message)}`);
          return;
        }

        const code = searchParams.get('code');
        let session = null;

        if (code) {
          setStatusMessage('Đang trao đổi mã xác thực với Google…');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('exchangeCodeForSession warning, checking active session:', exchangeError.message);
            const { data: fallbackData } = await supabase.auth.getSession();
            if (fallbackData?.session) {
              session = fallbackData.session;
            } else {
              throw exchangeError;
            }
          } else {
            session = data.session;
          }
        } else {
          // If session was established through implicit flow or already stored
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          session = sessionData?.session;
        }

        if (!session?.user) {
          throw new Error('Không tìm thấy phiên đăng nhập hợp lệ sau khi xác thực.');
        }

        if (isCancelled) return;

        // Persist Google OAuth tokens if returned for Google Calendar & services
        if (session.provider_token) {
          try {
            localStorage.setItem('costack_gcal_token', session.provider_token);
          } catch {}
        }
        if (session.provider_refresh_token) {
          try {
            localStorage.setItem('costack_gcal_refresh_token', session.provider_refresh_token);
          } catch {}
        }

        // Build authenticated user object
        const u = session.user;
        const metadata = u.user_metadata || {};
        const isSuper = isApexaSuperAdmin(u.id);
        const displayName = metadata.full_name || metadata.name || metadata.display_name || u.email?.split('@')[0] || 'Costack Champion';
        const displayAvatar = metadata.avatar_url || metadata.picture || metadata.avatar || '';

        const userObj = {
          id: u.id,
          name: displayName,
          email: u.email || '',
          avatar: displayAvatar,
          role: isSuper ? ('admin' as const) : resolveAppRole(u),
          status: 'online' as const,
          isPremium: isSuper,
          subscriptionPlan: isSuper ? ('enterprise' as const) : undefined,
          billingStatus: isSuper ? ('active' as const) : undefined,
        };

        const sessionPayload = {
          user: userObj,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };

        try {
          localStorage.setItem('avaxa_session', JSON.stringify(sessionPayload));
          localStorage.setItem('apexa_session', JSON.stringify(sessionPayload));
        } catch {}

        setStatusMessage('Đăng nhập thành công! Đang chuyển hướng…');

        // Determine destination safely
        const rawNext = searchParams.get('next');
        let destination = '/';
        if (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')) {
          destination = rawNext;
        }

        window.location.replace(destination);
      } catch (err: unknown) {
        if (isCancelled) return;
        console.error('Lỗi xử lý xác thực callback:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        router.replace(`/auth/auth-code-error?error=${encodeURIComponent(errorMessage)}`);
      }
    };

    void handleCallback();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090e] text-white px-4">
      <div className="flex flex-col items-center max-w-sm text-center space-y-4 p-8 rounded-2xl bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold tracking-tight">Đăng nhập Google</h2>
          <p className="text-xs text-slate-400">{statusMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07090e] text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
