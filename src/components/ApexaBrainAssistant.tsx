"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Brain, Bot, Send, X, FileText, CheckSquare, 
  TrendingUp, AlertTriangle, Users, ArrowRight, Check, Play, HelpCircle, Loader2,
  Mic, MicOff, Globe, Volume2, VolumeX, Copy, RotateCcw, ChevronDown, Calendar,
  Flame, Trash2, Plus, Search, Clock, Sparkle, ExternalLink
} from 'lucide-react';
import { Task, Document, User } from '../types';
import { callAiApi, isAiAccessError } from '@/lib/aiClient';
import { useTranslation } from '../contexts/TranslationContext';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { ApexaAiIcon, ApexaAiAvatar } from './ApexaAiIcon';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isFallback?: boolean;
  followUps?: string[];
}

export interface AiModelOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  isDefault?: boolean;
}

export const AI_MODELS: AiModelOption[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Khuyên dùng', desc: 'Mới nhất, thông minh & phản hồi cực nhanh', isDefault: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Cân bằng', desc: 'Tối ưu cho hội thoại dự án hàng ngày' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: 'Siêu tốc', desc: 'Phản hồi tức thì, tiết kiệm tài nguyên' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Lập luận cao', desc: 'Phân tích sâu, xử lý yêu cầu logic phức tạp' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Ổn định', desc: 'Phiên bản tin cậy và đa năng' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', tag: 'Nhẹ', desc: 'Tối giản băng thông mạng' },
];

export const QUICK_PROMPTS = [
  {
    id: 'daily-brief',
    icon: Calendar,
    color: 'amber',
    iconBg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
    title: 'Bản tin công việc hôm nay',
    titleEn: "Today's Briefing",
    desc: 'Việc quá hạn, việc cần làm ngay hôm nay',
    descEn: 'Overdue & due today priorities',
    query: 'Kiểm tra công việc hôm nay: việc nào quá hạn, đến hạn hôm nay hoặc ngày mai? Hãy chọn tối đa 3 việc tôi cần tập trung trước và giải thích ngắn gọn.'
  },
  {
    id: 'progress-summary',
    icon: TrendingUp,
    color: 'indigo',
    iconBg: 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20',
    title: 'Tóm tắt tiến độ công việc',
    titleEn: 'Progress Summary',
    desc: 'Tỷ lệ hoàn thành & tiến trình dự án',
    descEn: 'Completion rate & blockers',
    query: 'Phân tích và tóm tắt tiến độ hiện tại. Có bao nhiêu công việc đang thực hiện, quá hạn và đã hoàn thành?'
  },
  {
    id: 'urgent-tasks',
    icon: Flame,
    color: 'rose',
    iconBg: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20',
    title: 'Công việc khẩn cấp & rủi ro',
    titleEn: 'Urgent Tasks',
    desc: 'Lọc các việc ưu tiên cao/urgent',
    descEn: 'High & urgent priority tasks',
    query: 'Những công việc nào có độ ưu tiên khẩn cấp (urgent) hoặc cao (high)? Có những điểm nghẽn hoặc rủi ro nào cần giải quyết trước?'
  },
  {
    id: 'resource-allocation',
    icon: Users,
    color: 'emerald',
    iconBg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
    title: 'Phân bổ nguồn lực nhóm',
    titleEn: 'Resource Allocation',
    desc: 'Xem ai đang nhận nhiều việc nhất',
    descEn: 'Team workload distribution',
    query: 'Tóm tắt phân bổ công việc cho từng thành viên trong nhóm. Ai đang được giao nhiều việc nhất và có ai đang bị quá tải không?'
  }
];

interface ApexaBrainAssistantProps {
  tasks: Task[];
  documents: Document[];
  members: User[];
  isOffline: boolean;
  onUpdateTask: (updatedTask: Task) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  onAddSyncLog: (action: string) => void;
}

type TabType = 'query' | 'summarize' | 'subtasks' | 'generate-tasks';

