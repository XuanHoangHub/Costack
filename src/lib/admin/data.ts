import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getStripe } from '@/lib/billing/server';
import { SUGGESTED_PRICES, type BillingPlan } from '@/lib/billing/plans';
import type { AdminAuditEntry, AdminOverview, AdminVersion, GrowthPoint, RevenueMetric } from '@/lib/admin/types';

const LIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due']);

function isLiveSubscription(row: Record<string, unknown>) {
  const status = String(row.status);
  if (!LIVE_SUBSCRIPTION_STATUSES.has(status)) return false;
  if (status === 'past_due') return true;
  if (!row.current_period_end) return true;
  return new Date(String(row.current_period_end)).getTime() > Date.now();
}

export async function listAllAuthUsers(admin: SupabaseClient) {
  const users: User[] = [];
  let page = 1;
  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    users.push(...result.data.users);
    if (!result.data.nextPage) break;
    page = result.data.nextPage;
  }
  return users;
}

async function exactCount(admin: SupabaseClient, table: string) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildGrowth(users: User[], days = 30): GrowthPoint[] {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const counts = new Map<string, number>();
  users.forEach((user) => {
    const key = isoDay(new Date(user.created_at));
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = isoDay(date);
    return { date: key, users: counts.get(key) || 0 };
  });
}

