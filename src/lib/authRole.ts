import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'member';

/**
 * Resolve the account-level role only from server-controlled auth metadata.
 * Workspace-specific authorization is resolved separately from memberships.
 */
export function resolveAppRole(user: Pick<SupabaseAuthUser, 'app_metadata'> | null | undefined): AppRole {
  return user?.app_metadata?.role === 'admin' ? 'admin' : 'member';
}
