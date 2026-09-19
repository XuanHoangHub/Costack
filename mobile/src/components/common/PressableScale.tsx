import React, { useState } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  children: React.ReactNode;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  activeScale = 0.96,
  hapticFeedback = 'light',
  onPressIn,
  onPressOut,
  onPress,
  children,
  disabled,
  ...rest
}) => {
  const [scale] = useState(() => new Animated.Value(1));

  const handlePressIn = (event: any) => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 120,
    }).start();
    onPressOut?.(event);
  };

  const handlePress = (event: any) => {
    if (disabled) return;
    if (hapticFeedback !== 'none') {
      try {
        if (hapticFeedback === 'medium') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (hapticFeedback === 'heavy') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (hapticFeedback === 'selection') {
          Haptics.selectionAsync();
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}
    }
    onPress?.(event);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
