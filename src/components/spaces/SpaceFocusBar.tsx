"use client";

import { CheckCircle2, Clock3, Flag, ListFilter, UserRound, UsersRound, CalendarDays } from 'lucide-react';
import type { Task } from '../../types';
import { matchesSpaceFocus, type SpaceFocus } from '../../lib/spaceInsights';

interface Props {
  tasks: Task[];
  focus: SpaceFocus;
  onFocusChange: (focus: SpaceFocus) => void;
  userId?: string;
  locale: string;
  resultCount: number;
}

export default function SpaceFocusBar({ tasks, focus, onFocusChange, userId, locale, resultCount }: Props) {
  const vi = locale === 'vi';
  const items = [
    { id: 'all', label: vi ? 'Tất cả' : 'All tasks', icon: ListFilter },
    { id: 'mine', label: vi ? 'Của tôi' : 'Assigned to me', icon: UserRound },
    { id: 'today', label: vi ? 'Hôm nay' : 'Due today', icon: CalendarDays },
    { id: 'overdue', label: vi ? 'Quá hạn' : 'Overdue', icon: Clock3 },
    { id: 'priority', label: vi ? 'Ưu tiên cao' : 'High priority', icon: Flag },
    { id: 'unassigned', label: vi ? 'Chưa giao' : 'Unassigned', icon: UsersRound },
    { id: 'completed', label: vi ? 'Hoàn thành' : 'Completed', icon: CheckCircle2 },
  ] as const;
  return (
    <div className="space-focus-bar">
      <div className="space-focus-options" role="group" aria-label={vi ? 'Lọc nhanh công việc' : 'Quick task filters'}>
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={focus === id} onClick={() => onFocusChange(id)} disabled={id === 'mine' && !userId}>
            <Icon size={14} /><span>{label}</span><span className="space-focus-count">{tasks.filter(task => matchesSpaceFocus(task, id, userId)).length}</span>
          </button>
        ))}
        {focus === 'upcoming' && <button type="button" aria-pressed="true" onClick={() => onFocusChange('all')}><CalendarDays size={14} />{vi ? '7 ngày tới · Bỏ lọc' : 'Next 7 days · Clear'}</button>}
      </div>
      <span className="space-result-count" role="status" aria-live="polite">{resultCount} {vi ? 'kết quả' : 'results'}</span>
    </div>
  );
}
