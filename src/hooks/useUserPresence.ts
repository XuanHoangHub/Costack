'use client';

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  getAutomaticPresenceStatus,
  PRESENCE_TIMINGS,
  presenceKeyAliases,
  presenceStatusToUi,
  resolvePresence,
  type PresencePayload,
  type PresenceStatus,
  type ResolvedPresence,
} from '@/lib/presence';
import { useAuthStore } from '@/store';
import { useMemberStore } from '@/store/memberStore';
import { useUiStore } from '@/store/uiStore';

const PRESENCE_TOPIC = 'apexa_presence';
const CROSS_TAB_TOPIC = 'apexa_presence_tabs_v2';
const ACTIVITY_STORAGE_PREFIX = 'apexa_presence_activity:';
const PREFERENCE_STORAGE_PREFIX = 'apexa_presence_preference:';

interface PresencePreference {
  customStatus: PresenceStatus;
  statusMessage: string;
  statusEmoji: string;
  statusChangedAt: string;
}

type CrossTabMessage =
  | { type: 'activity'; userId: string; at: number }
  | { type: 'preference'; userId: string; preference: PresencePreference };

let activeChannel: RealtimeChannel | null = null;
let activeMemberId: string | null = null;
let activeAuthUserId: string | null = null;
let activeCrossTabChannel: BroadcastChannel | null = null;
let channelSubscribed = false;
let networkAvailable = true;
let lastActivityAt = Date.now();
let tabHiddenSince: number | null = null;
let lastPublishedStatus: PresenceStatus | null = null;
let lastPresencePublishedAt = 0;
let preference: PresencePreference = {
  customStatus: 'online',
  statusMessage: '',
  statusEmoji: '',
  statusChangedAt: new Date().toISOString(),
};

const tabId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function preferenceTimestamp(value: PresencePreference): number {
  const parsed = Date.parse(value.statusChangedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPresencePreference(value: unknown): value is PresencePreference {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PresencePreference>;
  return (
    ['online', 'busy', 'away', 'offline'].includes(candidate.customStatus || '') &&
    typeof candidate.statusMessage === 'string' &&
    typeof candidate.statusEmoji === 'string' &&
    typeof candidate.statusChangedAt === 'string'
  );
}

function readStoredJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Presence remains fully functional when storage is blocked.
  }
}

function setPreferenceUi(status: PresenceStatus) {
  useUiStore.getState().setPresencePreference(presenceStatusToUi(status));
}

function setOwnMemberStatus(status: PresenceStatus, lastSeenAt?: string) {
  useUiStore.getState().setUserStatus(presenceStatusToUi(status));
  const currentAuth = useAuthStore.getState().currentUser;
  useMemberStore.getState().setMembers((members) => {
    let changed = false;
    const next = members.map((member) => {
      const isCurrentAccount =
        member.id === 'user' ||
        (currentAuth?.id && member.id === currentAuth.id) ||
        (currentAuth?.email && member.email && member.email.toLowerCase() === currentAuth.email.toLowerCase());

      if (!isCurrentAccount) return member;
      if (
        member.status === status &&
        member.customStatus === preference.customStatus &&
        member.statusMessage === preference.statusMessage &&
        member.statusEmoji === preference.statusEmoji &&
        (!lastSeenAt || member.lastSeenAt === lastSeenAt)
      ) return member;

      changed = true;
      return {
        ...member,
        status,
        customStatus: preference.customStatus,
        statusMessage: preference.statusMessage,
        statusEmoji: preference.statusEmoji,
        ...(lastSeenAt ? { lastSeenAt } : {}),
      };
    });
    return changed ? next : members;
  });
}

function resolvedOwnStatus(now = Date.now()): PresenceStatus {
  return getAutomaticPresenceStatus({
    customStatus: preference.customStatus,
    lastActivityAt,
    now,
    hiddenSince: tabHiddenSince,
    networkOnline: networkAvailable,
  });
}

function currentPayload(memberId: string, status: PresenceStatus): PresencePayload {
  return {
    user_id: memberId,
    custom_status: preference.customStatus,
    effective_status: status,
    status_message: preference.statusMessage,
    status_emoji: preference.statusEmoji,
    is_idle: status === 'away',
    tab_id: tabId,
    is_visible: typeof document !== 'undefined' && document.visibilityState === 'visible',
    last_active: new Date(lastActivityAt).toISOString(),
    status_changed_at: preference.statusChangedAt,
  };
}

