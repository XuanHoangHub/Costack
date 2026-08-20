import 'server-only';

import { createClient } from '@supabase/supabase-js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) return jsonError('Payload is too large.', 413);

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  const requestOrigin = request.headers.get('origin');
  if (configuredOrigin && requestOrigin && requestOrigin !== configuredOrigin) {
    return jsonError('Origin is not allowed.', 403);
  }

  const body = await request.json().catch(() => null) as null | {
    email?: unknown;
    locale?: unknown;
    company?: unknown;
  };
  if (!body) return jsonError('Invalid request body.', 400);

  // Honeypot: return a normal response without storing automated submissions.
  if (typeof body.company === 'string' && body.company.trim()) {
    return Response.json({ ok: true }, { status: 202 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const locale = body.locale === 'en' ? 'en' : 'vi';
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return jsonError(locale === 'vi' ? 'Địa chỉ email không hợp lệ.' : 'Enter a valid email address.', 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return jsonError(locale === 'vi' ? 'Kênh đăng ký đang được cấu hình. Vui lòng thử lại sau.' : 'Subscriptions are being configured. Please try again later.', 503);
  }

  const admin = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.from('newsletter_subscribers').upsert({
    email,
    locale,
    source: 'landing',
    status: 'subscribed',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' });

  if (error) {
    console.error('Newsletter subscription failed:', error.message);
    return jsonError(locale === 'vi' ? 'Chưa thể đăng ký lúc này. Vui lòng thử lại.' : 'Unable to subscribe right now. Please try again.', 500);
  }

  return Response.json({
    ok: true,
    message: locale === 'vi' ? 'Đăng ký thành công. Cảm ơn bạn!' : 'You are subscribed. Thank you!',
  }, { status: 201 });
}