export default function ApexaBrainAssistant({
  tasks,
  documents,
  members,
  isOffline,
  onUpdateTask,
  onAddTask,
  onAddSyncLog
}: ApexaBrainAssistantProps) {
  const { t, locale } = useTranslation();
  const appActiveTab = useUiStore((s) => s.activeTab);
  const setShowPremiumModal = useUiStore((s) => s.setShowPremiumModal);
  const isPremium = useAuthStore((s) => Boolean(s.currentUser?.isPremium));
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [responseText, setResponseText] = useState<string>('');
  const [isAiFallbackActive, setIsAiFallbackActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Multi-turn chat conversation history
  const [chatHistory, setChatHistory] = useState<AiChatMessage[]>([]);

  // AI Model selector states
  const [activeModelId, setActiveModelId] = useState<string>('gemini-3.6-flash');
  const [activeModelName, setActiveModelName] = useState('Gemini 3.6 Flash');
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Copy helper
  const handleCopyText = (text: string) => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Voice transcription state variables
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Speech & Web Search configurations
  const [searchWeb, setSearchWeb] = useState(false);
  const [playingSpeech, setPlayingSpeech] = useState(false);
  const utteranceRef = useRef<any>(null);

  // Load Model & Search Grounding preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchDefault = localStorage.getItem('apexa_ai_search_grounding') === 'true';
      setSearchWeb(searchDefault);
    }
  }, []);

  // Update Model from storage
  useEffect(() => {
    const updateModelInfo = () => {
      const raw = (typeof window !== 'undefined' ? localStorage.getItem('apexa_ai_model') : '') || 'gemini-3.6-flash';
      const found = AI_MODELS.find(m => m.id === raw);
      if (found) {
        setActiveModelId(found.id);
        setActiveModelName(found.name);
      } else {
        setActiveModelId('gemini-3.6-flash');
        setActiveModelName('Gemini 3.6 Flash');
      }
    };
    updateModelInfo();
    window.addEventListener('storage', updateModelInfo);
    return () => window.removeEventListener('storage', updateModelInfo);
  }, []);

  const handleSelectModel = (modelId: string) => {
    setActiveModelId(modelId);
    const found = AI_MODELS.find(m => m.id === modelId);
    if (found) setActiveModelName(found.name);
    setShowModelMenu(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexa_ai_model', modelId);
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = (text: string) => {
    if (typeof window === 'undefined') return;

    if (playingSpeech) {
      window.speechSynthesis.cancel();
      setPlayingSpeech(false);
    } else {
      window.speechSynthesis.cancel();
      
      const cleanText = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/###/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = locale === 'vi' ? 'vi-VN' : 'en-US';
      utterance.onend = () => setPlayingSpeech(false);
      utterance.onerror = () => setPlayingSpeech(false);

      utteranceRef.current = utterance;
      setPlayingSpeech(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // Initializing speech recognition safely
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = locale === 'vi' ? 'vi-VN' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
        if (event.error === 'not-allowed') {
          setRecognitionError(locale === 'vi' ? 'Quyền truy cập micro bị từ chối. Vui lòng kiểm tra cài đặt trình duyệt.' : 'Microphone permission denied. Please check your browser settings.');
        } else {
          setRecognitionError(locale === 'vi' ? `Lỗi micro: ${event.error}` : `Microphone error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQueryInput(prev => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
          });
        }
      };

      recognitionRef.current = rec;
    }
  }, [locale]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setRecognitionError(locale === 'vi' ? "Trình duyệt của bạn không hỗ trợ Web Speech API." : "Your browser does not support Web Speech API for voice recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Starting recognition failed", err);
      }
    }
  };
  
  // Tab 2 Summarize states
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [docSummary, setDocSummary] = useState<string>('');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Tab 3 Subtask states
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [subtasksApplied, setSubtasksApplied] = useState(false);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Tab 4 AI Task Generator states
  const [taskPrompt, setTaskPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [tasksCreated, setTasksCreated] = useState(false);

  // Scroll to bottom of response refs
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatHistory, responseText, docSummary, loading, suggestedSubtasks, generatedTasks]);

  // Clear Chat History
  const handleClearChat = () => {
    setChatHistory([]);
    setResponseText('');
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setPlayingSpeech(false);
  };

  // Handle Query (Chat)
  const handleQuery = async (customQuery?: string) => {
    const finalQuery = (customQuery || queryInput).trim();
    if (!finalQuery) return;

    const timeStr = new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    // Append user message immediately
    const userMessage: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: finalQuery,
      timestamp: timeStr
    };

    setChatHistory(prev => [...prev, userMessage]);
    setQueryInput('');
    setLoading(true);

    if (isOffline) {
      setTimeout(() => {
        setLoading(false);
        const offlineText = locale === 'vi' 
          ? "⚠️ **Ngoại tuyến**: Upgen AI không thể kết nối tới máy chủ Gemini do không có kết nối mạng. Vui lòng bật lại mạng hoặc đồng bộ để tiếp tục truy vấn trực tuyến!"
          : "⚠️ **Offline**: Upgen AI cannot connect to Gemini AI servers at this time. Please enable network connection to resume online queries!";
        const offlineMsg: AiChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: offlineText,
          timestamp: new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          isFallback: true
        };
        setChatHistory(prev => [...prev, offlineMsg]);
        setResponseText(offlineText);
      }, 600);
      return;
    }

    try {
      const res = await callAiApi('/api/ai/query', {
        query: finalQuery,
        tasks,
        documents,
        members,
        now: new Date().toISOString(),
        googleSearch: searchWeb
      });

      const data = await res.json();
      if (data.success && data.text) {
        setIsAiFallbackActive(false);
        onAddSyncLog(`Asked Upgen AI: "${finalQuery.slice(0, 20)}..."`);
        
        const urgentCount = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
        const followUps = locale === 'vi' ? [
          urgentCount > 0 ? "Chi tiết các việc khẩn cấp & quá hạn" : "Đề xuất việc cần ưu tiên tiếp theo",
          "Ai đang nhận nhiều việc nhất trong nhóm?",
          "Tạo kế hoạch hành động giải quyết công việc"
        ] : [
          urgentCount > 0 ? "Details on urgent & overdue tasks" : "Recommend top priority next steps",
          "Who has the highest workload in the team?",
          "Create an action plan to resolve blockers"
        ];

        const aiMessage: AiChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.text,
          timestamp: new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          followUps
        };

        setChatHistory(prev => [...prev, aiMessage]);
        setResponseText(data.text);
      } else {
        throw new Error(data.error || "Fail Response");
      }
    } catch (err: any) {
      console.error(err);
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);

      const completedCount = tasks.filter(t => t.status === 'completed').length;
      const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
      const inProgressCount = tasks.filter(t => t.status === 'inprogress').length;

      const fallbackText = locale === 'vi' ? `### Phân tích tiến độ dự án (Dự phòng cục bộ)
Dựa trên dữ liệu hiện tại trong không gian làm việc của bạn:
- 📊 **Tỷ lệ hoàn thành**: **${completedCount}/${tasks.length}** việc (${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%).
- ⏳ **Đang tiến hành**: **${inProgressCount}** công việc.
- ⚠️ **Ưu tiên khẩn cấp/cao**: **${urgentTasks.length}** việc (${urgentTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}${urgentTasks.length > 2 ? '...' : ''}).
- 👥 **Nhân sự tham gia**: **${members.length}** thành viên trong dự án.

*Gợi ý: Upgen AI hỗ trợ Gemini trực tuyến khi kết nối mạng và tài khoản hoạt động ổn định.*` : `### Task Progress Analysis (Local Fallback)
Based on current workspace data:
- 📊 **Completion Rate**: **${completedCount}/${tasks.length}** tasks (${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%).
- ⏳ **In Progress**: **${inProgressCount}** tasks.
- ⚠️ **High / Urgent Priority**: **${urgentTasks.length}** tasks.
- 👥 **Assigned Members**: **${members.length}** active contributors.

*Hint: Upgen AI works best with active network and paid tier.*`;

      const aiFallbackMessage: AiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        isFallback: true,
        followUps: locale === 'vi' ? ["Lọc công việc quá hạn", "Phân bổ nhân sự chi tiết"] : ["Filter overdue tasks", "Team allocation details"]
      };

      setChatHistory(prev => [...prev, aiFallbackMessage]);
      setResponseText(fallbackText);
    } finally {
      setLoading(false);
    }
  };

  // Handle Document Summarization
  const handleSummarizeDoc = async (type: 'summarize' | 'points' | 'actions') => {
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) return;

    setLoading(true);
    setDocSummary('');

    if (isOffline) {
      setTimeout(() => {
        setLoading(false);
        setDocSummary(locale === 'vi' ? "⚠️ Ngoại tuyến: Không thể tóm tắt tài liệu khi không có kết nối mạng." : "⚠️ Offline: Cannot summarize document due to no network connection.");
      }, 700);
      return;
    }

    let actionPrompt = "summarize";
    if (type === 'points') actionPrompt = "improve";
    if (type === 'actions') actionPrompt = "expand";

    try {
      const res = await callAiApi('/api/ai/document', {
        title: doc.title,
        content: doc.content,
        action: actionPrompt
      });

      const data = await res.json();
      if (data.success && data.text) {
        setDocSummary(data.text);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Upgen AI analyzed document: "${doc.title}"`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);
      let fallbackText = `### ${locale === 'vi' ? 'Phân tích tài liệu' : 'Document Analysis'}: ${doc.title}\n\n`;
      if (type === 'summarize') {
        fallbackText += locale === 'vi'
          ? `- **Tóm tắt ngắn gọn**: Tài liệu đưa ra các tiêu chuẩn vận hành và hướng dẫn kiến trúc nền tảng.\n- **Từ khóa chính**: Năng suất, Đồng bộ hóa, Quy trình làm việc hiện đại.`
          : `- **Concise Summary**: The document outlines platform architecture guidelines and operations streamlining.\n- **Keywords**: Productivity, Synchronization, Modern Workflows.`;
      } else {
        fallbackText += locale === 'vi'
          ? `- **Điểm cải tiến**: Sắp xếp lại mức độ ưu tiên bằng bảng Kanban trực quan.\n- **Hành động đề xuất**: Kích hoạt kế hoạch sprint tuần và chạy kiểm thử tự động.`
          : `- **Improvements**: Re-organize priorities using Kanban boards.\n- **Proposed Actions**: Activate weekly sprint plans and run offline synchronization.`;
      }
      setDocSummary(fallbackText);
    } finally {
      setLoading(false);
    }
  };

  // Handle Suggested Subtasks
  const handleGenerateSubtasks = async () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    setLoading(true);
    setSuggestedSubtasks([]);
    setSubtasksApplied(false);

    if (isOffline) {
      setTimeout(() => {
        setLoading(false);
        setSuggestedSubtasks(locale === 'vi' ? [
          "Rà soát chi tiết yêu cầu kỹ thuật ban đầu (Dự phòng)",
          "Thảo luận và thống nhất các mốc KPI dự án",
          "Viết kiểm thử tự động & thực hiện đánh giá mã nguồn"
        ] : [
          "Review initial requirements in detail (Offline Fallback)",
          "Discuss and clarify project KPI milestones",
          "Perform unit testing & code review"
        ]);
      }, 700);
      return;
    }

    try {
      const res = await callAiApi('/api/ai/subtasks', {
        title: task.title,
        description: task.description
      });

      const data = await res.json();
      if (data.subtasks && data.subtasks.length > 0) {
        setSuggestedSubtasks(data.subtasks);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Upgen AI suggested ${data.subtasks.length} subtasks for: "${task.title}"`);
      } else {
        throw new Error("Zero list");
      }
    } catch (err) {
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);
      setSuggestedSubtasks(locale === 'vi' ? [
        "Phác thảo kiến trúc giao diện người dùng",
        "Xây dựng cấu trúc dữ liệu cốt lõi",
        "Đánh giá hiệu năng và trải nghiệm người dùng"
      ] : [
        "Sketch breakthrough designs for the project",
        "Build the core data structure outline",
        "Evaluate performance and end-user experience"
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Subtask item manipulation helpers
  const handleAddCustomSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSuggestedSubtasks(prev => [...prev, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSuggestedSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  // Apply suggested subtasks to current task state
  const applySubtasksToTask = () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task || suggestedSubtasks.length === 0) return;

    // Create subtask items with unique ids
    const newSubtaskItems = suggestedSubtasks.map((title, index) => ({
      id: `sub-gen-${Date.now()}-${index}`,
      title,
      completed: false
    }));

    const updatedTask: Task = {
      ...task,
      subtasks: [...task.subtasks, ...newSubtaskItems],
      // Recalculate progress
      progress: Math.round(
        ((task.subtasks.filter(s => s.completed).length) / 
        (task.subtasks.length + newSubtaskItems.length)) * 100
      ) || 0
    };

    onUpdateTask(updatedTask);
    setSubtasksApplied(true);
    onAddSyncLog(`Successfully applied ${suggestedSubtasks.length} subtasks to task: "${task.title}"`);
  };

  // Handle Generate Tasks from user prompt
  const handleGenerateTasks = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || taskPrompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setGeneratedTasks([]);
    setTasksCreated(false);

    if (isOffline) {
      setTimeout(() => {
        setLoading(false);
        setGeneratedTasks([
          {
            title: locale === 'vi' ? "Thiết kế UI/UX" : "UI/UX Design",
            description: locale === 'vi' ? "Phác thảo wireframe và thiết kế giao diện người dùng theo yêu cầu." : "Sketch wireframes and design detailed user interfaces for the new feature based on requirements.",
            priority: "high",
            hoursEstimate: 8,
            tags: ["Design"],
            subtasks: locale === 'vi' ? ["Phác thảo layout", "Thiết kế Figma mockups", "Thu thập phản hồi từ nhóm"] : ["Sketch layouts", "Figma mockups design", "Gather team feedback"]
          },
          {
            title: locale === 'vi' ? "Phát triển tính năng" : "Feature Development",
            description: locale === 'vi' ? "Viết mã nguồn giao diện frontend và tích hợp API liên quan." : "Build codebase for frontend and integrate related API services.",
            priority: "medium",
            hoursEstimate: 12,
            tags: ["Frontend", "API"],
            subtasks: locale === 'vi' ? ["Viết UI components", "Kết nối API dữ liệu", "Xử lý các lỗi biên dịch"] : ["Write UI components", "Connect data APIs", "Resolve compilation issues"]
          },
          {
            title: locale === 'vi' ? "Kiểm thử & Triển khai" : "Testing & Deploy",
            description: locale === 'vi' ? "Kiểm tra tính năng, vá lỗi và hoàn thiện quy trình triển khai." : "Run feature tests, resolve issues, and complete the deploy process.",
            priority: "low",
            hoursEstimate: 4,
            tags: ["Testing"],
            subtasks: locale === 'vi' ? ["Viết unit tests", "Sửa lỗi giao diện", "Triển khai bản cập nhật"] : ["Write unit tests", "Fix CSS/JS bugs", "Deploy live update"]
          }
        ]);
        onAddSyncLog(`Upgen AI planned 3 tasks (Offline Fallback)`);
      }, 700);
      return;
    }

    try {
      const res = await callAiApi('/api/ai/generate-tasks', { prompt: finalPrompt });

      const data = await res.json();
      if (data.tasks) {
        setGeneratedTasks(data.tasks);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Upgen AI planned ${data.tasks.length} tasks for: "${finalPrompt.slice(0, 20)}..."`);
      } else {
        throw new Error("Response error");
      }
    } catch (err) {
      console.error(err);
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);
      setGeneratedTasks([
        {
          title: locale === 'vi' ? "Thiết kế UI/UX" : "UI/UX Design",
          description: locale === 'vi' ? "Phác thảo wireframe và thiết kế chi tiết giao diện người dùng." : "Sketch wireframes and design detailed user interfaces for the new feature based on requirements.",
          priority: "high",
          hoursEstimate: 8,
          tags: ["Design"],
          subtasks: locale === 'vi' ? ["Phác thảo layout", "Thiết kế Figma", "Lấy phản hồi từ nhóm"] : ["Sketch layouts", "Figma mockups design", "Gather team feedback"]
        },
        {
          title: locale === 'vi' ? "Phát triển tính năng" : "Feature Development",
          description: locale === 'vi' ? "Xây dựng mã nguồn frontend và kết nối API hệ thống." : "Build codebase for frontend and integrate related API services.",
          priority: "medium",
          hoursEstimate: 12,
          tags: ["Frontend", "API"],
          subtasks: locale === 'vi' ? ["Xây dựng UI component", "Kết nối API", "Sửa lỗi biên dịch"] : ["Write UI components", "Connect data APIs", "Resolve compilation issues"]
        },
        {
          title: locale === 'vi' ? "Kiểm thử & Triển khai" : "Testing & Deploy",
          description: locale === 'vi' ? "Kiểm thử hệ thống và tiến hành đóng gói triển khai." : "Run feature tests, resolve issues, and complete the deploy process.",
          priority: "low",
          hoursEstimate: 4,
          tags: ["Testing"],
          subtasks: locale === 'vi' ? ["Kiểm thử chức năng", "Vá lỗi giao diện", "Đưa lên môi trường chạy thử"] : ["Write unit tests", "Fix CSS/JS bugs", "Deploy live update"]
        }
      ]);
    } finally {
      setLoading(false);
      if (!customPrompt) setTaskPrompt('');
    }
  };

  // Add all generated tasks to Task Manager
  const applyGeneratedTasks = () => {
    if (generatedTasks.length === 0 || !onAddTask) return;

    generatedTasks.forEach((t, idx) => {
      const subtaskItems = (t.subtasks || []).map((stTitle: string, stIdx: number) => ({
        id: `sub-ai-${Date.now()}-${idx}-${stIdx}`,
        title: stTitle,
        completed: false
      }));

      onAddTask({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: 'todo',
        subtasks: subtaskItems,
        hoursEstimate: t.hoursEstimate,
        hoursLogged: 0,
        tags: t.tags || []
      });
    });

    setTasksCreated(true);
    onAddSyncLog(`Successfully added ${generatedTasks.length} tasks from Upgen AI to Task Manager`);
  };

  // Helper function to render text to custom clean markup beautifully
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-slate-700 dark:text-slate-200 font-sans text-xs leading-relaxed">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('###')) {
            return <h4 key={i} className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-3 mb-1">{trimmed.replace('###', '').trim()}</h4>;
          }
          if (trimmed.startsWith('##')) {
            return <h3 key={i} className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 tracking-tight mt-3.5 mb-1.5">{trimmed.replace('##', '').trim()}</h3>;
          }
          if (trimmed.startsWith('#')) {
            return <h2 key={i} className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight mt-4 mb-2">{trimmed.replace('#', '').trim()}</h2>;
          }
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const cleanLine = trimmed.replace(/^[\s-*]+/, '').trim();
            const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)/);
            if (boldMatch) {
              return (
                <div key={i} className="flex gap-2 ml-1 items-start">
                  <span className="text-sky-500 font-extrabold mt-0.5">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white font-bold">{boldMatch[1]}</strong>
                    {boldMatch[2]}
                  </span>
                </div>
              );
            }
            return (
              <div key={i} className="flex gap-2 ml-1 items-start">
                <span className="text-sky-500 font-extrabold mt-0.5">•</span>
                <span>{cleanLine}</span>
              </div>
            );
          }
          
          const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
          if (numMatch) {
            const num = numMatch[1];
            const content = numMatch[2];
            const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
            return (
              <div key={i} className="flex gap-2 ml-0.5 items-start">
                <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 text-[9px] font-black flex items-center justify-center shadow-3xs mt-0.5 select-none font-sans">
                  {num}
                </span>
                <span className="flex-1 pt-0.5">
                  {boldMatch ? (
                    <>
                      <strong className="text-slate-900 dark:text-white font-bold">{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </>
                  ) : (
                    content
                  )}
                </span>
              </div>
            );
          }

          if (trimmed.startsWith('>')) {
            return (
              <div key={i} className="border-l-2 border-indigo-500/60 pl-3 py-1 my-1 text-slate-600 dark:text-slate-350 italic bg-indigo-50/20 dark:bg-indigo-950/10 rounded-r-lg">
                {trimmed.replace(/^>\s*/, '')}
              </div>
            );
          }
          
          if (trimmed === '') return <div key={i} className="h-1" />;
          
          return <p key={i} className="pl-0.5">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Custom Styles for Shimmer Skeleton Loader */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes assistant-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer-fast {
          background: linear-gradient(90deg, 
            rgba(226, 232, 240, 0.4) 25%, 
            rgba(203, 213, 225, 0.8) 50%, 
            rgba(226, 232, 240, 0.4) 75%
          );
          background-size: 200% 100%;
          animation: assistant-shimmer 1.5s infinite linear;
        }
        .dark .animate-shimmer-fast {
          background: linear-gradient(90deg, 
            rgba(30, 41, 59, 0.4) 25%, 
            rgba(71, 85, 105, 0.8) 50%, 
            rgba(30, 41, 59, 0.4) 75%
          );
          background-size: 200% 100%;
          animation: assistant-shimmer 1.5s infinite linear;
        }
      `}} />

      {/* PERSISTENT FLOATING BUTTON (Apexa AI Icon) */}
      <div className={`fixed right-3 sm:right-6 ${appActiveTab === 'chat' ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-6'} z-40 transition-all duration-300`}>
        <motion.button
          id="btn_apexa_ai_float"
          onClick={() => {
            if (!isPremium) {
              setShowPremiumModal(true);
              return;
            }
            setIsOpen(!isOpen);
            // Default selections if unselected
            if (documents.length > 0 && !selectedDocId) setSelectedDocId(documents[0].id);
            if (tasks.length > 0 && !selectedTaskId) setSelectedTaskId(tasks[0].id);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 border border-sky-400/40 flex items-center justify-center text-white shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:shadow-[0_8px_36px_rgba(56,189,248,0.55)] cursor-pointer relative z-10 overflow-hidden group"
          title="Trợ lý AI Upgen"
        >
          {/* Ambient specular highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 rounded-2xl blur-sm opacity-30 group-hover:opacity-60 transition-opacity -z-10" />

          {isOpen ? (
            <X className="w-5 h-5 shrink-0 text-white" />
          ) : (
            <ApexaAiIcon className="w-7 h-7 shrink-0 drop-shadow-[0_2px_10px_rgba(56,189,248,0.6)]" variant="gradient" />
          )}
        </motion.button>
        {!isOpen && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 animate-ping opacity-20 -z-0 scale-95 pointer-events-none" />
        )}
      </div>

      {/* SLIDE-IN DRAWER PANEL FROM RIGHT */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-955 z-40 cursor-default"
            />

            {/* AI Assistant Drawer Container */}
            <motion.div
              id="apexa_ai_drawer"
              initial={{ x: '100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] md:w-[540px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 backdrop-blur-2xl border-l border-slate-200/80 dark:border-slate-800/80 shadow-[-15px_0_50px_-10px_rgba(0,0,0,0.35)] z-40 flex flex-col overflow-hidden"
            >
              {/* Drawer Header with Glass Gradient Accent */}
              <div className="p-3.5 sm:p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800/80 relative overflow-visible shrink-0 select-none">
                {/* Decorative glowing gradient spheres */}
                <div className="absolute top-[-40px] left-[15%] w-[160px] h-[120px] bg-indigo-500/15 rounded-full blur-[40px] pointer-events-none" />
                <div className="absolute top-[-30px] right-[10%] w-[120px] h-[100px] bg-sky-500/15 rounded-full blur-[35px] pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative">
                    <ApexaAiAvatar size="sm" showGlow={true} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black tracking-tight text-white font-display">
                        Upgen AI
                      </h2>
                      {/* Interactive Model Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowModelMenu(!showModelMenu)}
                          className="flex items-center gap-1.5 bg-sky-500/15 hover:bg-sky-500/25 active:scale-95 text-sky-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-sky-500/30 transition-all cursor-pointer shadow-xs"
                          title={locale === 'vi' ? "Nhấp để đổi mô hình AI" : "Click to switch AI model"}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="truncate max-w-[110px]">{activeModelName}</span>
                          <ChevronDown className={`w-3 h-3 text-sky-400 transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Model Dropdown Menu */}
                        {showModelMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowModelMenu(false)} />
                            <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                              <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>{locale === 'vi' ? 'Chọn mô hình Gemini' : 'Select Gemini Model'}</span>
                                <span className="text-[9px] text-sky-400 font-semibold">{AI_MODELS.length} {locale === 'vi' ? 'mô hình' : 'models'}</span>
                              </div>
                              <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
                                {AI_MODELS.map(m => {
                                  const isSelected = activeModelId === m.id;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleSelectModel(m.id)}
                                      className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                                        isSelected 
                                          ? 'bg-sky-500/20 text-white border border-sky-500/40 shadow-xs' 
                                          : 'hover:bg-slate-800/80 text-slate-300'
                                      }`}
                                    >
                                      <div className="pt-0.5">
                                        {isSelected ? (
                                          <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-bold text-[11px] truncate">{m.name}</span>
                                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0">
                                            {m.tag}
                                          </span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {locale === 'vi' ? 'Trợ lý AI điều phối dự án thông minh' : 'Smart Project Orchestration Copilot'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 relative z-10">
                  {/* Reset/Clear Chat button */}
                  {activeTab === 'query' && chatHistory.length > 0 && (
                    <button 
                      type="button"
                      onClick={handleClearChat}
                      className="w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                      title={locale === 'vi' ? "Làm mới hội thoại" : "Clear conversation"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Close drawer */}
                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                    title={locale === 'vi' ? "Đóng trợ lý" : "Close Assistant"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Offline mode warn notification bar */}
              {isOffline && (
                <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{locale === 'vi' ? 'Mạng đang ngoại tuyến. AI đang chạy ở chế độ dự phòng dữ liệu cục bộ.' : 'Network is offline. Upgen AI is currently operating in local fallback mode.'}</span>
                </div>
              )}

              {/* Navigation Tabs bar inside Drawer */}
              <div className="flex border-b border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md p-1.5 gap-1.5 relative shrink-0">
                {[
                  { id: 'query', label: locale === 'vi' ? 'Hỏi AI' : 'Ask AI', icon: TrendingUp },
                  { id: 'summarize', label: locale === 'vi' ? 'Tài liệu' : 'Docs', icon: FileText },
                  { id: 'subtasks', label: locale === 'vi' ? 'Việc con' : 'Subtasks', icon: CheckSquare },
                  { id: 'generate-tasks', label: locale === 'vi' ? 'Lập kế hoạch' : 'Planner', icon: Sparkles }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className="flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active_ai_tab"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/70 dark:border-slate-700/60"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-3.5 h-3.5 relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-400'}`} />
                      <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-650 dark:text-sky-300 font-black' : 'text-slate-500 dark:text-slate-400'}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* DRAWER CONTENT DISPLAY */}
              <div className="flex-1 overflow-hidden p-4 sm:p-5 flex flex-col relative">
                {(isOffline || isAiFallbackActive) && (
                  <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-2 shadow-2xs leading-normal shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>{locale === 'vi' ? 'Chế độ dự phòng:' : 'Fallback mode:'}</strong> {locale === 'vi' ? 'Upgen AI cần kết nối mạng để sử dụng mô hình Gemini trực tuyến. Dữ liệu hiện được lấy trực tiếp từ máy tính của bạn.' : 'Upgen AI needs network to connect to Gemini servers. Currently operating using local workspace data.'}
                    </div>
                  </div>
                )}
                
                {/* --- TAB 1: QUERY & CONVERSATION --- */}
                {activeTab === 'query' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                    {/* Chat Messages Timeline or Empty Greeting State */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-start overflow-y-auto shadow-xs space-y-4">
                        {chatHistory.length === 0 ? (
                          <div className="space-y-4 my-auto py-2">
                            {/* Greeting & Workspace Metrics Card */}
                            <div className="bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center space-y-3">
                              <div className="flex justify-center">
                                <ApexaAiAvatar size="md" showGlow={true} />
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-display">
                                  {locale === 'vi' ? 'Xin chào! Tôi có thể hỗ trợ gì cho bạn hôm nay?' : 'Hello! How can I assist your project today?'}
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
                                  {locale === 'vi' 
                                    ? 'Tôi có thể phân tích tiến độ, cảnh báo công việc quá hạn, tóm tắt tài liệu và lập kế hoạch công việc tự động.'
                                    : 'I can analyze project health, pinpoint overdue blockers, summarize documentation, and plan tasks.'}
                                </p>
                              </div>

                              {/* Live Workspace Metrics Ribbon */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[9px] text-slate-400 block font-bold">{locale === 'vi' ? 'Tổng việc' : 'Total'}</span>
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{tasks.length}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[9px] text-sky-500 block font-bold">{locale === 'vi' ? 'Đang làm' : 'Active'}</span>
                                  <span className="text-xs font-black text-sky-600 dark:text-sky-400">{tasks.filter(t => t.status === 'inprogress').length}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[9px] text-rose-500 block font-bold">{locale === 'vi' ? 'Khẩn cấp' : 'Urgent'}</span>
                                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">{tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[9px] text-indigo-500 block font-bold">{locale === 'vi' ? 'Nhân sự' : 'Team'}</span>
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{members.length}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Analysis Prompts */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-sky-500" />
                                  <span>{locale === 'vi' ? 'Yêu cầu phân tích nhanh' : 'Quick Analysis Prompts'}</span>
                                </label>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {QUICK_PROMPTS.map((item) => {
                                  const IconComponent = item.icon;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setQueryInput(item.query);
                                        handleQuery(item.query);
                                      }}
                                      className="p-3 text-left border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-400/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all duration-300 cursor-pointer group text-[10px] flex flex-col justify-between h-20 bg-white dark:bg-slate-900/60 shadow-2xs hover:shadow-sm relative overflow-hidden"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${item.iconBg}`}>
                                          <IconComponent className="w-3.5 h-3.5" />
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-sky-300 transition-colors line-clamp-1">
                                          {locale === 'vi' ? item.title : item.titleEn}
                                        </span>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 line-clamp-1 block mt-0.5">
                                          {locale === 'vi' ? item.desc : item.descEn}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Chat Message History Timeline */
                          <div className="space-y-4">
                            {chatHistory.map((msg) => (
                              <div key={msg.id} className="space-y-2">
                                {msg.sender === 'user' ? (
                                  /* User Message Bubble */
                                  <div className="flex justify-end">
                                    <div className="max-w-[85%] bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-xs p-3 shadow-xs space-y-1">
                                      <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                      <span className="text-[9px] text-indigo-100/70 block text-right font-mono">{msg.timestamp}</span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Assistant Message Bubble */
                                  <div className="flex gap-2.5 items-start">
                                    <ApexaAiAvatar size="sm" />
                                    <div className="flex-1 min-w-0 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl rounded-tl-xs border border-slate-200/60 dark:border-slate-700/50 shadow-2xs space-y-2 relative">
                                      {/* Message top action bar */}
                                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/40 dark:border-slate-700/30">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] font-black text-indigo-600 dark:text-sky-400 uppercase tracking-wider">Upgen AI</span>
                                          {msg.isFallback && (
                                            <span className="text-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/20">
                                              {locale === 'vi' ? 'Dự phòng' : 'Fallback'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(msg.text)}
                                            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title={copied ? "Đã sao chép!" : "Sao chép"}
                                          >
                                            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleSpeech(msg.text)}
                                            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title={playingSpeech ? "Dừng đọc" : "Đọc bằng giọng nói"}
                                          >
                                            {playingSpeech ? <VolumeX className="w-3 h-3 text-indigo-600 animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                                          </button>
                                          <span className="text-[9px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
                                        </div>
                                      </div>

                                      {/* Markdown Body */}
                                      <div className="text-xs">
                                        {renderMarkdown(msg.text)}
                                      </div>

                                      {/* Follow-up Chips */}
                                      {msg.followUps && msg.followUps.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/40 space-y-1.5">
                                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">
                                            {locale === 'vi' ? 'Gợi ý câu hỏi tiếp theo:' : 'Suggested next questions:'}
                                          </span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {msg.followUps.map((chip, chipIdx) => (
                                              <button
                                                key={chipIdx}
                                                type="button"
                                                onClick={() => {
                                                  setQueryInput(chip);
                                                  handleQuery(chip);
                                                }}
                                                className="text-[9px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-sky-300 border border-indigo-200/50 dark:border-indigo-800/40 transition-all cursor-pointer flex items-center gap-1"
                                              >
                                                <span>{chip}</span>
                                                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Loading State Skeleton */}
                        {loading && (
                          <div className="space-y-3 py-3 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>{locale === 'vi' ? 'AI Upgen đang phân tích dữ liệu...' : 'Upgen AI is analyzing workspace...'}</span>
                            </div>
                            <div className="space-y-2.5 max-w-sm mx-auto">
                              <div className="h-3 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-5/6 mx-auto" />
                            </div>
                          </div>
                        )}

                        <div ref={responseEndRef} />
                      </div>
                    </div>

                    {/* Audio Listening Active State Waveform */}
                    {isListening && (
                      <div className="p-3 border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl flex items-center justify-between shrink-0 animate-pulse shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-0.5 h-4">
                            <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-2 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.45s]" />
                            <span className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                            <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-bounce" />
                          </div>
                          <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400">
                            {locale === 'vi' ? 'Đang nghe giọng nói... Hãy nói câu hỏi của bạn!' : 'Listening to voice... Speak your query now!'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleListening}
                          className="text-[9px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          {locale === 'vi' ? 'Dừng mic' : 'Stop mic'}
                        </button>
                      </div>
                    )}

                    {/* TTS Speech Active indicator */}
                    {playingSpeech && (
                      <div className="p-2 border border-sky-200 dark:border-sky-900/40 bg-sky-50/70 dark:bg-sky-950/30 rounded-xl flex items-center justify-between shrink-0 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
                            {locale === 'vi' ? 'Đang phát giọng đọc AI...' : 'Playing AI speech response...'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSpeech('')}
                          className="text-[9px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          {locale === 'vi' ? 'Dừng' : 'Stop'}
                        </button>
                      </div>
                    )}

                    {/* Recognition Error notice */}
                    {recognitionError && (
                      <div className="p-2 border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 text-[10px] text-rose-600 dark:text-rose-400 rounded-xl font-semibold flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{recognitionError}</span>
                      </div>
                    )}

                    {/* Input Console Bar */}
                    <div className="shrink-0 bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/60 transition-all flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                          isListening 
                            ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300'
                        }`}
                        title={isListening ? "Đang nghe... Nhấp để dừng" : "Nhập bằng giọng nói (Mic)"}
                      >
                        {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                      </button>

                      <input
                        type="text"
                        placeholder={isListening ? (locale === 'vi' ? "Đang nghe giọng nói của bạn..." : "Listening...") : (locale === 'vi' ? "Hỏi Upgen AI về tiến độ, rủi ro, phân bổ..." : "Ask about progress, risks, tasks...")}
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleQuery();
                          }
                        }}
                        className="flex-1 px-2 py-2 text-xs text-slate-800 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent font-medium"
                        disabled={isListening}
                      />

                      {/* Google Search Grounding toggle */}
                      <button
                        type="button"
                        onClick={() => setSearchWeb(!searchWeb)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                          searchWeb 
                            ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 shadow-2xs' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500'
                        }`}
                        title={searchWeb ? (locale === 'vi' ? "Tìm kiếm Web đang bật" : "Web Search Grounding Enabled") : (locale === 'vi' ? "Tìm kiếm Web đang tắt" : "Web Search Grounding Disabled")}
                      >
                        <Globe className="w-4 h-4" />
                      </button>

                      {/* Send Button */}
                      <button
                        type="button"
                        onClick={() => handleQuery()}
                        disabled={loading || !queryInput.trim() || isListening}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer select-none transition-all shrink-0 ${
                          (queryInput.trim() && !isListening) ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}


                {/* --- TAB 2: SUMMARIZE WIKI DOC --- */}
                {activeTab === 'summarize' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3 font-sans">
                    <div className="space-y-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          {locale === 'vi' ? 'Chọn tài liệu hệ thống' : 'Select Knowledge Doc'}
                        </label>
                        <span className="text-[9px] text-slate-400 font-semibold">{documents.length} {locale === 'vi' ? 'tài liệu' : 'docs'}</span>
                      </div>

                      {documents.length > 3 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder={locale === 'vi' ? "Lọc tìm tài liệu..." : "Filter docs..."}
                            value={docSearchQuery}
                            onChange={(e) => setDocSearchQuery(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400"
                          />
                        </div>
                      )}

                      <select
                        value={selectedDocId}
                        onChange={(e) => {
                          setSelectedDocId(e.target.value);
                          setDocSummary('');
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-bold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-xs"
                      >
                        {documents.length === 0 ? (
                          <option value="">{locale === 'vi' ? 'Chưa có tài liệu nào' : 'No documents found'}</option>
                        ) : (
                          documents
                            .filter(d => !docSearchQuery || d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) || d.category?.toLowerCase().includes(docSearchQuery.toLowerCase()))
                            .map(d => (
                              <option key={d.id} value={d.id}>
                                [{d.category || 'Tài liệu'}] {d.title}
                              </option>
                            ))
                        )}
                      </select>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-1.5 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        {locale === 'vi' ? 'Tùy chọn phân tích AI' : 'AI Analysis Actions'}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: locale === 'vi' ? 'Tóm tắt cốt lõi' : 'Summary', action: 'summarize' as const, icon: FileText },
                          { label: locale === 'vi' ? 'Điểm mấu chốt' : 'Key Insights', action: 'points' as const, icon: Sparkles },
                          { label: locale === 'vi' ? 'Kế hoạch hành động' : 'Action Plan', action: 'actions' as const, icon: ArrowRight }
                        ].map((act, index) => {
                          const ActIcon = act.icon;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSummarizeDoc(act.action)}
                              disabled={!selectedDocId || loading}
                              className="py-2.5 px-2 text-[10px] font-extrabold bg-indigo-50/70 dark:bg-indigo-950/25 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-sky-300 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <ActIcon className="w-3 h-3 text-indigo-600 dark:text-sky-400 shrink-0" />
                              <span className="truncate">{act.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Output display */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-3 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>{locale === 'vi' ? 'AI Upgen đang phân tích tài liệu...' : 'Upgen AI is analyzing doc...'}</span>
                            </div>
                            <div className="space-y-2.5">
                              <div className="h-3.5 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-5/6 mx-auto" />
                            </div>
                          </div>
                        ) : docSummary ? (
                          <div className="space-y-2 relative">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
                                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">
                                  {locale === 'vi' ? 'Kết quả phân tích' : 'Analysis Output'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(docSummary)}
                                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title={copied ? "Đã sao chép!" : "Sao chép"}
                                >
                                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSpeech(docSummary)}
                                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title={playingSpeech ? "Dừng đọc" : "Đọc bằng giọng nói"}
                                >
                                  {playingSpeech ? <VolumeX className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div className="text-xs">
                              {renderMarkdown(docSummary)}
                            </div>
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-500">
                              <FileText className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {locale === 'vi' ? 'Soạn & Rà soát tài liệu Wiki' : 'Wiki Knowledge Summarizer'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                              {locale === 'vi' 
                                ? 'Chọn tài liệu ở trên và nhấp vào một trong các tùy chọn AI để tự động trích xuất điểm chính hoặc lên kế hoạch hành động.'
                                : 'Select a document above and pick an AI analysis action to summarize or extract action items.'}
                            </p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}


                {/* --- TAB 3: SUBTASK GENERATOR --- */}
                {activeTab === 'subtasks' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3 font-sans">
                    <div className="space-y-1.5 shrink-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          {locale === 'vi' ? 'Chọn công việc chính' : 'Select Main Task'}
                        </label>
                        <span className="text-[9px] text-slate-400 font-semibold">{tasks.length} {locale === 'vi' ? 'công việc' : 'tasks'}</span>
                      </div>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(e.target.value);
                          setSuggestedSubtasks([]);
                          setSubtasksApplied(false);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-bold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-xs"
                      >
                        {tasks.length === 0 ? (
                          <option value="">{locale === 'vi' ? 'Không có công việc nào' : 'No tasks available'}</option>
                        ) : (
                          tasks.map(t => (
                            <option key={t.id} value={t.id}>
                              [{(t.priority || 'none').toUpperCase()}] {t.title}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSubtasks}
                      disabled={!selectedTaskId || loading}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_18px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/30 shrink-0 active:scale-[0.99]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>{locale === 'vi' ? 'AI Upgen đang bóc tách nhiệm vụ...' : 'Decomposing task into subtasks...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-sky-200 animate-pulse" />
                          <span>{locale === 'vi' ? 'Đề xuất công việc con bằng AI' : 'Generate Subtasks with AI'}</span>
                        </>
                      )}
                    </button>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-3 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>{locale === 'vi' ? 'Đang phân tích cấu trúc công việc...' : 'Analyzing task breakdown...'}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="h-3.5 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                            </div>
                          </div>
                        ) : suggestedSubtasks.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {locale === 'vi' ? `Đề xuất (${suggestedSubtasks.length} việc con):` : `Suggested (${suggestedSubtasks.length} subtasks):`}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {suggestedSubtasks.map((st, i) => (
                                <div key={i} className="flex gap-2 items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs group hover:border-indigo-400/40 transition-colors">
                                  <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-sky-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                    {i + 1}
                                  </div>
                                  <span className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug flex-1">{st}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSubtask(i)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                    title={locale === 'vi' ? "Xóa việc con này" : "Remove"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add custom subtask input */}
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder={locale === 'vi' ? "+ Thêm việc con khác..." : "+ Add custom subtask..."}
                                value={newSubtaskInput}
                                onChange={(e) => setNewSubtaskInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCustomSubtask();
                                }}
                                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-400"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomSubtask}
                                disabled={!newSubtaskInput.trim()}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Apply Button */}
                            {subtasksApplied ? (
                              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>{locale === 'vi' ? 'Đã áp dụng thành công vào công việc!' : 'Subtasks successfully applied!'}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={applySubtasksToTask}
                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer text-center shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{locale === 'vi' ? 'Áp dụng danh sách này vào công việc' : 'Apply these subtasks to task'}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-500">
                              <CheckSquare className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {locale === 'vi' ? 'Phân rã công việc con thông minh' : 'Intelligent Subtask Breakdown'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                              {locale === 'vi'
                                ? 'Chọn một công việc lớn ở trên và AI sẽ tự động chia nhỏ thành các bước thực thi rõ ràng, giúp tăng khả năng hoàn thành.'
                                : 'Select a major task above and AI will break it down into actionable subtasks with clear progress tracking.'}
                            </p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}


                {/* --- TAB 4: AI TASK GENERATOR --- */}
                {activeTab === 'generate-tasks' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3 font-sans">
                    <div className="space-y-1.5 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        {locale === 'vi' ? 'Ý tưởng mục tiêu dự án' : 'Inspiration Ideas'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { text: locale === 'vi' ? "Thiết kế Landing Page" : "Landing Page Design", q: "Plan tasks for design and development of a product Landing Page" },
                          { text: locale === 'vi' ? "Chiến dịch Marketing" : "Marketing Campaign", q: "Plan a digital marketing campaign for a new tech product launch" },
                          { text: locale === 'vi' ? "Tuyển dụng & Đào tạo" : "Hiring & Onboarding", q: "Build a hiring and onboarding workflow for Software Developers" },
                          { text: locale === 'vi' ? "Kiểm thử & Bảo mật" : "Security Audit", q: "Plan vulnerability assessment and penetration testing for web app" }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setTaskPrompt(btn.q);
                              handleGenerateTasks(btn.q);
                            }}
                            className="p-2.5 text-left border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-400/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all duration-200 cursor-pointer group text-[10px] flex flex-col justify-between h-14 bg-white dark:bg-slate-900/60 shadow-2xs hover:shadow-xs"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-sky-300 transition-colors truncate">
                              {btn.text}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                              {locale === 'vi' ? 'Chọn đề xuất' : 'Pick prompt'}
                              <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform text-indigo-500" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Prompt Input */}
                    <div className="shrink-0 bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/60 transition-all flex gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder={locale === 'vi' ? "Mô tả mục tiêu (ví dụ: Ra mắt tính năng ví điện tử)..." : "Describe project goal to generate tasks..."}
                        value={taskPrompt}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerateTasks();
                        }}
                        className="flex-1 px-2.5 py-2 text-xs text-slate-800 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateTasks()}
                        disabled={loading || !taskPrompt.trim()}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer select-none transition-all shrink-0 ${
                          taskPrompt.trim() ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tasks Display */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-3 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>{locale === 'vi' ? 'AI Upgen đang lập kế hoạch chi tiết...' : 'Upgen AI is planning tasks...'}</span>
                            </div>
                            <div className="space-y-2.5 max-w-sm mx-auto">
                              <div className="h-3.5 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-5/6 mx-auto" />
                            </div>
                          </div>
                        ) : generatedTasks.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-slate-100/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                              <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                                {locale === 'vi' ? `Đã tạo ${generatedTasks.length} công việc:` : `Generated ${generatedTasks.length} tasks:`}
                              </span>
                              {tasksCreated ? (
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{locale === 'vi' ? 'Đã thêm thành công!' : 'Added successfully!'}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={applyGeneratedTasks}
                                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                >
                                  {locale === 'vi' ? '+ Thêm tất cả vào dự án' : '+ Add all to workspace'}
                                </button>
                              )}
                            </div>

                            <div className="space-y-2.5">
                              {generatedTasks.map((t, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-xs font-bold text-slate-850 dark:text-slate-100 leading-tight flex-1">{t.title}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border shrink-0 ${
                                      t.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                                      t.priority === 'high' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                                      t.priority === 'medium' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                                      'bg-slate-50 text-slate-650 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{t.description}</p>
                                  
                                  <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mr-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {t.hoursEstimate} {locale === 'vi' ? 'giờ' : 'hrs'}
                                    </span>
                                    {t.tags && t.tags.map((tag: string, tagIdx: number) => (
                                      <span key={tagIdx} className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>

                                  {t.subtasks && t.subtasks.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">
                                        {locale === 'vi' ? 'Việc con kèm theo:' : 'Included subtasks:'}
                                      </span>
                                      <div className="space-y-0.5">
                                        {t.subtasks.map((st: string, stIdx: number) => (
                                          <div key={stIdx} className="flex gap-1.5 items-center text-[9px] text-slate-600 dark:text-slate-350">
                                            <span className="text-sky-500 shrink-0">•</span>
                                            <span className="truncate">{st}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-500">
                              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {locale === 'vi' ? 'Trình lập kế hoạch công việc tự động' : 'Automatic Task Planner'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                              {locale === 'vi'
                                ? 'Nhập mục tiêu dự án (ví dụ: "Ra mắt chiến dịch Tết 2026") và AI sẽ tự động phân rã thành các công việc chi tiết kèm thời gian ước tính.'
                                : 'Describe any objective and Upgen AI will generate a complete set of tasks with time estimates and subtasks.'}
                            </p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer and credits */}
              <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                <span className="flex items-center gap-1.5">
                  <ApexaAiIcon className="w-3.5 h-3.5 animate-pulse" variant="gradient" />
                  <span className="font-semibold">{locale === 'vi' ? 'Trợ lý thông minh Upgen AI' : 'Upgen AI Intelligent Copilot'}</span>
                </span>
                <span className="flex items-center gap-1 text-[9px]">
                  <span>Vận hành bởi</span>
                  <span className="font-bold text-sky-500 dark:text-sky-400">Gemini 3.6 Flash</span>
                </span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
