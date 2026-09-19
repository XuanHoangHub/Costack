import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Check, Plus, X, Briefcase, Settings, Trash2, Crown, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Workspace } from '../../types';
import { Input } from './Input';
import { Button } from './Button';

interface WorkspaceSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

const THEMES = [
  { key: 'indigo', label: 'Electric Blue', color: '#2563eb' },
  { key: 'ocean', label: 'Ocean', color: '#0ea5e9' },
  { key: 'sunset', label: 'Sunset', color: '#f59e0b' },
  { key: 'emerald', label: 'Emerald', color: '#10b981' },
  { key: 'rose', label: 'Rose', color: '#f43f5e' },
];

export const WorkspaceSwitcherModal: React.FC<WorkspaceSwitcherModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('indigo');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings / Edit sub-modal state
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState('');
  const [editTheme, setEditTheme] = useState('indigo');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSelect = (id: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveWorkspaceId(id);
    onClose();
  };

  const handleCreate = async () => {
    if (!newWsName.trim()) return;
    setLoading(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      await addWorkspace({
        name: newWsName.trim(),
        theme: selectedTheme,
      });

      setNewWsName('');
      setNewLogoUrl('');
      setShowAddForm(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (ws: Workspace, e?: any) => {
    e?.stopPropagation?.();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEditingWs(ws);
    setEditName(ws.name);
    setEditTheme(ws.theme || 'indigo');
    setEditLogoUrl(ws.logoUrl || '');
  };

  const handleSaveEdit = async () => {
    if (!editingWs || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateWorkspace(editingWs.id, {
        name: editName.trim(),
        theme: editTheme,
        logoUrl: editLogoUrl.trim() || undefined,
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setEditingWs(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = () => {
    if (!editingWs) return;
    if (workspaces.length <= 1) {
      Alert.alert('Không thể xóa', 'Bạn cần giữ lại ít nhất một Không gian làm việc.');
      return;
    }

    Alert.alert(
      'Xóa Không gian làm việc',
      `Bạn có chắc chắn muốn xóa "${editingWs.name}"? Hành động này sẽ xóa toàn bộ Không gian và Công việc liên quan và không thể khôi phục.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkspace(editingWs.id);
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              } catch {}
              setEditingWs(null);
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa workspace.');
            }
          },
        },
      ]
    );
  };

  const getThemeColor = (themeKey?: string) => {
    const found = THEMES.find((t) => t.key === themeKey);
    return found ? found.color : colors.primary;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            if (editingWs) {
              setEditingWs(null);
            } else {
              onClose();
            }
          }}
        />

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Briefcase size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {editingWs ? `Cài đặt: ${editingWs.name}` : 'Không gian làm việc (Workspace)'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (editingWs) {
                  setEditingWs(null);
                } else {
                  onClose();
                }
              }}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Case 1: Editing a specific workspace */}
            {editingWs ? (
              <View style={styles.editContainer}>
                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
                  Tên Workspace
                </Text>
                <Input
                  placeholder="Nhập tên workspace..."
                  value={editName}
                  onChangeText={setEditName}
                />

                <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                  Màu chủ đề
                </Text>
                <View style={styles.themeRow}>
                  {THEMES.map((theme) => (
                    <TouchableOpacity
                      key={theme.key}
                      onPress={() => setEditTheme(theme.key)}
                      style={[
                        styles.themeCircle,
                        { backgroundColor: theme.color },
                        editTheme === theme.key && styles.themeCircleActive,
                      ]}
                    >
                      {editTheme === theme.key && (
                        <Check size={14} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                  URL Ảnh đại diện / Logo (tùy chọn)
                </Text>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={editLogoUrl}
                  onChangeText={setEditLogoUrl}
                  autoCapitalize="none"
                />

                {editLogoUrl.trim() ? (
                  <View style={styles.logoPreviewRow}>
                    <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                      Xem trước logo:
                    </Text>
                    <Image
                      source={{ uri: editLogoUrl.trim() }}
                      style={styles.logoPreviewImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {/* Delete Workspace Button (if > 1 workspace) */}
                {workspaces.length > 1 && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={[styles.deleteWsBtn, { borderColor: '#ef444430', backgroundColor: '#ef444410' }]}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={styles.deleteWsText}>Xóa Không gian làm việc này</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.formActions}>
                  <TouchableOpacity
                    onPress={() => setEditingWs(null)}
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                      Quay lại
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Lưu thay đổi"
                      onPress={handleSaveEdit}
                      loading={savingEdit}
                      disabled={!editName.trim()}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <>
                {/* Workspaces List */}
                <View style={styles.listContainer}>
                  {workspaces.map((ws) => {
                    const isActive = ws.id === activeWorkspaceId;
                    const wsColor = getThemeColor(ws.theme);
                    const isOwner = ws.role === 'owner';

                    return (
                      <TouchableOpacity
                        key={ws.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(ws.id)}
                        style={[
                          styles.wsItem,
                          {
                            backgroundColor: isActive
                              ? `${wsColor}18`
                              : colors.surfaceSubtle,
                            borderColor: isActive ? wsColor : colors.border,
                          },
                        ]}
                      >
                        {/* Logo / Monogram */}
                        {ws.logoUrl ? (
                          <Image
                            source={{ uri: ws.logoUrl }}
                            style={[styles.wsAvatarImg, { borderColor: isActive ? wsColor : colors.border }]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.wsInitialBox,
                              { backgroundColor: wsColor },
                            ]}
                          >
                            <Text style={styles.wsInitialText}>
                              {ws.initial || ws.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}

                        <View style={styles.wsInfo}>
                          <View style={styles.nameRow}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.wsName,
                                {
                                  color: isActive
                                    ? colors.textPrimary
                                    : colors.textSecondary,
                                  fontWeight: isActive ? '700' : '600',
                                },
                              ]}
                            >
                              {ws.name}
                            </Text>
                            {isOwner && (
                              <View style={[styles.roleBadge, { backgroundColor: '#f59e0b18' }]}>
                                <Crown size={10} color="#f59e0b" />
                                <Text style={styles.roleText}>Chủ sở hữu</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.metaRow}>
                            <Text style={[styles.wsSub, { color: isActive ? wsColor : colors.textMuted }]}>
                              {isActive ? 'Đang hoạt động' : 'Chạm để chuyển đổi'}
                            </Text>
                            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                            <View style={styles.memberCountWrap}>
                              <Users size={11} color={colors.textMuted} />
                              <Text style={[styles.memberCountText, { color: colors.textMuted }]}>
                                {ws.memberCount || 1}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Settings Button */}
                        <TouchableOpacity
                          onPress={(e) => openEditModal(ws, e)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={[styles.gearBtn, { backgroundColor: colors.surfaceHover }]}
                          accessibilityLabel="Cài đặt Workspace"
                        >
                          <Settings size={15} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {isActive && <Check size={18} color={wsColor} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Add Workspace Button or Inline Form */}
                {!showAddForm ? (
                  <TouchableOpacity
                    onPress={() => setShowAddForm(true)}
                    style={[
                      styles.addWsBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Plus size={18} color={colors.primary} />
                    <Text style={[styles.addWsText, { color: colors.primary }]}>
                      Tạo Không gian làm việc mới...
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.addFormCard,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
                      Tên Workspace mới
                    </Text>
                    <Input
                      placeholder="VD: Startup Tech, Phòng Kinh Doanh..."
                      value={newWsName}
                      onChangeText={setNewWsName}
                    />

                    <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                      Màu chủ đề
                    </Text>
                    <View style={styles.themeRow}>
                      {THEMES.map((theme) => (
                        <TouchableOpacity
                          key={theme.key}
                          onPress={() => setSelectedTheme(theme.key)}
                          style={[
                            styles.themeCircle,
                            { backgroundColor: theme.color },
                            selectedTheme === theme.key && styles.themeCircleActive,
                          ]}
                        >
                          {selectedTheme === theme.key && (
                            <Check size={14} color="#ffffff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                      URL Logo (tùy chọn)
                    </Text>
                    <Input
                      placeholder="https://example.com/logo.png"
                      value={newLogoUrl}
                      onChangeText={setNewLogoUrl}
                      autoCapitalize="none"
                    />

                    <View style={styles.formActions}>
                      <TouchableOpacity
                        onPress={() => setShowAddForm(false)}
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                      >
                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                          Hủy
                        </Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Xác nhận tạo"
                          onPress={handleCreate}
                          loading={loading}
                          disabled={!newWsName.trim()}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  listContainer: {
    gap: 8,
  },
  wsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  wsInitialBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  wsInitialText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
  },
  wsInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wsName: {
    fontSize: 15,
    maxWidth: 160,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  wsSub: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 11,
  },
  memberCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: '500',
  },
  gearBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addWsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addFormCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
  },
  editContainer: {
    gap: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  themeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCircleActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  logoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 12,
  },
  logoPreviewImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  deleteWsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  deleteWsText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
});

