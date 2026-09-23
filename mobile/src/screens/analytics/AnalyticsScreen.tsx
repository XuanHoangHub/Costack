import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  Users,
  Filter,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useMemberStore } from '../../store/memberStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { GlassCard } from '../../components/common/GlassCard';
import { PressableScale } from '../../components/common/PressableScale';

interface AnalyticsScreenProps {
  navigation: any;
}

type TimeframeType = 'all' | '7days' | '30days';

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasksFromSupabase);
  const spaces = useSpaceStore((s) => s.spaces);
  const members = useMemberStore((s) => s.members);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const { t } = useTranslation();

  const [timeframe, setTimeframe] = useState<TimeframeType>('all');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Promise.allSettled([
      fetchTasks(),
      useSpaceStore.getState().fetchSpacesFromSupabase(),
      useMemberStore.getState().fetchMembers(),
    ]);
    setRefreshing(false);
  };

  // Filter tasks based on workspace, space, and timeframe
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => !activeWorkspaceId || t.workspaceId === activeWorkspaceId);

    if (selectedSpaceId !== 'all') {
      list = list.filter((t) => t.spaceId === selectedSpaceId);
    }

    const now = Date.now();
    if (timeframe === '7days') {
      const sevenDaysAgo = now - 7 * 86400000;
      list = list.filter((t) => new Date(t.createdAt).getTime() >= sevenDaysAgo);
    } else if (timeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 86400000;
      list = list.filter((t) => new Date(t.createdAt).getTime() >= thirtyDaysAgo);
    }

    return list;
  }, [tasks, activeWorkspaceId, selectedSpaceId, timeframe]);

  // General Metrics
  const total = filteredTasks.length;
  const completed = filteredTasks.filter((t) => t.status === 'completed').length;
  const inProgress = filteredTasks.filter((t) => t.status === 'inprogress').length;
  const review = filteredTasks.filter((t) => t.status === 'review').length;
  const todo = filteredTasks.filter((t) => t.status === 'todo').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const now = Date.now();
  const overdue = filteredTasks.filter(
    (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now
  ).length;

  const loggedHours = filteredTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
  const estimatedHours = filteredTasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0);

  // Average Lead Time in hours
  let totalLeadTimeMs = 0;
  let completedWithDates = 0;
  filteredTasks.forEach((t) => {
    if (t.status === 'completed' && t.createdAt && t.completedAt) {
      const created = new Date(t.createdAt).getTime();
      const finished = new Date(t.completedAt).getTime();
      if (finished > created) {
        totalLeadTimeMs += finished - created;
        completedWithDates++;
      }
    }
  });
  const avgLeadTimeHours =
    completedWithDates > 0
      ? Math.round((totalLeadTimeMs / (1000 * 60 * 60 * completedWithDates)) * 10) / 10
      : 0;

  // Priority Distribution
  const urgentCount = filteredTasks.filter((t) => t.priority === 'urgent').length;
  const highCount = filteredTasks.filter((t) => t.priority === 'high').length;
  const mediumCount = filteredTasks.filter((t) => t.priority === 'medium').length;
  const lowCount = filteredTasks.filter((t) => t.priority === 'low').length;

  // Member Workload Breakdown
  const memberWorkload = useMemo(() => {
    return members
      .map((m) => {
        const memberTasks = filteredTasks.filter(
          (t) => t.assigneeId === m.id || t.assigneeIds?.includes(m.id)
        );
        const memCompleted = memberTasks.filter((t) => t.status === 'completed').length;
        const memPending = memberTasks.length - memCompleted;
        return {
          member: m,
          total: memberTasks.length,
          completed: memCompleted,
          pending: memPending,
        };
      })
      .filter((mw) => mw.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [members, filteredTasks]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.analytics.title}
        subtitle={`${activeWs?.name || 'Workspace'} • ${filteredTasks.length} ${t.tasks.title.toLowerCase()}`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Filter Bar: Timeframe & Spaces */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Timeframe Chips */}
          <TouchableOpacity
            onPress={() => setTimeframe('all')}
            style={[
              styles.filterChip,
              timeframe === 'all'
                ? { backgroundColor: colors.primarySubtle, borderColor: colors.primary }
                : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: timeframe === 'all' ? colors.primaryText : colors.textSecondary },
              ]}
            >
              {t.analytics.timeframeAll}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTimeframe('7days')}
            style={[
              styles.filterChip,
              timeframe === '7days'
                ? { backgroundColor: colors.primarySubtle, borderColor: colors.primary }
                : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: timeframe === '7days' ? colors.primaryText : colors.textSecondary },
              ]}
            >
              {t.analytics.timeframe7d}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTimeframe('30days')}
            style={[
              styles.filterChip,
              timeframe === '30days'
                ? { backgroundColor: colors.primarySubtle, borderColor: colors.primary }
                : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: timeframe === '30days' ? colors.primaryText : colors.textSecondary },
              ]}
            >
              {t.analytics.timeframe30d}
            </Text>
          </TouchableOpacity>

          <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />

          {/* Spaces Dropdown Chips */}
          <TouchableOpacity
            onPress={() => setSelectedSpaceId('all')}
            style={[
              styles.filterChip,
              selectedSpaceId === 'all'
                ? { backgroundColor: `${colors.accentCyan}20`, borderColor: colors.accentCyan }
                : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedSpaceId === 'all' ? colors.accentCyan : colors.textSecondary },
              ]}
            >
              {t.analytics.allSpaces}
            </Text>
          </TouchableOpacity>

          {currentSpaces.map((sp) => {
            const isSelected = selectedSpaceId === sp.id;
            return (
              <TouchableOpacity
                key={sp.id}
                onPress={() => setSelectedSpaceId(sp.id)}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: `${colors.accentCyan}20`, borderColor: colors.accentCyan }
                    : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Text style={{ fontSize: 11, marginRight: 4 }}>{sp.emoji || '📦'}</Text>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? colors.accentCyan : colors.textSecondary },
                  ]}
                >
                  {sp.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero Completion Rate Card */}
        <LinearGradient
          colors={colors.gradientStat}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: `${colors.primary}35` }]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                {t.analytics.completionRate}
              </Text>
              <Text style={[styles.heroRateValue, { color: colors.textPrimary }]}>
                {completionRate}%
              </Text>
            </View>
            <View style={[styles.trophyBadge, { backgroundColor: colors.primarySubtle }]}>
              <Award size={28} color={colors.primary} />
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(completionRate, 5)}%` }]}
            />
          </View>

          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            Đã hoàn thành {completed} trên tổng số {total} mục công việc
          </Text>
        </LinearGradient>

        {/* 4 Quick Stat Metric Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.completed }]}>{completed}</Text>
            <Text style={[styles.statName, { color: colors.textMuted }]}>{t.tasks.statusCompleted}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.inprogress }]}>{inProgress}</Text>
            <Text style={[styles.statName, { color: colors.textMuted }]}>{t.tasks.statusInProgress}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.review }]}>{review}</Text>
            <Text style={[styles.statName, { color: colors.textMuted }]}>{t.tasks.statusReview}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: overdue > 0 ? colors.danger : colors.todo }]}>
              {overdue}
            </Text>
            <Text style={[styles.statName, { color: colors.textMuted }]}>{t.dashboard.overdue}</Text>
          </View>
        </View>

        {/* Time Tracked Card */}
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.metricHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t.analytics.hoursTracked}</Text>
            </View>
            <Text style={[styles.leadBadge, { color: colors.accentCyan }]}>
              TB: {avgLeadTimeHours}h / task
            </Text>
          </View>

          <View style={styles.hoursRow}>
            <View style={styles.hourItem}>
              <Text style={[styles.hourVal, { color: colors.primary }]}>{loggedHours}h</Text>
              <Text style={[styles.hourLbl, { color: colors.textMuted }]}>Đã ghi nhận (Logged)</Text>
            </View>
            <View style={[styles.hourDivider, { backgroundColor: colors.border }]} />
            <View style={styles.hourItem}>
              <Text style={[styles.hourVal, { color: colors.textPrimary }]}>{estimatedHours}h</Text>
              <Text style={[styles.hourLbl, { color: colors.textMuted }]}>Dự toán (Estimated)</Text>
            </View>
          </View>
        </View>

        {/* Priority Breakdown */}
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.metricHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Flame size={18} color={colors.danger} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t.analytics.priorityBreakdown}
              </Text>
            </View>
          </View>

          <View style={styles.priorityList}>
            {/* Urgent */}
            <View style={styles.priorityRow}>
              <View style={styles.priorityMeta}>
                <View style={[styles.prioDot, { backgroundColor: colors.priorityUrgent }]} />
                <Text style={[styles.prioName, { color: colors.textPrimary }]}>{t.tasks.priorityUrgent}</Text>
                <Text style={[styles.prioCount, { color: colors.textMuted }]}>{urgentCount} việc</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: colors.priorityUrgent,
                      width: `${total > 0 ? (urgentCount / total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* High */}
            <View style={styles.priorityRow}>
              <View style={styles.priorityMeta}>
                <View style={[styles.prioDot, { backgroundColor: colors.priorityHigh }]} />
                <Text style={[styles.prioName, { color: colors.textPrimary }]}>{t.tasks.priorityHigh}</Text>
                <Text style={[styles.prioCount, { color: colors.textMuted }]}>{highCount} việc</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: colors.priorityHigh,
                      width: `${total > 0 ? (highCount / total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Medium */}
            <View style={styles.priorityRow}>
              <View style={styles.priorityMeta}>
                <View style={[styles.prioDot, { backgroundColor: colors.priorityMedium }]} />
                <Text style={[styles.prioName, { color: colors.textPrimary }]}>{t.tasks.priorityMedium}</Text>
                <Text style={[styles.prioCount, { color: colors.textMuted }]}>{mediumCount} việc</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: colors.priorityMedium,
                      width: `${total > 0 ? (mediumCount / total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Low */}
            <View style={styles.priorityRow}>
              <View style={styles.priorityMeta}>
                <View style={[styles.prioDot, { backgroundColor: colors.priorityLow }]} />
                <Text style={[styles.prioName, { color: colors.textPrimary }]}>{t.tasks.priorityLow}</Text>
                <Text style={[styles.prioCount, { color: colors.textMuted }]}>{lowCount} việc</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: colors.priorityLow,
                      width: `${total > 0 ? (lowCount / total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Member Workload Card */}
        {memberWorkload.length > 0 && (
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {t.analytics.memberWorkload}
                </Text>
              </View>
            </View>

            <View style={styles.memberList}>
              {memberWorkload.map(({ member, total: mTotal, completed: mComp, pending: mPend }) => (
                <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.borderSubtle }]}>
                  <Avatar name={member.name} url={member.avatar} size={38} online={member.status === 'online'} />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>{member.name}</Text>
                    <Text style={[styles.memberRole, { color: colors.textMuted }]}>
                      {member.department || member.role}
                    </Text>
                  </View>
                  <View style={styles.workloadStats}>
                    <Text style={[styles.workloadTotal, { color: colors.textPrimary }]}>
                      {mComp}/{mTotal}
                    </Text>
                    <Text style={[styles.workloadSub, { color: colors.textMuted }]}>Xong ({mPend} chờ)</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 4,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroRateValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  trophyBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statName: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  leadBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourItem: {
    flex: 1,
    alignItems: 'center',
  },
  hourVal: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  hourLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  hourDivider: {
    width: 1,
    height: 32,
  },
  priorityList: {
    gap: 12,
  },
  priorityRow: {
    gap: 6,
  },
  priorityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  prioName: {
    fontSize: 12,
    fontWeight: '600',
  },
  prioCount: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  memberList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 11,
    marginTop: 1,
  },
  workloadStats: {
    alignItems: 'flex-end',
  },
  workloadTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  workloadSub: {
    fontSize: 10,
  },
});
