import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Users, Mail, Share2, Shield, Circle, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useMemberStore } from '../../store/memberStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';

interface TeamScreenProps {
  navigation: any;
}

export const TeamScreen: React.FC<TeamScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const members = useMemberStore((s) => s.members);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const subscribeToMembers = useMemberStore((s) => s.subscribeToMembers);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMembers();
    const unsub = subscribeToMembers();
    return unsub;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  const workspaceMembers = members.filter((m) => {
    if (!activeWorkspaceId) return true;
    return m.workspaceIds && m.workspaceIds.length > 0
      ? m.workspaceIds.includes(activeWorkspaceId)
      : true;
  });

  const filteredMembers = workspaceMembers.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.department && m.department.toLowerCase().includes(q))
    );
  });

  const handleShareInvite = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    alert('Đã sao chép liên kết mời tham gia workspace!');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Danh bạ Đội nhóm"
        subtitle={`${filteredMembers.length} thành viên • ${activeWs?.name || 'Workspace'}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleShareInvite}
            style={[styles.shareBtn, { backgroundColor: colors.surface }]}
          >
            <Share2 size={16} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm theo tên, email, phòng ban..."
            placeholderTextColor={colors.textPlaceholder}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredMembers.map((member) => (
          <View
            key={member.id}
            style={[
              styles.memberCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Avatar
              name={member.name}
              url={member.avatar}
              size={48}
              online={member.status === 'online'}
            />

            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>
                  {member.name}
                </Text>
                <Badge
                  label={member.role.toUpperCase()}
                  color={member.role === 'admin' ? colors.primary : colors.textMuted}
                />
              </View>

              <Text style={[styles.department, { color: colors.textSecondary }]}>
                {member.department}
              </Text>

              <Text style={[styles.email, { color: colors.textMuted }]}>
                {member.email}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  department: {
    fontSize: 13,
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
});