function mapVersion(row: Record<string, unknown>): AdminVersion {
  return {
    id: String(row.id),
    version: String(row.version),
    channel: row.channel as AdminVersion['channel'],
    status: row.status as AdminVersion['status'],
    title: String(row.title),
    releaseNotes: String(row.release_notes || ''),
    rolloutPercent: Number(row.rollout_percent || 0),
    minimumSupportedVersion: row.minimum_supported_version ? String(row.minimum_supported_version) : null,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAudit(row: Record<string, unknown>): AdminAuditEntry {
  return {
    id: Number(row.id),
    actorId: String(row.actor_id),
    action: String(row.action),
    targetType: String(row.target_type),
    targetId: row.target_id ? String(row.target_id) : null,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {},
    requestId: String(row.request_id),
    createdAt: String(row.created_at),
  };
}

function intervalToMonthly(amount: number, interval: string | undefined, intervalCount: number | undefined) {
  const count = intervalCount || 1;
  if (interval === 'year') return amount / (12 * count);
  if (interval === 'week') return amount * (52 / 12) / count;
  if (interval === 'day') return amount * (365 / 12) / count;
  return amount / count;
}

async function getStripeRevenue(): Promise<RevenueMetric[]> {
  const stripe = getStripe();
  const byCurrency = new Map<string, { mrr: number; collected30d: number }>();

  for await (const subscription of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    if (!LIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) continue;
    subscription.items.data.forEach((item) => {
      const price = item.price;
      if (price.unit_amount == null) return;
      const currency = price.currency.toUpperCase();
      const current = byCurrency.get(currency) || { mrr: 0, collected30d: 0 };
      current.mrr += intervalToMonthly(price.unit_amount * (item.quantity || 1), price.recurring?.interval, price.recurring?.interval_count);
      byCurrency.set(currency, current);
    });
  }

  const created = Math.floor((Date.now() - 30 * 86_400_000) / 1000);
  for await (const invoice of stripe.invoices.list({ status: 'paid', created: { gte: created }, limit: 100 })) {
    const currency = invoice.currency.toUpperCase();
    const current = byCurrency.get(currency) || { mrr: 0, collected30d: 0 };
    current.collected30d += invoice.amount_paid;
    byCurrency.set(currency, current);
  }

  return Array.from(byCurrency.entries()).map(([currency, amount]) => ({
    currency,
    mrr: Math.round(amount.mrr),
    arr: Math.round(amount.mrr * 12),
    collected30d: amount.collected30d,
  }));
}

function estimateRevenue(rows: Array<Record<string, unknown>>): RevenueMetric[] {
  let mrr = 0;
  rows.forEach((row) => {
    if (!isLiveSubscription(row)) return;
    const plan = row.plan;
    if (plan !== 'starter' && plan !== 'pro' && plan !== 'business') return;
    const cycle = row.billing_cycle === 'monthly' ? 'monthly' : 'yearly';
    const amount = SUGGESTED_PRICES[plan][cycle];
    mrr += cycle === 'yearly' ? amount / 12 : amount;
  });
  return [{ currency: 'VND', mrr: Math.round(mrr), arr: Math.round(mrr * 12), collected30d: 0 }];
}

async function getPayOSRevenue(admin: SupabaseClient, rows: Array<Record<string, unknown>>): Promise<RevenueMetric[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from('billing_orders')
    .select('amount,currency,paid_at')
    .eq('provider', 'payos')
    .eq('status', 'paid')
    .gte('paid_at', since)
    .range(0, 9999);
  if (error) throw error;
  const estimate = estimateRevenue(rows)[0];
  const collected30d = (data || []).reduce((total, order) => total + Number(order.amount || 0), 0);
  return [{ ...estimate, collected30d }];
}

export async function getAdminOverview(admin: SupabaseClient): Promise<AdminOverview> {
  const health: AdminOverview['health'] = [];
  let partial = false;

  const users = await listAllAuthUsers(admin);
  health.push({ service: 'Supabase Auth', status: 'operational', detail: `${users.length} users synchronized` });

  const countTables = ['workspaces', 'spaces', 'tasks', 'docs', 'documents', 'whiteboard_elements', 'newsletter_subscribers', 'finance_transactions'] as const;
  const countResults = await Promise.all(countTables.map(async (table) => {
    try {
      return [table, await exactCount(admin, table)] as const;
    } catch {
      partial = true;
      return [table, 0] as const;
    }
  }));
  const content = Object.fromEntries(countResults);

  let subscriptionRows: Array<Record<string, unknown>> = [];
  try {
    const { data, error } = await admin
      .from('billing_subscriptions')
      .select('user_id,plan,billing_cycle,status,current_period_end')
      .range(0, 9999);
    if (error) throw error;
    subscriptionRows = (data || []) as Array<Record<string, unknown>>;
    health.push({ service: 'Billing database', status: 'operational', detail: `${subscriptionRows.length} subscription records` });
  } catch {
    partial = true;
    health.push({ service: 'Billing database', status: 'degraded', detail: 'Subscription metrics unavailable' });
  }

  const paidUserIds = new Set<string>();
  const planCounts = new Map<BillingPlan, number>([['free', 0], ['starter', 0], ['pro', 0], ['business', 0], ['enterprise', 0]]);
  subscriptionRows.forEach((row) => {
    if (!isLiveSubscription(row)) return;
    const plan = String(row.plan) as BillingPlan;
    if (!planCounts.has(plan)) return;
    paidUserIds.add(String(row.user_id));
    planCounts.set(plan, (planCounts.get(plan) || 0) + 1);
  });
  planCounts.set('free', Math.max(0, users.length - paidUserIds.size));

  let revenue: RevenueMetric[] = [];
  let revenueSource: AdminOverview['revenueSource'] = 'unavailable';
  try {
    revenue = await getPayOSRevenue(admin, subscriptionRows);
    revenueSource = 'payos';
    health.push({ service: 'PayOS', status: 'operational', detail: 'Paid orders and prepaid entitlements synchronized' });
  } catch {
    try {
      revenue = await getStripeRevenue();
      revenueSource = 'stripe';
      health.push({ service: 'Stripe (legacy)', status: 'operational', detail: 'Legacy subscriptions and paid invoices' });
    } catch {
      if (subscriptionRows.length) {
        revenue = estimateRevenue(subscriptionRows);
        revenueSource = 'subscription-estimate';
        partial = true;
        health.push({ service: 'PayOS', status: 'degraded', detail: 'Using prepaid entitlement catalog estimate' });
      } else {
        health.push({ service: 'PayOS', status: 'unavailable', detail: 'Revenue metrics unavailable' });
      }
    }
  }

  let latestVersion: AdminVersion | null = null;
  try {
    const { data, error } = await admin.from('app_versions').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    latestVersion = data ? mapVersion(data as Record<string, unknown>) : null;
  } catch {
    partial = true;
  }

  let recentAudit: AdminAuditEntry[] = [];
  try {
    const { data, error } = await admin.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(8);
    if (error) throw error;
    recentAudit = (data || []).map((row) => mapAudit(row as Record<string, unknown>));
  } catch {
    partial = true;
  }

  const now = Date.now();
  const dayAgo = now - 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const banned = (user: User) => Boolean(user.banned_until && new Date(user.banned_until).getTime() > now);

  return {
    generatedAt: new Date().toISOString(),
    source: partial ? 'partial' : 'live',
    revenueSource,
    users: {
      total: users.length,
      active24h: users.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() >= dayAgo).length,
      active30d: users.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() >= monthAgo).length,
      new30d: users.filter((user) => new Date(user.created_at).getTime() >= monthAgo).length,
      unconfirmed: users.filter((user) => !user.email_confirmed_at && !user.phone_confirmed_at).length,
      suspended: users.filter(banned).length,
    },
    content,
    plans: Array.from(planCounts.entries()).map(([plan, count]) => ({ plan, count })),
    revenue,
    growth: buildGrowth(users),
    latestVersion,
    recentAudit,
    health,
  };
}

export { mapAudit, mapVersion };
