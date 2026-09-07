import 'server-only';

import { createHash, randomUUID } from 'crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { APEXA_SUPER_ADMIN_UID, isApexaSuperAdmin } from '@/lib/admin/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export class AdminHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getAdminClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseSecret) throw new AdminHttpError(503, 'Admin database access is not configured.');
  return createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new AdminHttpError(401, 'Authentication required.');
  const token = authorization.slice(7).trim();
  if (!token || token.length > 8192) throw new AdminHttpError(401, 'Invalid authentication token.');
  return token;
}

export async function requireSuperAdmin(request: Request): Promise<{ user: User; accessToken: string; admin: SupabaseClient }> {
  if (!supabaseUrl || !publishableKey) throw new AdminHttpError(503, 'Supabase authentication is not configured.');
  const accessToken = getAccessToken(request);
  const verifier = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const claimsResult = await verifier.auth.getClaims(accessToken);
  const claims = claimsResult.data?.claims;
  const subject = typeof claims?.sub === 'string' ? claims.sub : '';
  if (claimsResult.error) {
    console.warn('Admin JWT verification rejected:', {
      error: claimsResult.error instanceof Error ? claimsResult.error.message : String(claimsResult.error || ''),
    });
    if (claimsResult.error.name === 'AuthRetryableFetchError' || claimsResult.error.status === 0) {
      throw new AdminHttpError(503, 'Không thể kết nối dịch vụ xác thực. Vui lòng thử lại.');
    }
    throw new AdminHttpError(401, 'Your session is invalid or expired.');
  }
  if (!subject) {
    throw new AdminHttpError(401, 'Your session is invalid or expired.');
  }
  if (!isApexaSuperAdmin(subject)) throw new AdminHttpError(403, 'You do not have access to Apexa Control Center.');
  const requireAal2 = process.env.ADMIN_REQUIRE_AAL2 !== 'false';
  if (requireAal2 && claims?.aal !== 'aal2') {
    throw new AdminHttpError(403, 'Tài khoản quản trị phải hoàn tất xác thực hai bước (AAL2). Hãy bật TOTP trong Cài đặt bảo mật rồi đăng nhập lại.');
  }

  // getClaims verifies the JWT signature and expiry. The Admin API lookup then
  // confirms that the exact account still exists and has not been suspended.
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(subject);
  if (error) {
    console.warn('Admin account lookup rejected:', {
      error: error instanceof Error ? error.message : String(error || ''),
    });
    throw new AdminHttpError(503, 'Không thể kết nối dịch vụ quản trị người dùng. Vui lòng thử lại.');
  }
  if (!data.user) throw new AdminHttpError(401, 'Your session is invalid or expired.');
  if (data.user.banned_until && new Date(data.user.banned_until).getTime() > Date.now()) {
    throw new AdminHttpError(403, 'This administrator account is suspended.');
  }
  return { user: data.user, accessToken, admin };
}

function requestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  return configured || new URL(request.url).origin;
}

export function assertTrustedMutation(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new AdminHttpError(415, 'Administrative mutations require application/json.');
  }
  const origin = request.headers.get('origin');
  if ((!origin && process.env.NODE_ENV === 'production') || (origin && origin !== requestOrigin(request))) {
    throw new AdminHttpError(403, 'Untrusted administrative request origin.');
  }
}

export async function enforceAdminMutationRateLimit(admin: SupabaseClient, actorId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await admin
    .from('admin_audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', actorId)
    .gte('created_at', since);
  if (error && error.code !== '42P01') throw error;
  const { data: securitySetting } = await admin.from('app_admin_settings').select('value').eq('key', 'security').maybeSingle();
  const configured = Number(asObject(securitySetting?.value).adminMutationLimitPerMinute || process.env.ADMIN_MUTATION_LIMIT_PER_MINUTE || 30);
  const limit = Number.isFinite(configured) ? Math.min(120, Math.max(5, configured)) : 30;
  if ((count || 0) >= limit) throw new AdminHttpError(429, 'Too many administrative changes. Please wait one minute.');
}

function hashRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip');
  if (!ip) return null;
  const salt = process.env.ADMIN_AUDIT_SALT || supabaseSecret || 'apexa-admin-audit';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function writeAdminAudit(
  admin: SupabaseClient,
  request: Request,
  actorId: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  const requestIdHeader = request.headers.get('x-request-id');
  const requestId = requestIdHeader && /^[0-9a-f-]{36}$/i.test(requestIdHeader) ? requestIdHeader : randomUUID();
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;
  const { error } = await admin.from('admin_audit_logs').insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    metadata,
    request_id: requestId,
    ip_hash: hashRequestIp(request),
    user_agent: userAgent,
  });
  if (error) throw error;
  return requestId;
}

export function adminJson(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return Response.json(data, { ...init, headers });
}

export function adminErrorResponse(error: unknown) {
  const status = error instanceof AdminHttpError ? error.status : 500;
  if (status >= 500) console.error('Admin control plane error:', error);
  const message = status >= 500
    ? 'Hệ thống quản trị tạm thời không khả dụng.'
    : error instanceof Error ? error.message : 'Administrative request failed.';
  return adminJson({ error: message }, { status });
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function asTrimmedString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
