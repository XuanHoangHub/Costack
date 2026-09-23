import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  X,
  Plus,
  StickyNote,
  PenTool,
  Trash2,
  Undo2,
  CheckCircle2,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { safeAsyncStorage } from '../../api/storage';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

interface WhiteboardScreenProps {
  navigation: any;
}

interface StickyNoteItem {
  id: string;
  title: string;
  content: string;
  color: string;
  textColor: string;
  createdAt: string;
}

interface Stroke {
  path: string;
  color: string;
  width: number;
}

const PASTEL_COLORS = [
  { id: 'yellow', bg: '#fef08a', text: '#854d0e', name: 'Vàng' },
  { id: 'blue', bg: '#bae6fd', text: '#0369a1', name: 'Xanh' },
  { id: 'pink', bg: '#fbcfe8', text: '#9d174d', name: 'Hồng' },
  { id: 'green', bg: '#bbf7d0', text: '#15803d', name: 'Lục' },
  { id: 'purple', bg: '#e9d5ff', text: '#6b21a8', name: 'Tím' },
];

const PEN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#ffffff'];

const STORAGE_KEY = 'apexa_mobile_whiteboard_notes';

export const WhiteboardScreen: React.FC<WhiteboardScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const addTask = useTaskStore((s) => s.addTask);

  const [activeTab, setActiveTab] = useState<'notes' | 'sketch'>('notes');
  const [notes, setNotes] = useState<StickyNoteItem[]>([
    {
      id: 'note-1',
      title: 'Tối ưu UI/UX Mobile',
      content: 'Chuyển đổi các modal sang dạng bottom sheet và hỗ trợ Dark Mode Obsidian.',
      color: '#fef08a',
      textColor: '#854d0e',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'note-2',
      title: 'Ý tưởng Sprint tiếp theo',
      content: 'Tích hợp thông báo đẩy (Push Notifications) và quét hóa đơn thông minh.',
      color: '#bae6fd',
      textColor: '#0369a1',
      createdAt: new Date().toISOString(),
    },
  ]);

  // New Note Modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);

  // Sketch State
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [penColor, setPenColor] = useState('#3b82f6');

  // Load saved notes
  useEffect(() => {
    safeAsyncStorage.getItem(`${STORAGE_KEY}_${activeWorkspaceId || 'default'}`).then((res) => {
      if (res) {
        try {
          const parsed = JSON.parse(res);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotes(parsed);
          }
        } catch {}
      }
    });
  }, [activeWorkspaceId]);

  const saveNotes = (updated: StickyNoteItem[]) => {
    setNotes(updated);
    safeAsyncStorage.setItem(
      `${STORAGE_KEY}_${activeWorkspaceId || 'default'}`,
      JSON.stringify(updated)
    );
  };

  // PanResponder for drawing
  const currentPathRef = useRef('');
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrentPath(currentPathRef.current);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrentPath(currentPathRef.current);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          setStrokes((prev) => [
            ...prev,
            { path: currentPathRef.current, color: penColor, width: 3 },
          ]);
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleCreateNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const newNote: StickyNoteItem = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim() || 'Ghi chú mới',
      content: noteContent.trim(),
      color: selectedColor.bg,
      textColor: selectedColor.text,
      createdAt: new Date().toISOString(),
    };

    saveNotes([newNote, ...notes]);
    setNoteTitle('');
    setNoteContent('');
    setShowNoteModal(false);

    Toast.show({
      type: 'success',
      text1: 'Đã thêm ghi chú',
      text2: 'Ghi chú mới đã được dán lên bảng ý tưởng.',
    });
  };

  const handleDeleteNote = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    saveNotes(notes.filter((n) => n.id !== id));
  };

  const handleConvertToTask = async (note: StickyNoteItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    await addTask({
      title: note.title,
      description: note.content,
      priority: 'medium',
      status: 'todo',
      tags: ['Whiteboard', 'Idea'],
    });

    Toast.show({
      type: 'success',
      text1: 'Đã chuyển thành công việc',
      text2: `Công việc "${note.title}" đã được thêm vào danh sách.`,
    });
  };

  const handleUndoStroke = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClearSketch = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setStrokes([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Bảng ý tưởng & Whiteboard"
        subtitle={`${notes.length} ghi chú dán • Phác thảo tự do`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          activeTab === 'notes' ? (
            <TouchableOpacity
              onPress={() => setShowNoteModal(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleUndoStroke}
                disabled={strokes.length === 0}
                style={[
                  styles.iconBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  strokes.length === 0 && { opacity: 0.5 },
                ]}
              >
                <Undo2 size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearSketch}
                style={[styles.iconBtn, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Mode Switcher */}
      <View style={[styles.modeBar, { backgroundColor: colors.surfaceSubtle }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('notes')}
          style={[
            styles.modeItem,
            activeTab === 'notes' && [styles.activeModeItem, { backgroundColor: colors.primary }],
          ]}
        >
          <StickyNote size={15} color={activeTab === 'notes' ? '#ffffff' : colors.textMuted} />
          <Text
            style={[
              styles.modeText,
              { color: activeTab === 'notes' ? '#ffffff' : colors.textMuted },
            ]}
          >
            Ghi chú dán (Sticky Notes)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('sketch')}
          style={[
            styles.modeItem,
            activeTab === 'sketch' && [styles.activeModeItem, { backgroundColor: colors.primary }],
          ]}
        >
          <PenTool size={15} color={activeTab === 'sketch' ? '#ffffff' : colors.textMuted} />
          <Text
            style={[
              styles.modeText,
              { color: activeTab === 'sketch' ? '#ffffff' : colors.textMuted },
            ]}
          >
            Vẽ phác thảo (Sketch Pad)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'notes' ? (
        <ScrollView contentContainerStyle={styles.notesGrid}>
          {notes.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <StickyNote size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Chưa có ghi chú nào
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Nhấn dấu "+" để tạo ghi chú ý tưởng và dán lên bảng.
              </Text>
              <Button
                title="Tạo ghi chú mới"
                onPress={() => setShowNoteModal(true)}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            notes.map((note) => (
              <View
                key={note.id}
                style={[styles.noteCard, { backgroundColor: note.color }]}
              >
                <View style={styles.noteTop}>
                  <Text numberOfLines={1} style={[styles.noteTitle, { color: note.textColor }]}>
                    {note.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteNote(note.id)}
                    style={styles.noteDeleteBtn}
                  >
                    <X size={15} color={note.textColor} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.noteContent, { color: note.textColor }]}>
                  {note.content}
                </Text>

                <View style={styles.noteBottom}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleConvertToTask(note)}
                    style={[styles.convertBtn, { backgroundColor: 'rgba(0, 0, 0, 0.08)' }]}
                  >
                    <CheckCircle2 size={13} color={note.textColor} />
                    <Text style={[styles.convertBtnText, { color: note.textColor }]}>
                      Tạo công việc
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <View style={styles.sketchContainer}>
          {/* Pen Color Palette */}
          <View style={[styles.penPalette, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {PEN_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setPenColor(c)}
                style={[
                  styles.penDot,
                  { backgroundColor: c },
                  penColor === c && styles.penDotActive,
                ]}
              />
            ))}
          </View>

          {/* SVG Canvas */}
          <View style={styles.canvasArea} {...panResponder.panHandlers}>
            <Svg style={StyleSheet.absoluteFill}>
              {strokes.map((s, idx) => (
                <Path
                  key={idx}
                  d={s.path}
                  stroke={s.color}
                  strokeWidth={s.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke={penColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          </View>
        </View>
      )}

      {/* Modal Add Sticky Note */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Tạo ghi chú dán mới
              </Text>
              <TouchableOpacity
                onPress={() => setShowNoteModal(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              {/* Color picker */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Màu sắc giấy dán
              </Text>
              <View style={styles.colorRow}>
                {PASTEL_COLORS.map((pc) => (
                  <TouchableOpacity
                    key={pc.id}
                    onPress={() => setSelectedColor(pc)}
                    style={[
                      styles.colorChip,
                      { backgroundColor: pc.bg },
                      selectedColor.id === pc.id && styles.colorChipSelected,
                    ]}
                  >
                    {selectedColor.id === pc.id && (
                      <CheckCircle2 size={16} color={pc.text} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Tiêu đề ý tưởng
              </Text>
              <Input
                placeholder="VD: Cải tiến flow thanh toán..."
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Nội dung chi tiết
              </Text>
              <Input
                placeholder="Mô tả ý tưởng hoặc các điểm cần thảo luận..."
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                numberOfLines={3}
              />

              <Button
                title="Dán lên bảng"
                onPress={handleCreateNote}
                disabled={!noteTitle.trim() && !noteContent.trim()}
                style={{ marginTop: 8 }}
              />
            </ScrollView>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    padding: 3,
  },
  modeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  activeModeItem: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesGrid: {
    padding: 16,
    gap: 14,
  },
  noteCard: {
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  noteDeleteBtn: {
    padding: 4,
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  noteBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  convertBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  sketchContainer: {
    flex: 1,
    position: 'relative',
  },
  penPalette: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  penDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  penDotActive: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.2 }],
  },
  canvasArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
});
