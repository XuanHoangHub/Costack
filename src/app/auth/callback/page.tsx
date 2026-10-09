'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { resolveAppRole } from '@/lib/authRole';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryProvider = searchParams.get('provider');
  const [providerTitle, setProviderTitle] = useState(
    queryProvider === 'facebook' ? 'Facebook' : queryProvider === 'google' ? 'Google' : 'Mạng xã hội'
  );
  const [statusMessage, setStatusMessage] = useState('Đang kết nối tài khoản…');

  useEffect(() => {
    let isCancelled = false;

    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const savedProvider =
          queryProvider ||
          (typeof window !== 'undefined' ? sessionStorage.getItem('apexa_oauth_provider') : null);

        if (error || errorDescription) {
          const message = errorDescription || error || 'OAuth authentication failed';
          const providerParam = savedProvider ? `&provider=${encodeURIComponent(savedProvider)}` : '';
          router.replace(`/auth/auth-code-error?error=${encodeURIComponent(message)}${providerParam}`);
          return;
        }

        const code = searchParams.get('code');
        let session = null;

        if (code) {
          setStatusMessage(
            savedProvider === 'facebook'
              ? 'Đang trao đổi mã xác thực với Facebook…'
              : 'Đang trao đổi mã xác thực…'
          );
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

        const actualProvider =
          session.user.app_metadata?.provider ||
          savedProvider ||
          'social';

        if (actualProvider === 'facebook') {
          setProviderTitle('Facebook');
        } else if (actualProvider === 'google') {
          setProviderTitle('Google');
        }

        // Persist Google OAuth tokens if returned for Google Calendar & services
        if (actualProvider === 'google') {
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
        } else if (actualProvider === 'facebook') {
          if (session.provider_token) {
            try {
              localStorage.setItem('costack_fb_token', session.provider_token);
            } catch {}
          }
        }

        // Build authenticated user object
        const u = session.user;
        const metadata = u.user_metadata || {};
        const userEmail = u.email || metadata.email || '';

        // Handle Facebook edge-case where user account has no email or permissions unselected
        if (!userEmail) {
          const providerName = actualProvider === 'facebook' ? 'Facebook' : 'mạng xã hội';
          const errMsg = `Tài khoản ${providerName} chưa cung cấp địa chỉ email. Vui lòng bật quyền truy cập email trong tài khoản hoặc liên kết email rồi thử lại.`;
          router.replace(`/auth/auth-code-error?provider=${encodeURIComponent(actualProvider)}&error=${encodeURIComponent(errMsg)}`);
          return;
        }

        const isSuper = isApexaSuperAdmin(u.id);
        const displayName =
          metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          userEmail.split('@')[0] ||
          (actualProvider === 'facebook' ? 'Facebook User' : 'Costack Champion');

        // Robust avatar parsing (Facebook returns picture as object or string)
        const displayAvatar =
          typeof metadata.avatar_url === 'string'
            ? metadata.avatar_url
            : typeof metadata.picture === 'string'
            ? metadata.picture
            : metadata.picture?.data?.url || metadata.avatar || '';

        const userObj = {
          id: u.id,
          name: displayName,
          email: userEmail,
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
          sessionStorage.removeItem('apexa_oauth_provider');
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
        const savedProvider =
          queryProvider ||
          (typeof window !== 'undefined' ? sessionStorage.getItem('apexa_oauth_provider') : null);
        const providerParam = savedProvider ? `&provider=${encodeURIComponent(savedProvider)}` : '';
        router.replace(`/auth/auth-code-error?error=${encodeURIComponent(errorMessage)}${providerParam}`);
      }
    };

    void handleCallback();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams, queryProvider]);

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
          <h2 className="text-base font-bold tracking-tight">Đăng nhập {providerTitle}</h2>
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
