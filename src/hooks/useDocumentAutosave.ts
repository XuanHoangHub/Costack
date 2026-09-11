"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createDocumentSaveQueue, type DocumentPatch, type SaveState } from '@/lib/documentSaveQueue';

export function useDocumentAutosave(documentId: string, userId: string, isOffline: boolean, onUpdate?: (patch: DocumentPatch) => void) {
  const key = `apexa-document-draft:${userId}:${documentId}`;
  const [draft] = useState<DocumentPatch | null>(() => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  });
  const [saveStatus, setSaveStatus] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const mounted = useRef(true);
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const queue = useMemo(() => createDocumentSaveQueue({
    save: async patch => {
      if (isOffline) throw new Error('offline');
      const { data, error } = await supabase.from('documents').update(patch).eq('id', documentId).select('id').maybeSingle();
      if (error || !data) throw error || new Error('Document not writable');
    },
    persist: patch => {
      try { if (patch) localStorage.setItem(key, JSON.stringify(patch)); else localStorage.removeItem(key); }
      catch { if (mounted.current) setSaveStatus('error'); }
    },
    onState: state => {
      if (!mounted.current) return;
      setSaveStatus(isOffline && state !== 'idle' ? 'saved' : state);
      if (state === 'saved') setLastSavedAt(new Date());
    },
  }), [documentId, isOffline, key]);
  useEffect(() => {
    mounted.current = true;
    if (draft) queue.enqueue(draft);
    const retry = () => { void queue.flush(); };
    const leave = () => { if (document.visibilityState === 'hidden') retry(); };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', leave);
    return () => {
      mounted.current = false;
      queue.dispose();
      if (!isOffline) void queue.flush();
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', leave);
    };
  }, [queue, draft, isOffline]);
  return {
    draft, saveStatus, lastSavedAt,
    save: (patch: DocumentPatch) => {
      const updated = { ...patch, updated_at: new Date().toISOString() };
      callback.current?.(updated);
      queue.enqueue(updated);
    },
    retry: queue.flush,
  };
}
