export type DocumentPatch = Record<string, unknown>;
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Serialize writes; retain the latest complete patch until the server acknowledges it. */
export function createDocumentSaveQueue(options: {
  save: (patch: DocumentPatch) => Promise<void>;
  persist: (patch: DocumentPatch | null) => void;
  onState: (state: SaveState) => void;
  delay?: number;
}) {
  let pending: DocumentPatch | null = null;
  let version = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | null = null;
  const flush = (): Promise<void> => {
    clearTimeout(timer);
    if (running) return running;
    running = (async () => {
      while (pending) {
        const snapshot = pending;
        const currentVersion = version;
        options.onState('saving');
        try { await options.save(snapshot); }
        catch { options.onState('error'); return; }
        if (currentVersion === version) { pending = null; options.persist(null); options.onState('saved'); }
      }
    })().finally(() => { running = null; });
    return running;
  };
  return {
    enqueue(patch: DocumentPatch) {
      pending = { ...pending, ...patch }; version += 1;
      options.persist(pending); options.onState('saving');
      clearTimeout(timer); timer = setTimeout(() => { void flush(); }, options.delay ?? 700);
    },
    flush,
    dispose() { clearTimeout(timer); },
  };
}