async function publishCurrentPresence(force = false) {
  const now = Date.now();
  const status = resolvedOwnStatus(now);
  setOwnMemberStatus(status, new Date(lastActivityAt).toISOString());

  if (!activeChannel || !activeMemberId || !channelSubscribed) return;

  if (status === 'offline') {
    if (lastPublishedStatus !== 'offline') {
      try {
        await activeChannel.untrack();
      } finally {
        lastPublishedStatus = 'offline';
        lastPresencePublishedAt = now;
      }
    }
    return;
  }

  if (
    !force &&
    lastPublishedStatus === status &&
    now - lastPresencePublishedAt < PRESENCE_TIMINGS.heartbeatMs
  ) return;

  await activeChannel.track(currentPayload(activeMemberId, status));
  lastPublishedStatus = status;
  lastPresencePublishedAt = now;
}

async function removePresenceChannel(channel: RealtimeChannel) {
  try {
    await channel.untrack();
  } catch {
    // The socket may already be gone during page close or network loss.
  }
  try {
    await supabase.removeChannel(channel);
  } catch {
    // Removing an already closed channel is harmless.
  }
}

function broadcastPreference(nextPreference: PresencePreference) {
  if (!activeAuthUserId) return;
  storeJson(`${PREFERENCE_STORAGE_PREFIX}${activeAuthUserId}`, nextPreference);
  activeCrossTabChannel?.postMessage({
    type: 'preference',
    userId: activeAuthUserId,
    preference: nextPreference,
  } satisfies CrossTabMessage);
}

/** Leave Presence before Auth destroys the session/socket during sign-out. */
export async function disconnectUserPresence() {
  setOwnMemberStatus('offline', new Date(lastActivityAt).toISOString());
  const channel = activeChannel;
  activeChannel = null;
  activeMemberId = null;
  activeAuthUserId = null;
  channelSubscribed = false;
  lastPublishedStatus = 'offline';
  if (channel) await removePresenceChannel(channel);
}

/** Update the account preference and immediately fan it out to every open tab. */
export async function setUserPresenceStatus(
  status: PresenceStatus,
  message = '',
  emoji = ''
) {
  const changedAt = new Date().toISOString();
  preference = {
    customStatus: status,
    statusMessage: message,
    statusEmoji: emoji,
    statusChangedAt: changedAt,
  };

  setPreferenceUi(status);
  setOwnMemberStatus(resolvedOwnStatus(), new Date(lastActivityAt).toISOString());
  broadcastPreference(preference);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  activeAuthUserId = session.user.id;
  broadcastPreference(preference);
  const memberId = `user-${session.user.id}`;
  const { error } = await supabase
    .from('members')
    .update({
      custom_status: status,
      status_message: message,
      status_emoji: emoji,
      last_seen_at: changedAt,
    })
    .eq('id', memberId)
    .eq('user_id', session.user.id);

  if (error) console.warn('Unable to persist account presence preference:', error.message);

  try {
    await publishCurrentPresence(true);
  } catch (error) {
    console.warn('Unable to publish account presence:', error);
  }
}

