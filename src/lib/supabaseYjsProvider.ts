import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import {
  Doc,
  applyUpdate,
  encodeStateAsUpdate,
  encodeStateVector,
  mergeUpdates,
} from 'yjs';
import { supabase } from './supabaseClient';

export type DocumentRealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'offline';

export interface DocumentPresenceUser {
  userId: string;
  sessionId: string;
  name: string;
  avatar: string;
  color: string;
  onlineAt: string;
}

interface ProviderIdentity {
  userId: string;
  name: string;
  avatar?: string;
  color: string;
}

type StatusListener = (status: DocumentRealtimeStatus, error?: Error) => void;
type PresenceListener = (users: DocumentPresenceUser[]) => void;

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `doc-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Bridges Yjs updates and awareness over a private Supabase Realtime channel.
 * Database JSON remains the durable snapshot; Broadcast provides low-latency CRDT updates.
 */
export class SupabaseYjsProvider {
  readonly awareness: Awareness;
  readonly sessionId = createSessionId();

  private readonly doc: Doc;
  private readonly documentId: string;
  private readonly identity: ProviderIdentity;
  private channel: RealtimeChannel | null = null;
  private status: DocumentRealtimeStatus = 'offline';
  private started = false;
  private destroyed = false;
  private connected = false;
  private canWrite = false;
  private pendingUpdates: Uint8Array[] = [];
  private statusListeners = new Set<StatusListener>();
  private presenceListeners = new Set<PresenceListener>();

  private readonly updateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin === this || this.destroyed || !this.canWrite) return;

    if (!this.connected) {
      this.pendingUpdates.push(update);
      return;
    }

    this.sendBroadcast('yjs-update', { update: bytesToBase64(update) });
  };

  private readonly awarenessHandler = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this || !this.connected || this.destroyed) return;

    const clients = [...added, ...updated, ...removed];
    if (!clients.length) return;

    this.sendBroadcast('yjs-awareness', {
      update: bytesToBase64(encodeAwarenessUpdate(this.awareness, clients)),
    });
  };

  constructor(doc: Doc, documentId: string, identity: ProviderIdentity) {
    this.doc = doc;
    this.documentId = documentId;
    this.identity = identity;
    this.awareness = new Awareness(doc);
    this.awareness.setLocalStateField('user', {
      id: identity.userId,
      userId: identity.userId,
      sessionId: this.sessionId,
      name: identity.name,
      avatar: identity.avatar || '',
      color: identity.color,
    });

    this.doc.on('update', this.updateHandler);
    this.awareness.on('update', this.awarenessHandler);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  onPresence(listener: PresenceListener) {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  setCanWrite(canWrite: boolean) {
    this.canWrite = canWrite;
  }

  async connect() {
    if (this.started || this.destroyed) return;
    this.started = true;
    this.setStatus('connecting');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Không tìm thấy phiên đăng nhập cho cộng tác realtime.');
      }

      await supabase.realtime.setAuth(session.access_token);

      const topic = `document:${this.documentId}`;
      this.channel = supabase.channel(topic, {
        config: {
          private: true,
          broadcast: { self: false, ack: true },
          presence: { key: this.sessionId },
        },
      });

      this.bindChannel(this.channel);
      this.channel.subscribe((status, error) => {
        if (this.destroyed) return;

        if (status === 'SUBSCRIBED') {
          this.connected = true;
          this.setStatus('connected');
          void this.channel?.track(this.presencePayload());
          this.flushPendingUpdates();
          this.requestSync();
          this.sendLocalAwareness();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connected = false;
          this.setStatus('reconnecting', error || new Error('Kết nối realtime bị gián đoạn.'));
          return;
        }

        if (status === 'CLOSED') {
          this.connected = false;
          this.setStatus('offline');
        }
      });
    } catch (error) {
      this.started = false;
      this.connected = false;
      this.setStatus('error', error instanceof Error ? error : new Error('Không thể kết nối realtime.'));
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.connected) {
      removeAwarenessStates(this.awareness, [this.awareness.clientID], 'provider-destroy');
      void this.channel?.untrack();
    }

    this.connected = false;
    this.doc.off('update', this.updateHandler);
    this.awareness.off('update', this.awarenessHandler);
    this.awareness.destroy();

    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.pendingUpdates = [];
    this.statusListeners.clear();
    this.presenceListeners.clear();
  }

  private bindChannel(channel: RealtimeChannel) {
    channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        if (payload?.sender === this.sessionId || !payload?.update) return;
        this.applyRemoteUpdate(payload.update);
      })
      .on('broadcast', { event: 'yjs-awareness' }, ({ payload }) => {
        if (payload?.sender === this.sessionId || !payload?.update) return;

        try {
          applyAwarenessUpdate(this.awareness, base64ToBytes(payload.update), this);
        } catch (error) {
          console.warn('[Realtime Doc] Không thể áp dụng awareness update:', error);
        }
      })
      .on('broadcast', { event: 'yjs-sync-request' }, ({ payload }) => {
        if (!this.canWrite || payload?.sender === this.sessionId || !payload?.stateVector) return;

        try {
          const update = encodeStateAsUpdate(this.doc, base64ToBytes(payload.stateVector));
          this.sendBroadcast('yjs-sync-response', {
            target: payload.sender,
            update: bytesToBase64(update),
          });
        } catch (error) {
          console.warn('[Realtime Doc] Không thể trả lời yêu cầu đồng bộ:', error);
        }
      })
      .on('broadcast', { event: 'yjs-sync-response' }, ({ payload }) => {
        if (payload?.target !== this.sessionId || !payload?.update) return;
        this.applyRemoteUpdate(payload.update);
      })
      .on('presence', { event: 'sync' }, () => this.emitPresence())
      .on('presence', { event: 'join' }, () => this.emitPresence())
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const sessions = new Set(
          (leftPresences || [])
            .map((presence: Record<string, unknown>) => presence.sessionId)
            .filter((value: unknown): value is string => typeof value === 'string'),
        );

        if (sessions.size) {
          const staleClients: number[] = [];
          this.awareness.getStates().forEach((state, clientId) => {
            if (sessions.has(state.user?.sessionId)) staleClients.push(clientId);
          });
          if (staleClients.length) removeAwarenessStates(this.awareness, staleClients, this);
        }

        this.emitPresence();
      });
  }

  private applyRemoteUpdate(encodedUpdate: string) {
    try {
      applyUpdate(this.doc, base64ToBytes(encodedUpdate), this);
    } catch (error) {
      console.warn('[Realtime Doc] Không thể áp dụng Yjs update:', error);
    }
  }

  private requestSync() {
    this.sendBroadcast('yjs-sync-request', {
      stateVector: bytesToBase64(encodeStateVector(this.doc)),
    });
  }

  private sendLocalAwareness() {
    this.sendBroadcast('yjs-awareness', {
      update: bytesToBase64(encodeAwarenessUpdate(this.awareness, [this.awareness.clientID])),
    });
  }

  private flushPendingUpdates() {
    if (!this.pendingUpdates.length) return;
    const mergedUpdate = mergeUpdates(this.pendingUpdates);
    this.pendingUpdates = [];
    this.sendBroadcast('yjs-update', { update: bytesToBase64(mergedUpdate) });
  }

  private sendBroadcast(event: string, payload: Record<string, unknown>) {
    if (!this.channel || !this.connected) return;

    void this.channel
      .send({
        type: 'broadcast',
        event,
        payload: { ...payload, sender: this.sessionId },
      })
      .then((result) => {
        if (result !== 'ok' && !this.destroyed) {
          this.setStatus('reconnecting', new Error(`Realtime broadcast: ${result}`));
        }
      })
      .catch((error) => {
        if (!this.destroyed) {
          this.setStatus('reconnecting', error instanceof Error ? error : undefined);
        }
      });
  }

  private presencePayload(): DocumentPresenceUser {
    return {
      userId: this.identity.userId,
      sessionId: this.sessionId,
      name: this.identity.name,
      avatar: this.identity.avatar || '',
      color: this.identity.color,
      onlineAt: new Date().toISOString(),
    };
  }

  private emitPresence() {
    if (!this.channel) return;

    const uniqueUsers = new Map<string, DocumentPresenceUser>();
    Object.values(this.channel.presenceState<DocumentPresenceUser>())
      .flat()
      .forEach((presence) => {
        if (!presence?.userId) return;
        uniqueUsers.set(presence.userId, presence);
      });

    const users = Array.from(uniqueUsers.values());
    this.presenceListeners.forEach((listener) => listener(users));
  }

  private setStatus(status: DocumentRealtimeStatus, error?: Error) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status, error));
  }
}
