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
import { Sparkles, Send, Bot, User, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
      text: '👋 Xin chào! Tôi là **Upgen Brain Assistant**. Tôi có thể giúp bạn lập kế hoạch, chia nhỏ đầu việc, tóm tắt tiến độ hoặc giải đáp thắc mắc công việc hôm nay.',
    },
  ]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages.length]);

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
    t.ai.promptBriefing,
    t.ai.promptBreakdown,
    t.ai.promptPrioritize,
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
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
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
