import type { AdminVersion } from '@/lib/admin/types';
import { mapVersion } from '@/lib/admin/data';
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

const semverPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function parseRolloutPercent(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') return fallback;
  const rollout = Number(value);
  if (!Number.isInteger(rollout) || rollout < 1 || rollout > 100) {
    throw new AdminHttpError(400, 'Tỷ lệ rollout phải là số nguyên từ 1 đến 100.');
  }
  return rollout;
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireSuperAdmin(request);
    const { data, error } = await admin.from('app_versions').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return adminJson({ versions: (data || []).map((row) => mapVersion(row as Record<string, unknown>)) });
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
    const version = asTrimmedString(body.version, 64);
    const title = asTrimmedString(body.title, 160);
    const releaseNotes = asTrimmedString(body.releaseNotes, 20_000);
    const channel = body.channel === 'beta' || body.channel === 'canary' ? body.channel : 'stable';
    if (!semverPattern.test(version)) throw new AdminHttpError(400, 'Phiên bản phải theo Semantic Versioning, ví dụ 1.4.0.');
    if (title.length < 3) throw new AdminHttpError(400, 'Tiêu đề phiên bản quá ngắn.');
    const { data, error } = await admin.from('app_versions').insert({
      version,
      channel,
      status: 'draft',
      title,
      release_notes: releaseNotes,
      rollout_percent: 0,
      created_by: user.id,
    }).select('*').single();
    if (error) throw new AdminHttpError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Phiên bản và channel đã tồn tại.' : error.message);
    await writeAdminAudit(admin, request, user.id, 'version.create', 'app_version', String(data.id), { version, channel });
    return adminJson({ version: mapVersion(data as Record<string, unknown>) }, { status: 201 });
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
    const id = asTrimmedString(body.id, 64);
    const action = asTrimmedString(body.action, 30);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AdminHttpError(400, 'ID phiên bản không hợp lệ.');
    const { data: currentVersion, error: currentVersionError } = await admin
      .from('app_versions')
      .select('id,status,version')
      .eq('id', id)
      .maybeSingle();
    if (currentVersionError) throw currentVersionError;
    if (!currentVersion) throw new AdminHttpError(404, 'Không tìm thấy phiên bản.');
    const currentStatus = String(currentVersion.status);

    let updated: AdminVersion;
    if (action === 'publish') {
      if (currentStatus !== 'draft' && currentStatus !== 'scheduled') {
        throw new AdminHttpError(409, 'Chỉ có thể phát hành phiên bản nháp hoặc đã lên lịch.');
      }
      const rollout = parseRolloutPercent(body.rolloutPercent, 100);
      const { data, error } = await admin.rpc('admin_publish_app_version', {
        p_version_id: id,
        p_actor_id: user.id,
        p_rollout_percent: rollout,
      });
      if (error) throw error;
      const publishedRow = Array.isArray(data) ? data[0] : data;
      if (!publishedRow) throw new AdminHttpError(500, 'Không nhận được phiên bản sau khi phát hành.');
      updated = mapVersion(publishedRow as Record<string, unknown>);
      await writeAdminAudit(admin, request, user.id, 'version.publish', 'app_version', id, { rolloutPercent: rollout, version: updated.version });
    } else if (action === 'deprecate') {
      if (currentStatus !== 'active') throw new AdminHttpError(409, 'Chỉ phiên bản đang hoạt động mới có thể ngừng phân phối.');
      const { data, error } = await admin.from('app_versions').update({ status: 'deprecated', rollout_percent: 0 }).eq('id', id).select('*').single();
      if (error) throw error;
      updated = mapVersion(data as Record<string, unknown>);
      await writeAdminAudit(admin, request, user.id, 'version.deprecate', 'app_version', id, { version: updated.version });
    } else if (action === 'schedule') {
      if (currentStatus !== 'draft' && currentStatus !== 'scheduled') {
        throw new AdminHttpError(409, 'Chỉ có thể lên lịch phiên bản nháp hoặc đã lên lịch.');
      }
      const scheduledAt = asTrimmedString(body.scheduledAt, 64);
      const timestamp = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(timestamp.getTime()) || timestamp.getTime() <= Date.now()) throw new AdminHttpError(400, 'Thời gian phát hành phải ở tương lai.');
      const { data, error } = await admin.from('app_versions').update({ status: 'scheduled', scheduled_at: timestamp.toISOString() }).eq('id', id).select('*').single();
      if (error) throw error;
      updated = mapVersion(data as Record<string, unknown>);
      await writeAdminAudit(admin, request, user.id, 'version.schedule', 'app_version', id, { scheduledAt: timestamp.toISOString() });
    } else if (action === 'rollout') {
      if (currentStatus !== 'active') throw new AdminHttpError(409, 'Chỉ phiên bản đang hoạt động mới có thể điều chỉnh rollout.');
      const rollout = parseRolloutPercent(body.rolloutPercent, 1);
      const { data, error } = await admin.from('app_versions').update({ rollout_percent: rollout }).eq('id', id).eq('status', 'active').select('*').single();
      if (error) throw error;
      updated = mapVersion(data as Record<string, unknown>);
      await writeAdminAudit(admin, request, user.id, 'version.rollout', 'app_version', id, { rolloutPercent: rollout });
    } else {
      throw new AdminHttpError(400, 'Thao tác phiên bản không được hỗ trợ.');
    }
    return adminJson({ version: updated });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
