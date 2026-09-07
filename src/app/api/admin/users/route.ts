import type { User } from '@supabase/supabase-js';
import { APEXA_SUPER_ADMIN_UID, isApexaSuperAdmin } from '@/lib/admin/constants';
import type { AdminUser } from '@/lib/admin/types';
import { isPaidBillingPlan, type BillingPlan } from '@/lib/billing/plans';
import {
  AdminHttpError,
  adminErrorResponse,
  adminJson,
  asObject,
  asTrimmedString,
  assertTrustedMutation,
  enforceAdminMutationRateLimit,
  requireSuperAdmin,
  writeAdminAudit,
} from '@/lib/admin/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function userStatus(user: User): AdminUser['status'] {
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) return 'suspended';
  if (!user.email_confirmed_at && !user.phone_confirmed_at) return 'invited';
  return 'active';
}

function mapUser(
  user: User,
  member?: Record<string, unknown>,
  subscription?: Record<string, unknown>,
  profile?: Record<string, unknown>,
): AdminUser {
  const metadata = asObject(user.user_metadata);
  const subscriptionPlan = isPaidBillingPlan(subscription?.plan) ? subscription.plan : 'free';
  return {
    id: user.id,
    email: user.email || String(member?.email || ''),
    name: String(member?.name || metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Apexa user'),
    avatar: String(member?.avatar || metadata.avatar_url || metadata.picture || ''),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at || null,
    confirmedAt: user.email_confirmed_at || user.phone_confirmed_at || null,
    bannedUntil: user.banned_until || null,
    status: userStatus(user),
    plan: subscriptionPlan as BillingPlan,
    billingCycle: subscription?.billing_cycle === 'monthly' ? 'monthly' : subscription?.billing_cycle === 'yearly' ? 'yearly' : undefined,
    subscriptionStatus: subscription?.status ? String(subscription.status) : undefined,
    riskLevel: profile?.risk_level === 'watch' || profile?.risk_level === 'high' ? profile.risk_level : 'normal',
    tags: Array.isArray(profile?.tags) ? profile.tags.map(String) : [],
    note: String(profile?.note || ''),
  };
}

async function loadRelated(admin: Awaited<ReturnType<typeof requireSuperAdmin>>['admin'], userIds: string[]) {
  if (!userIds.length) return { members: new Map(), subscriptions: new Map(), profiles: new Map() };
  const [membersResult, subscriptionsResult, profilesResult] = await Promise.all([
    admin.from('members').select('*').in('user_id', userIds),
    admin.from('billing_subscriptions').select('user_id,plan,billing_cycle,status,current_period_end').in('user_id', userIds),
    admin.from('admin_user_profiles').select('*').in('user_id', userIds),
  ]);
  const members = new Map<string, Record<string, unknown>>();
  const subscriptions = new Map<string, Record<string, unknown>>();
  const profiles = new Map<string, Record<string, unknown>>();
  (membersResult.data || []).forEach((row) => members.set(String(row.user_id), row as Record<string, unknown>));
  (subscriptionsResult.data || []).forEach((row) => subscriptions.set(String(row.user_id), row as Record<string, unknown>));
  (profilesResult.data || []).forEach((row) => profiles.set(String(row.user_id), row as Record<string, unknown>));
  return { members, subscriptions, profiles };
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireSuperAdmin(request);
    const url = new URL(request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const perPage = Math.min(100, Math.max(10, Number.parseInt(url.searchParams.get('perPage') || '25', 10) || 25));
    const search = (url.searchParams.get('search') || '').trim().toLowerCase().slice(0, 120);

    let users: User[];
    let total: number;
    if (search) {
      const all: User[] = [];
      let authPage = 1;
      while (true) {
        const result = await admin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
        if (result.error) throw result.error;
        all.push(...result.data.users);
        if (!result.data.nextPage) break;
        authPage = result.data.nextPage;
      }
      const filtered = all.filter((item) => {
        const metadata = asObject(item.user_metadata);
        return item.id.toLowerCase().includes(search)
          || (item.email || '').toLowerCase().includes(search)
          || String(metadata.full_name || metadata.name || '').toLowerCase().includes(search);
      });
      total = filtered.length;
      users = filtered.slice((page - 1) * perPage, page * perPage);
    } else {
      const result = await admin.auth.admin.listUsers({ page, perPage });
      if (result.error) throw result.error;
      users = result.data.users;
      total = result.data.total;
    }

    const related = await loadRelated(admin, users.map((item) => item.id));
    return adminJson({
      users: users.map((item) => mapUser(item, related.members.get(item.id), related.subscriptions.get(item.id), related.profiles.get(item.id))),
      pagination: { page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)) },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const { user, admin } = await requireSuperAdmin(request);
    await enforceAdminMutationRateLimit(admin, user.id);
    const body = asObject(await request.json().catch(() => ({})));
    const email = asTrimmedString(body.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminHttpError(400, 'Email không hợp lệ.');
    const redirectTo = `${(process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')}/`;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) throw new AdminHttpError(400, error.message);
    await writeAdminAudit(admin, request, user.id, 'user.invite', 'user', data.user.id, { email });
    return adminJson({ userId: data.user.id, message: 'Đã gửi lời mời người dùng.' }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedMutation(request);
    const { user, admin } = await requireSuperAdmin(request);
    await enforceAdminMutationRateLimit(admin, user.id);
    const body = asObject(await request.json().catch(() => ({})));
    const targetUserId = asTrimmedString(body.userId, 64);
    const action = asTrimmedString(body.action, 30);
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new AdminHttpError(400, 'UID người dùng không hợp lệ.');
    if (isApexaSuperAdmin(targetUserId) && action === 'suspend') throw new AdminHttpError(400, 'Không thể đình chỉ tài khoản quản trị.');

    if (action === 'suspend' || action === 'restore') {
      const { error } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: action === 'suspend' ? '876000h' : 'none' });
      if (error) throw error;
      await writeAdminAudit(admin, request, user.id, `user.${action}`, 'user', targetUserId);
      return adminJson({ message: action === 'suspend' ? 'Đã đình chỉ người dùng.' : 'Đã khôi phục người dùng.' });
    }

    if (action === 'profile') {
      const riskLevel = body.riskLevel === 'watch' || body.riskLevel === 'high' ? body.riskLevel : 'normal';
      const note = asTrimmedString(body.note, 5000);
      const tags = Array.isArray(body.tags)
        ? body.tags.map((tag) => asTrimmedString(tag, 40)).filter(Boolean).slice(0, 20)
        : [];
      const { error } = await admin.from('admin_user_profiles').upsert({
        user_id: targetUserId,
        risk_level: riskLevel,
        tags,
        note,
        updated_by: user.id,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      await writeAdminAudit(admin, request, user.id, 'user.profile_update', 'user', targetUserId, { riskLevel, tagCount: tags.length });
      return adminJson({ message: 'Đã cập nhật hồ sơ quản trị.' });
    }

    throw new AdminHttpError(400, 'Thao tác người dùng không được hỗ trợ.');
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertTrustedMutation(request);
    const { user, admin } = await requireSuperAdmin(request);
    await enforceAdminMutationRateLimit(admin, user.id);
    const body = asObject(await request.json().catch(() => ({})));
    const targetUserId = asTrimmedString(body.userId, 64);
    const confirmation = asTrimmedString(body.confirmation, 254).toLowerCase();
    if (isApexaSuperAdmin(targetUserId)) throw new AdminHttpError(400, 'Không thể xóa tài khoản quản trị.');
    const { data, error } = await admin.auth.admin.getUserById(targetUserId);
    if (error || !data.user) throw new AdminHttpError(404, 'Không tìm thấy người dùng.');
    if (!data.user.email || confirmation !== data.user.email.toLowerCase()) {
      throw new AdminHttpError(400, 'Nhập đúng email người dùng để xác nhận xóa mềm.');
    }
    await writeAdminAudit(admin, request, user.id, 'user.soft_delete', 'user', targetUserId, { email: data.user.email });
    const deletion = await admin.auth.admin.deleteUser(targetUserId, true);
    if (deletion.error) throw deletion.error;
    return adminJson({ message: 'Người dùng đã được xóa mềm.' });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
