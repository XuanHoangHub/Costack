import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  CheckSquare,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  Flame,
  Layers,
  Lightbulb,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useTranslation } from '../../locales';
import { askApexaAi } from '../../api/aiService';
import { Header } from '../../components/common/Header';

interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  copied?: boolean;
}

interface AiBrainScreenProps {
  navigation: any;
}

const INITIAL_MESSAGE: AiMessage = {
  id: 'welcome',
  role: 'ai',
  text: '👋 Xin chào! Tôi là **Apexa Brain AI Assistant**.\n\nTôi đồng bộ toàn bộ dữ liệu công việc và không gian làm việc của bạn trong thời gian thực. Tôi có thể giúp bạn:\n• 📋 Tóm tắt bản tin năng suất & tiến độ hôm nay\n• 🔥 Lọc và phân tích các công việc khẩn cấp / quá hạn\n• 🧩 Gợi ý chia nhỏ các đầu việc phức tạp\n• 🎯 Lên lộ trình công việc tuần tối ưu',
};

export const AiBrainScreen: React.FC<AiBrainScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);
  const spaces = useSpaceStore((s) => s.spaces);
  const { t } = useTranslation();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([INITIAL_MESSAGE]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages.length, loading]);

  // Context calculations
  const now = Date.now();
  const todayStr = new Date().toDateString();
  const dueTodayCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toDateString() === todayStr
  ).length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now
  ).length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const highPriorityTasks = tasks
    .filter((t) => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed')
    .map((t) => t.title);

  const handleResetChat = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setMessages([INITIAL_MESSAGE]);
    Toast.show({
      type: 'info',
      text1: 'Đã làm mới',
      text2: 'Cuộc trò chuyện với AI đã được khởi động lại.',
    });
  };

  const handleCopyText = (msgId: string, text: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Clipboard.setString(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
    Toast.show({
      type: 'success',
      text1: 'Đã sao chép',
      text2: 'Nội dung phản hồi đã được lưu vào bộ nhớ tạm.',
      visibilityTime: 1800,
    });
  };

  const handleCreateTaskFromAi = async (text: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const firstLine = text.split('\n')[0].replace(/[*#]/g, '').trim();
    const title = firstLine.length > 55 ? firstLine.slice(0, 55) + '...' : firstLine || 'Nhiệm vụ từ gợi ý AI';

    await useTaskStore.getState().addTask({
      title,
      description: text,
      priority: 'medium',
      status: 'todo',
    });

    Toast.show({
      type: 'success',
      text1: 'Đã tạo công việc',
      text2: `"${title}" đã được thêm vào danh sách việc cần làm.`,
    });
  };

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || loading) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const taskContext = {
        totalTasks: tasks.length,
        dueTodayCount,
        overdueCount,
        completedCount,
        highPriorityTasks,
      };

      const reply = await askApexaAi(promptText, [], taskContext);
      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: 'Xin lỗi, không thể kết nối tới máy chủ AI lúc này. Vui lòng kiểm tra kết nối mạng và thử lại sau!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Bản tin năng suất hôm nay', icon: Sparkles },
    { label: 'Việc gấp cần giải quyết ngay', icon: Flame },
    { label: 'Lập kế hoạch tuần này', icon: Calendar },
    { label: 'Gợi ý chia nhỏ đầu việc', icon: Lightbulb },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header
        title={t.ai.title}
        subtitle="Apexa Brain Assistant"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleResetChat}
            style={[styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <RotateCcw size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      {/* Realtime Context Live Banner */}
      <View
        style={[
          styles.contextBanner,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.contextLeft}>
          <View style={[styles.contextDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.contextText, { color: colors.textSecondary }]}>
            Đang phân tích: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{tasks.length} việc</Text> •{' '}
            <Text style={{ color: overdueCount > 0 ? colors.danger : colors.textMuted }}>{overdueCount} quá hạn</Text> •{' '}
            <Text style={{ color: colors.primary }}>{dueTodayCount} hôm nay</Text>
          </Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.liveBadgeText, { color: colors.primary }]}>AI Sẵn sàng</Text>
        </View>
      </View>

      {/* Chat Messages Feed */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatFeed}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isAi = msg.role === 'ai';
          const isCopied = copiedId === msg.id;

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isAi ? styles.aiRow : styles.userRow,
              ]}
            >
              <View
                style={[
                  styles.avatarWrap,
                  {
                    backgroundColor: isAi ? colors.primary : colors.surfaceHover,
                  },
                ]}
              >
                {isAi ? (
                  <Bot size={16} color="#ffffff" />
                ) : (
                  <User size={16} color={colors.textPrimary} />
                )}
              </View>

              <View
                style={[
                  styles.bubble,
                  isAi ? styles.aiBubble : styles.userBubble,
                  {
                    backgroundColor: isAi ? colors.surface : colors.primary,
                    borderColor: isAi ? colors.border : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: isAi ? colors.textPrimary : '#ffffff' },
                  ]}
                >
                  {msg.text}
                </Text>

                {/* AI Action Toolbar on messages */}
                {isAi && msg.id !== 'welcome' && (
                  <View style={styles.aiActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCreateTaskFromAi(msg.text)}
                      style={[
                        styles.createTaskFromAiBtn,
                        {
                          backgroundColor: `${colors.primary}12`,
                          borderColor: `${colors.primary}35`,
                        },
                      ]}
                    >
                      <CheckSquare size={13} color={colors.primary} />
                      <Text style={[styles.createTaskFromAiText, { color: colors.primary }]}>
                        Tạo công việc
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCopyText(msg.id, msg.text)}
                      style={[
                        styles.copyBtn,
                        {
                          backgroundColor: colors.surfaceHover,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {isCopied ? (
                        <Check size={12} color={colors.success} />
                      ) : (
                        <Copy size={12} color={colors.textSecondary} />
                      )}
                      <Text style={[styles.copyBtnText, { color: isCopied ? colors.success : colors.textSecondary }]}>
                        {isCopied ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingRow}>
            <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
              <Bot size={16} color="#ffffff" />
            </View>
            <View
              style={[
                styles.bubble,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompt Chips */}
      <View style={styles.quickPromptsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quickPrompts.map((p, idx) => {
            const Icon = p.icon;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSendPrompt(p.label)}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Icon size={12} color={colors.primary} />
                <Text style={[styles.promptChipText, { color: colors.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Input bar with dynamic safe area padding */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          placeholder={t.ai.placeholder}
          placeholderTextColor={colors.textPlaceholder}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSendPrompt(input)}
          multiline
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceSubtle,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
        />

        <TouchableOpacity
          onPress={() => handleSendPrompt(input)}
          disabled={!input.trim() || loading}
          style={[
            styles.sendBtn,
            {
              backgroundColor: input.trim() && !loading ? colors.primary : colors.surfaceHover,
            },
          ]}
        >
          <Send
            size={18}
            color={input.trim() && !loading ? '#ffffff' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  contextDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  contextText: {
    fontSize: 11,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chatFeed: {
    padding: 16,
    paddingBottom: 20,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  aiBubble: {
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  aiActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  createTaskFromAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  createTaskFromAiText: {
    fontSize: 12,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  quickPromptsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
