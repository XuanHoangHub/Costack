import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import {
  Home,
  CheckSquare,
  Layers,
  MessageSquare,
  Menu,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../store/uiStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTranslation } from '../locales';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { SpacesScreen } from '../screens/spaces/SpacesScreen';
import { ChatStackNavigator } from './ChatStackNavigator';
import { MoreStackNavigator } from './MoreStackNavigator';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  useRealtimeSync();

  const colors = useUiStore((s) => s.colors);
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
          <BlurView
            tint={isDarkMode ? 'dark' : 'light'}
            intensity={Platform.OS === 'ios' ? 85 : 45}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDarkMode
            ? 'rgba(12, 14, 20, 0.82)'
            : 'rgba(255, 255, 255, 0.85)',
          borderTopColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.06)',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDarkMode ? 0.4 : 0.08,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: colors.primaryLight || colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: -0.2,
          marginTop: 2,
        },
      }}
      screenListeners={{
        tabPress: () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: t.tabs.home,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconWrap,
                focused && [
                  styles.activeIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.16)'
                      : 'rgba(37, 99, 235, 0.12)',
                    borderColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.35)'
                      : 'rgba(37, 99, 235, 0.25)',
                  },
                ],
              ]}
            >
              <Home size={20} color={focused ? colors.primaryLight || colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          tabBarLabel: t.tabs.tasks,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconWrap,
                focused && [
                  styles.activeIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.16)'
                      : 'rgba(37, 99, 235, 0.12)',
                    borderColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.35)'
                      : 'rgba(37, 99, 235, 0.25)',
                  },
                ],
              ]}
            >
              <CheckSquare size={20} color={focused ? colors.primaryLight || colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Spaces"
        component={SpacesScreen}
        options={{
          tabBarLabel: t.tabs.spaces,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconWrap,
                styles.spacesCenterWrap,
                focused && [
                  styles.activeIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.24)'
                      : 'rgba(37, 99, 235, 0.16)',
                    borderColor: colors.primary,
                  },
                ],
              ]}
            >
              <Layers size={21} color={focused ? colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{
          tabBarLabel: t.tabs.chat,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconWrap,
                focused && [
                  styles.activeIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.16)'
                      : 'rgba(37, 99, 235, 0.12)',
                    borderColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.35)'
                      : 'rgba(37, 99, 235, 0.25)',
                  },
                ],
              ]}
            >
              <MessageSquare size={20} color={focused ? colors.primaryLight || colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          tabBarLabel: t.tabs.more,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            fontSize: 10,
            fontWeight: '800',
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            lineHeight: 14,
          },
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconWrap,
                focused && [
                  styles.activeIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.16)'
                      : 'rgba(37, 99, 235, 0.12)',
                    borderColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.35)'
                      : 'rgba(37, 99, 235, 0.25)',
                  },
                ],
              ]}
            >
              <Menu size={20} color={focused ? colors.primaryLight || colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrap: {
    borderWidth: 1,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  spacesCenterWrap: {
    width: 44,
    height: 32,
    borderRadius: 14,
  },
});
