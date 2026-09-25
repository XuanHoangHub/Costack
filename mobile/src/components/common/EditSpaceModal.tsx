import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  X,
  Palette,
  Check,
  Folder,
  Trash2,
  Plus,
  List,
  Sliders,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useSpaceStore } from '../../store/spaceStore';
import { Space } from '../../types';
import { Input } from './Input';
import { Button } from './Button';
import { RenderSpaceIcon } from './RenderSpaceIcon';

interface EditSpaceModalProps {
  visible: boolean;
  space: Space | null;
  onClose: () => void;
}

const EMOJI_PRESETS = [
  'Rocket:indigo',
  'Package:blue',
  'Folder:amber',
  'Target:rose',
  'Brain:pink',
  'Zap:amber',
  'Briefcase:slate',
  'Kanban:purple',
  'Sparkles:purple',
  'Flame:rose',
  '🚀',
  '🎯',
  '⚡',
  '💼',
  '💻',
  '📊',
  '✨',
  '🔥',
];

const THEME_COLORS = [
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#64748b', // Slate
];

export const EditSpaceModal: React.FC<EditSpaceModalProps> = ({
  visible,
  space,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const updateSpace = useSpaceStore((s) => s.updateSpace);
  const deleteSpace = useSpaceStore((s) => s.deleteSpace);
  const deleteList = useSpaceStore((s) => s.deleteList);
  const addList = useSpaceStore((s) => s.addList);

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('Folder:amber');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [newListName, setNewListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (space) {
      setName(space.name || '');
      setSelectedEmoji(space.emoji || 'Folder:amber');
      setSelectedColor(space.themeColor || '#3b82f6');
      setNewListName('');
    }
  }, [space]);

  if (!space) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cho Không gian.');
      return;
    }

    setIsSaving(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      await updateSpace(space.id, {
        name: name.trim(),
        emoji: selectedEmoji,
        themeColor: selectedColor,
      });

      Toast.show({
        type: 'success',
        text1: 'Đã lưu thay đổi',
        text2: `Không gian "${name.trim()}" đã được cập nhật thành công.`,
      });

      onClose();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: e?.message || 'Không thể cập nhật không gian.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim()) return;
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      await addList(space.id, newListName.trim());
      setNewListName('');
      Toast.show({
        type: 'success',
        text1: 'Đã thêm danh sách',
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: e?.message || 'Không thể thêm danh sách.',
      });
    }
  };

  const handleDeleteCurrentSpace = () => {
    Alert.alert(
      'Xóa không gian',
      `Bạn có chắc chắn muốn xóa không gian "${space.name}"? Toàn bộ danh sách và công việc bên trong sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            await deleteSpace(space.id);
            onClose();
            Toast.show({
              type: 'info',
              text1: 'Đã xóa không gian',
              text2: `Không gian "${space.name}" đã được xóa.`,
            });
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconWrap, { backgroundColor: `${selectedColor}20` }]}>
                <RenderSpaceIcon icon={selectedEmoji} size={22} color={selectedColor} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Cài đặt Không gian
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Tùy chỉnh giao diện & danh mục dự án
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.modalClose, { backgroundColor: colors.surfaceHover }]}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Space Name */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Tên không gian
            </Text>
            <Input
              placeholder="VD: Dự án Alpha, Thiết kế UI..."
              value={name}
              onChangeText={setName}
            />

            {/* Emoji Selection */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Biểu tượng đại diện
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {EMOJI_PRESETS.map((emoji) => {
                const isSelected = selectedEmoji === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    activeOpacity={0.7}
                    onPress={() => setSelectedEmoji(emoji)}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor: isSelected ? `${selectedColor}22` : colors.surfaceSubtle,
                        borderColor: isSelected ? selectedColor : colors.border,
                      },
                    ]}
                  >
                    <RenderSpaceIcon icon={emoji} size={20} color={isSelected ? selectedColor : undefined} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Color Selection */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Màu chủ đạo
            </Text>
            <View style={styles.colorPaletteRow}>
              {THEME_COLORS.map((col) => {
                const isSelected = selectedColor === col;
                return (
                  <TouchableOpacity
                    key={col}
                    activeOpacity={0.7}
                    onPress={() => setSelectedColor(col)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: col },
                      isSelected && styles.colorCircleSelected,
                    ]}
                  >
                    {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Lists Management */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Danh sách công việc ({space.lists?.length || 0})
            </Text>
            <View style={[styles.listsBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              {space.lists && space.lists.length > 0 ? (
                space.lists.map((l) => (
                  <View key={l.id} style={[styles.listRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <List size={14} color={selectedColor} />
                      <Text style={[styles.listRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {l.name}
                      </Text>
                    </View>
                    {space.lists && space.lists.length > 1 && (
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => deleteList(space.id, l.id)}
                        style={styles.delListBtn}
                      >
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                  Chưa có danh sách nào
                </Text>
              )}

              {/* Add mini list input */}
              <View style={styles.addListInlineRow}>
                <Input
                  placeholder="Thêm danh sách mới..."
                  value={newListName}
                  onChangeText={setNewListName}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAddList}
                  disabled={!newListName.trim()}
                  style={[
                    styles.addListActionBtn,
                    {
                      backgroundColor: newListName.trim() ? selectedColor : colors.surfaceHover,
                    },
                  ]}
                >
                  <Plus size={16} color={newListName.trim() ? '#ffffff' : colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.bottomActions}>
              <Button
                title={isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                onPress={handleSave}
                loading={isSaving}
                style={{ backgroundColor: selectedColor }}
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleDeleteCurrentSpace}
                style={[styles.deleteSpaceBtn, { borderColor: `${colors.danger}40` }]}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={[styles.deleteSpaceText, { color: colors.danger }]}>
                  Xóa không gian này
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  horizontalChips: {
    flexDirection: 'row',
  },
  emojiChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  listsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listRowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  delListBtn: {
    padding: 6,
  },
  emptyListText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
  },
  addListInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addListActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    marginTop: 16,
    gap: 10,
    paddingBottom: 24,
  },
  deleteSpaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deleteSpaceText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
