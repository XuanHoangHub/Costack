import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { BottomTabNavigator } from './BottomTabNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkSession = useAuthStore((s) => s.checkSession);
  const colors = useUiStore((s) => s.getColors());
  const isDarkMode = useUiStore((s) => s.isDarkMode);

  useEffect(() => {
    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(59, 130, 246, 0.22)', 'rgba(6, 182, 212, 0.07)', 'transparent']
              : ['rgba(59, 130, 246, 0.12)', 'rgba(6, 182, 212, 0.04)', 'transparent']
          }
          style={styles.ambientGlow}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['#2563eb', '#06b6d4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBadge}
        >
          <Zap size={32} color="#ffffff" />
        </LinearGradient>
        <Text style={[styles.appName, { color: colors.textPrimary }]}>UPGEN OS</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>
          Smart Workspace & Collaboration
        </Text>
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    marginBottom: 24,
    fontWeight: '500',
  },
  spinner: {
    marginTop: 8,
  },
});
