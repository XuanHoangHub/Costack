import { mapAudit } from '@/lib/admin/data';
import { adminErrorResponse, adminJson, requireSuperAdmin } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { admin } = await requireSuperAdmin(request);
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(10, Number.parseInt(url.searchParams.get('limit') || '40', 10) || 40));
    const before = Number.parseInt(url.searchParams.get('before') || '', 10);
    const action = (url.searchParams.get('action') || '').trim().slice(0, 100);
    let query = admin.from('admin_audit_logs').select('*').order('id', { ascending: false }).limit(limit);
    if (Number.isFinite(before) && before > 0) query = query.lt('id', before);
    if (action) query = query.ilike('action', `%${action.replace(/[%_]/g, '')}%`);
    const { data, error } = await query;
    if (error) throw error;
    const entries = (data || []).map((row) => mapAudit(row as Record<string, unknown>));
    return adminJson({ entries, nextCursor: entries.length === limit ? entries.at(-1)?.id || null : null });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
