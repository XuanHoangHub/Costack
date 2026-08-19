'use client';

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
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

const ACTIVITY_THROTTLE_MS = 10_000;
const IDLE_TIMEOUT_MS = 5 * 60_000;
const PRESENCE_HEARTBEAT_MS = 60_000;
const DATABASE_HEARTBEAT_MS = 60_000;

interface PresencePreference {
  customStatus: PresenceStatus;
  statusMessage: string;
  statusEmoji: string;
  statusChangedAt: string;
}

let activeChannel: RealtimeChannel | null = null;
let activeMemberId: string | null = null;
let lastActivityAt = Date.now();
let isIdle = false;
let preference: PresencePreference = {
  customStatus: 'online',
  statusMessage: '',
  statusEmoji: '',
  statusChangedAt: new Date().toISOString(),
};

function setOwnMemberStatus(status: PresenceStatus, lastSeenAt?: string) {
  useUiStore.getState().setUserStatus(presenceStatusToUi(status));
  const currentAuth = useAuthStore.getState().currentUser;
  useMemberStore.getState().setMembers((members) =>
    members.map((member) =>
      member.id === 'user' || (currentAuth?.id && member.id === currentAuth.id) || (currentAuth?.email && member.email && member.email.toLowerCase() === currentAuth.email.toLowerCase())
        ? {
            ...member,
            status,
            customStatus: preference.customStatus,
            statusMessage: preference.statusMessage,
            statusEmoji: preference.statusEmoji,
            ...(lastSeenAt ? { lastSeenAt } : {}),
          }
        : member
    )
  );
}

function currentPayload(memberId: string): PresencePayload {
  return {
    user_id: memberId,
    custom_status: preference.customStatus,
    status_message: preference.statusMessage,
    status_emoji: preference.statusEmoji,
    is_idle: isIdle,
    last_active: new Date(lastActivityAt).toISOString(),
    status_changed_at: preference.statusChangedAt,
  };
}

function resolvedOwnStatus(): PresenceStatus {
  if (preference.customStatus === 'offline' || preference.customStatus === 'busy' || preference.customStatus === 'away') {
    return preference.customStatus;
  }
  return isIdle ? 'away' : 'online';
}

async function publishCurrentPresence() {
  if (!activeChannel || !activeMemberId) return;
  if (preference.customStatus === 'offline') {
    await activeChannel.untrack();
    return;
  }
  await activeChannel.track(currentPayload(activeMemberId));
}

async function removePresenceChannel(channel: RealtimeChannel) {
  try {
    await channel.untrack();
  } catch (error) {
    // Ignore untrack error during disconnect/unmount
  } finally {
    try {
      await supabase.removeChannel(channel);
    } catch (error) {
      // Ignore channel removal error
    }
  }
}

/** Leave Presence before Auth destroys the session/socket during sign-out. */
export async function disconnectUserPresence() {
  setOwnMemberStatus('offline', new Date().toISOString());
  const channel = activeChannel;
  activeChannel = null;
  activeMemberId = null;
  if (channel) await removePresenceChannel(channel);
}

