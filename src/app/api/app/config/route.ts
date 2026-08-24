import { createClient } from '@supabase/supabase-js';
import { APEXA_SUPER_ADMIN_UID } from '@/lib/admin/constants';
import type { RuntimeConfig } from '@/lib/admin/types';
import { adminJson, asObject, getAdminClient } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requestIsAdmin(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.slice(7).trim();
  const [{ data }, claimsResult] = await Promise.all([
    client.auth.getUser(token),
    client.auth.getClaims(token),
  ]);
  return data.user?.id === APEXA_SUPER_ADMIN_UID && claimsResult.data?.claims?.aal === 'aal2';
}

export async function GET(request: Request) {
  const fallback: RuntimeConfig = {
    maintenance: { enabled: false, message: 'Apexa đang được bảo trì. Vui lòng quay lại sau.' },
    registration: { enabled: true },
    runtime: { status: 'operational', statusMessage: 'Tất cả hệ thống hoạt động bình thường.' },
    isAdmin: false,
    version: process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
  };
  try {
    const admin = getAdminClient();
    const [{ data: settings }, { data: version }] = await Promise.all([
      admin.from('app_admin_settings').select('key,value').in('key', ['maintenance', 'registration', 'runtime']),
      admin.from('app_versions').select('version').eq('channel', 'stable').eq('status', 'active').maybeSingle(),
    ]);
    const values = new Map((settings || []).map((row) => [String(row.key), asObject(row.value)]));
    const maintenance = values.get('maintenance');
    const registration = values.get('registration');
    const runtime = values.get('runtime');
    return adminJson({
      config: {
        maintenance: maintenance ? { enabled: Boolean(maintenance.enabled), message: String(maintenance.message || fallback.maintenance.message) } : fallback.maintenance,
        registration: registration ? { enabled: Boolean(registration.enabled) } : fallback.registration,
        runtime: runtime ? { status: String(runtime.status || 'operational'), statusMessage: String(runtime.statusMessage || fallback.runtime.statusMessage) } : fallback.runtime,
        isAdmin: await requestIsAdmin(request),
        version: version?.version || fallback.version,
      } satisfies RuntimeConfig,
    });
  } catch {
    return adminJson({ config: { ...fallback, isAdmin: await requestIsAdmin(request) } });
  }
}
