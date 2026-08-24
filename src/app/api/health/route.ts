import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();
  
  return NextResponse.json(
    {
      status: 'healthy',
      app: 'Apexa OS',
      version: process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
      timestamp,
      uptimeSeconds: Math.floor(uptime),
      environment: process.env.NODE_ENV || 'production',
      services: {
        api: 'operational',
        supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)),
        payosConfigured: Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY),
        stripeLegacyConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
