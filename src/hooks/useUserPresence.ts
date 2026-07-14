import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store';
import { useMemberStore } from '@/store/memberStore';
import { User } from '@/types';

// Throttling timer for activity listeners (10 seconds)
const ACTIVITY_THROTTLE = 10000;
// Inactivity timeout for setting IDLE / AWAY status (5 minutes)
const IDLE_TIMEOUT = 300000;

export function useUserPresence() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { members, setMembers } = useMemberStore();
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    const myMemberId = `user-${currentUser.id}`;

    // Get current user's profile from store
    const me = members.find((m) => m.id === 'user');
    const customStatus = me?.customStatus || 'online';
    const statusMessage = me?.statusMessage || '';
    const statusEmoji = me?.statusEmoji || '';

    // Initialize Supabase Presence channel
    const channel = supabase.channel('avaxa_presence', {
      config: {
        presence: {
          key: myMemberId,
        },
      },
    });

    channelRef.current = channel;

    // Listen to Presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const presenceState = channel.presenceState();
        
        // Extract online states
        const onlineUsersMap: Record<string, {
          custom_status: string;
          status_message: string;
          status_emoji: string;
          is_idle: boolean;
          last_active: string;
        }> = {};

        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key] as any[];
          if (presences && presences.length > 0) {
            // Take the most recent presence node
            const latest = presences[presences.length - 1];
            onlineUsersMap[key] = {
              custom_status: latest.custom_status || 'online',
              status_message: latest.status_message || '',
              status_emoji: latest.status_emoji || '',
              is_idle: !!latest.is_idle,
              last_active: latest.last_active || new Date().toISOString(),
            };
          }
        });

        // Update members store with online/idle statuses
        setMembers((prev) =>
          prev.map((member) => {
            const dbId = member.id === 'user' ? myMemberId : member.id;
            const presenceInfo = onlineUsersMap[dbId];

            if (presenceInfo) {
              // User is connected
              let resolvedStatus: 'online' | 'busy' | 'offline' | 'away' = 'online';
              
              if (presenceInfo.custom_status === 'offline') {
                resolvedStatus = 'offline';
              } else if (presenceInfo.custom_status === 'busy') {
                resolvedStatus = 'busy';
              } else if (presenceInfo.custom_status === 'away' || presenceInfo.is_idle) {
                resolvedStatus = 'away';
              }

              return {
                ...member,
                status: resolvedStatus,
                customStatus: presenceInfo.custom_status as any,
                statusMessage: presenceInfo.status_message,
                statusEmoji: presenceInfo.status_emoji,
                lastSeenAt: presenceInfo.last_active,
              };
            } else {
              // User is disconnected (Offline)
              return {
                ...member,
                status: 'offline',
                customStatus: member.customStatus || 'offline',
              };
            }
          })
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({
            user_id: myMemberId,
            custom_status: customStatus,
            status_message: statusMessage,
            status_emoji: statusEmoji,
            is_idle: false,
            last_active: new Date().toISOString(),
          });
        }
      });

    // Inactivity/Idle detection logic
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > ACTIVITY_THROTTLE) {
        lastActivityRef.current = now;
        
        if (isIdle) {
          setIsIdle(false);
          // Resume online presence
          channel.track({
            user_id: myMemberId,
            custom_status: customStatus,
            status_message: statusMessage,
            status_emoji: statusEmoji,
            is_idle: false,
            last_active: new Date().toISOString(),
          });
        }
      }
    };

    // Add activity event listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('focus', handleActivity);

    // Inactivity check interval (every 15 seconds)
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > IDLE_TIMEOUT) {
        if (!isIdle) {
          setIsIdle(true);
          // Track as idle/away
          channel.track({
            user_id: myMemberId,
            custom_status: customStatus,
            status_message: statusMessage,
            status_emoji: statusEmoji,
            is_idle: true,
            last_active: new Date().toISOString(),
          });
        }
      }
    }, 15000);

    // Update database last_seen_at periodically as a heartbeat (every 2 minutes)
    const dbHeartbeat = setInterval(async () => {
      await supabase
        .from('members')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', myMemberId);
    }, 120000);

    return () => {
      active = false;
      clearInterval(interval);
      clearInterval(dbHeartbeat);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', handleActivity);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser, members, isIdle]);

  // Function to manually set custom status (persisted in DB and presence)
  const setCustomStatus = async (
    status: 'online' | 'busy' | 'away' | 'offline',
    message: string = '',
    emoji: string = ''
  ) => {
    if (!currentUser) return;
    const myMemberId = `user-${currentUser.id}`;

    // 1. Update local store
    setMembers((prev) =>
      prev.map((m) =>
        m.id === 'user'
          ? {
              ...m,
              customStatus: status,
              statusMessage: message,
              statusEmoji: emoji,
              // Immediate UI status update
              status: status,
            }
          : m
      )
    );

    // 2. Persist preference to PostgreSQL Database
    await supabase
      .from('members')
      .update({
        custom_status: status,
        status_message: message,
        status_emoji: emoji,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', myMemberId);

    // 3. Update active presence broadcast if channel is active
    if (channelRef.current) {
      await channelRef.current.track({
        user_id: myMemberId,
        custom_status: status,
        status_message: message,
        status_emoji: emoji,
        is_idle: false,
        last_active: new Date().toISOString(),
      });
    }
  };

  return { setCustomStatus };
}
