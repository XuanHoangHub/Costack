"use client";

import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useMemberStore } from '@/store/memberStore';

export type BillingEntitlement = {
  plan: 'free' | 'pro' | 'enterprise';
  status: string;
  billing_cycle?: 'monthly' | 'yearly';
  is_pro: boolean;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  trial_end?: string;
};

export function useBillingEntitlement() {
  const currentUserId = useAuthStore((state) => state.currentUser?.id);

  const applyEntitlement = useCallback((entitlement: BillingEntitlement) => {
    const current = useAuthStore.getState().currentUser;
    if (!current) return;
    if (current.isPremium !== entitlement.is_pro) {
      useAuthStore.getState().setCurrentUser({ ...current, isPremium: entitlement.is_pro });
    }
    const member = useMemberStore.getState().members.find(item => item.id === 'user' || item.userId === current.id);
    if (member && member.isPremium !== entitlement.is_pro) {
      useMemberStore.getState().updateMember({ ...member, isPremium: entitlement.is_pro });
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    const response = await fetch('/api/billing/subscription', { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) return null;
    const body = await response.json();
    applyEntitlement(body.entitlement);
    return body.entitlement as BillingEntitlement;
  }, [applyEntitlement]);

  useEffect(() => {
    void refresh();
    const url = new URL(window.location.href);
    const billing = url.searchParams.get('billing');
    if (billing === 'success') {
      let attempts = 0;
      const timer = window.setInterval(async () => {
        attempts += 1;
        const entitlement = await refresh();
        if (entitlement?.is_pro || attempts >= 8) window.clearInterval(timer);
      }, 1500);
      url.searchParams.delete('billing');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      return () => window.clearInterval(timer);
    }
    if (billing === 'canceled' || billing === 'portal_return') {
      url.searchParams.delete('billing');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [currentUserId, refresh]);

  return { refresh, applyEntitlement };
}
