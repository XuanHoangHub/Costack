import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useUiStore } from '../../store/uiStore';
import { PressableScale } from './PressableScale';

interface FABProps {
  onPress: () => void;
  style?: ViewStyle;
}

export const FloatingActionButton: React.FC<FABProps> = ({ onPress, style }) => {
  const colors = useUiStore((s) => s.getColors());

  return (
    <PressableScale
      activeScale={0.9}
      hapticFeedback="medium"
      onPress={onPress}
      style={[
        styles.fabContainer,
        {
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
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </LinearGradient>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
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
