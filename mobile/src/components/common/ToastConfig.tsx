import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ToastConfig as ToastConfigType } from 'react-native-toast-message';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';

export const toastConfig: ToastConfigType = {
  success: ({ text1, text2 }) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    return <CustomToastToast type="success" title={text1} message={text2} />;
  },
  error: ({ text1, text2 }) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
    return <CustomToastToast type="error" title={text1} message={text2} />;
  },
  info: ({ text1, text2 }) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    return <CustomToastToast type="info" title={text1} message={text2} />;
  },
  warning: ({ text1, text2 }) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    return <CustomToastToast type="warning" title={text1} message={text2} />;
  },
};

interface CustomToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message?: string;
}

const CustomToastToast: React.FC<CustomToastProps> = ({ type, title, message }) => {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const colors = useUiStore((s) => s.getColors());

  const getAccent = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={20} color={colors.success} strokeWidth={2.2} />,
          badgeColor: colors.success,
          glow: colors.successSubtle,
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} color={colors.danger} strokeWidth={2.2} />,
          badgeColor: colors.danger,
          glow: colors.dangerSubtle,
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} color={colors.warning} strokeWidth={2.2} />,
          badgeColor: colors.warning,
          glow: colors.warningSubtle,
        };
      case 'info':
      default:
        return {
          icon: <Info size={20} color={colors.primary} strokeWidth={2.2} />,
          badgeColor: colors.primary,
          glow: colors.primarySubtle,
        };
    }
  };

  const accent = getAccent();

  return (
    <View
      style={[
        styles.toastWrapper,
        {
          backgroundColor: isDarkMode ? 'rgba(18, 21, 32, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          shadowColor: accent.badgeColor,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: accent.glow }]}>
        {accent.icon}
      </View>
      <View style={styles.textContainer}>
        {!!title && (
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {!!message && (
          <Text
            style={[
              styles.message,
              { color: colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    maxWidth: 420,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: Platform.OS === 'ios' ? 8 : 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
});
