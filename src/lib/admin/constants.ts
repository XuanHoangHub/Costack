const DEFAULT_SUPER_ADMIN_UIDS: readonly string[] = [
  'd8c93bca-750a-4c79-9acc-61007b0ba261',
  '1bf2a088-ecbe-447e-8793-cb9b388e69f5',
];

function resolveSuperAdminUids(): readonly string[] {
  const envConfigured = (
    (typeof process !== 'undefined' ? (process.env.SUPER_ADMIN_UIDS || process.env.NEXT_PUBLIC_SUPER_ADMIN_UIDS || process.env.SUPER_ADMIN_UID || process.env.NEXT_PUBLIC_SUPER_ADMIN_UID) : '') || ''
  )
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));

  if (envConfigured.length > 0) {
    return Array.from(new Set([...envConfigured, ...DEFAULT_SUPER_ADMIN_UIDS]));
  }
  return DEFAULT_SUPER_ADMIN_UIDS;
}

export const APEXA_SUPER_ADMIN_UIDS = resolveSuperAdminUids();

export const APEXA_SUPER_ADMIN_UID = APEXA_SUPER_ADMIN_UIDS[0];

export function isApexaSuperAdmin(uid?: string | null): boolean {
  if (!uid || typeof uid !== 'string') return false;
  return resolveSuperAdminUids().includes(uid.toLowerCase().trim());
}

export const ADMIN_REALTIME_TABLES = ['admin_audit_logs', 'app_versions', 'app_admin_settings'] as const;

