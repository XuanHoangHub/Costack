"use client";

import { useCallback, useEffect, useState } from 'react';
import type { RuntimeConfig } from '@/lib/admin/types';
import { supabase } from '@/lib/supabaseClient';

const fallbackConfig: RuntimeConfig = {
  maintenance: { enabled: false, message: 'Costack đang được bảo trì. Vui lòng quay lại sau.' },
  registration: { enabled: true },
  runtime: { status: 'operational', statusMessage: 'Tất cả hệ thống hoạt động bình thường.' },
  isAdmin: false,
  version: '0.1.0',
};

export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig>(fallbackConfig);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/app/config', {
        cache: 'no-store',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!response.ok) return;
      const body = await response.json();
      if (body?.config) setConfig(body.config as RuntimeConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refresh(), 0);
    });
    return () => {
      window.clearInterval(interval);
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  return { config, loading, refresh };
}