export function useUserPresence() {
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const appIsOffline = useUiStore((state) => state.isOffline);
  const setMembers = useMemberStore((state) => state.setMembers);
  const [browserIsOffline, setBrowserIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setBrowserIsOffline(false);
    const handleOffline = () => setBrowserIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let effectIsActive = true;
    let channel: RealtimeChannel | null = null;
    let memberId: string | null = null;
    let authUserId: string | null = null;
    let crossTabChannel: BroadcastChannel | null = null;
    let evaluationTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let databaseTimer: ReturnType<typeof setInterval> | null = null;
    let reconciliationTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let lastDatabaseActivityAt = 0;

    networkAvailable = !appIsOffline && !browserIsOffline;
    if (!networkAvailable) {
      setOwnMemberStatus('offline', new Date(lastActivityAt).toISOString());
      return;
    }

    const updateLastSeen = async (force = false) => {
      if (!memberId || !authUserId) return;
      if (!force && lastDatabaseActivityAt === lastActivityAt) return;
      lastDatabaseActivityAt = lastActivityAt;
      const lastSeenAt = new Date(lastActivityAt).toISOString();
      const { error } = await supabase
        .from('members')
        .update({ last_seen_at: lastSeenAt })
        .eq('id', memberId)
        .eq('user_id', authUserId);
      if (!error) setOwnMemberStatus(resolvedOwnStatus(), lastSeenAt);
    };

    const refreshPresence = (force = false) => {
      const status = resolvedOwnStatus();
      setOwnMemberStatus(status, new Date(lastActivityAt).toISOString());
      if (force || status !== lastPublishedStatus) {
        void publishCurrentPresence(force).catch((error) => {
          console.warn('Unable to refresh presence:', error);
        });
      }
    };

    const announceActivity = (at: number) => {
      if (!authUserId) return;
      storeJson(`${ACTIVITY_STORAGE_PREFIX}${authUserId}`, at);
      crossTabChannel?.postMessage({ type: 'activity', userId: authUserId, at } satisfies CrossTabMessage);
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt < PRESENCE_TIMINGS.activityThrottleMs) return;
      const previousStatus = resolvedOwnStatus(now);
      lastActivityAt = now;
      if (document.visibilityState === 'visible') tabHiddenSince = null;
      announceActivity(now);
      const nextStatus = resolvedOwnStatus(now);
      setOwnMemberStatus(nextStatus, new Date(now).toISOString());
      if (previousStatus !== nextStatus || previousStatus === 'offline') refreshPresence(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tabHiddenSince = Date.now();
        refreshPresence();
      } else {
        tabHiddenSince = null;
        lastActivityAt = Date.now();
        announceActivity(lastActivityAt);
        refreshPresence(true);
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      tabHiddenSince = Date.now();
      if (event.persisted) {
        refreshPresence();
        return;
      }

      setOwnMemberStatus('offline', new Date(lastActivityAt).toISOString());
      void updateLastSeen(true);
      if (channel) {
        const closingChannel = channel;
        channel = null;
        if (activeChannel === closingChannel) activeChannel = null;
        channelSubscribed = false;
        void removePresenceChannel(closingChannel);
      }
    };

    const applyRemotePreference = (nextPreference: PresencePreference) => {
      if (preferenceTimestamp(nextPreference) <= preferenceTimestamp(preference)) return;
      preference = nextPreference;
      setPreferenceUi(preference.customStatus);
      refreshPresence(true);
    };

    const handleCrossTabMessage = (event: MessageEvent<CrossTabMessage>) => {
      const message = event.data;
      if (!authUserId || !message || message.userId !== authUserId) return;
      if (message.type === 'activity' && Number.isFinite(message.at) && message.at > lastActivityAt) {
        lastActivityAt = message.at;
        refreshPresence();
      } else if (message.type === 'preference' && isPresencePreference(message.preference)) {
        applyRemotePreference(message.preference);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (!authUserId || !event.key || !event.newValue) return;
      if (event.key === `${ACTIVITY_STORAGE_PREFIX}${authUserId}`) {
        try {
          const at = Number(JSON.parse(event.newValue));
          if (Number.isFinite(at) && at > lastActivityAt) {
            lastActivityAt = at;
            refreshPresence();
          }
        } catch {
          // Ignore malformed values written by older application versions.
        }
      } else if (event.key === `${PREFERENCE_STORAGE_PREFIX}${authUserId}`) {
        try {
          const nextPreference = JSON.parse(event.newValue);
          if (isPresencePreference(nextPreference)) applyRemotePreference(nextPreference);
        } catch {
          // Ignore malformed values written by older application versions.
        }
      }
    };

    const reconcileMembers = (presenceChannel: RealtimeChannel) => {
      if (!effectIsActive || presenceChannel !== channel) return;
      const state = presenceChannel.presenceState<PresencePayload>();
      const onlineAccounts = new Map<string, ResolvedPresence>();

      for (const [key, payloads] of Object.entries(state)) {
        const resolved = resolvePresence(payloads);
        if (!resolved) continue;
        for (const alias of presenceKeyAliases(key, ...payloads.map((payload) => payload.user_id))) {
          onlineAccounts.set(alias, resolved);
        }
      }

      const ownStatus = resolvedOwnStatus();
      setMembers((members) => {
        let changed = false;
        const nextMembers = members.map((member) => {
          const accountIds = presenceKeyAliases(
            member.id === 'user' ? memberId : member.id,
            member.userId
          );
          const resolved = accountIds
            .map((accountId) => onlineAccounts.get(accountId))
            .find((presence): presence is ResolvedPresence => Boolean(presence));
          const isOwnAccount = Boolean(memberId && accountIds.includes(memberId));

          if (!resolved) {
            const nextStatus = isOwnAccount ? ownStatus : 'offline';
            if (member.status === nextStatus) return member;
            changed = true;
            return { ...member, status: nextStatus as PresenceStatus };
          }

          if (
            member.status === resolved.status &&
            member.customStatus === resolved.customStatus &&
            member.statusMessage === resolved.statusMessage &&
            member.statusEmoji === resolved.statusEmoji &&
            member.lastSeenAt === resolved.lastSeenAt
          ) return member;

          changed = true;
          return {
            ...member,
            status: resolved.status,
            customStatus: resolved.customStatus,
            statusMessage: resolved.statusMessage,
            statusEmoji: resolved.statusEmoji,
            lastSeenAt: resolved.lastSeenAt,
          };
        });
        return changed ? nextMembers : members;
      });
    };

    const scheduleReconnect = (connect: () => Promise<void>) => {
      if (!effectIsActive || reconnectTimer || !networkAvailable) return;
      const delay = Math.min(30_000, 1_000 * (2 ** reconnectAttempt));
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!effectIsActive || channelSubscribed) return;
        void connect();
      }, delay);
    };

    const connectChannel = async () => {
      if (!effectIsActive || !memberId) return;
      if (channel) {
        const staleChannel = channel;
        channel = null;
        if (activeChannel === staleChannel) activeChannel = null;
        await removePresenceChannel(staleChannel);
      }
      if (!effectIsActive) return;

      const nextChannel = supabase.channel(PRESENCE_TOPIC, {
        config: { presence: { key: memberId } },
      });
      channel = nextChannel;
      activeChannel = nextChannel;
      activeMemberId = memberId;
      channelSubscribed = false;
      lastPublishedStatus = null;

      nextChannel
        .on('presence', { event: 'sync' }, () => reconcileMembers(nextChannel))
        .subscribe(async (status, error) => {
          if (!effectIsActive || channel !== nextChannel) return;
          if (status === 'SUBSCRIBED') {
            channelSubscribed = true;
            reconnectAttempt = 0;
            await publishCurrentPresence(true);
            reconcileMembers(nextChannel);
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            channelSubscribed = false;
            lastPublishedStatus = null;
            setOwnMemberStatus('offline', new Date(lastActivityAt).toISOString());
            if (error) console.warn('Presence channel error:', error.message);
            scheduleReconnect(connectChannel);
          }
        });
    };

    const start = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!effectIsActive || !session?.user) return;

      authUserId = session.user.id;
      memberId = `user-${session.user.id}`;
      activeAuthUserId = authUserId;
      activeMemberId = memberId;

      const currentAuth = useAuthStore.getState().currentUser;
      const me = useMemberStore.getState().members.find(
        (member) =>
          member.id === 'user' ||
          (currentAuth?.id && member.id === currentAuth.id) ||
          (currentAuth?.email && member.email?.toLowerCase() === currentAuth.email.toLowerCase())
      );
      const memberPreference: PresencePreference = {
        customStatus: me?.customStatus || 'online',
        statusMessage: me?.statusMessage || '',
        statusEmoji: me?.statusEmoji || '',
        statusChangedAt: new Date().toISOString(),
      };
      const storedPreference = readStoredJson(`${PREFERENCE_STORAGE_PREFIX}${authUserId}`);
      preference = isPresencePreference(storedPreference) &&
        preferenceTimestamp(storedPreference) > preferenceTimestamp(memberPreference)
        ? storedPreference
        : memberPreference;
      setPreferenceUi(preference.customStatus);

      lastActivityAt = Date.now();
      tabHiddenSince = document.visibilityState === 'hidden' ? Date.now() : null;
      announceActivity(lastActivityAt);
      setOwnMemberStatus(resolvedOwnStatus(), new Date(lastActivityAt).toISOString());

      if ('BroadcastChannel' in window) {
        crossTabChannel = new BroadcastChannel(CROSS_TAB_TOPIC);
        crossTabChannel.addEventListener('message', handleCrossTabMessage);
        activeCrossTabChannel = crossTabChannel;
      }

      window.addEventListener('mousemove', handleActivity, { passive: true });
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('pointerdown', handleActivity, { passive: true });
      window.addEventListener('touchstart', handleActivity, { passive: true });
      window.addEventListener('scroll', handleActivity, { passive: true });
      window.addEventListener('focus', handleActivity);
      window.addEventListener('storage', handleStorage);
      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      await connectChannel();
      if (!effectIsActive) return;

      evaluationTimer = setInterval(() => refreshPresence(), PRESENCE_TIMINGS.evaluationMs);
      heartbeatTimer = setInterval(
        () => void publishCurrentPresence(true).catch(() => undefined),
        PRESENCE_TIMINGS.heartbeatMs
      );
      databaseTimer = setInterval(
        () => void updateLastSeen(),
        PRESENCE_TIMINGS.databaseHeartbeatMs
      );
      reconciliationTimer = setInterval(() => {
        if (channel) reconcileMembers(channel);
      }, 5_000);
    };

    void start();

    return () => {
      effectIsActive = false;
      networkAvailable = typeof navigator === 'undefined' ? false : navigator.onLine;
      if (evaluationTimer) clearInterval(evaluationTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (databaseTimer) clearInterval(databaseTimer);
      if (reconciliationTimer) clearInterval(reconciliationTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      crossTabChannel?.removeEventListener('message', handleCrossTabMessage);
      crossTabChannel?.close();
      if (activeCrossTabChannel === crossTabChannel) activeCrossTabChannel = null;

      if (channel) {
        const closingChannel = channel;
        channel = null;
        if (activeChannel === closingChannel) activeChannel = null;
        if (activeMemberId === memberId) activeMemberId = null;
        if (activeAuthUserId === authUserId) activeAuthUserId = null;
        channelSubscribed = false;
        void removePresenceChannel(closingChannel);
      }
    };
  }, [appIsOffline, browserIsOffline, currentUserId, setMembers]);

  return { setCustomStatus: setUserPresenceStatus };
}
