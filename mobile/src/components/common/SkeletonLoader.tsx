import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useUiStore } from '../../store/uiStore';

export interface SkeletonProps {
  width?: number | `${number}%` | '100%';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const [opacity] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  const baseBg = isDarkMode ? '#242b3d' : '#e2e8f0';

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseBg,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCircle: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }> = ({
  size = 40,
  style,
}) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
};

export const SkeletonCard: React.FC<{ height?: number; style?: StyleProp<ViewStyle> }> = ({
  height = 96,
  style,
}) => {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  return (
    <View
      style={[
        styles.cardContainer,
        {
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          backgroundColor: isDarkMode ? '#121520' : '#ffffff',
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <SkeletonCircle size={36} />
        <View style={styles.cardHeaderLines}>
          <Skeleton width="60%" height={14} borderRadius={6} />
          <Skeleton width="40%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="90%" height={12} borderRadius={6} style={{ marginTop: 14 }} />
      <Skeleton width="75%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderLines: {
    flex: 1,
  },
});
