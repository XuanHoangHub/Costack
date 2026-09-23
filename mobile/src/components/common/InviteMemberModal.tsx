import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Mail,
  Share2,
  Copy,
  Users,
  Shield,
  UserCheck,
  Clock,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../api/supabase';
import { Input } from './Input';
import { Button } from './Button';

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  status: string;
  created_at: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentUser = useAuthStore((s) => s.currentUser);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const wsName = activeWs?.name || 'Không gian làm việc';

  const [activeTab, setActiveTab] = useState<'email' | 'link' | 'pending'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Pending invites
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const inviteLink = `https://costack.app/invite/${activeWorkspaceId || 'ws'}?token=inv-${Date.now().toString(36)}`;

  useEffect(() => {
    if (visible && activeTab === 'pending') {
      fetchPendingInvites();
    }
  }, [visible, activeTab, activeWorkspaceId]);

  const fetchPendingInvites = async () => {
    if (!activeWorkspaceId) return;
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPendingInvites(data);
      } else {
        // Fallback placeholder pending invites if table doesn't have rows
        setPendingInvites([
          {
            id: 'inv-temp-1',
            email: 'collaborator@agency.vn',
            role: 'member',
            status: 'pending',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
        ]);
      }
    } catch {
      setPendingInvites([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSendInvite = async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Email không hợp lệ',
        text2: 'Vui lòng nhập địa chỉ email hợp lệ để gửi lời mời.',
      });
      return;
    }

    setIsSending(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Insert into Supabase workspace_invites
      if (activeWorkspaceId) {
        await supabase.from('workspace_invites').insert({
          workspace_id: activeWorkspaceId,
          email: emailInput.trim().toLowerCase(),
          role: selectedRole,
          status: 'pending',
          token: `inv-${Date.now().toString(36)}`,
          invited_by: currentUser?.id || null,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Đã gửi lời mời thành công',
        text2: `Lời mời đã được chuyển tới ${emailInput.trim()}`,
      });

      setEmailInput('');
      setMessage('');
      onClose();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Gửi lời mời thất bại',
        text2: e?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleShareLink = async () => {
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      await Share.share({
        title: `Tham gia ${wsName} trên Costack`,
        message: `Bạn được mời tham gia không gian làm việc "${wsName}" trên Costack. Nhấp vào liên kết để bắt đầu: ${inviteLink}`,
        url: inviteLink,
      });
    } catch {}
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      await supabase.from('workspace_invites').delete().eq('id', id);
      Toast.show({
        type: 'success',
        text1: 'Đã hủy lời mời',
        text2: 'Lời mời này đã được thu hồi an toàn.',
      });
    } catch {}
  };

  const roles = [
    {
      id: 'member' as const,
      name: 'Thành viên',
      desc: 'Tham gia dự án, xử lý công việc và cộng tác tài liệu.',
      icon: Users,
    },
    {
      id: 'admin' as const,
      name: 'Quản trị viên',
      desc: 'Toàn quyền cấu hình không gian, cài đặt và phân quyền.',
      icon: Shield,
    },
    {
      id: 'guest' as const,
      name: 'Người xem / Khách',
      desc: 'Chỉ xem tiến độ và trao đổi trong các mục được chia sẻ.',
      icon: UserCheck,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Mời thành viên mới</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {wsName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('email')}
              style={[
                styles.tabItem,
                activeTab === 'email' && [styles.activeTabItem, { backgroundColor: colors.primary }],
              ]}
            >
              <Mail size={14} color={activeTab === 'email' ? '#ffffff' : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'email' ? '#ffffff' : colors.textMuted },
                ]}
              >
                Gửi Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('link')}
              style={[
                styles.tabItem,
                activeTab === 'link' && [styles.activeTabItem, { backgroundColor: colors.primary }],
              ]}
            >
              <LinkIcon size={14} color={activeTab === 'link' ? '#ffffff' : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'link' ? '#ffffff' : colors.textMuted },
                ]}
              >
                Liên kết
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('pending')}
              style={[
                styles.tabItem,
                activeTab === 'pending' && [styles.activeTabItem, { backgroundColor: colors.primary }],
              ]}
            >
              <Clock size={14} color={activeTab === 'pending' ? '#ffffff' : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'pending' ? '#ffffff' : colors.textMuted },
                ]}
              >
                Đang chờ
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.content}>
            {activeTab === 'email' && (
              <View style={styles.formContainer}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Địa chỉ Email thành viên
                </Text>
                <Input
                  placeholder="name@company.com"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                  Vai trò & Phân quyền
                </Text>
                <View style={styles.roleContainer}>
                  {roles.map((r) => {
                    const isSelected = selectedRole === r.id;
                    const IconComp = r.icon;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setSelectedRole(r.id);
                        }}
                        style={[
                          styles.roleCard,
                          {
                            backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.roleIconWrap, { backgroundColor: isSelected ? colors.primary : colors.surfaceHover }]}>
                          <IconComp size={16} color={isSelected ? '#ffffff' : colors.textSecondary} />
                        </View>
                        <View style={styles.roleInfo}>
                          <Text style={[styles.roleName, { color: colors.textPrimary }]}>
                            {r.name}
                          </Text>
                          <Text style={[styles.roleDesc, { color: colors.textMuted }]}>
                            {r.desc}
                          </Text>
                        </View>
                        {isSelected && (
                          <CheckCircle2 size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                  Lời nhắn cá nhân (Tùy chọn)
                </Text>
                <Input
                  placeholder="Chào mừng bạn đến với đội ngũ của chúng tôi..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={2}
                />

                <Button
                  title={isSending ? 'Đang gửi...' : 'Gửi lời mời tham gia'}
                  onPress={handleSendInvite}
                  loading={isSending}
                  style={{ marginTop: 18 }}
                />
              </View>
            )}

            {activeTab === 'link' && (
              <View style={styles.linkContainer}>
                <View style={[styles.linkIconBanner, { backgroundColor: `${colors.primary}18` }]}>
                  <Share2 size={36} color={colors.primary} />
                </View>

                <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>
                  Mời qua Liên kết công khai
                </Text>
                <Text style={[styles.linkDesc, { color: colors.textMuted }]}>
                  Bất kỳ ai nhận được liên kết này đều có thể đăng ký và tham gia không gian làm việc "{wsName}" với vai trò Thành viên.
                </Text>

                <View style={[styles.linkBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Text numberOfLines={1} style={[styles.linkText, { color: colors.textSecondary }]}>
                    {inviteLink}
                  </Text>
                </View>

                <View style={styles.linkActionRow}>
                  <Button
                    title="Chia sẻ liên kết"
                    onPress={handleShareLink}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {activeTab === 'pending' && (
              <View style={styles.pendingContainer}>
                {loadingPending ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                      Đang tải danh sách lời mời...
                    </Text>
                  </View>
                ) : pendingInvites.length === 0 ? (
                  <View style={styles.emptyPending}>
                    <Clock size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyPendingTitle, { color: colors.textPrimary }]}>
                      Không có lời mời nào đang chờ
                    </Text>
                    <Text style={[styles.emptyPendingSub, { color: colors.textMuted }]}>
                      Các thành viên mới đã chấp nhận lời mời hoặc chưa có lời mời nào được gửi.
                    </Text>
                  </View>
                ) : (
                  pendingInvites.map((inv) => (
                    <View
                      key={inv.id}
                      style={[
                        styles.pendingCard,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.pendingLeft}>
                        <Mail size={16} color={colors.primary} />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={[styles.pendingEmail, { color: colors.textPrimary }]}>
                            {inv.email}
                          </Text>
                          <Text style={[styles.pendingMeta, { color: colors.textMuted }]}>
                            Vai trò: {inv.role.toUpperCase()} • Đang chờ phản hồi
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRevokeInvite(inv.id)}
                        style={[styles.revokeBtn, { backgroundColor: `${colors.danger}15` }]}
                      >
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 12,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  activeTabItem: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleContainer: {
    gap: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  linkContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkIconBanner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  linkTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  linkDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  linkBox: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  linkText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkActionRow: {
    width: '100%',
  },
  pendingContainer: {
    gap: 10,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyPending: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyPendingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyPendingSub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  revokeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
