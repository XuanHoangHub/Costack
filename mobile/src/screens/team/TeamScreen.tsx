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
import { Users, Mail, Share2, Shield, Circle, Search, MessageSquare, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useMemberStore } from '../../store/memberStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { User } from '../../types';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { InviteMemberModal } from '../../components/common/InviteMemberModal';
import { MemberProfileModal } from '../../components/common/MemberProfileModal';

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  useEffect(() => {
    fetchMembers();
    const unsub = subscribeToMembers();
    return unsub;
  }, [fetchMembers, subscribeToMembers]);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowInviteModal(true);
  };

  const handleDirectChat = async (memberId: string, memberName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const dmId = await useChatStore.getState().getOrCreateDirectMessageChannel(memberId, memberName);
    navigation.navigate('Chat', {
      screen: 'ChatRoom',
      params: { channelId: dmId, channelName: memberName },
    });
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
            style={[styles.shareBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
          <TouchableOpacity
            key={member.id}
            activeOpacity={0.7}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setSelectedMember(member);
            }}
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
                {member.department || 'Thành viên'}
              </Text>

              <Text style={[styles.email, { color: colors.textMuted }]}>
                {member.email}
              </Text>
            </View>

            {/* Direct Message Button */}
            <TouchableOpacity
              onPress={() => handleDirectChat(member.id, member.name)}
              style={[
                styles.chatBtn,
                {
                  backgroundColor: colors.primarySubtle,
                  borderColor: `${colors.primary}35`,
                },
              ]}
            >
              <MessageSquare size={17} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Invite Member Modal */}
      <InviteMemberModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Member Profile Modal */}
      <MemberProfileModal
        visible={!!selectedMember}
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onDirectMessage={handleDirectChat}
      />
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
    borderRadius: 12,
    borderWidth: 1,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  department: {
    fontSize: 12,
    marginBottom: 2,
  },
  email: {
    fontSize: 11,
  },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
});
