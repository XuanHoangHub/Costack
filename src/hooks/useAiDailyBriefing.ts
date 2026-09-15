import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, User } from '@/types';
import { callAiApi, isAiAccessError } from '@/lib/aiClient';
import { analyzeTasks, createLocalBriefing } from '@/lib/taskIntelligence';
import { useAuthStore } from '@/store/authStore';

type ToastType = 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message';

type UseAiDailyBriefingOptions = {
  tasks: Task[];
  members: User[];
  workspaceId?: string;
  currentUserId?: string;
  locale: 'vi' | 'en';
  isOffline: boolean;
  triggerToast: (type: ToastType, title: string, message: string) => void;
  onAddSyncLog?: (action: string) => void;
};

const readSettings = () => ({
  enabled: localStorage.getItem('apexa_ai_daily_briefing_enabled') !== 'false',
  time: localStorage.getItem('apexa_ai_daily_briefing_time') || '08:00',
});

const localDateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export function useAiDailyBriefing({
  tasks,
  members,
  workspaceId,
  currentUserId,
  locale,
  isOffline,
  triggerToast,
  onAddSyncLog,
}: UseAiDailyBriefingOptions) {
  const isPremium = useAuthStore(state => Boolean(state.currentUser?.isPremium));
  const [settingsVersion, setSettingsVersion] = useState(0);
  const runningRef = useRef(false);

  const deliverBriefing = useCallback(async () => {
    if (!isPremium || !workspaceId || !tasks.length || runningRef.current) return;
    const now = new Date();
    const storageKey = `apexa_ai_daily_briefing_last_${workspaceId}_${currentUserId || 'user'}`;
    if (localStorage.getItem(storageKey) === localDateKey(now)) return;

    const intelligence = analyzeTasks(tasks, now);
    if (intelligence.counts.open === 0) {
      localStorage.setItem(storageKey, localDateKey(now));
      return;
    }

    runningRef.current = true;
    const local = createLocalBriefing(intelligence, locale);
    let headline = local.headline;
    let summary = local.summary;

    if (!isOffline) {
      try {
        const response = await callAiApi('/api/ai/daily-briefing', {
          tasks,
          members,
          locale,
          now: now.toISOString(),
          workspaceId,
          currentUserId,
        });
        const data = await response.json();
        if (response.ok && data.success) {
          headline = data.headline || headline;
          summary = data.summary || summary;
        }
      } catch (error) {
        if (isAiAccessError(error)) {
          runningRef.current = false;
          return;
        }
        // The deterministic local briefing is intentionally retained.
      }
    }

    triggerToast(
      intelligence.counts.overdue || intelligence.counts.dueToday ? 'deadline' : 'info',
      headline,
      summary.slice(0, 420),
    );
    localStorage.setItem(storageKey, localDateKey(now));
    onAddSyncLog?.(locale === 'vi' ? 'Upgen AI đã gửi bản tin công việc hằng ngày' : 'Upgen AI delivered the daily task briefing');
    runningRef.current = false;
  }, [currentUserId, isOffline, isPremium, locale, members, onAddSyncLog, tasks, triggerToast, workspaceId]);

  useEffect(() => {
    const refreshSettings = () => setSettingsVersion(version => version + 1);
    window.addEventListener('apexa-ai-settings-changed', refreshSettings);
    return () => window.removeEventListener('apexa-ai-settings-changed', refreshSettings);
  }, []);

  useEffect(() => {
    const settings = readSettings();
    if (!isPremium || !settings.enabled || !workspaceId || !tasks.length) return;

    const [hours, minutes] = settings.time.split(':').map(Number);
    const now = new Date();
    const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 0);
    const delay = Math.max(1200, scheduled.getTime() - now.getTime());
    const timer = window.setTimeout(deliverBriefing, delay);
    return () => window.clearTimeout(timer);
  }, [deliverBriefing, isPremium, settingsVersion, tasks.length, workspaceId]);
}
