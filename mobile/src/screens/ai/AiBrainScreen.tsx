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
} from 'react-native';
import { Sparkles, Send, Bot, User, RefreshCw, CheckSquare, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useTranslation } from '../../locales';
import { askApexaAi } from '../../api/aiService';
import { Header } from '../../components/common/Header';

interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface AiBrainScreenProps {
  navigation: any;
}

export const AiBrainScreen: React.FC<AiBrainScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const { t } = useTranslation();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: '👋 Xin chào! Tôi là **Costack Brain Assistant**. Tôi có thể giúp bạn lập kế hoạch, chia nhỏ đầu việc, tóm tắt tiến độ hoặc giải đáp thắc mắc công việc hôm nay.',
    },
  ]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages.length]);

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
      const allTasks = useTaskStore.getState().tasks;
      const now = Date.now();
      const todayStr = new Date().toDateString();

      const dueTodayCount = allTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate).toDateString() === todayStr
      ).length;
      const overdueCount = allTasks.filter(
        (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now
      ).length;
      const completedCount = allTasks.filter((t) => t.status === 'completed').length;
      const highPriorityTasks = allTasks
        .filter((t) => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed')
        .map((t) => t.title);

      const taskContext = {
        totalTasks: allTasks.length,
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
          text: 'Xin lỗi, không thể kết nối tới máy chủ AI lúc này. Vui lòng thử lại sau!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Tóm tắt tiến độ công việc',
    'Việc gấp cần giải quyết ngay',
    'Lập kế hoạch tuần này',
    'Gợi ý chia nhỏ đầu việc',
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header
        title={t.ai.title}
        subtitle={t.ai.subtitle}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatFeed}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isAi = msg.role === 'ai';

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

                {/* 1-tap "Tạo công việc từ gợi ý này" button on AI responses */}
                {isAi && msg.id !== 'welcome' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleCreateTaskFromAi(msg.text)}
                    style={[
                      styles.createTaskFromAiBtn,
                      {
                        backgroundColor: `${colors.primary}15`,
                        borderColor: `${colors.primary}40`,
                      },
                    ]}
                  >
                    <CheckSquare size={13} color={colors.primary} />
                    <Text style={[styles.createTaskFromAiText, { color: colors.primary }]}>
                      Tạo công việc từ gợi ý này
                    </Text>
                  </TouchableOpacity>
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
          {quickPrompts.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSendPrompt(p)}
              style={[
                styles.promptChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Sparkles size={12} color={colors.primary} />
              <Text style={[styles.promptChipText, { color: colors.textSecondary }]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TextInput
          placeholder={t.ai.placeholder}
          placeholderTextColor={colors.textPlaceholder}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSendPrompt(input)}
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
  createTaskFromAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  createTaskFromAiText: {
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
