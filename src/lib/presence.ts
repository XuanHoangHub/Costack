export type PresenceStatus = 'online' | 'busy' | 'away' | 'offline';
export type UiPresenceStatus = 'online' | 'focused' | 'away' | 'offline';

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

/**
 * Presence has historically used both an auth UUID and `user-${uuid}` as its key.
 * Return every equivalent form so a member can be matched across old and new data.
 */
export function presenceKeyAliases(...values: Array<string | null | undefined>): string[] {
  const aliases = new Set<string>();

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;

    aliases.add(normalized);
    if (normalized.startsWith('user-')) {
      const authUserId = normalized.slice(5);
      if (authUserId) aliases.add(authUserId);
    } else {
      aliases.add(`user-${normalized}`);
    }
  }

  return [...aliases];
}

export function presenceDotClass(status: PresenceStatus, pulse = false): string {
  const color = {
    online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] ring-2 ring-emerald-500/30',
    busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] ring-2 ring-rose-500/30',
    away: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] ring-2 ring-amber-500/30',
    offline: 'bg-slate-400 ring-2 ring-slate-400/20',
  }[status] || 'bg-slate-400';

  return `${color}${pulse && status === 'online' ? ' animate-pulse' : ''}`;
}

export function uiStatusToPresence(status: UiPresenceStatus): PresenceStatus {
  return status === 'focused' ? 'busy' : status;
}

export function presenceStatusToUi(status: PresenceStatus): UiPresenceStatus {
  if (status === 'busy') return 'focused';
  return status;
}
