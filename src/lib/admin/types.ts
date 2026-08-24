import type { BillingCycle, BillingPlan } from '@/lib/billing/plans';

export type AdminMetric = {
  value: number;
  change?: number;
};

export type RevenueMetric = {
  currency: string;
  mrr: number;
  arr: number;
  collected30d: number;
};

export type GrowthPoint = {
  date: string;
  users: number;
};

export type AdminOverview = {
  generatedAt: string;
  source: 'live' | 'partial';
  revenueSource: 'payos' | 'stripe' | 'subscription-estimate' | 'unavailable';
  users: {
    total: number;
    active24h: number;
    active30d: number;
    new30d: number;
    unconfirmed: number;
    suspended: number;
  };
  content: Record<string, number>;
  plans: Array<{ plan: BillingPlan; count: number }>;
  revenue: RevenueMetric[];
  growth: GrowthPoint[];
  latestVersion: AdminVersion | null;
  recentAudit: AdminAuditEntry[];
  health: Array<{ service: string; status: 'operational' | 'degraded' | 'unavailable'; detail: string }>;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
  lastSignInAt: string | null;
  confirmedAt: string | null;
  bannedUntil: string | null;
  status: 'active' | 'invited' | 'suspended';
  plan: BillingPlan;
  billingCycle?: BillingCycle;
  subscriptionStatus?: string;
  riskLevel: 'normal' | 'watch' | 'high';
  tags: string[];
  note: string;
};

export type AdminVersion = {
  id: string;
  version: string;
  channel: 'stable' | 'beta' | 'canary';
  status: 'draft' | 'scheduled' | 'active' | 'deprecated';
  title: string;
  releaseNotes: string;
  rolloutPercent: number;
  minimumSupportedVersion?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditEntry = {
  id: number;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata: Record<string, unknown>;
  requestId: string;
  createdAt: string;
};

export type AdminSetting = {
  key: string;
  value: Record<string, unknown>;
  description: string;
  updatedAt: string;
};

export type RuntimeConfig = {
  maintenance: { enabled: boolean; message: string };
  registration: { enabled: boolean };
  runtime: { status: string; statusMessage: string };
  isAdmin: boolean;
  version: string;
};
