import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUiStore } from '../../store/uiStore';
import { PressableScale } from './PressableScale';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: readonly [string, string, ...string[]];
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  gradientColors,
}) => {
  const colors = useUiStore((s) => s.getColors());

  let bg = colors.primary;
  let textCol = '#ffffff';
  let borderCol = 'transparent';

  if (variant === 'secondary') {
    bg = colors.surfaceHover;
    textCol = colors.textPrimary;
    borderCol = colors.border;
  } else if (variant === 'outline') {
    bg = 'transparent';
    textCol = colors.textPrimary;
    borderCol = colors.border;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textCol = colors.textPrimary;
  } else if (variant === 'danger') {
    bg = colors.danger;
    textCol = '#ffffff';
  }

  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const paddingHorizontal = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14.5;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={textCol} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textCol, fontSize }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'gradient') {
    const activeGradient = gradientColors || colors.gradientBrand || ['#2563eb', '#06b6d4'];
    return (
      <PressableScale
        activeScale={0.96}
        hapticFeedback="medium"
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.outerWrap,
          styles.glowShadow,
          { opacity: disabled ? 0.5 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={activeGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={[
            styles.button,
            {
              paddingVertical,
              paddingHorizontal,
            },
          ]}
        >
          {content}
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      activeScale={0.96}
      hapticFeedback={variant === 'primary' || variant === 'danger' ? 'medium' : 'light'}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.outerWrap,
        styles.button,
        variant === 'primary' && styles.glowShadow,
        {
          backgroundColor: bg,
          borderColor: borderCol,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {content}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    borderRadius: 14,
  },
  button: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  glowShadow: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});
