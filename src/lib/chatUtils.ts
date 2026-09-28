import { User, ChatChannel } from '../types';

/**
 * UUID validator regex
 */
export const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

/**
 * Resolve the primary identity key for a user (auth UUID preferred, otherwise member id).
 */
export const resolveUserAuthId = (user: { id?: string; userId?: string } | null | undefined): string => {
  if (!user) return 'user';
  return user.userId || user.id || 'user';
};

/**
 * Build a canonical DM key from two user identity keys.
 * Sorts them alphabetically to ensure uniqueness regardless of caller order.
 */
export const buildDmKey = (idA: string, idB: string): string => {
  return [idA, idB].sort().join(':');
};

/**
 * Build a deterministic DM channel ID for a given workspace and two users.
 */
export const buildDmChannelId = (workspaceId: string, idA: string, idB: string): string => {
  const ws = workspaceId || 'w1';
  const sorted = [idA, idB].sort();
  return `${ws}:dm-${sorted[0]}-${sorted[1]}`;
};

/**
 * Resolve DM channel info for a specific member synchronously with 0ms latency.
 */
export const resolveDmChannelForMember = (
  member: User,
  currentUser: User,
  channels: ChatChannel[],
  workspaceId: string
): { channelId: string; dmKey: string; isExisting: boolean } => {
  const myAuthId = resolveUserAuthId(currentUser);
  const peerAuthId = resolveUserAuthId(member);
  const dmKey = buildDmKey(myAuthId, peerAuthId);

  // 1. Check if a channel with this exact dmKey already exists
  const existingByDmKey = channels.find(c => c.type === 'dm' && c.dmKey === dmKey);
  if (existingByDmKey) {
    return { channelId: existingByDmKey.id, dmKey, isExisting: true };
  }

  // 2. Check if a channel with the deterministic channel ID exists
  const deterministicId = buildDmChannelId(workspaceId, myAuthId, peerAuthId);
  const existingById = channels.find(c => c.id === deterministicId);
  if (existingById) {
    return { channelId: existingById.id, dmKey: existingById.dmKey || dmKey, isExisting: true };
  }

  // 3. Fallback check: in case IDs were constructed with member.id instead of member.userId
  if (currentUser.id && member.id && (currentUser.id !== myAuthId || member.id !== peerAuthId)) {
    const altDmKey = buildDmKey(currentUser.id, member.id);
    const existingByAltKey = channels.find(c => c.type === 'dm' && c.dmKey === altDmKey);
    if (existingByAltKey) {
      return { channelId: existingByAltKey.id, dmKey: existingByAltKey.dmKey || altDmKey, isExisting: true };
    }
  }

  return { channelId: deterministicId, dmKey, isExisting: false };
};

/**
 * Accurately resolve the peer User in a 1-to-1 DM channel.
 * Uses strict token matching and explicit session bindings — NEVER single-digit substring searching.
 */
export const resolveDmPeer = (
  activeChannelId: string,
  currentUser: User,
  members: User[],
  channels: ChatChannel[],
  dmPeerMap?: Map<string, User>
): User | undefined => {
  if (!activeChannelId || !activeChannelId.includes(':dm-')) return undefined;

  // 1. Direct explicit binding (e.g. from user click or explicit navigation)
  if (dmPeerMap && dmPeerMap.has(activeChannelId)) {
    const peer = dmPeerMap.get(activeChannelId);
    if (peer) return peer;
  }

  const myAuthId = resolveUserAuthId(currentUser);
  const myId = currentUser?.id || 'user';

  // 2. Check from channel object in channels state
  const activeDm = channels.find(c => c.id === activeChannelId && c.type === 'dm');
  if (activeDm?.dmKey) {
    const keyParts = activeDm.dmKey.split(':');
    const peerKey = keyParts.find(id => id !== myAuthId && id !== myId);
    if (peerKey) {
      const match = members.find(m => (m.userId && m.userId === peerKey) || m.id === peerKey);
      if (match) return match;
    }
  }

  // 3. Parse activeChannelId: ${workspaceId}:dm-${idA}-${idB}
  const prefixIndex = activeChannelId.indexOf(':dm-');
  const dmPart = activeChannelId.substring(prefixIndex + 4);

  // If dmPart contains two UUIDs separated by '-' (each UUID is 36 chars)
  if (dmPart.length >= 73 && dmPart[36] === '-') {
    const partA = dmPart.substring(0, 36);
    const partB = dmPart.substring(37);
    const targetUuid = (partA === myAuthId || partA === myId) ? partB : partA;
    const match = members.find(m => (m.userId && m.userId === targetUuid) || m.id === targetUuid);
    if (match) return match;
  }

  // 4. Exact hyphen-delimited token matching for non-UUID or mixed IDs
  // We check which member has an exact match with the peer half
  for (const m of members) {
    if (m.id === myId || (m.userId && m.userId === myAuthId) || m.id === 'user') continue;
    
    // Check if m.userId or m.id matches either side of the dmPart
    const idCandidates = [m.userId, m.id].filter(Boolean) as string[];
    for (const cand of idCandidates) {
      if (dmPart === cand) return m;
      if (dmPart.startsWith(`${cand}-`)) {
        const remainder = dmPart.substring(cand.length + 1);
        if (remainder === myAuthId || remainder === myId) return m;
      }
      if (dmPart.endsWith(`-${cand}`)) {
        const leader = dmPart.substring(0, dmPart.length - cand.length - 1);
        if (leader === myAuthId || leader === myId) return m;
      }
    }
  }

  // 5. Fallback: match by channel name if channel name corresponds to member name
  if (activeDm?.name) {
    const matchByName = members.find(
      m => m.id !== myId && (m.userId ? m.userId !== myAuthId : true) && m.name === activeDm.name
    );
    if (matchByName) return matchByName;
  }

  return undefined;
};
