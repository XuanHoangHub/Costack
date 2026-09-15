import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUiStore } from './src/store/uiStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useRealtimeConnection } from './src/hooks/useRealtimeConnection';

export default function App() {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  useRealtimeConnection();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
