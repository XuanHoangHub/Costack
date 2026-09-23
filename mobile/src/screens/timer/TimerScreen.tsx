import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Flame,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Clock,
  ChevronDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { usePomodoroStore, PomodoroMode } from '../../store/pomodoroStore';
import { useTaskStore } from '../../store/taskStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Task } from '../../types';
import { TaskDetailSheet } from '../../components/tasks/TaskDetailSheet';

interface TimerScreenProps {
  navigation: any;
}

export const TimerScreen: React.FC<TimerScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const { t } = useTranslation();

  const mode = usePomodoroStore((s) => s.mode);
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const isActive = usePomodoroStore((s) => s.isActive);
  const completedCycles = usePomodoroStore((s) => s.completedCycles);
  const targetTaskId = usePomodoroStore((s) => s.targetTaskId);
  const setMode = usePomodoroStore((s) => s.setMode);
  const startTimer = usePomodoroStore((s) => s.startTimer);
  const pauseTimer = usePomodoroStore((s) => s.pauseTimer);
  const resetTimer = usePomodoroStore((s) => s.resetTimer);
  const skipMode = usePomodoroStore((s) => s.skipMode);
  const tick = usePomodoroStore((s) => s.tick);
  const setTargetTaskId = usePomodoroStore((s) => s.setTargetTaskId);

  const tasks = useTaskStore((s) => s.tasks);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

  const linkedTask = useMemo(() => {
    return tasks.find((t) => t.id === targetTaskId) || null;
  }, [tasks, targetTaskId]);

  // Run timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive) {
      interval = setInterval(() => {
        const finished = tick();
        if (finished) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          Toast.show({
            type: 'success',
            text1: 'Phiên làm việc hoàn thành! 🎉',
            text2: mode === 'work' ? 'Bạn đã hoàn thành phiên tập trung. Hãy giải lao một chút!' : 'Đã hết giờ giải lao. Sẵn sàng tập trung tiếp nào!',
            visibilityTime: 4000,
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, tick, mode]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage
  const totalModeSeconds = useMemo(() => {
    const state = usePomodoroStore.getState();
    if (mode === 'shortBreak') return state.shortBreakDuration * 60;
    if (mode === 'longBreak') return state.longBreakDuration * 60;
    return state.workDuration * 60;
  }, [mode]);

  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalModeSeconds - timeLeft) / totalModeSeconds) * 100)));

  const handleToggleActive = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (isActive) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleReset = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    resetTimer();
  };

  const handleSkip = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    skipMode();
  };

  const handleSelectMode = (newMode: PomodoroMode) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setMode(newMode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.timer.title}
        subtitle={t.timer.subtitle}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mode Selector Tabs */}
        <View style={[styles.modeTabs, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleSelectMode('work')}
            style={[
              styles.modeTab,
              mode === 'work' && [styles.activeModeTab, { backgroundColor: colors.surface, borderColor: colors.primary }],
            ]}
          >
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'work' ? colors.primaryText : colors.textMuted },
                mode === 'work' && { fontWeight: '700' },
              ]}
            >
              {t.timer.workMode}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectMode('shortBreak')}
            style={[
              styles.modeTab,
              mode === 'shortBreak' && [styles.activeModeTab, { backgroundColor: colors.surface, borderColor: colors.success }],
            ]}
          >
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'shortBreak' ? colors.success : colors.textMuted },
                mode === 'shortBreak' && { fontWeight: '700' },
              ]}
            >
              {t.timer.shortBreak}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectMode('longBreak')}
            style={[
              styles.modeTab,
              mode === 'longBreak' && [styles.activeModeTab, { backgroundColor: colors.surface, borderColor: colors.accentCyan }],
            ]}
          >
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'longBreak' ? colors.accentCyan : colors.textMuted },
                mode === 'longBreak' && { fontWeight: '700' },
              ]}
            >
              {t.timer.longBreak}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Big Circular / Glowing Countdown Display */}
        <View style={styles.clockContainer}>
          <LinearGradient
            colors={
              mode === 'work'
                ? colors.gradientStat
                : mode === 'shortBreak'
                ? colors.gradientSuccess
                : colors.gradientAi
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.clockRing,
              {
                borderColor:
                  mode === 'work'
                    ? `${colors.primary}45`
                    : mode === 'shortBreak'
                    ? `${colors.success}45`
                    : `${colors.accentCyan}45`,
              },
            ]}
          >
            <View
              style={[
                styles.clockInner,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.timerText,
                  {
                    color:
                      mode === 'work'
                        ? colors.textPrimary
                        : mode === 'shortBreak'
                        ? colors.success
                        : colors.accentCyan,
                  },
                ]}
              >
                {timeFormatted}
              </Text>

              <Text style={[styles.modeCaption, { color: colors.textMuted }]}>
                {mode === 'work'
                  ? 'PHIÊN TẬP TRUNG'
                  : mode === 'shortBreak'
                  ? 'NGHỈ GIẢI LAO'
                  : 'NGHỈ DÀI'}
              </Text>

              {/* Mini Progress */}
              <View style={styles.miniProgressWrap}>
                <View
                  style={[
                    styles.miniProgressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor:
                        mode === 'work'
                          ? colors.primary
                          : mode === 'shortBreak'
                          ? colors.success
                          : colors.accentCyan,
                    },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={handleReset}
            style={[styles.secondaryControlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <RotateCcw size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleToggleActive}
            style={[
              styles.mainPlayBtn,
              {
                backgroundColor:
                  mode === 'work'
                    ? colors.primary
                    : mode === 'shortBreak'
                    ? colors.success
                    : colors.accentCyan,
                shadowColor:
                  mode === 'work'
                    ? colors.primary
                    : mode === 'shortBreak'
                    ? colors.success
                    : colors.accentCyan,
              },
            ]}
          >
            {isActive ? (
              <Pause size={28} color="#ffffff" />
            ) : (
              <Play size={28} color="#ffffff" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            style={[styles.secondaryControlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkipForward size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Cycle Stats Banner */}
        <View style={[styles.statsBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.flameIconBox, { backgroundColor: `${colors.danger}20` }]}>
            <Flame size={20} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statsBannerTitle, { color: colors.textPrimary }]}>
              {completedCycles} chu kỳ Pomodoro
            </Text>
            <Text style={[styles.statsBannerSub, { color: colors.textMuted }]}>
              Mỗi 4 chu kỳ tập trung sẽ tự động kích hoạt 1 lần nghỉ dài 15 phút.
            </Text>
          </View>
        </View>

        {/* Linked Target Task Card */}
        <View style={[styles.targetTaskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.targetHeader}>
            <Text style={[styles.targetTitle, { color: colors.textPrimary }]}>
              {t.timer.targetTask}
            </Text>
            <TouchableOpacity onPress={() => setShowTaskPicker(!showTaskPicker)}>
              <Text style={[styles.chooseTaskText, { color: colors.primary }]}>
                {linkedTask ? 'Đổi việc' : 'Chọn việc'}
              </Text>
            </TouchableOpacity>
          </View>

          {linkedTask ? (
            <TouchableOpacity
              onPress={() => setSelectedTaskForDetail(linkedTask)}
              style={[styles.linkedTaskRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            >
              <CheckSquare size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.linkedTaskTitle, { color: colors.textPrimary }]}>
                  {linkedTask.title}
                </Text>
                <Text style={[styles.linkedTaskSub, { color: colors.textMuted }]}>
                  {linkedTask.status.toUpperCase()} • {linkedTask.priority}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowTaskPicker(true)}
              style={[styles.unlinkedBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            >
              <Clock size={16} color={colors.textMuted} />
              <Text style={[styles.unlinkedText, { color: colors.textMuted }]}>
                {t.timer.unlinkedTask}
              </Text>
            </TouchableOpacity>
          )}

          {/* Inline Task Picker Dropdown */}
          {showTaskPicker && (
            <View style={[styles.pickerList, { borderTopColor: colors.border }]}>
              <Text style={[styles.pickerHeader, { color: colors.textMuted }]}>Chọn công việc để gắn phiên:</Text>
              {tasks.slice(0, 6).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setTargetTaskId(item.id);
                    setShowTaskPicker(false);
                  }}
                  style={[styles.pickerItem, { borderBottomColor: colors.borderSubtle }]}
                >
                  <Text numberOfLines={1} style={[styles.pickerItemText, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Sheet if tapped on linked task */}
      {selectedTaskForDetail && (
        <TaskDetailSheet
          task={selectedTaskForDetail}
          visible={!!selectedTaskForDetail}
          onClose={() => setSelectedTaskForDetail(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeModeTab: {},
  modeTabText: {
    fontSize: 12,
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  clockRing: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  clockInner: {
    width: 218,
    height: 218,
    borderRadius: 109,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1,
  },
  modeCaption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  miniProgressWrap: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 14,
  },
  miniProgressFill: {
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginVertical: 24,
  },
  secondaryControlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  flameIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  statsBannerSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  targetTaskCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  chooseTaskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkedTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  linkedTaskTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkedTaskSub: {
    fontSize: 11,
    marginTop: 2,
  },
  unlinkedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  unlinkedText: {
    fontSize: 12,
  },
  pickerList: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  pickerHeader: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  pickerItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: {
    fontSize: 13,
  },
});
