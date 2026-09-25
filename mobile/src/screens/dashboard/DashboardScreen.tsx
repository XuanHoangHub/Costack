import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import {
  Calendar,
  AlertTriangle,
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
  ArrowRight,
  Zap,
  Search,
  Bell,
  BarChart2,
  CalendarDays,
  Timer as TimerIcon,
  Crown,
  PenTool,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTranslation } from '../../locales';
import { Task } from '../../types';
import { Avatar } from '../../components/common/Avatar';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TaskDetailSheet } from '../../components/tasks/TaskDetailSheet';
import { TaskCreateModal } from '../../components/tasks/TaskCreateModal';
import { WorkspaceSwitcherModal } from '../../components/common/WorkspaceSwitcherModal';
import { GlobalSearchModal } from '../../components/common/GlobalSearchModal';
import { PricingModal } from '../../components/common/PricingModal';
import { RenderSpaceIcon } from '../../components/common/RenderSpaceIcon';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';
import { PressableScale } from '../../components/common/PressableScale';
import { GlassCard } from '../../components/common/GlassCard';
import { SkeletonCard } from '../../components/common/SkeletonLoader';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
  const pomodoro = usePomodoroStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { t } = useTranslation();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Promise.allSettled([
      fetchTasks(),
      fetchSpaces(),
      useWorkspaceStore.getState().fetchWorkspacesFromSupabase(),
    ]);
    setRefreshing(false);
    Toast.show({
      type: 'success',
      text1: 'Đã cập nhật',
      text2: 'Dữ liệu công việc & không gian đã được đồng bộ mới nhất.',
      visibilityTime: 2500,
    });
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

    return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Welcome Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 14),
            borderBottomColor: colors.border,
          },
        ]}
      >
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

        <View style={styles.topRightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowSearchModal(true);
            }}
            style={[
              styles.searchIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              navigation.navigate('More', { screen: 'Inbox' });
            }}
            style={[
              styles.searchIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                position: 'relative',
              },
            ]}
          >
            <Bell size={18} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

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
                contentFit="cover"
                transition={200}
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
              {activeWorkspace?.name || 'Costack'}
            </Text>
            <ChevronDown size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
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
          <PressableScale
            activeScale={0.96}
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
          </PressableScale>

          {/* Overdue */}
          <PressableScale
            activeScale={0.96}
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
          </PressableScale>

          {/* In Progress */}
          <PressableScale
            activeScale={0.96}
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
          </PressableScale>

          {/* Completed */}
          <PressableScale
            activeScale={0.96}
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
          </PressableScale>
        </View>

        {/* Quick Action Shortcuts Carousel */}
        <View style={styles.shortcutsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsScroll}>
            <PressableScale
              onPress={() => setShowCreateModal(true)}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Tạo việc mới</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'AiBrain' })}
              style={[styles.shortcutBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}
            >
              <Sparkles size={16} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.primaryText, fontWeight: '700' }]}>Hỏi AI Brain</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Analytics' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <BarChart2 size={16} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Phân tích</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Calendar' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <CalendarDays size={16} color={colors.info} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Lịch việc</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Timer' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <TimerIcon size={16} color={colors.inprogress} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Pomodoro</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('Spaces')}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Layers size={16} color={colors.accentCyan} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Không gian</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Finance' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Wallet size={16} color={colors.success} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Sổ quỹ</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Docs' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <FileText size={16} color={colors.info} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Tài liệu</Text>
            </PressableScale>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Whiteboard' })}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <PenTool size={16} color={colors.accentCyan} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Bảng vẽ</Text>
            </PressableScale>

            <PressableScale
              onPress={() => setShowPricingModal(true)}
              style={[styles.shortcutBtn, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}
            >
              <Crown size={16} color={colors.warning} />
              <Text style={[styles.shortcutText, { color: colors.warning, fontWeight: '700' }]}>Gói VIP</Text>
            </PressableScale>
          </ScrollView>
        </View>

        {/* Costack AI Smart Intelligence Card (Replaces Pomodoro with Modern Webapp Accent) */}
        <PressableScale
          activeScale={0.97}
          onPress={() => navigation.navigate('More', { screen: 'AiBrain' })}
          style={[
            styles.aiBriefingCard,
            {
              backgroundColor: colors.card,
              borderColor: `${colors.primary}35`,
            },
          ]}
        >
          <LinearGradient
            colors={colors.gradientStat}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiBriefingGradient}
          >
            <View style={styles.aiBriefingLeft}>
              <View style={[styles.aiIconBadge, { backgroundColor: `${colors.primary}22` }]}>
                <Sparkles size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.aiBriefingTitle, { color: colors.textPrimary }]}>
                    Costack Brain AI
                  </Text>
                  <View style={[styles.aiPillBadge, { backgroundColor: `${colors.accentCyan}20` }]}>
                    <Text style={[styles.aiPillText, { color: colors.accentCyan }]}>
                      Thông minh
                    </Text>
                  </View>
                </View>
                <Text style={[styles.aiBriefingDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {overdueCount > 0
                    ? `⚠️ Có ${overdueCount} việc quá hạn cần ưu tiên. Chạm để AI gợi ý lộ trình xử lý!`
                    : `✨ ${dueTodayCount > 0 ? `Hôm nay có ${dueTodayCount} việc tới hạn.` : 'Tiến độ rất tốt!'} Hỏi AI để lập kế hoạch tối ưu.`}
                </Text>
              </View>
            </View>
            <View style={[styles.aiActionIcon, { backgroundColor: `${colors.primary}15` }]}>
              <ArrowRight size={16} color={colors.primary} />
            </View>
          </LinearGradient>
        </PressableScale>

        {/* Pomodoro Focus Mini Card */}
        <PressableScale
          activeScale={0.97}
          onPress={() => navigation.navigate('More', { screen: 'Timer' })}
          style={[
            styles.pomodoroCard,
            {
              backgroundColor: colors.surface,
              borderColor: pomodoro.isActive ? colors.primary : colors.border,
            },
          ]}
        >
          <View style={styles.pomodoroLeft}>
            <View
              style={[
                styles.pomodoroIconWrap,
                {
                  backgroundColor: pomodoro.isActive ? `${colors.primary}25` : `${colors.primary}12`,
                },
              ]}
            >
              <TimerIcon size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.pomodoroTitle, { color: colors.textPrimary }]}>
                  {pomodoro.mode === 'work' ? 'Tập trung Pomodoro' : 'Giải lao Pomodoro'}
                </Text>
                {pomodoro.isActive ? (
                  <View style={[styles.liveBadge, { backgroundColor: `${colors.success}20` }]}>
                    <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.liveText, { color: colors.success }]}>Đang chạy</Text>
                  </View>
                ) : (
                  <View style={[styles.cycleBadge, { backgroundColor: colors.surfaceHover }]}>
                    <Text style={[styles.cycleText, { color: colors.textSecondary }]}>
                      Chu kỳ {pomodoro.completedCycles}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.pomodoroSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {pomodoro.isActive
                  ? 'Chạm để mở đồng hồ & quản lý chu kỳ'
                  : 'Bắt đầu phiên làm việc sâu để tăng năng suất'}
              </Text>
            </View>
          </View>
          <View style={styles.pomodoroRight}>
            <Text
              style={[
                styles.pomodoroTimerText,
                { color: pomodoro.isActive ? colors.primaryLight : colors.textPrimary },
              ]}
            >
              {formatTimerTime(pomodoro.timeLeft)}
            </Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
        </PressableScale>

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
                <PressableScale
                  key={sp.id}
                  activeScale={0.96}
                  onPress={() => {
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
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : (
          <PressableScale
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
          </PressableScale>
        )}

        {/* VIP / Pro Upgrade Banner */}
        <PressableScale
          activeScale={0.98}
          onPress={() => setShowPricingModal(true)}
          style={[styles.proBanner, { borderColor: `${colors.warning}40` }]}
        >
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.14)', 'rgba(234, 88, 12, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proBannerGradient}
          >
            <View style={styles.proBannerLeft}>
              <View style={[styles.proIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.22)' }]}>
                <Crown size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.proBannerTitle, { color: colors.textPrimary }]}>
                    Nâng cấp Costack Pro
                  </Text>
                  <View style={[styles.vipTag, { backgroundColor: colors.warning }]}>
                    <Text style={styles.vipTagText}>VIP</Text>
                  </View>
                </View>
                <Text style={[styles.proBannerSub, { color: colors.textSecondary }]}>
                  AI Brain không giới hạn, phân tích hiệu suất và quản lý tài chính chuyên sâu.
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color={colors.warning} />
          </LinearGradient>
        </PressableScale>

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
        {refreshing ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : recentTasks.length > 0 ? (
          recentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => setSelectedTask(task)}
            />
          ))
        ) : (
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

      {/* Global Search Modal */}
      <GlobalSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        navigation={navigation}
        onOpenTask={(task) => setSelectedTask(task)}
        onOpenCreateTask={() => setShowCreateModal(true)}
      />

      {/* Pricing Modal */}
      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
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
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
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
    paddingBottom: 110,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
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
    fontVariant: ['tabular-nums'],
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
  aiBriefingCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
  },
  aiBriefingGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiBriefingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  aiIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBriefingTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  aiPillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  aiBriefingDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  aiActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pomodoroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pomodoroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pomodoroSub: {
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cycleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cycleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pomodoroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  pomodoroTimerText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  proBanner: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  proBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  proBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  proIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  vipTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipTagText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  proBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
