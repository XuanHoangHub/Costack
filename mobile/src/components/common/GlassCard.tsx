import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useUiStore } from '../../store/uiStore';
import { PressableScale } from './PressableScale';

export interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  activeScale?: number;
  tint?: 'light' | 'dark' | 'default';
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  onPress,
  style,
  contentStyle,
  intensity = 45,
  activeScale = 0.97,
  tint,
  hapticFeedback = 'light',
}) => {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const selectedTint = tint || (isDarkMode ? 'dark' : 'light');

  const cardContent = (
    <View
      style={[
        styles.outerContainer,
        {
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.10)'
            : 'rgba(0, 0, 0, 0.08)',
          backgroundColor: isDarkMode
            ? 'rgba(18, 21, 32, 0.70)'
            : 'rgba(255, 255, 255, 0.75)',
        },
        style,
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? Math.min(intensity, 30) : intensity}
        tint={selectedTint}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.innerContent, contentStyle]}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <PressableScale
        activeScale={activeScale}
        hapticFeedback={hapticFeedback}
        onPress={onPress}
      >
        {cardContent}
      </PressableScale>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  innerContent: {
    padding: 16,
    zIndex: 1,
  },
});
