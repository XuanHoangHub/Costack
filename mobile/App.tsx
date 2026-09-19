import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useUiStore } from './src/store/uiStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useRealtimeConnection } from './src/hooks/useRealtimeConnection';
import { useAuthDeepLink } from './src/hooks/useAuthDeepLink';
import { toastConfig } from './src/components/common/ToastConfig';

export default function App() {
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  useRealtimeConnection();
  useAuthDeepLink();

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <RootNavigator />
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
