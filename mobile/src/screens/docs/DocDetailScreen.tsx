import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Trash2, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useDocStore } from '../../store/docStore';
import { Header } from '../../components/common/Header';

interface DocDetailScreenProps {
  route: any;
  navigation: any;
}

export const DocDetailScreen: React.FC<DocDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { docId } = route.params;
  const colors = useUiStore((s) => s.getColors());
  const docs = useDocStore((s) => s.docs);
  const updateDoc = useDocStore((s) => s.updateDoc);
  const deleteDoc = useDocStore((s) => s.deleteDoc);

  const doc = docs.find((d) => d.id === docId);

  const [title, setTitle] = useState(doc?.title || '');
  const [content, setContent] = useState(doc?.content || '');

  if (!doc) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Tài liệu" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Không tìm thấy tài liệu.</Text>
        </View>
      </View>
    );
  }

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateDoc(doc.id, { title, content });
    navigation.goBack();
  };

  const handleDelete = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    deleteDoc(doc.id);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={doc.title}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            >
              <Trash2 size={18} color={colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            >
              <Save size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Tiêu đề tài liệu..."
          placeholderTextColor={colors.textPlaceholder}
          style={[styles.titleInput, { color: colors.textPrimary }]}
        />

        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          Cập nhật lần cuối:{' '}
          {new Date(doc.updatedAt).toLocaleString('vi-VN')}
        </Text>

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Viết nội dung tài liệu tại đây..."
          placeholderTextColor={colors.textPlaceholder}
          multiline
          style={[styles.contentInput, { color: colors.textSecondary }]}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    marginBottom: 20,
  },
  contentInput: {
    fontSize: 15,
    lineHeight: 24,
    minHeight: 300,
    textAlignVertical: 'top',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
