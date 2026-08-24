import type { AdminSetting } from '@/lib/admin/types';
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

function mapSetting(row: Record<string, unknown>): AdminSetting {
  return {
    key: String(row.key),
    value: asObject(row.value),
    description: String(row.description || ''),
    updatedAt: String(row.updated_at),
  };
}

function validateSetting(key: string, rawValue: unknown) {
  const value = asObject(rawValue);
  if (key === 'maintenance') {
    return {
      enabled: Boolean(value.enabled),
      message: asTrimmedString(value.message, 300) || 'Apexa đang được bảo trì. Vui lòng quay lại sau.',
    };
  }
  if (key === 'registration') return { enabled: Boolean(value.enabled) };
  if (key === 'runtime') {
    const status = value.status === 'degraded' || value.status === 'maintenance' ? value.status : 'operational';
    return { status, statusMessage: asTrimmedString(value.statusMessage, 300) || 'Tất cả hệ thống hoạt động bình thường.' };
  }
  if (key === 'security') {
    const sessionWarningMinutes = Math.min(120, Math.max(5, Number(value.sessionWarningMinutes) || 15));
    const adminMutationLimitPerMinute = Math.min(120, Math.max(5, Number(value.adminMutationLimitPerMinute) || 30));
    return { sessionWarningMinutes, adminMutationLimitPerMinute };
  }
  throw new AdminHttpError(400, 'Cấu hình không được hỗ trợ.');
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireSuperAdmin(request);
    const { data, error } = await admin.from('app_admin_settings').select('*').order('key');
    if (error) throw error;
    return adminJson({ settings: (data || []).map((row) => mapSetting(row as Record<string, unknown>)) });
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
    const key = asTrimmedString(body.key, 64);
    const value = validateSetting(key, body.value);
    const { data, error } = await admin.from('app_admin_settings').update({ value, updated_by: user.id }).eq('key', key).select('*').single();
    if (error) throw error;
    await writeAdminAudit(admin, request, user.id, 'setting.update', 'app_setting', key, { value });
    return adminJson({ setting: mapSetting(data as Record<string, unknown>) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
