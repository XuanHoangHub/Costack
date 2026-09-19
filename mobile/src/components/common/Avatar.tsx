import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarProps {
  name: string;
  url?: string;
  size?: number;
  online?: boolean;
}

const GRADIENT_PALETTES: [string, string][] = [
  ['#3b82f6', '#06b6d4'], // Electric Blue -> Cyan
  ['#8b5cf6', '#ec4899'], // Violet -> Pink
  ['#10b981', '#14b8a6'], // Emerald -> Teal
  ['#f59e0b', '#ef4444'], // Amber -> Rose
  ['#6366f1', '#a855f7'], // Indigo -> Purple
  ['#0284c7', '#2563eb'], // Sky -> Blue
];

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  size = 36,
  online,
}) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  // Deterministic gradient selection based on user's name
  const gradient = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % GRADIENT_PALETTES.length;
    return GRADIENT_PALETTES[index];
  }, [name]);

  const hasValidUrl = !!url && typeof url === 'string' && url.trim().length > 0 && !url.includes('placeholder');

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {hasValidUrl ? (
        <Image
          source={{ uri: url }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.fallbackGradient,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
        </LinearGradient>
      )}

      {online !== undefined && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: online ? '#10b981' : '#64748b',
              width: Math.max(size * 0.28, 8),
              height: Math.max(size * 0.28, 8),
              borderRadius: Math.max(size * 0.28, 8) / 2,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#1e293b',
  },
  fallbackGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  initial: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
    borderColor: '#0c0e14',
  },
});
