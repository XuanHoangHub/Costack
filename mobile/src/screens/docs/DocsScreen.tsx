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
import { FileText, Plus, ChevronRight, X, Star } from 'lucide-react-native';
import { useUiStore } from '../../store/uiStore';
import { useDocStore } from '../../store/docStore';
import { DocumentItem } from '../../types';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';

interface DocsScreenProps {
  navigation: any;
}

export const DocsScreen: React.FC<DocsScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const docs = useDocStore((s) => s.docs);
  const addDoc = useDocStore((s) => s.addDoc);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;
    addDoc({
      title: title.trim(),
      content: content.trim(),
      emoji: '📄',
      category: 'General',
    });
    setTitle('');
    setContent('');
    setShowModal(false);
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
            onPress={() => setShowModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {docs.map((doc) => (
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
                {doc.content}
              </Text>

              <Text style={[styles.docMeta, { color: colors.textMuted }]}>
                {doc.category} •{' '}
                {new Date(doc.updatedAt).toLocaleDateString('vi-VN', {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
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
              placeholder="Nội dung ghi chú..."
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
              style={{ marginTop: 10 }}
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
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
});
