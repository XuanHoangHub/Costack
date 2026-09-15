import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Play, Pause, RotateCcw, Flame, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';

interface PomodoroScreenProps {
  navigation: any;
}

export const PomodoroScreen: React.FC<PomodoroScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const isRunning = usePomodoroStore((s) => s.isRunning);
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const mode = usePomodoroStore((s) => s.mode);
  const sessions = usePomodoroStore((s) => s.sessionsCompleted);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const reset = usePomodoroStore((s) => s.reset);
  const setMode = usePomodoroStore((s) => s.setMode);
  const tick = usePomodoroStore((s) => s.tick);
  const { t } = useTranslation();

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };

  const handleReset = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    reset();
  };

  const handleMode = (m: 'focus' | 'break') => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setMode(m);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalModeSeconds = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progressPercent = Math.round(((totalModeSeconds - timeLeft) / totalModeSeconds) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.pomodoro.title}
        subtitle="Duy trì sự tập trung cao độ"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.body}>
        {/* Mode Selector */}
        <View style={[styles.modeTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleMode('focus')}
            style={[
              styles.modeBtn,
              mode === 'focus' && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'focus' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {t.pomodoro.focusTime} (25p)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleMode('break')}
            style={[
              styles.modeBtn,
              mode === 'break' && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'break' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {t.pomodoro.breakTime} (5p)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Concentric Modern Circular Timer Ring */}
        <View
          style={[
            styles.outerGlowRing,
            {
              borderColor: isRunning ? `${colors.primary}30` : colors.borderSubtle,
              backgroundColor: isRunning ? `${colors.primary}08` : 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.timerRing,
              {
                borderColor: isRunning ? colors.primary : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.timeText,
                { color: isRunning ? colors.primaryLight : colors.textPrimary },
              ]}
            >
              {formattedTime}
            </Text>
            <Text
              style={[
                styles.modeLabel,
                { color: isRunning ? colors.primary : colors.textMuted },
              ]}
            >
              {mode === 'focus' ? 'TẬP TRUNG' : 'NGHỈ NGƠI'}
            </Text>
            <Text style={[styles.percentLabel, { color: colors.textMuted }]}>
              {progressPercent}% hoàn thành
            </Text>
          </View>
        </View>

        {/* Session Streak Pill */}
        <View
          style={[
            styles.streakBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Flame size={20} color="#f97316" />
          <Text style={[styles.streakText, { color: colors.textPrimary }]}>
            Đã hoàn thành <Text style={{ color: '#f97316', fontWeight: '800' }}>{sessions}</Text> phiên hôm nay
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleReset}
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <RotateCcw size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleToggle}
            style={[
              styles.primaryPlayBtn,
              {
                backgroundColor: isRunning ? colors.danger : colors.primary,
                shadowColor: isRunning ? colors.danger : colors.primary,
              },
            ]}
          >
            {isRunning ? (
              <Pause size={32} color="#ffffff" />
            ) : (
              <Play size={32} color="#ffffff" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 36,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  outerGlowRing: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timerRing: {
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  timeText: {
    fontSize: 54,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 6,
  },
  percentLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginBottom: 36,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  secondaryBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPlayBtn: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
});
