import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Bell, CheckCheck, MessageSquare, AlertCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';

export const InboxScreen: React.FC = () => {
  const colors = useUiStore((s) => s.getColors());
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'system'>('all');

  const handleMarkAll = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    markAllAsRead();
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'system') return n.type === 'system';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <AlertCircle size={18} color={colors.danger} />;
      case 'mention':
        return <MessageSquare size={18} color={colors.primary} />;
      case 'system':
        return <Info size={18} color={colors.info} />;
      default:
        return <Bell size={18} color={colors.primary} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.inbox.title}
        rightAction={
          <TouchableOpacity
            onPress={handleMarkAll}
            style={[styles.markAllBtn, { backgroundColor: colors.surface }]}
          >
            <CheckCheck size={16} color={colors.primary} />
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              {t.inbox.markAllAsRead}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('all')}
          style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'all' ? colors.primary : colors.textMuted },
            ]}
          >
            {t.inbox.all}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('mentions')}
          style={[styles.tabItem, activeTab === 'mentions' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'mentions' ? colors.primary : colors.textMuted },
            ]}
          >
            {t.inbox.mentions}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('system')}
          style={[styles.tabItem, activeTab === 'system' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'system' ? colors.primary : colors.textMuted },
            ]}
          >
            {t.inbox.system}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => markAsRead(item.id)}
            style={[
              styles.notifCard,
              {
                backgroundColor: item.read ? colors.surfaceSubtle : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: colors.surfaceHover },
              ]}
            >
              {getIcon(item.type)}
            </View>

            <View style={styles.textBox}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                {!item.read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>

              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {item.message}
              </Text>

              <Text style={[styles.time, { color: colors.textMuted }]}>
                {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Bell size={36} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t.inbox.noNotifications}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 20,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
});
