import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { FileText, Plus, ChevronRight, X, Star, Search, Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useDocStore } from '../../store/docStore';
import { DocumentItem } from '../../types';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';

interface DocsScreenProps {
  navigation: any;
}

const CATEGORIES = [
  { id: 'All', label: 'Tất cả' },
  { id: 'Planning', label: 'Kế hoạch' },
  { id: 'Design', label: 'Thiết kế' },
  { id: 'Tech', label: 'Kỹ thuật' },
  { id: 'General', label: 'Ghi chú chung' },
];

const EMOJIS = ['📄', '📝', '💡', '🚀', '📊', '🎯', '📌', '📚', '🛠️', '💰'];

export const DocsScreen: React.FC<DocsScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const docs = useDocStore((s) => s.docs);
  const addDoc = useDocStore((s) => s.addDoc);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [docEmoji, setDocEmoji] = useState('📄');
  const [docCategory, setDocCategory] = useState('General');

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    await addDoc({
      title: title.trim(),
      content: content.trim(),
      emoji: docEmoji,
      category: docCategory,
    });
    Toast.show({
      type: 'success',
      text1: 'Thành công',
      text2: `Tài liệu "${title.trim()}" đã được tạo.`,
    });
    setTitle('');
    setContent('');
    setDocEmoji('📄');
    setDocCategory('General');
    setShowModal(false);
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryLabel = (catId?: string) => {
    const found = CATEGORIES.find((c) => c.id === catId);
    return found ? found.label : (catId || 'Chung');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Tài liệu & Ghi chú"
        subtitle="Kho tri thức và kế hoạch dự án"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowModal(true);
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      {/* Search Input Bar */}
      <View style={[styles.searchBarWrap, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Tìm kiếm tài liệu, ý tưởng..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoriesWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setSelectedCategory(cat.id);
                }}
                style={[
                  styles.catFilterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catFilterText,
                    { color: isSelected ? '#ffffff' : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredDocs.length === 0 ? (
          <View
            style={[
              styles.emptyWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <FileText size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {searchQuery
                ? 'Thử thay đổi từ khóa hoặc bộ lọc danh mục.'
                : 'Nhấn nút "+" góc trên để tạo tài liệu hoặc ghi chú đầu tiên.'}
            </Text>
          </View>
        ) : (
          filteredDocs.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DocDetail', { docId: doc.id })}
              style={[
                styles.docCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emojiWrap,
                  { backgroundColor: colors.surfaceHover },
                ]}
              >
                <Text style={styles.emojiText}>{doc.emoji || '📄'}</Text>
              </View>

              <View style={styles.docInfo}>
                <View style={styles.titleRow}>
                  <Text
                    numberOfLines={1}
                    style={[styles.docTitle, { color: colors.textPrimary }]}
                  >
                    {doc.title}
                  </Text>
                  {doc.isFavorite && <Star size={14} color="#eab308" fill="#eab308" />}
                </View>

                <Text
                  numberOfLines={2}
                  style={[styles.docPreview, { color: colors.textSecondary }]}
                >
                  {doc.content || 'Chưa có nội dung ghi chú...'}
                </Text>

                <View style={styles.metaRow}>
                  <View style={[styles.badgeCategory, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.badgeCategoryText, { color: colors.primary }]}>
                      {getCategoryLabel(doc.category)}
                    </Text>
                  </View>
                  <Text style={[styles.docMeta, { color: colors.textMuted }]}>
                    •{' '}
                    {new Date(doc.updatedAt).toLocaleDateString('vi-VN', {
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Document Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Tạo tài liệu mới
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Emoji Selector */}
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                Biểu tượng:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setDocEmoji(emoji)}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor: docEmoji === emoji ? `${colors.primary}25` : colors.surfaceSubtle,
                        borderColor: docEmoji === emoji ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Category Selector */}
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                Danh mục:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.filter((c) => c.id !== 'All').map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setDocCategory(cat.id)}
                    style={[
                      styles.modalCatChip,
                      {
                        backgroundColor: docCategory === cat.id ? `${colors.primary}25` : colors.surfaceSubtle,
                        borderColor: docCategory === cat.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalCatChipText,
                        { color: docCategory === cat.id ? colors.primaryLight : colors.textSecondary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput
              placeholder="Tiêu đề tài liệu..."
              placeholderTextColor={colors.textPlaceholder}
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              placeholder="Nội dung ghi chú & kiến thức..."
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={6}
              value={content}
              onChangeText={setContent}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  minHeight: 120,
                  textAlignVertical: 'top',
                },
              ]}
            />

            <Button
              title="Lưu tài liệu"
              onPress={handleCreate}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  categoriesWrap: {
    paddingBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  catFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  emptyWrap: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  docInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  docPreview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeCategory: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  modalCatChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
});
