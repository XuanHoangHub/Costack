import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 66,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 10,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
            <View style={[styles.iconWrap, focused && { backgroundColor: `${colors.primary}18` }]}>
              <Home size={21} color={color} strokeWidth={focused ? 2.5 : 2} />
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
            <View style={[styles.iconWrap, focused && { backgroundColor: `${colors.primary}18` }]}>
              <CheckSquare size={21} color={color} strokeWidth={focused ? 2.5 : 2} />
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
                focused && { backgroundColor: `${colors.primary}25`, borderColor: colors.primary },
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
            <View style={[styles.iconWrap, focused && { backgroundColor: `${colors.primary}18` }]}>
              <MessageSquare size={21} color={color} strokeWidth={focused ? 2.5 : 2} />
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
            <View style={[styles.iconWrap, focused && { backgroundColor: `${colors.primary}18` }]}>
              <Menu size={21} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacesCenterWrap: {
    width: 42,
    height: 32,
    borderRadius: 12,
  },
});
