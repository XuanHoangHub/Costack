"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, AlertTriangle, ArrowLeft, BadgeDollarSign, Ban, BarChart3, BellRing, BookOpenCheck,
  Boxes, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, CloudCog, Database, FileText,
  Fingerprint, Gauge, GitBranch, Globe2, KeyRound, LayoutDashboard, Loader2, LockKeyhole, MailPlus,
  MoreHorizontal, PackageCheck, RefreshCw, Rocket, Search, ServerCog, Settings, ShieldAlert, ShieldCheck,
  Sparkles, Trash2, UserCheck, UserRoundCog, Users, X, Zap, ArrowUpRight, TrendingUp, Cpu, Server, Shield,
  PieChart as PieIcon, Download
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts';
import { supabase, getCleanChannel } from '@/lib/supabaseClient';
import { APEXA_SUPER_ADMIN_UID, isApexaSuperAdmin } from '@/lib/admin/constants';
import type { AdminAuditEntry, AdminOverview, AdminSetting, AdminUser, AdminVersion } from '@/lib/admin/types';
import AdminMfaGate from '@/components/admin/AdminMfaGate';

type TabId = 'overview' | 'users' | 'revenue' | 'versions' | 'system' | 'audit';
type AccessState = 'checking' | 'authorized' | 'denied' | 'signed-out' | 'error';
type Pagination = { page: number; perPage: number; total: number; pages: number };
type VersionAction = 'publish' | 'schedule' | 'rollout' | 'deprecate';
type VersionActionDialog = { version: AdminVersion; action: Exclude<VersionAction, 'deprecate'> };

const planColors: Record<string, string> = {
  free: '#64748b',
  starter: '#38bdf8',
  pro: '#6366f1',
  business: '#8b5cf6',
  enterprise: '#f59e0b',
};

const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount / (zeroDecimalCurrencies.has(currency) ? 1 : 100));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(new Date(value));
}

