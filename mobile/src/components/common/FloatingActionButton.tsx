import React from 'react';
import { StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '../../store/uiStore';
import { PressableScale } from './PressableScale';

interface FABProps {
  onPress: () => void;
  style?: ViewStyle;
  icon?: React.ReactNode;
  bottomOffset?: number;
}

export const FloatingActionButton: React.FC<FABProps> = ({
  onPress,
  style,
  icon,
  bottomOffset,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const insets = useSafeAreaInsets();

  // Bottom tab bar height is 88 on iOS, 68 on Android.
  // Standard position should sit comfortably above it.
  const defaultBottom = Platform.OS === 'ios' ? 96 : 80;
  const calculatedBottom = bottomOffset !== undefined ? bottomOffset : defaultBottom;

  return (
    <PressableScale
      activeScale={0.88}
      hapticFeedback="medium"
      onPress={onPress}
      style={[
        styles.fabContainer,
        {
          bottom: calculatedBottom,
          shadowColor: colors.primary,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {icon || <Plus size={26} color="#ffffff" strokeWidth={2.5} />}
      </LinearGradient>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  gradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