/** Update the account preference and the live Presence connection from any UI. */
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

  useUiStore.getState().setUserStatus(presenceStatusToUi(status));
  setOwnMemberStatus(resolvedOwnStatus(), changedAt);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

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
    await publishCurrentPresence();
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
    let idleTimer: ReturnType<typeof setInterval> | null = null;
    let presenceHeartbeat: ReturnType<typeof setInterval> | null = null;
    let databaseHeartbeat: ReturnType<typeof setInterval> | null = null;
    let reconciliationTimer: ReturnType<typeof setInterval> | null = null;
    let memberId: string | null = null;

    if (appIsOffline || browserIsOffline) {
      setOwnMemberStatus('offline');
      return;
    }

    const updateLastSeen = async () => {
      if (!memberId) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const lastSeenAt = new Date(lastActivityAt).toISOString();
      const { error } = await supabase
        .from('members')
        .update({ last_seen_at: lastSeenAt })
        .eq('id', memberId)
        .eq('user_id', session.user.id);
      if (!error) setOwnMemberStatus(resolvedOwnStatus(), lastSeenAt);
    };

    const handleActivity = () => {
      const now = Date.now();
      const resumedFromIdle = isIdle;
      if (!resumedFromIdle && now - lastActivityAt < ACTIVITY_THROTTLE_MS) return;

      lastActivityAt = now;
      isIdle = false;
      if (resumedFromIdle) {
        setOwnMemberStatus(resolvedOwnStatus(), new Date(now).toISOString());
        void publishCurrentPresence();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isIdle = true;
        setOwnMemberStatus(resolvedOwnStatus());
        void publishCurrentPresence();
      } else {
        handleActivity();
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        isIdle = true;
        setOwnMemberStatus(resolvedOwnStatus());
        void publishCurrentPresence();
        return;
      }
      setOwnMemberStatus('offline', new Date(lastActivityAt).toISOString());
      if (channel) void removePresenceChannel(channel);
      void updateLastSeen();
    };

    const start = async () => {
      const currentAuth = useAuthStore.getState().currentUser;
      const me = useMemberStore.getState().members.find(
        (member) => member.id === 'user' || (currentAuth?.id && member.id === currentAuth.id) || (currentAuth?.email && member.email?.toLowerCase() === currentAuth.email.toLowerCase())
      );
      if (me) {
        preference = {
          customStatus: me.customStatus || 'online',
          statusMessage: me.statusMessage || '',
          statusEmoji: me.statusEmoji || '',
          statusChangedAt: new Date().toISOString(),
        };
      }

      lastActivityAt = Date.now();
      isIdle = document.visibilityState === 'hidden';
      setOwnMemberStatus(resolvedOwnStatus());

      const { data: { session } } = await supabase.auth.getSession();
      if (!effectIsActive) return;
      if (!session?.user) {
        return;
      }

      memberId = `user-${session.user.id}`;

      // Ensure any existing presence channel instance is cleanly removed before subscribing
      const existingChannels = supabase.getChannels().filter(
        (c) => c.topic === 'realtime:apexa_presence' || c.topic === 'apexa_presence'
      );
      for (const ch of existingChannels) {
        try {
          await ch.untrack();
        } catch {}
        await supabase.removeChannel(ch);
      }
      if (!effectIsActive) return;

      channel = supabase.channel('apexa_presence', {
        config: { presence: { key: memberId } },
      });

      // Guard against reused channel instances in non-closed state
      if ((channel as any).state && (channel as any).state !== 'closed') {
        try {
          await supabase.removeChannel(channel);
        } catch {}
        if (!effectIsActive) return;
        channel = supabase.channel('apexa_presence', {
          config: { presence: { key: memberId } },
        });
      }

      activeChannel = channel;
      activeMemberId = memberId;

      const reconcileMembers = () => {
        if (!effectIsActive || !channel) return;
        const state = channel.presenceState<PresencePayload>();
        const onlineAccounts = new Map<string, ResolvedPresence>();

        for (const [key, payloads] of Object.entries(state)) {
          const resolved = resolvePresence(payloads);
          if (!resolved) continue;

          const payloadAccountIds = payloads.map((payload) => payload.user_id);
          for (const alias of presenceKeyAliases(key, ...payloadAccountIds)) {
            onlineAccounts.set(alias, resolved);
          }
        }

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

              if (!resolved) {
                if (member.status === 'offline') return member;
                changed = true;
                return { ...member, status: 'offline' as const };
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

      try {
        channel
          .on('presence', { event: 'sync' }, reconcileMembers)
          .subscribe(async (status, error) => {
            if (!effectIsActive) return;
            if (status === 'SUBSCRIBED') {
              await publishCurrentPresence();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              setOwnMemberStatus('offline');
              if (error) console.warn('Presence channel error:', error.message);
            }
          });
      } catch (subErr) {
        console.warn('Realtime presence subscription error caught:', subErr);
      }

      window.addEventListener('mousemove', handleActivity, { passive: true });
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('pointerdown', handleActivity, { passive: true });
      window.addEventListener('scroll', handleActivity, { passive: true });
      window.addEventListener('focus', handleActivity);
      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      idleTimer = setInterval(() => {
        if (!isIdle && Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
          isIdle = true;
          setOwnMemberStatus(resolvedOwnStatus());
          void publishCurrentPresence();
        }
      }, 15_000);

      presenceHeartbeat = setInterval(() => void publishCurrentPresence(), PRESENCE_HEARTBEAT_MS);
      databaseHeartbeat = setInterval(() => void updateLastSeen(), DATABASE_HEARTBEAT_MS);
      // A database/profile refresh must never overwrite the server Presence snapshot.
      reconciliationTimer = setInterval(reconcileMembers, 5_000);
    };

    void start();

    return () => {
      effectIsActive = false;
      if (idleTimer) clearInterval(idleTimer);
      if (presenceHeartbeat) clearInterval(presenceHeartbeat);
      if (databaseHeartbeat) clearInterval(databaseHeartbeat);
      if (reconciliationTimer) clearInterval(reconciliationTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (channel) {
        const ch = channel;
        channel = null;
        void removePresenceChannel(ch);
      }
      if (activeChannel) {
        const prevActive = activeChannel;
        activeChannel = null;
        activeMemberId = null;
        void removePresenceChannel(prevActive);
      }
    };
  }, [appIsOffline, browserIsOffline, currentUserId, setMembers]);

  return { setCustomStatus: setUserPresenceStatus };
}
