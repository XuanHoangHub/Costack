export type PresenceStatus = 'online' | 'busy' | 'away' | 'offline';

export interface PresencePayload {
  user_id?: string;
  custom_status?: PresenceStatus;
  status_message?: string;
  status_emoji?: string;
  is_idle?: boolean;
  last_active?: string;
  status_changed_at?: string;
}

export interface ResolvedPresence {
  status: PresenceStatus;
  customStatus: PresenceStatus;
  statusMessage: string;
  statusEmoji: string;
  lastSeenAt: string;
}

const VALID_STATUSES: PresenceStatus[] = ['online', 'busy', 'away', 'offline'];

function normalizeStatus(status: unknown): PresenceStatus {
  return VALID_STATUSES.includes(status as PresenceStatus)
    ? (status as PresenceStatus)
    : 'online';
}

function timestamp(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Collapses all tabs/devices for one account into a single status.
 * A user is idle only when every live connection is idle.
 */
export function resolvePresence(payloads: PresencePayload[]): ResolvedPresence | null {
  if (payloads.length === 0) return null;

  const latestPreference = [...payloads].sort(
    (a, b) =>
      timestamp(b.status_changed_at || b.last_active) -
      timestamp(a.status_changed_at || a.last_active)
  )[0];
  const customStatus = normalizeStatus(latestPreference.custom_status);

  // "Appear offline" is an account-level preference even while the socket stays connected.
  if (customStatus === 'offline') return null;

  const lastActivePayload = [...payloads].sort(
    (a, b) => timestamp(b.last_active) - timestamp(a.last_active)
  )[0];
  const allConnectionsIdle = payloads.every((payload) => Boolean(payload.is_idle));
  const status: PresenceStatus =
    customStatus === 'busy'
      ? 'busy'
      : customStatus === 'away' || allConnectionsIdle
        ? 'away'
        : 'online';

  return {
    status,
    customStatus,
    statusMessage: latestPreference.status_message || '',
    statusEmoji: latestPreference.status_emoji || '',
    lastSeenAt: lastActivePayload.last_active || new Date().toISOString(),
  };
}

export function presenceDotClass(status: PresenceStatus, pulse = false): string {
  const color = {
    online: 'bg-emerald-500',
    busy: 'bg-rose-500',
    away: 'bg-amber-400',
    offline: 'bg-slate-400',
  }[status];

  return `${color}${pulse && status === 'online' ? ' animate-pulse' : ''}`;
}

export function uiStatusToPresence(status: 'online' | 'focused' | 'away'): PresenceStatus {
  return status === 'focused' ? 'busy' : status;
}

export function presenceStatusToUi(status: PresenceStatus): 'online' | 'focused' | 'away' {
  if (status === 'busy') return 'focused';
  return status === 'away' ? 'away' : 'online';
}
