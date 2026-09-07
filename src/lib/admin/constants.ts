export const APEXA_SUPER_ADMIN_UIDS = [
  'd8c93bca-750a-4c79-9acc-61007b0ba261',
  '1bf2a088-ecbe-447e-8793-cb9b388e69f5',
] as const;

export const APEXA_SUPER_ADMIN_UID = APEXA_SUPER_ADMIN_UIDS[0];

export function isApexaSuperAdmin(uid?: string | null): boolean {
  if (!uid) return false;
  return (APEXA_SUPER_ADMIN_UIDS as readonly string[]).includes(uid);
}

export const ADMIN_REALTIME_TABLES = ['admin_audit_logs', 'app_versions', 'app_admin_settings'] as const;

