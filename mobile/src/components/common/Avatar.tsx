import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  name: string;
  url?: string;
  size?: number;
  online?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  size = 36,
  online,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
        </View>
      )}

      {online !== undefined && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: online ? '#10b981' : '#64748b',
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
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
    backgroundColor: '#334155',
  },
  fallback: {
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#0c0e14',
  },
});
