"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { BillingCycle, BillingPlan } from '@/lib/billing/plans';
import { useAuthStore } from '@/store/authStore';
import { useMemberStore } from '@/store/memberStore';
import { useUiStore } from '@/store/uiStore';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

export type BillingEntitlement = {
  plan: BillingPlan;
  provider?: 'payos' | 'stripe';
  status: string;
  billing_cycle?: BillingCycle;
  is_pro: boolean;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  trial_end?: string;
  limits?: {
    maxSpaces: number | null;
    maxMembers: number | null;
    monthlyAiRequests: number;
  };
  capabilities?: string[];
};

export function useBillingEntitlement() {
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const [entitlement, setEntitlement] = useState<BillingEntitlement | null>(null);

  const applyEntitlement = useCallback((entitlement: BillingEntitlement) => {
    setEntitlement(entitlement);
    const current = useAuthStore.getState().currentUser;
    if (!current) return;
    const isSuper = isApexaSuperAdmin(current.id);
    const isPro = isSuper || entitlement.is_pro;
    const plan = isSuper ? 'enterprise' : entitlement.plan;
    const status = isSuper ? 'active' : entitlement.status;
    const cycle = isSuper ? 'yearly' : entitlement.billing_cycle;
    const periodEnd = isSuper ? '2099-12-31T23:59:59Z' : entitlement.current_period_end;

    const updatedUser = {
      ...current,
      isPremium: isPro,
      subscriptionPlan: plan,
      billingStatus: status,
      billingCycle: cycle,
      billingPeriodEnd: periodEnd,
    };
    useAuthStore.getState().setCurrentUser(updatedUser);

    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('avaxa_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.user) {
            parsed.user = { ...parsed.user, ...updatedUser };
            window.localStorage.setItem('avaxa_session', JSON.stringify(parsed));
          }
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('apexa-entitlement-updated', { detail: entitlement }));
    }

    const member = useMemberStore.getState().members.find(item => item.id === 'user' || item.userId === current.id);
    if (member) {
      useMemberStore.getState().updateMember({
        ...member,
        isPremium: isPro,
        subscriptionPlan: plan,
        billingStatus: status,
        billingCycle: cycle,
        billingPeriodEnd: periodEnd,
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    const current = useAuthStore.getState().currentUser;
    if (current && isApexaSuperAdmin(current.id)) {
      const superAdminEntitlement: BillingEntitlement = {
        plan: 'enterprise',
        status: 'active',
        is_pro: true,
        billing_cycle: 'yearly',
        current_period_end: '2099-12-31T23:59:59Z',
        limits: { maxSpaces: null, maxMembers: null, monthlyAiRequests: 100000 },
        capabilities: ['unlimited_spaces', 'unlimited_members', 'advanced_ai', 'audit_logs', 'custom_branding', 'priority_support'],
      };
      applyEntitlement(superAdminEntitlement);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    const response = await fetch('/api/billing/subscription', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) return null;
    const body = await response.json();
    applyEntitlement(body.entitlement);
    return body.entitlement as BillingEntitlement;
  }, [applyEntitlement]);

  useEffect(() => {
    // Purge credentials left by legacy BYOK builds. Current AI requests use
    // only Apexa's server-side provider credential.
    window.localStorage.removeItem('apexa_gemini_api_key');
    void refresh().catch(() => undefined);
    const url = new URL(window.location.href);
    const billing = url.searchParams.get('billing');
    if (billing === 'success') {
      const provider = url.searchParams.get('provider');
      const pendingPlan = window.localStorage.getItem('apexa_pending_upgrade_plan');
      let attempts = 0;
      let inFlight = false;
      let active = true;
      const timer = window.setInterval(async () => {
        if (inFlight) return;
        inFlight = true;
        attempts += 1;
        const entitlement = await refresh().catch(() => null);
        inFlight = false;
        if (!active) return;
        if (entitlement?.is_pro && (provider !== 'stripe' || (entitlement.provider === 'stripe' && entitlement.plan === pendingPlan))) {
          window.clearInterval(timer);
          if (provider === 'stripe') {
            window.sessionStorage.setItem('apexa_billing_success_provider', 'stripe');
            useUiStore.getState().setShowPremiumModal(true);
          }
        } else if (attempts >= 8) {
          window.clearInterval(timer);
        }
      }, 1500);
      url.searchParams.delete('billing');
      url.searchParams.delete('provider');
      url.searchParams.delete('session_id');
      url.searchParams.delete('code');
      url.searchParams.delete('id');
      url.searchParams.delete('cancel');
      url.searchParams.delete('status');
      url.searchParams.delete('orderCode');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      return () => { active = false; window.clearInterval(timer); };
    }
    if (billing === 'canceled' || billing === 'portal_return') {
      url.searchParams.delete('billing');
      url.searchParams.delete('provider');
      url.searchParams.delete('code');
      url.searchParams.delete('id');
      url.searchParams.delete('cancel');
      url.searchParams.delete('status');
      url.searchParams.delete('orderCode');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [currentUserId, refresh]);

  return { refresh, applyEntitlement, entitlement };
}
