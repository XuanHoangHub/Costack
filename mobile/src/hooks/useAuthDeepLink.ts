import { useEffect } from 'react';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';

export function extractAuthTokens(url: string) {
  try {
    let paramString = '';
    if (url.includes('#')) {
      paramString = url.split('#')[1];
    } else if (url.includes('?')) {
      paramString = url.split('?')[1];
    }
    if (!paramString) return null;

    const params = new URLSearchParams(paramString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const error = params.get('error_description') || params.get('error');

    return { accessToken, refreshToken, code, error };
  } catch (err) {
    console.warn('Error parsing auth URL:', err);
    return null;
  }
}

export function useAuthDeepLink() {
  const checkSession = useAuthStore((s) => s.checkSession);
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspacesFromSupabase);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (!url.includes('auth/callback') && !url.includes('access_token') && !url.includes('code=')) {
        return;
      }

      const parsed = extractAuthTokens(url);
      if (!parsed) return;

      if (parsed.error) {
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập không thành công',
          text2: parsed.error,
        });
        return;
      }

      try {
        if (parsed.accessToken && parsed.refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });

          if (error) throw error;

          if (data.session) {
            await checkSession();
            await fetchWorkspaces();
            Toast.show({
              type: 'success',
              text1: 'Đăng nhập thành công',
              text2: 'Chào mừng bạn quay trở lại Upgen!',
            });
          }
        } else if (parsed.code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
          if (error) throw error;

          if (data.session) {
            await checkSession();
            await fetchWorkspaces();
            Toast.show({
              type: 'success',
              text1: 'Đăng nhập thành công',
              text2: 'Chào mừng bạn quay trở lại Upgen!',
            });
          }
        }
      } catch (err: any) {
        console.warn('Deep link authentication error:', err);
        Toast.show({
          type: 'error',
          text1: 'Lỗi xác thực OAuth',
          text2: err?.message || 'Không thể thiết lập phiên đăng nhập.',
        });
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleUrl(initialUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkSession, fetchWorkspaces]);
}
