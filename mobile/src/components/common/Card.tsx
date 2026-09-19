import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useUiStore } from '../../store/uiStore';
import { PressableScale } from './PressableScale';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'subtle';
  activeScale?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  activeScale = 0.98,
  hapticFeedback = 'light',
}) => {
  const colors = useUiStore((s) => s.getColors());
  const isDarkMode = useUiStore((s) => s.isDarkMode);

  const isElevated = variant === 'elevated';
  const isSubtle = variant === 'subtle';

  const cardStyle: ViewStyle = {
    backgroundColor: isSubtle ? colors.surfaceSubtle : colors.card,
    borderColor: isSubtle ? colors.borderSubtle : colors.cardBorder,
    shadowColor: isElevated ? '#000000' : isDarkMode ? '#000000' : '#64748b',
    shadowOpacity: isElevated ? (isDarkMode ? 0.35 : 0.12) : isDarkMode ? 0.2 : 0.05,
    shadowOffset: { width: 0, height: isElevated ? 6 : 2 },
    shadowRadius: isElevated ? 12 : 6,
    elevation: isElevated ? 6 : 2,
  };

  if (onPress) {
    return (
      <PressableScale
        activeScale={activeScale}
        hapticFeedback={hapticFeedback}
        onPress={onPress}
        style={[styles.card, cardStyle, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
});
