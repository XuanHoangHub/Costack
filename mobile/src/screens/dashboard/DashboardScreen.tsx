import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Calendar,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Plus,
  Flame,
  Wallet,
  FileText,
  ChevronDown,
  Layers,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useTranslation } from '../../locales';
import { Task } from '../../types';
import { Avatar } from '../../components/common/Avatar';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TaskDetailSheet } from '../../components/tasks/TaskDetailSheet';
import { TaskCreateModal } from '../../components/tasks/TaskCreateModal';
import { WorkspaceSwitcherModal } from '../../components/common/WorkspaceSwitcherModal';
import { RenderSpaceIcon } from '../../components/common/RenderSpaceIcon';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.colors);
  const currentUser = useAuthStore((s) => s.currentUser);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasksFromSupabase);
  const spaces = useSpaceStore((s) => s.spaces);
  const fetchSpaces = useSpaceStore((s) => s.fetchSpacesFromSupabase);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const { t } = useTranslation();

  const isPomodoroRunning = usePomodoroStore((s) => s.isRunning);
  const pomodoroTimeLeft = usePomodoroStore((s) => s.timeLeft);
  const startPomodoro = usePomodoroStore((s) => s.start);
  const pausePomodoro = usePomodoroStore((s) => s.pause);
  const tickPomodoro = usePomodoroStore((s) => s.tick);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    let interval: any = null;
    if (isPomodoroRunning) {
      interval = setInterval(() => {
        tickPomodoro();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchTasks(), fetchSpaces()]);
    setRefreshing(false);
  };

  // Spaces & Tasks strictly scoped to active workspace
  const currentSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);
  const workspaceSpaceIds = new Set(currentSpaces.map((s) => s.id));

  const now = Date.now();
  const displayTasks = tasks.filter((task) => {
    if (activeWorkspaceId) {
      if (task.workspaceId && task.workspaceId !== activeWorkspaceId) return false;
      if (!task.workspaceId && task.spaceId && !workspaceSpaceIds.has(task.spaceId)) return false;
    }
    return true;
  });

  const dueTodayCount = displayTasks.filter((task) => {
    if (!task.dueDate) return false;
    const d = new Date(task.dueDate);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const overdueCount = displayTasks.filter(
    (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now
  ).length;

  const inProgressCount = displayTasks.filter((t) => t.status === 'inprogress').length;
  const completedCount = displayTasks.filter((t) => t.status === 'completed').length;
  const totalCount = displayTasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Recent tasks
  const recentTasks = displayTasks.slice(0, 4);

  // Format pomodoro
  const minutes = Math.floor(pomodoroTimeLeft / 60);
  const seconds = pomodoroTimeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const togglePomodoro = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (isPomodoroRunning) {
      pausePomodoro();
    } else {
      startPomodoro();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Welcome Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <View style={styles.userRow}>
          <Avatar
            name={currentUser?.name || 'User'}
            url={currentUser?.avatar}
            size={42}
            online={true}
          />
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              {t.dashboard.greeting}
            </Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {currentUser?.name || 'Thành viên'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowWorkspaceModal(true)}
          style={[
            styles.workspaceChip,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {activeWorkspace?.logoUrl ? (
            <Image
              source={{ uri: activeWorkspace.logoUrl }}
              style={styles.chipLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.chipInitial, { backgroundColor: colors.primary }]}>
              <Text style={styles.chipInitialText}>
                {activeWorkspace?.initial || (activeWorkspace?.name ? activeWorkspace.name.charAt(0).toUpperCase() : 'W')}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={[styles.workspaceName, { color: colors.textPrimary }]}
          >
            {activeWorkspace?.name || 'Upgen'}
          </Text>
          <ChevronDown size={12} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Progress Banner */}
        <LinearGradient
          colors={colors.gradientStat}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBanner, { borderColor: `${colors.primary}30` }]}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Tiến độ công việc
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                Đã hoàn thành {completedCount}/{totalCount} mục ({completionRate}%)
              </Text>
            </View>
            <View style={[styles.rateBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.rateText, { color: colors.primaryLight }]}>
                {completionRate}%
              </Text>
            </View>
          </View>

          {/* Progress track */}
          <View style={styles.heroTrack}>
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.heroFill, { width: `${Math.max(completionRate, 4)}%` }]}
            />
          </View>
        </LinearGradient>

        {/* 4 Quick Stat Cards */}
        <View style={styles.statsGrid}>
          {/* Due Today */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Tasks')}
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.dashboard.dueToday}
              </Text>
              <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Calendar size={15} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {dueTodayCount}
            </Text>
          </TouchableOpacity>

          {/* Overdue */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Tasks')}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: overdueCount > 0 ? `${colors.danger}40` : colors.cardBorder,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.dashboard.overdue}
              </Text>
              <View style={[styles.statIconWrap, { backgroundColor: colors.dangerSubtle }]}>
                <AlertTriangle size={15} color={colors.danger} />
              </View>
            </View>
            <Text
              style={[
                styles.statValue,
                { color: overdueCount > 0 ? colors.danger : colors.textPrimary },
              ]}
            >
              {overdueCount}
            </Text>
          </TouchableOpacity>

          {/* In Progress */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Tasks')}
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.dashboard.inProgress}
              </Text>
              <View style={[styles.statIconWrap, { backgroundColor: colors.infoSubtle }]}>
                <Clock size={15} color={colors.inprogress} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: colors.inprogress }]}>
              {inProgressCount}
            </Text>
          </TouchableOpacity>

          {/* Completed */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Tasks')}
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.dashboard.completed}
              </Text>
              <View style={[styles.statIconWrap, { backgroundColor: colors.successSubtle }]}>
                <CheckCircle2 size={15} color={colors.completed} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: colors.completed }]}>
              {completedCount}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Action Shortcuts Carousel */}
        <View style={styles.shortcutsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsScroll}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Tạo việc mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('More', { screen: 'Pomodoro' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Clock size={16} color="#f97316" />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Phiên Focus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('More', { screen: 'AiBrain' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Sparkles size={16} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Hỏi AI Brain</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('More', { screen: 'Finance' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Wallet size={16} color={colors.success} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Sổ quỹ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('More', { screen: 'Docs' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <FileText size={16} color={colors.info} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Tài liệu</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Pomodoro Focus Quick Widget */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('More', { screen: 'Pomodoro' })}
          style={[
            styles.pomodoroWidget,
            {
              backgroundColor: colors.card,
              borderColor: isPomodoroRunning ? `${colors.primary}50` : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.pomodoroLeft}>
            <View
              style={[
                styles.timerIconWrap,
                {
                  backgroundColor: isPomodoroRunning ? `${colors.primary}30` : colors.surfaceHover,
                  borderColor: isPomodoroRunning ? colors.primary : 'transparent',
                },
              ]}
            >
              <Clock
                size={22}
                color={isPomodoroRunning ? colors.primaryLight : colors.textMuted}
              />
            </View>
            <View>
              <Text style={[styles.pomodoroTitle, { color: colors.textPrimary }]}>
                {t.dashboard.focusPomodoro}
              </Text>
              <Text style={[styles.pomodoroSubtitle, { color: colors.textSecondary }]}>
                {isPomodoroRunning ? '⚡ Đang trong phiên tập trung' : 'Sẵn sàng đạt năng suất cao nhất'}
              </Text>
            </View>
          </View>

          <View style={styles.pomodoroRight}>
            <Text
              style={[
                styles.timerCountdown,
                { color: isPomodoroRunning ? colors.primaryLight : colors.textPrimary },
              ]}
            >
              {formattedTime}
            </Text>
            <TouchableOpacity
              onPress={togglePomodoro}
              style={[
                styles.playBtn,
                { backgroundColor: isPomodoroRunning ? colors.danger : colors.primary },
              ]}
            >
              {isPomodoroRunning ? (
                <Pause size={16} color="#ffffff" />
              ) : (
                <Play size={16} color="#ffffff" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Spaces Overview Section */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Không gian làm việc
            </Text>
            {currentSpaces.length > 0 && (
              <View style={[styles.badgePill, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.badgePillText, { color: colors.primary }]}>
                  {currentSpaces.length} Spaces
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Spaces')}>
            <Text style={[styles.viewAllText, { color: colors.primaryLight }]}>
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        {currentSpaces.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spacesCarousel}
          >
            {currentSpaces.map((sp) => {
              const spTasks = tasks.filter((t) => t.spaceId === sp.id);
              const spColor = sp.themeColor || colors.primary;

              return (
                <TouchableOpacity
                  key={sp.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setActiveSpaceId(sp.id);
                    setActiveListId(null);
                    navigation.navigate('Tasks');
                  }}
                  style={[
                    styles.spaceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.spaceCardTop}>
                    <View
                      style={[
                        styles.spaceIconWrap,
                        { backgroundColor: `${spColor}18` },
                      ]}
                    >
                      <RenderSpaceIcon icon={sp.emoji || 'Folder'} size={20} color={spColor} />
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[styles.spaceName, { color: colors.textPrimary }]}
                  >
                    {sp.name}
                  </Text>

                  <Text style={[styles.spaceSub, { color: colors.textSecondary }]}>
                    {sp.lists?.length || 0} danh sách • {spTasks.length} việc
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Spaces')}
            style={[
              styles.emptySpaceBanner,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.spaceIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Layers size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.spaceName, { color: colors.textPrimary }]}>
                Chưa có Không gian nào
              </Text>
              <Text style={[styles.spaceSub, { color: colors.textMuted }]}>
                Chạm để khởi tạo Space đầu tiên cho Workspace
              </Text>
            </View>
            <Plus size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Recent Tasks Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.dashboard.recentTasks}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text style={[styles.viewAllText, { color: colors.primaryLight }]}>
              {t.dashboard.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Tasks List */}
        {recentTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => setSelectedTask(task)}
          />
        ))}

        {recentTasks.length === 0 && (
          <View
            style={[
              styles.emptyTasks,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTasksText, { color: colors.textMuted }]}>
              {t.dashboard.noRecentTasks}
            </Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton onPress={() => setShowCreateModal(true)} />

      {/* Task Creation Modal */}
      <TaskCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        visible={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        visible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  workspaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    maxWidth: 160,
  },
  chipLogo: {
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  chipInitial: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInitialText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  workspaceName: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroBanner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  shortcutsWrap: {
    marginBottom: 16,
  },
  shortcutsScroll: {
    gap: 8,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pomodoroWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  pomodoroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  timerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pomodoroSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  pomodoroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerCountdown: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTasks: {
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTasksText: {
    fontSize: 13,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  spacesCarousel: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 8,
  },
  spaceCard: {
    width: 175,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  spaceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  spaceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  spaceSub: {
    fontSize: 12,
  },
  emptySpaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
});