function toLocalDateTime(value: Date) {
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function escapeCsvCell(value: unknown) {
  let text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportAuditCsv(entries: AdminAuditEntry[]) {
  const headers = ['ID', 'Thời gian', 'Hành động', 'Loại mục tiêu', 'Mục tiêu', 'Actor ID', 'Request ID', 'Metadata'];
  const rows = entries.map((entry) => [
    entry.id,
    entry.createdAt,
    entry.action,
    entry.targetType,
    entry.targetId || '',
    entry.actorId,
    entry.requestId,
    entry.metadata,
  ]);
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `apexa-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function statusTone(status: string) {
  if (status === 'active' || status === 'operational') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
  if (status === 'suspended' || status === 'high' || status === 'unavailable') return 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
  if (status === 'degraded' || status === 'watch' || status === 'scheduled' || status === 'beta') return 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
  if (status === 'canary' || status === 'draft') return 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
  return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
}

const EmptyState = ({ icon: Icon, title, text }: { icon: typeof Database; title: string; text: string }) => (
  <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-white/40 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-[var(--cu-surface)]/40">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
      <Icon className="h-6 w-6" />
    </span>
    <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
  </div>
);

/* Custom Recharts Tooltip */
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[var(--cu-surface)]/95">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-xs font-black text-slate-900 dark:text-white">
          {payload[0].name}: <span className="text-indigo-600 dark:text-indigo-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('checking');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, perPage: 25, total: 0, pages: 1 });
  const [versions, setVersions] = useState<AdminVersion[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [auditCursor, setAuditCursor] = useState<number | null>(null);
  const [auditFilter, setAuditFilter] = useState('');
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'pro' | 'enterprise'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutation, setMutation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'live' | 'degraded'>('connecting');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [versionForm, setVersionForm] = useState({ version: '', title: '', channel: 'stable', releaseNotes: '' });
  const [versionActionDialog, setVersionActionDialog] = useState<VersionActionDialog | null>(null);
  const [versionActionForm, setVersionActionForm] = useState({ scheduledAt: '', rolloutPercent: 10 });
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null);
  const [profileDraft, setProfileDraft] = useState({ riskLevel: 'normal', tags: '', note: '' });
  const [confirmAction, setConfirmAction] = useState<{ type: 'suspend' | 'restore' | 'delete'; user: AdminUser } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAccess('signed-out');
      throw new Error('Phiên đăng nhập không tồn tại.');
    }
    if (session.user?.id) setCurrentAdminId(session.user.id);
    const send = (accessToken: string) => fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Request-Id': crypto.randomUUID(),
        ...(init?.headers || {}),
      },
    });
    let response = await send(session.access_token);
    let body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session?.access_token) {
        response = await send(refreshed.session.access_token);
        body = await response.json().catch(() => ({}));
      }
    }
    if (response.status === 401) setAccess('signed-out');
    if (response.status === 403) {
      const ownerNeedsMfa = isApexaSuperAdmin(session.user.id) && /AAL2|xác thực hai bước|TOTP/i.test(String(body.error || ''));
      setMfaRequired(ownerNeedsMfa);
      setAccess('denied');
    }
    if (!response.ok) throw new Error(body.error || 'Yêu cầu quản trị thất bại.');
    return body;
  }, []);

  const loadOverview = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const body = await authorizedFetch('/api/admin/overview');
      setOverview(body.overview);
      setAccess('authorized');
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải Control Center.');
      setAccess((current) => current === 'checking' ? 'error' : current);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authorizedFetch]);

  const loadUsers = useCallback(async (page = pagination.page, value = search) => {
    setLoading(true);
    try {
      const body = await authorizedFetch(`/api/admin/users?page=${page}&perPage=${pagination.perPage}&search=${encodeURIComponent(value)}`);
      setUsers(body.users);
      setPagination(body.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải người dùng.');
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, pagination.page, pagination.perPage, search]);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const body = await authorizedFetch('/api/admin/versions');
      setVersions(body.versions);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải phiên bản.');
    } finally { setLoading(false); }
  }, [authorizedFetch]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const body = await authorizedFetch('/api/admin/settings');
      setSettings(body.settings);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải cấu hình.');
    } finally { setLoading(false); }
  }, [authorizedFetch]);

  const loadAudit = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (append && auditCursor) params.set('before', String(auditCursor));
      if (auditFilter.trim()) params.set('action', auditFilter.trim());
      const body = await authorizedFetch(`/api/admin/audit?${params.toString()}`);
      setAudit((current) => append ? [...current, ...body.entries] : body.entries);
      setAuditCursor(body.nextCursor);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải audit log.');
    } finally { setLoading(false); }
  }, [auditCursor, auditFilter, authorizedFetch]);

  const activeTabRef = useRef(activeTab);
  const loadOverviewRef = useRef(loadOverview);
  const loadAuditRef = useRef(loadAudit);
  const loadVersionsRef = useRef(loadVersions);
  const loadSettingsRef = useRef(loadSettings);

  useEffect(() => {
    activeTabRef.current = activeTab;
    loadOverviewRef.current = loadOverview;
    loadAuditRef.current = loadAudit;
    loadVersionsRef.current = loadVersions;
    loadSettingsRef.current = loadSettings;
  }, [activeTab, loadOverview, loadAudit, loadVersions, loadSettings]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (access !== 'authorized') return;
    const timer = window.setInterval(() => void loadOverviewRef.current(true), 20_000);
    const channel = getCleanChannel('apexa-admin-control-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_audit_logs' }, () => {
        void loadOverviewRef.current(true);
        if (activeTabRef.current === 'audit') void loadAuditRef.current(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_versions' }, () => {
        void loadOverviewRef.current(true);
        if (activeTabRef.current === 'versions') void loadVersionsRef.current();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_admin_settings' }, () => {
        if (activeTabRef.current === 'system') void loadSettingsRef.current();
      })
      .subscribe((status) => setRealtimeState(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'degraded' : 'connecting'));
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [access]);

  useEffect(() => {
    if (access !== 'authorized') return;
    if (activeTab === 'users') void loadUsers(1, search);
    if (activeTab === 'versions') void loadVersions();
    if (activeTab === 'system') void loadSettings();
  }, [access, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (access !== 'authorized' || activeTab !== 'users') return;
    const timer = window.setTimeout(() => void loadUsers(1, search), 350);
    return () => window.clearTimeout(timer);
  }, [access, activeTab, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (access !== 'authorized' || activeTab !== 'audit') return;
    const timer = window.setTimeout(() => void loadAudit(false), 300);
    return () => window.clearTimeout(timer);
  }, [access, activeTab, auditFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runMutation = async (key: string, url: string, init: RequestInit, after: () => Promise<void> | void, successMessage = 'Đã cập nhật thành công.') => {
    setMutation(key);
    setError('');
    setNotice('');
    try {
      await authorizedFetch(url, init);
      await after();
      setNotice(successMessage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Thao tác không thành công.');
    } finally { setMutation(''); }
  };

  const saveUserProfile = () => {
    if (!profileUser) return;
    void runMutation('profile', '/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: profileUser.id, action: 'profile', riskLevel: profileDraft.riskLevel, tags: profileDraft.tags.split(',').map((item) => item.trim()).filter(Boolean), note: profileDraft.note }),
    }, async () => { setProfileUser(null); await loadUsers(); });
  };

  const executeUserAction = () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    const deleting = type === 'delete';
    void runMutation(`${type}-${user.id}`, '/api/admin/users', {
      method: deleting ? 'DELETE' : 'PATCH',
      body: JSON.stringify(deleting
        ? { userId: user.id, confirmation: deleteConfirmation }
        : { userId: user.id, action: type }),
    }, async () => {
      setConfirmAction(null);
      setDeleteConfirmation('');
      await Promise.all([loadUsers(), loadOverview(true)]);
    });
  };

  const createVersion = () => {
    void runMutation('create-version', '/api/admin/versions', {
      method: 'POST', body: JSON.stringify(versionForm),
    }, async () => {
      setShowVersionForm(false);
      setVersionForm({ version: '', title: '', channel: 'stable', releaseNotes: '' });
      await loadVersions();
    });
  };

  const updateVersion = (version: AdminVersion, action: VersionAction) => {
    if (action === 'deprecate') {
      void runMutation(`deprecate-${version.id}`, '/api/admin/versions', {
        method: 'PATCH', body: JSON.stringify({ id: version.id, action }),
      }, loadVersions, `Đã ngừng phân phối phiên bản v${version.version}.`);
      return;
    }
    setError('');
    setVersionActionForm({
      scheduledAt: version.scheduledAt
        ? toLocalDateTime(new Date(version.scheduledAt))
        : toLocalDateTime(new Date(Date.now() + 60 * 60_000)),
      rolloutPercent: action === 'rollout' ? Math.max(1, version.rolloutPercent) : 10,
    });
    setVersionActionDialog({ version, action });
  };

  const executeVersionAction = () => {
    if (!versionActionDialog) return;
    const { version, action } = versionActionDialog;
    if (action === 'schedule') {
      const timestamp = new Date(versionActionForm.scheduledAt);
      if (!versionActionForm.scheduledAt || Number.isNaN(timestamp.getTime()) || timestamp.getTime() <= Date.now()) {
        setError('Thời gian phát hành phải ở tương lai.');
        return;
      }
    }
    const body = action === 'schedule'
      ? { id: version.id, action, scheduledAt: new Date(versionActionForm.scheduledAt).toISOString() }
      : { id: version.id, action, rolloutPercent: versionActionForm.rolloutPercent };
    const successMessage = action === 'schedule'
      ? `Đã lên lịch phiên bản v${version.version}.`
      : action === 'publish'
        ? `Đã phát hành phiên bản v${version.version} cho ${versionActionForm.rolloutPercent}% người dùng.`
        : `Đã cập nhật rollout v${version.version} lên ${versionActionForm.rolloutPercent}%.`;
    void runMutation(`${action}-${version.id}`, '/api/admin/versions', {
      method: 'PATCH', body: JSON.stringify(body),
    }, async () => {
      setVersionActionDialog(null);
      await Promise.all([loadVersions(), loadOverview(true)]);
    }, successMessage);
  };

  const saveSetting = (setting: AdminSetting) => {
    void runMutation(`setting-${setting.key}`, '/api/admin/settings', {
      method: 'PATCH', body: JSON.stringify({ key: setting.key, value: setting.value }),
    }, loadSettings);
  };

  const primaryRevenue = overview?.revenue[0];
  const contentChart = overview ? Object.entries(overview.content).map(([name, value]) => ({ name: name.replace('_', ' '), value })) : [];
  
  const navItems: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard; badge?: string | number }> = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'users', label: 'Người dùng', icon: Users, badge: overview?.users.total },
    { id: 'revenue', label: 'Doanh thu', icon: CircleDollarSign },
    { id: 'versions', label: 'Phiên bản', icon: GitBranch, badge: versions.length || undefined },
    { id: 'system', label: 'Hệ thống & Bảo mật', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log', icon: BookOpenCheck },
  ];

  const filteredUsers = useMemo(() => {
    if (userFilter === 'all') return users;
    if (userFilter === 'active') return users.filter(u => u.status === 'active');
    if (userFilter === 'suspended') return users.filter(u => u.status === 'suspended');
    if (userFilter === 'pro') return users.filter(u => u.plan === 'pro');
    if (userFilter === 'enterprise') return users.filter(u => u.plan === 'enterprise' || u.plan === 'business');
    return users;
  }, [users, userFilter]);

  if (access === 'checking' || (loading && !overview)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cu-bg)] text-white select-none">
        <div className="text-center">
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500 opacity-25 blur-xl animate-pulse" />
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300 shadow-inner">
              <ShieldCheck className="h-7 w-7 animate-pulse" />
            </span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-300">Apexa Control Center</p>
          <p className="mt-1 text-[11px] text-slate-500">Đang xác minh quyền quản trị…</p>
        </div>
      </div>
    );
  }

  if (mfaRequired) {
    return <AdminMfaGate onBack={() => router.push('/')} onSuccess={() => { setMfaRequired(false); setAccess('checking'); void loadOverview(); }} />;
  }

  if (access !== 'authorized') {
    const signedOut = access === 'signed-out';
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#172554_0%,#070a12_48%)] p-6 text-white select-none">
        <section className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl backdrop-blur-2xl">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-400/25">
            <LockKeyhole className="h-7 w-7" />
          </span>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">Zero-Trust Access Control</p>
          <h1 className="mt-2 text-2xl font-black">{signedOut ? 'Yêu cầu đăng nhập' : 'Quyền truy cập bị từ chối'}</h1>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-slate-400">
            {signedOut ? 'Đăng nhập bằng tài khoản quản trị được chỉ định để mở Apexa Control Center.' : 'Phiên hiện tại không đáp ứng UID quản trị duy nhất và mức xác thực AAL2 bắt buộc. Không có dữ liệu quản trị nào được cấp.'}
          </p>
          {error && <p className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-xs text-rose-200 border border-rose-500/20">{error}</p>}
          <button onClick={() => router.push('/')} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" /> Về ứng dụng
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[var(--cu-bg)] dark:text-slate-100 select-none font-sans">
      
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] flex-col border-r border-slate-200/80 bg-white/90 px-4 py-5 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[var(--sidebar-bg)]/90 lg:flex">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500 opacity-20 blur-md" />
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Apexa Control</p>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Security Center</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-7 flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-3 text-left text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-mono font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Verified UID & Security Status Footer */}
        <div className="mt-auto rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
              <Fingerprint className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>AAL2 Verified</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1.5 truncate font-mono text-[9px] font-bold text-emerald-700/80 dark:text-emerald-400/60">
            {currentAdminId || APEXA_SUPER_ADMIN_UID}
          </p>
        </div>
      </aside>

      {/* ── Main Container ── */}
      <div className="lg:pl-[270px]">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/80 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                  Control Center
                </span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                  {navItems.find((item) => item.id === activeTab)?.label}
                </span>
              </div>
              <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {navItems.find((item) => item.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Realtime Live Pill */}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black ${
                realtimeState === 'live'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  : realtimeState === 'degraded'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${realtimeState === 'live' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                <span className="hidden sm:inline">{realtimeState === 'live' ? 'Realtime Live' : realtimeState === 'degraded' ? 'Polling Mode' : 'Connecting'}</span>
              </span>

              {/* Refresh Action */}
              <button
                onClick={() => void loadOverview(true)}
                disabled={refreshing}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 shadow-xs"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Back to App */}
              <button
                onClick={() => router.push('/')}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-black text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 shadow-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Về ứng dụng</span>
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Navigation Tabs */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  activeTab === item.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          
          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-300/80 bg-rose-50/80 px-4 py-3.5 text-xs font-bold text-rose-800 backdrop-blur-md dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
                <button onClick={() => setError('')} className="cursor-pointer text-rose-400 hover:text-rose-600">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                aria-live="polite"
                className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-300/80 bg-emerald-50/80 px-4 py-3.5 text-xs font-bold text-emerald-800 backdrop-blur-md dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{notice}</span>
                </div>
                <button onClick={() => setNotice('')} aria-label="Đóng thông báo" className="cursor-pointer text-emerald-400 hover:text-emerald-600">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: TỔNG QUAN & DOANH THU
              ══════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'overview' || activeTab === 'revenue') && overview && (
            <div className="space-y-6">
              
              {/* 4 Hero Metric KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'Tổng người dùng',
                    value: formatNumber(overview.users.total),
                    detail: `+${overview.users.new30d} trong 30 ngày`,
                    icon: Users,
                    color: 'from-blue-600 to-cyan-500',
                    badge: '+30d',
                  },
                  {
                    label: 'Người dùng hoạt động',
                    value: formatNumber(overview.users.active30d),
                    detail: `${overview.users.active24h} trong 24 giờ qua`,
                    icon: Activity,
                    color: 'from-emerald-600 to-teal-500',
                    badge: 'Active',
                  },
                  {
                    label: 'Doanh thu tháng (MRR)',
                    value: primaryRevenue ? formatMoney(primaryRevenue.mrr, primaryRevenue.currency) : '—',
                    detail: overview.revenueSource === 'payos' ? 'Đồng bộ trực tiếp PayOS' : overview.revenueSource === 'stripe' ? 'Đồng bộ Stripe cũ' : 'Ước tính theo gói',
                    icon: BadgeDollarSign,
                    color: 'from-indigo-600 to-violet-500',
                    badge: overview.revenueSource === 'payos' ? 'PayOS' : overview.revenueSource === 'stripe' ? 'Stripe' : 'Catalog',
                  },
                  {
                    label: 'Không gian làm việc',
                    value: formatNumber(overview.content.workspaces || 0),
                    detail: `${overview.content.tasks || 0} công việc · ${overview.content.documents || overview.content.docs || 0} tài liệu`,
                    icon: Boxes,
                    color: 'from-amber-500 to-orange-500',
                    badge: 'Workspaces',
                  },
                ].map((metric) => (
                  <motion.article
                    key={metric.label}
                    whileHover={{ translateY: -2 }}
                    transition={{ duration: 0.15 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95 dark:hover:border-indigo-500/40"
                  >
                    <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${metric.color} opacity-15 blur-2xl`} />
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            {metric.label}
                          </p>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {metric.badge}
                          </span>
                        </div>
                        <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                          {metric.value}
                        </p>
                        <p className="mt-1 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                          {metric.detail}
                        </p>
                      </div>
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${metric.color} text-white shadow-md shadow-indigo-500/20`}>
                        <metric.icon className="h-5 w-5" />
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>

              {activeTab === 'overview' ? (
                <>
                  {/* Row 1: Charts (Growth + Plans) */}
                  <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                    
                    {/* User Growth Chart */}
                    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">Tăng trưởng người dùng</h2>
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                              30 ngày
                            </span>
                          </div>
                          <p className="mt-1 text-[10.5px] font-medium text-slate-400">Tài khoản đăng ký mới đã xác thực</p>
                        </div>
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                          <TrendingUp className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={overview.growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b818" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => String(value).slice(5)}
                              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="users"
                              name="Người dùng mới"
                              stroke="#6366f1"
                              strokeWidth={3}
                              fill="url(#userGrowthGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    {/* Subscription Plans Donut */}
                    <section className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
                      <div>
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-black text-slate-900 dark:text-white">Phân bổ gói dịch vụ</h2>
                          <PieIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="mt-1 text-[10.5px] font-medium text-slate-400">Subscription đang hoạt động</p>
                      </div>

                      <div className="relative my-2 h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={overview.plans}
                              dataKey="count"
                              nameKey="plan"
                              innerRadius={48}
                              outerRadius={72}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {overview.plans.map((item) => (
                                <Cell key={item.plan} fill={planColors[item.plan] || '#94a3b8'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-slate-900 dark:text-white">
                            {overview.users.total}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase text-slate-400">Tổng users</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                        {overview.plans.map((item) => (
                          <div key={item.plan} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-bold dark:bg-white/[0.03]">
                            <span className="flex items-center gap-1.5 capitalize text-slate-600 dark:text-slate-400">
                              <span className="h-2 w-2 rounded-full" style={{ background: planColors[item.plan] }} />
                              {item.plan}
                            </span>
                            <span className="font-mono text-slate-900 dark:text-white">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Row 2: Module Content Data & System Health */}
                  <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                    
                    {/* Data Records Chart */}
                    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-black text-slate-900 dark:text-white">Dữ liệu theo Module</h2>
                          <p className="mt-1 text-[10.5px] font-medium text-slate-400">Số lượng bản ghi toàn ứng dụng</p>
                        </div>
                        <Boxes className="h-4 w-4 text-indigo-500" />
                      </div>

                      <div className="mt-4 h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={contentChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b818" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 9.5, fill: '#94a3b8', fontWeight: 600 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 9.5, fill: '#94a3b8', fontWeight: 600 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar
                              dataKey="value"
                              name="Bản ghi"
                              radius={[8, 8, 0, 0]}
                              fill="#3b82f6"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    {/* System Health Status */}
                    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-black text-slate-900 dark:text-white">Sức khỏe hạ tầng</h2>
                          <p className="mt-1 text-[10.5px] font-medium text-slate-400">Kiểm tra kết nối dịch vụ thời gian thực</p>
                        </div>
                        <Gauge className="h-5 w-5 text-emerald-500" />
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {overview.health.map((item) => (
                          <div
                            key={item.service}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition-colors hover:border-slate-200 dark:border-white/[0.04] dark:bg-white/[0.03] dark:hover:border-white/[0.08]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-200">
                                {item.service.toLowerCase().includes('database') ? <Database className="h-4 w-4" /> :
                                 item.service.toLowerCase().includes('auth') ? <Shield className="h-4 w-4" /> :
                                 item.service.toLowerCase().includes('stripe') ? <CircleDollarSign className="h-4 w-4" /> :
                                 <Server className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 dark:text-white">{item.service}</p>
                                <p className="truncate text-[10px] font-medium text-slate-400">{item.detail}</p>
                              </div>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusTone(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <RevenuePanel overview={overview} />
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: QUẢN LÝ NGƯỜI DÙNG
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <section className="space-y-5">
              
              {/* Header & Quick Action */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Quản lý người dùng</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tài khoản hệ thống · Hồ sơ người dùng · Gói dịch vụ · Trạng thái truy cập
                  </p>
                </div>
                <button
                  onClick={() => setShowInvite(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-98"
                >
                  <MailPlus className="h-4 w-4" /> Mời người dùng
                </button>
              </div>

              {/* Filter Pills & Search Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'active', label: 'Hoạt động' },
                    { id: 'pro', label: 'Gói Pro' },
                    { id: 'enterprise', label: 'Enterprise' },
                    { id: 'suspended', label: 'Đình chỉ' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setUserFilter(filter.id as any)}
                      className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        userFilter === filter.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center min-w-[260px] sm:w-80">
                  <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm theo tên, email hoặc UID…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--cu-border)] dark:bg-[var(--cu-surface-2)] dark:text-white"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-slate-50/80 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:bg-white/[0.02]">
                      <tr>
                        <th className="px-5 py-3.5">Người dùng</th>
                        <th className="px-4 py-3.5">Trạng thái</th>
                        <th className="px-4 py-3.5">Gói dịch vụ</th>
                        <th className="px-4 py-3.5">Đăng nhập cuối</th>
                        <th className="px-4 py-3.5">Mức rủi ro</th>
                        <th className="px-5 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                          
                          {/* User Name & Avatar */}
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => {
                                setProfileUser(user);
                                setProfileDraft({ riskLevel: user.riskLevel, tags: user.tags.join(', '), note: user.note });
                              }}
                              className="flex cursor-pointer items-center gap-3 text-left group"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 text-xs font-black text-white shadow-xs">
                                {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="min-w-0">
                                <span className="block max-w-56 truncate font-black text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                                  {user.name}
                                </span>
                                <span className="block max-w-56 truncate text-[10px] font-medium text-slate-400">
                                  {user.email}
                                </span>
                              </span>
                            </button>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusTone(user.status)}`}>
                              {user.status}
                            </span>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-3.5">
                            <span className="font-black capitalize text-indigo-600 dark:text-indigo-400">
                              {user.plan}
                            </span>
                            <span className="block text-[9.5px] font-medium text-slate-400">
                              {user.subscriptionStatus || 'Miễn phí'}
                            </span>
                          </td>

                          {/* Last Sign In */}
                          <td className="px-4 py-3.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {formatDate(user.lastSignInAt, true)}
                          </td>

                          {/* Risk Level */}
                          <td className="px-4 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusTone(user.riskLevel)}`}>
                              {user.riskLevel}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setProfileUser(user);
                                  setProfileDraft({ riskLevel: user.riskLevel, tags: user.tags.join(', '), note: user.note });
                                }}
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                                title="Hồ sơ quản trị"
                              >
                                <UserRoundCog className="h-4 w-4" />
                              </button>

                              {user.status === 'suspended' ? (
                                <button
                                  onClick={() => setConfirmAction({ type: 'restore', user })}
                                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  title="Khôi phục tài khoản"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmAction({ type: 'suspend', user })}
                                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
                                  title="Đình chỉ tài khoản"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() => setConfirmAction({ type: 'delete', user })}
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                                title="Xóa mềm tài khoản"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!filteredUsers.length && !loading && (
                  <EmptyState icon={Users} title="Không tìm thấy người dùng" text="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-white/[0.06]">
                  <p className="text-[10px] font-bold text-slate-400">
                    Trang {pagination.page} / {pagination.pages} ({pagination.total} người dùng)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => void loadUsers(pagination.page - 1)}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => void loadUsers(pagination.page + 1)}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: PHIÊN BẢN (VERSIONS)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'versions' && (
            <VersionsPanel
              versions={versions}
              loading={loading}
              mutation={mutation}
              onCreate={() => setShowVersionForm(true)}
              onAction={updateVersion}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: HỆ THỐNG & BẢO MẬT (SYSTEM)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'system' && (
            <SettingsPanel
              settings={settings}
              mutation={mutation}
              setSettings={setSettings}
              onSave={saveSetting}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: AUDIT LOG BẤT BIẾN
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit' && (
            <AuditPanel
              entries={audit}
              loading={loading}
              hasMore={Boolean(auditCursor)}
              filter={auditFilter}
              onFilter={setAuditFilter}
              onExport={() => exportAuditCsv(audit)}
              onMore={() => void loadAudit(true)}
            />
          )}
        </main>
      </div>

      {/* ── MODAL: MỜI NGƯỜI DÙNG ── */}
      <AnimatePresence>
        {showInvite && (
          <Modal title="Mời người dùng mới" description="Hệ thống sẽ gửi email xác nhận bảo mật kèm liên kết kích hoạt tài khoản." onClose={() => setShowInvite(false)}>
            <Field label="Địa chỉ Email">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@company.com"
                className="admin-input"
                autoFocus
              />
            </Field>
            <button
              disabled={!inviteEmail || mutation === 'invite'}
              onClick={() => void runMutation('invite', '/api/admin/users', { method: 'POST', body: JSON.stringify({ email: inviteEmail }) }, async () => {
                setShowInvite(false);
                setInviteEmail('');
                await loadUsers();
              })}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
              Gửi lời mời thành viên
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── MODAL: TẠO PHIÊN BẢN ── */}
      <AnimatePresence>
        {showVersionForm && (
          <Modal title="Tạo phiên bản phát hành" description="Semantic Versioning · Kiểm soát kênh phát hành (Channel) và tỷ lệ rollout." onClose={() => setShowVersionForm(false)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mã phiên bản">
                <input
                  value={versionForm.version}
                  onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })}
                  placeholder="1.4.0"
                  className="admin-input font-mono"
                />
              </Field>
              <Field label="Kênh phát hành">
                <select
                  value={versionForm.channel}
                  onChange={(e) => setVersionForm({ ...versionForm, channel: e.target.value })}
                  className="admin-input"
                >
                  <option value="stable">Stable</option>
                  <option value="beta">Beta</option>
                  <option value="canary">Canary</option>
                </select>
              </Field>
            </div>
            <Field label="Tiêu đề phiên bản">
              <input
                value={versionForm.title}
                onChange={(e) => setVersionForm({ ...versionForm, title: e.target.value })}
                placeholder="Cải tiến hiệu năng & bảo mật"
                className="admin-input"
              />
            </Field>
            <Field label="Ghi chú phát hành (Release Notes)">
              <textarea
                value={versionForm.releaseNotes}
                onChange={(e) => setVersionForm({ ...versionForm, releaseNotes: e.target.value })}
                rows={4}
                className="admin-input resize-none"
                placeholder="Mô tả các tính năng mới, bản vá lỗi..."
              />
            </Field>
            <button
              disabled={!versionForm.version || !versionForm.title || mutation === 'create-version'}
              onClick={createVersion}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation === 'create-version' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Tạo bản nháp phát hành
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── MODAL: ĐIỀU PHỐI PHÁT HÀNH ── */}
      <AnimatePresence>
        {versionActionDialog && (
          <Modal
            title={
              versionActionDialog.action === 'schedule'
                ? `Lên lịch v${versionActionDialog.version.version}`
                : versionActionDialog.action === 'publish'
                  ? `Phát hành v${versionActionDialog.version.version}`
                  : `Điều chỉnh rollout v${versionActionDialog.version.version}`
            }
            description={`${versionActionDialog.version.title} · Kênh ${versionActionDialog.version.channel.toUpperCase()}`}
            onClose={() => { if (!mutation) setVersionActionDialog(null); }}
          >
            {versionActionDialog.action === 'schedule' ? (
              <>
                <Field label="Thời gian phát hành dự kiến">
                  <input
                    type="datetime-local"
                    min={toLocalDateTime(new Date(Date.now() + 60_000))}
                    value={versionActionForm.scheduledAt}
                    onChange={(event) => setVersionActionForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                    className="admin-input"
                    autoFocus
                  />
                </Field>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  Lịch được lưu theo múi giờ hiện tại của thiết bị và đồng bộ lên máy chủ dưới dạng UTC.
                </div>
              </>
            ) : (
              <>
                <Field label="Tỷ lệ người dùng nhận phiên bản">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={versionActionForm.rolloutPercent}
                        onChange={(event) => setVersionActionForm((current) => ({ ...current, rolloutPercent: Number(event.target.value) }))}
                        className="h-2 flex-1 cursor-pointer accent-indigo-600"
                        aria-label="Tỷ lệ rollout"
                      />
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={versionActionForm.rolloutPercent}
                          onChange={(event) => setVersionActionForm((current) => ({ ...current, rolloutPercent: Math.min(100, Math.max(1, Number(event.target.value) || 1)) }))}
                          className="admin-input pr-8 text-right font-mono"
                          aria-label="Phần trăm rollout"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 transition-all"
                        style={{ width: `${versionActionForm.rolloutPercent}%` }}
                      />
                    </div>
                  </div>
                </Field>
                {versionActionDialog.action === 'publish' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    Phiên bản đang hoạt động trên cùng kênh sẽ được chuyển sang trạng thái deprecated khi phát hành.
                  </div>
                )}
              </>
            )}
            <button
              disabled={Boolean(mutation) || (versionActionDialog.action === 'schedule' && !versionActionForm.scheduledAt)}
              onClick={executeVersionAction}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation === `${versionActionDialog.action}-${versionActionDialog.version.id}`
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : versionActionDialog.action === 'schedule'
                  ? <Clock3 className="h-4 w-4" />
                  : <Rocket className="h-4 w-4" />}
              {versionActionDialog.action === 'schedule'
                ? 'Xác nhận lịch phát hành'
                : versionActionDialog.action === 'publish'
                  ? 'Phát hành theo tỷ lệ đã chọn'
                  : 'Cập nhật tỷ lệ rollout'}
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── MODAL: HỒ SƠ QUẢN TRỊ NGƯỜI DÙNG ── */}
      <AnimatePresence>
        {profileUser && (
          <Modal title={`Hồ sơ: ${profileUser.name}`} description={`${profileUser.email} · UID: ${profileUser.id}`} onClose={() => setProfileUser(null)}>
            <Field label="Đánh giá mức độ rủi ro">
              <select
                value={profileDraft.riskLevel}
                onChange={(e) => setProfileDraft({ ...profileDraft, riskLevel: e.target.value as any })}
                className="admin-input"
              >
                <option value="normal">Bình thường (Normal)</option>
                <option value="watch">Cần theo dõi (Watch)</option>
                <option value="high">Rủi ro cao (High)</option>
              </select>
            </Field>
            <Field label="Tags quản trị (cách nhau bằng dấu phẩy)">
              <input
                value={profileDraft.tags}
                onChange={(e) => setProfileDraft({ ...profileDraft, tags: e.target.value })}
                className="admin-input"
                placeholder="vip, lead, enterprise-trial"
              />
            </Field>
            <Field label="Ghi chú nội bộ quản trị viên">
              <textarea
                value={profileDraft.note}
                onChange={(e) => setProfileDraft({ ...profileDraft, note: e.target.value })}
                rows={4}
                className="admin-input resize-none"
                placeholder="Thông tin liên hệ, ghi chú thanh toán..."
              />
            </Field>
            <button
              disabled={mutation === 'profile'}
              onClick={saveUserProfile}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation === 'profile' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCog className="h-4 w-4" />}
              Lưu hồ sơ quản trị
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── MODAL: XÁC NHẬN HÀNH ĐỘNG ── */}
      <AnimatePresence>
        {confirmAction && (
          <Modal
            title={
              confirmAction.type === 'delete' ? 'Xác nhận xóa mềm người dùng' :
              confirmAction.type === 'suspend' ? 'Đình chỉ quyền truy cập?' : 'Khôi phục tài khoản?'
            }
            description={
              confirmAction.type === 'delete'
                ? 'Tài khoản sẽ bị vô hiệu hóa quyền truy cập. Mọi hành động được ghi vào Nhật ký hệ thống bất biến.'
                : `${confirmAction.user.email} · Mọi thay đổi trạng thái sẽ có hiệu lực tức thì.`
            }
            onClose={() => { setConfirmAction(null); setDeleteConfirmation(''); }}
          >
            {confirmAction.type === 'delete' && (
              <Field label={`Nhập chính xác email: ${confirmAction.user.email}`}>
                <input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="admin-input"
                  placeholder={confirmAction.user.email}
                  autoFocus
                />
              </Field>
            )}
            <button
              disabled={Boolean(mutation) || (confirmAction.type === 'delete' && deleteConfirmation.toLowerCase() !== confirmAction.user.email.toLowerCase())}
              onClick={executeUserAction}
              className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black text-white shadow-lg transition-all disabled:opacity-40 ${
                confirmAction.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' :
                confirmAction.type === 'suspend' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' :
                'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {mutation ? <Loader2 className="h-4 w-4 animate-spin" /> :
               confirmAction.type === 'delete' ? <Trash2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              Xác nhận thực thi
            </button>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PANEL PHỤ: DOANH THU & SUBSCRIPTION
   ══════════════════════════════════════════════════════════════════ */
function RevenuePanel({ overview }: { overview: AdminOverview }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      {/* Revenue Breakdown */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Doanh thu Subscription</h2>
            <p className="mt-1 text-[10.5px] font-medium text-slate-400">
              {overview.revenueSource === 'payos' ? 'Đồng bộ đơn đã thanh toán PayOS' : overview.revenueSource === 'stripe' ? 'Đồng bộ Stripe Invoices cũ' : 'Ước tính từ danh mục gói hiện hành'}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${overview.revenueSource === 'payos' || overview.revenueSource === 'stripe' ? statusTone('active') : statusTone('degraded')}`}>
            {overview.revenueSource}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {overview.revenue.map((item) => (
            <div key={item.currency} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/[0.04] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white">{item.currency}</span>
                <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-3.5 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">MRR</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatMoney(item.mrr, item.currency)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">ARR</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatMoney(item.arr, item.currency)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Thu 30 ngày</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatMoney(item.collected30d, item.currency)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Funnel Distribution */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
        <h2 className="text-sm font-black text-slate-900 dark:text-white">Phễu phân bổ gói dịch vụ</h2>
        <p className="mt-1 text-[10.5px] font-medium text-slate-400">Tỷ lệ chuyển đổi và tài khoản theo từng cấp độ</p>

        <div className="mt-6 space-y-4">
          {overview.plans.map((item) => {
            const max = Math.max(...overview.plans.map((p) => p.count), 1);
            const percentage = Math.round((item.count / max) * 100);
            return (
              <div key={item.plan} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black capitalize">
                  <span className="text-slate-700 dark:text-slate-300">{item.plan}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{item.count} users</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${percentage}%`, background: planColors[item.plan] || '#6366f1' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PANEL PHỤ: QUẢN LÝ PHIÊN BẢN
   ══════════════════════════════════════════════════════════════════ */
function VersionsPanel({
  versions, loading, mutation, onCreate, onAction
}: {
  versions: AdminVersion[]; loading: boolean; mutation: string; onCreate: () => void;
  onAction: (version: AdminVersion, action: VersionAction) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Hệ thống phiên bản</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Semantic Versioning · Stable / Beta / Canary · Phased Rollout Control
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-98"
        >
          <Rocket className="h-4 w-4" /> Tạo phiên bản
        </button>
      </div>

      {!versions.length && !loading ? (
        <EmptyState icon={GitBranch} title="Chưa có phiên bản nào" text="Tạo bản nháp đầu tiên để bắt đầu quản lý lộ trình phát hành." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {versions.map((version) => (
            <article
              key={version.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-white">
                        v{version.version}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${statusTone(version.status)}`}>
                        {version.status}
                      </span>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[9px] font-black uppercase text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        {version.channel}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">{version.title}</h3>
                  </div>
                  <PackageCheck className="h-5 w-5 text-indigo-500 shrink-0" />
                </div>

                <p className="mt-3 line-clamp-3 min-h-12 whitespace-pre-wrap text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {version.releaseNotes || 'Chưa có ghi chú phát hành.'}
                </p>

                {/* Rollout Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-400">
                    <span>TỶ LỆ ROLLOUT</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{version.rolloutPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${version.rolloutPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[10.5px] font-semibold text-slate-400 dark:border-white/[0.06]">
                <span>
                  {version.status === 'scheduled' && version.scheduledAt
                    ? `Đã lên lịch: ${formatDate(version.scheduledAt, true)}`
                    : version.publishedAt
                      ? `Phát hành: ${formatDate(version.publishedAt)}`
                      : `Cập nhật: ${formatDate(version.updatedAt)}`}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {version.status !== 'active' && version.status !== 'deprecated' && (
                    <>
                      <button
                        disabled={Boolean(mutation)}
                        onClick={() => onAction(version, 'schedule')}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 font-black text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                      >
                        <Clock3 className="h-3.5 w-3.5" /> {version.status === 'scheduled' ? 'Đổi lịch' : 'Lên lịch'}
                      </button>
                      <button
                        disabled={Boolean(mutation)}
                        onClick={() => onAction(version, 'publish')}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 font-black text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                      >
                        <Rocket className="h-3.5 w-3.5" /> Phát hành
                      </button>
                    </>
                  )}
                  {version.status === 'active' && (
                    <>
                      <button
                        disabled={Boolean(mutation)}
                        onClick={() => onAction(version, 'rollout')}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 font-black text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                      >
                        <Gauge className="h-3.5 w-3.5" /> Rollout
                      </button>
                      <button
                        disabled={Boolean(mutation)}
                        onClick={() => onAction(version, 'deprecate')}
                        className="cursor-pointer rounded-xl bg-amber-50 px-3.5 py-2 font-black text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                      >
                        Ngừng phân phối
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PANEL PHỤ: HỆ THỐNG & BẢO MẬT
   ══════════════════════════════════════════════════════════════════ */
function SettingsPanel({
  settings, mutation, setSettings, onSave
}: {
  settings: AdminSetting[]; mutation: string;
  setSettings: React.Dispatch<React.SetStateAction<AdminSetting[]>>;
  onSave: (setting: AdminSetting) => void;
}) {
  const update = (key: string, patch: Record<string, unknown>) =>
    setSettings((current) =>
      current.map((item) => (item.key === key ? { ...item, value: { ...item.value, ...patch } } : item))
    );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Hệ thống & Bảo mật</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Runtime Controls · Chế độ bảo trì · Cho phép đăng ký · Giới hạn Mutation
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {settings.map((setting) => (
          <article
            key={setting.key}
            className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    {setting.key === 'maintenance' ? <ServerCog className="h-5 w-5" /> :
                     setting.key === 'registration' ? <UserCheck className="h-5 w-5" /> :
                     setting.key === 'security' ? <KeyRound className="h-5 w-5" /> :
                     <CloudCog className="h-5 w-5" />}
                  </span>
                  <div>
                    <h3 className="text-sm font-black capitalize text-slate-900 dark:text-white">
                      {setting.key.replace('_', ' ')}
                    </h3>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">{setting.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3.5">
                {setting.key === 'maintenance' && (
                  <>
                    <Toggle
                      label="Bật chế độ bảo trì toàn hệ thống"
                      checked={Boolean(setting.value.enabled)}
                      onChange={(value) => update(setting.key, { enabled: value })}
                    />
                    <Field label="Thông báo bảo trì hiển thị cho người dùng">
                      <textarea
                        value={String(setting.value.message || '')}
                        onChange={(e) => update(setting.key, { message: e.target.value })}
                        rows={3}
                        className="admin-input resize-none"
                        placeholder="Hệ thống đang bảo trì định kỳ..."
                      />
                    </Field>
                  </>
                )}

                {setting.key === 'registration' && (
                  <Toggle
                    label="Cho phép đăng ký tài khoản mới trong ứng dụng"
                    checked={Boolean(setting.value.enabled)}
                    onChange={(value) => update(setting.key, { enabled: value })}
                  />
                )}

                {setting.key === 'runtime' && (
                  <>
                    <Field label="Trạng thái Runtime">
                      <select
                        value={String(setting.value.status || 'operational')}
                        onChange={(e) => update(setting.key, { status: e.target.value })}
                        className="admin-input"
                      >
                        <option value="operational">Operational (Bình thường)</option>
                        <option value="degraded">Degraded (Hiệu năng giảm)</option>
                        <option value="maintenance">Maintenance (Bảo trì)</option>
                      </select>
                    </Field>
                    <Field label="Thông điệp trạng thái">
                      <input
                        value={String(setting.value.statusMessage || '')}
                        onChange={(e) => update(setting.key, { statusMessage: e.target.value })}
                        className="admin-input"
                        placeholder="Tất cả hệ thống hoạt động ổn định"
                      />
                    </Field>
                  </>
                )}

                {setting.key === 'security' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cảnh báo phiên (phút)">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={Number(setting.value.sessionWarningMinutes || 15)}
                        onChange={(e) => update(setting.key, { sessionWarningMinutes: Number(e.target.value) })}
                        className="admin-input font-mono"
                      />
                    </Field>
                    <Field label="Mutation / phút">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={Number(setting.value.adminMutationLimitPerMinute || 30)}
                        onChange={(e) => update(setting.key, { adminMutationLimitPerMinute: Number(e.target.value) })}
                        className="admin-input font-mono"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={mutation === `setting-${setting.key}`}
              onClick={() => onSave(setting)}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-black text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 shadow-xs"
            >
              {mutation === `setting-${setting.key}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Lưu cấu hình hệ thống
            </button>
          </article>
        ))}
      </div>

      {/* Defense in depth security note */}
      <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/70 p-5 text-xs leading-relaxed text-indigo-900 backdrop-blur-md dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
        <div className="flex items-start gap-3.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <p>
            <strong className="font-black">Defense in Depth:</strong> Mọi thao tác quản trị được xác thực ở phía máy chủ (Server-side) dựa trên Super Admin UID duy nhất, kiểm tra nguồn gốc truy cập (Origin), giới hạn tần suất mutation và tự động ghi Audit Log bất biến. Khóa Service-role không bao giờ được chuyển xuống phía Client.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PANEL PHỤ: AUDIT LOG BẤT BIẾN
   ══════════════════════════════════════════════════════════════════ */
function AuditPanel({
  entries, loading, hasMore, filter, onFilter, onExport, onMore
}: {
  entries: AdminAuditEntry[]; loading: boolean; hasMore: boolean; filter: string;
  onFilter: (value: string) => void; onExport: () => void; onMore: () => void;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Audit Log bất biến</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Keyset Pagination · Giả danh hóa IP (Pseudonymized) · Đối chiếu Request Correlation ID
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-72">
            <span className="sr-only">Lọc theo hành động audit</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filter}
              onChange={(event) => onFilter(event.target.value)}
              placeholder="Lọc hành động: version.publish…"
              className="admin-input h-11 pl-10"
            />
          </label>
          <button
            type="button"
            disabled={!entries.length}
            onClick={onExport}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Download className="h-4 w-4" /> Xuất CSV ({entries.length})
          </button>
        </div>
      </div>

      {!entries.length && !loading ? (
        <EmptyState icon={BookOpenCheck} title="Chưa có sự kiện quản trị" text="Mọi thay đổi trong Control Center sẽ được hệ thống ghi nhận tự động." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xs dark:border-white/[0.08] dark:bg-[var(--cu-surface)]/95">
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02] sm:grid-cols-[200px_1fr_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{entry.action}</p>
                    <p className="text-[10px] font-medium text-slate-400">{formatDate(entry.createdAt, true)}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">
                    Mục tiêu: <span className="font-mono text-indigo-600 dark:text-indigo-400">{entry.targetType}</span> · {entry.targetId || 'toàn cục'}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                    Request ID: {entry.requestId}
                  </p>
                </div>

                <span className="font-mono text-[10px] font-black text-slate-400">
                  #{entry.id}
                </span>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              disabled={loading}
              onClick={onMore}
              className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-slate-100 py-3.5 text-xs font-black text-indigo-600 transition-colors hover:bg-indigo-50/50 disabled:opacity-50 dark:border-white/[0.06] dark:text-indigo-400 dark:hover:bg-indigo-950/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tải thêm bản ghi Audit Log
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   UI HELPERS: MODAL, FIELD, TOGGLE
   ══════════════════════════════════════════════════════════════════ */
function Modal({
  title, description, onClose, children
}: {
  title: string; description: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/70 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-lg rounded-[32px] border border-white/80 bg-white p-6 shadow-2xl dark:border-[var(--cu-border)] dark:bg-[var(--cu-surface)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white text-balance">{title}</h2>
            <p className="mt-1 break-words text-pretty text-[11px] font-medium leading-relaxed text-slate-400">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.12]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-3.5">{children}</div>
      </motion.section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5 text-left text-xs font-bold text-slate-900 transition-colors dark:bg-white/[0.03] dark:text-white"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
