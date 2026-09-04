"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Brain, Bot, Send, X, FileText, CheckSquare, 
  TrendingUp, AlertTriangle, Users, ArrowRight, Check, Play, HelpCircle, Loader2,
  Mic, MicOff, Globe, Volume2, VolumeX, Copy
} from 'lucide-react';
import { Task, Document, User } from '../types';
import { callAiApi, isAiAccessError } from '@/lib/aiClient';

interface ApexaBrainAssistantProps {
  tasks: Task[];
  documents: Document[];
  members: User[];
  isOffline: boolean;
  onUpdateTask: (updatedTask: Task) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  onAddSyncLog: (action: string) => void;
}

import { useTranslation } from '../contexts/TranslationContext';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { ApexaAiIcon, ApexaAiAvatar } from './ApexaAiIcon';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchDefault = localStorage.getItem('apexa_ai_search_grounding') === 'true';
      setSearchWeb(searchDefault);
    }
  }, []);

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
      utterance.lang = 'vi-VN';
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
      rec.lang = 'vi-VN';

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
          setRecognitionError('Microphone permission denied. Please check your browser settings.');
        } else {
          setRecognitionError(`Microphone error: ${event.error}`);
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
  }, []);

  const [activeModelName, setActiveModelName] = useState('Gemini 3.6 Flash');
  useEffect(() => {
    const updateModelName = () => {
      const raw = (typeof window !== 'undefined' ? localStorage.getItem('apexa_ai_model') : '') || 'gemini-3.6-flash';
      if (raw.includes('3.6')) setActiveModelName('Gemini 3.6 Flash');
      else if (raw.includes('3.5-flash-lite')) setActiveModelName('Gemini 3.5 Flash-Lite');
      else if (raw.includes('3.5')) setActiveModelName('Gemini 3.5 Flash');
      else if (raw.includes('2.5-pro')) setActiveModelName('Gemini 2.5 Pro');
      else if (raw.includes('2.5-flash-lite')) setActiveModelName('Gemini 2.5 Flash-Lite');
      else setActiveModelName('Gemini 2.5 Flash');
    };
    updateModelName();
    window.addEventListener('storage', updateModelName);
    return () => window.removeEventListener('storage', updateModelName);
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setRecognitionError("Your browser does not support Web Speech API for voice recognition.");
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

  // Tab 3 Subtask states
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [subtasksApplied, setSubtasksApplied] = useState(false);

  // Tab 4 AI Task Generator states
  const [taskPrompt, setTaskPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [tasksCreated, setTasksCreated] = useState(false);

  // Scroll to bottom of response refs if needed
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [responseText, docSummary, loading, suggestedSubtasks, generatedTasks]);

  // Handle Query
  const handleQuery = async (customQuery?: string) => {
    const finalQuery = customQuery || queryInput;
    if (!finalQuery.trim()) return;

    setLoading(true);
    setResponseText('');

    if (isOffline) {
      setTimeout(() => {
        setLoading(false);
        setResponseText("⚠️ Offline: Apexa AI cannot connect to Gemini AI servers at this time. Please enable network connection (Click the SYNCD button in the bottom-left corner) to resume online queries!");
      }, 700);
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
        setResponseText(data.text);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Asked Apexa AI: "${finalQuery.slice(0, 20)}..."`);
      } else {
        throw new Error(data.error || "Fail Response");
      }
    } catch (err: any) {
      console.error(err);
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);
      // Fallback response with beautiful markdown formatting
      setResponseText(`### Task Progress Analysis (Local Fallback)
Based on current information, here is a quick summary:
- 📊 **Completion Rate**: You have completed **${tasks.filter(t => t.status === 'completed').length}/${tasks.length}** tasks.
- ⚠️ **Urgency Level**: You have **${tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}** High/Urgent priority tasks.
- 👥 **Resource Allocation**: **${members.length}** members are actively assigned.

*Hint: Apexa AI requires a paid plan and an online connection.*`);
    } finally {
      setLoading(false);
      if (!customQuery) setQueryInput('');
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
        setDocSummary("⚠️ Offline: Cannot summarize document due to no network connection.");
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
        onAddSyncLog(`Apexa AI analyzed document: "${doc.title}"`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      if (isAiAccessError(err)) return;
      // Local fallback
      setIsAiFallbackActive(true);
      let fallbackText = `### Document Analysis: ${doc.title}\n\n`;
      if (type === 'summarize') {
        fallbackText += `- **Concise Summary**: The document outlines platform architecture guidelines and operations streamlining.\n- **Keywords**: Productivity, Synchronization, Modern Workflows.`;
      } else {
        fallbackText += `- **Improvements**: Re-organize priorities using Kanban boards.\n- **Proposed Actions**: Activate weekly sprint plans and run offline synchronization.`;
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
        setSuggestedSubtasks([
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
        onAddSyncLog(`Apexa AI suggested ${data.subtasks.length} subtasks for: "${task.title}"`);
      } else {
        throw new Error("Zero list");
      }
    } catch (err) {
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);
      setSuggestedSubtasks([
        "Sketch breakthrough designs for the project",
        "Build the core data structure outline",
        "Evaluate performance and end-user experience"
      ]);
    } finally {
      setLoading(false);
    }
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
            title: "UI/UX Design",
            description: "Sketch wireframes and design detailed user interfaces for the new feature based on requirements.",
            priority: "high",
            hoursEstimate: 8,
            tags: ["Design"],
            subtasks: ["Sketch layouts", "Figma mockups design", "Gather team feedback"]
          },
          {
            title: "Feature Development",
            description: "Build codebase for frontend and integrate related API services.",
            priority: "medium",
            hoursEstimate: 12,
            tags: ["Frontend", "API"],
            subtasks: ["Write UI components", "Connect data APIs", "Resolve compilation issues"]
          },
          {
            title: "Testing & Deploy",
            description: "Run feature tests, resolve issues, and complete the deploy process.",
            priority: "low",
            hoursEstimate: 4,
            tags: ["Testing"],
            subtasks: ["Write unit tests", "Fix CSS/JS bugs", "Deploy live update"]
          }
        ]);
        onAddSyncLog(`Apexa AI planned 3 tasks (Offline Fallback)`);
      }, 700);
      return;
    }

    try {
      const res = await callAiApi('/api/ai/generate-tasks', { prompt: finalPrompt });

      const data = await res.json();
      if (data.tasks) {
        setGeneratedTasks(data.tasks);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Apexa AI planned ${data.tasks.length} tasks for: "${finalPrompt.slice(0, 20)}..."`);
      } else {
        throw new Error("Response error");
      }
    } catch (err) {
      console.error(err);
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);
      setGeneratedTasks([
        {
          title: "UI/UX Design",
          description: "Sketch wireframes and design detailed user interfaces for the new feature based on requirements.",
          priority: "high",
          hoursEstimate: 8,
          tags: ["Design"],
          subtasks: ["Sketch layouts", "Figma mockups design", "Gather team feedback"]
        },
        {
          title: "Feature Development",
          description: "Build codebase for frontend and integrate related API services.",
          priority: "medium",
          hoursEstimate: 12,
          tags: ["Frontend", "API"],
          subtasks: ["Write UI components", "Connect data APIs", "Resolve compilation issues"]
        },
        {
          title: "Testing & Deploy",
          description: "Run feature tests, resolve issues, and complete the deploy process.",
          priority: "low",
          hoursEstimate: 4,
          tags: ["Testing"],
          subtasks: ["Write unit tests", "Fix CSS/JS bugs", "Deploy live update"]
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
      const subtaskItems = t.subtasks.map((stTitle: string, stIdx: number) => ({
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
    onAddSyncLog(`Successfully added ${generatedTasks.length} tasks from Apexa AI to Task Manager`);
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
            return <h4 key={i} className="text-sm font-extrabold text-indigo-700 tracking-tight mt-3 mb-1">{trimmed.replace('###', '').trim()}</h4>;
          }
          if (trimmed.startsWith('##')) {
            return <h3 key={i} className="text-base font-black text-slate-800 dark:text-slate-50 tracking-tight mt-4 mb-1.5">{trimmed.replace('##', '').trim()}</h3>;
          }
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const cleanLine = trimmed.replace(/^[\s-*]+/, '').trim();
            // simple check for bold text like **Title**: Content
            const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)/);
            if (boldMatch) {
              return (
                <div key={i} className="flex gap-1.5 ml-2.5 items-start">
                  <span className="text-indigo-500 font-extrabold mt-0.5">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white font-semibold">{boldMatch[1]}</strong>
                    {boldMatch[2]}
                  </span>
                </div>
              );
            }
            return (
              <div key={i} className="flex gap-1.5 ml-2.5 items-start">
                <span className="text-indigo-500 font-extrabold mt-0.5">•</span>
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
              <div key={i} className="flex gap-2 ml-1 items-start">
                <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-[9.5px] font-black flex items-center justify-center shadow-3xs mt-0.5 select-none font-sans">
                  {num}
                </span>
                <span className="flex-1 pt-0.5">
                  {boldMatch ? (
                    <>
                      <strong className="text-slate-900 dark:text-white font-semibold">{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </>
                  ) : (
                    content
                  )}
                </span>
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
          title="Trợ lý AI Apexa"
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
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-l border-slate-200/80 dark:border-slate-800/80 shadow-[-10px_0_50px_-15px_rgba(99,102,241,0.15)] z-40 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-805 relative overflow-hidden shrink-0">
                {/* Decorative glowing gradient sphere in the header background */}
                <div className="absolute top-[-50px] left-[20%] w-[150px] h-[150px] bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                <div className="absolute top-[-30px] right-[10%] w-[100px] h-[100px] bg-pink-500/10 rounded-full blur-[30px] pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-slate-850 to-indigo-950 border border-sky-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                    <ApexaAiIcon className="w-5 h-5" variant="gradient" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight flex items-center gap-2 text-white font-display">
                      AI Apexa
                      <span className="flex items-center gap-1.5 bg-sky-500/20 text-sky-300 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-sky-500/30 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {activeModelName}
                      </span>
                    </h2>
                    <p className="text-[10px] text-slate-400">Trợ lý AI điều phối dự án thông minh</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-900/50 hover:bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-450 hover:text-white transition-all cursor-pointer relative z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Offline mode warn notification bar */}
              {isOffline && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-2 text-[10px] font-bold text-amber-650 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Mạng đang ngoại tuyến. Một số tính năng AI đã chuyển sang chế độ dự phòng cục bộ.</span>
                </div>
              )}

              {/* Navigation Tabs bar inside Drawer */}
              <div className="flex border-b border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/40 p-1.5 gap-1.5 relative shrink-0">
                {[
                  { id: 'query', label: 'Ask Progress', icon: TrendingUp },
                  { id: 'summarize', label: 'Wiki Summary', icon: FileText },
                  { id: 'subtasks', label: 'Suggest Subtasks', icon: CheckSquare },
                  { id: 'generate-tasks', label: 'Create AI Tasks', icon: Sparkles }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as TabType);
                      }}
                      className="flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active_ai_tab"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-[0_2px_8px_rgba(99,102,241,0.08)] border border-slate-200/50 dark:border-slate-700/50"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-3.5 h-3.5 relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-450 dark:text-slate-400'}`} />
                      <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-550 dark:text-slate-400'}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* DRAWER CONTENT DISPLAY - WITH INDIVIDUAL TABS SCROLLABLE INTERNALLY */}
              <div className="flex-1 overflow-hidden p-5 flex flex-col relative">
                {(isOffline || isAiFallbackActive) && (
                  <div className="p-3.5 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-2 shadow-xs leading-normal shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Chế độ dự phòng:</strong> Apexa AI cần gói trả phí và kết nối mạng. Hãy nâng cấp gói để sử dụng AI trực tuyến.
                    </div>
                  </div>
                )}
                
                {/* --- TAB 1: QUERY STATUS --- */}
                {activeTab === 'query' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                    <div className="space-y-1.5 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Yêu cầu phân tích nhanh</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { text: "Bản tin công việc hôm nay", q: "Kiểm tra công việc hôm nay: việc nào quá hạn, đến hạn hôm nay hoặc ngày mai? Hãy chọn tối đa 3 việc tôi cần tập trung trước và giải thích ngắn gọn." },
                          { text: "Tóm tắt tiến độ công việc", q: "Phân tích và tóm tắt tiến độ hiện tại. Có bao nhiêu công việc đang thực hiện, quá hạn và đã hoàn thành?" },
                          { text: "What are the urgent tasks?", q: "Which tasks have urgent or high priority? What issues require attention?" },
                          { text: "Resource allocation summary", q: "Summarize task allocation for each team member. Who has the most tasks assigned?" }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setQueryInput(btn.q);
                              handleQuery(btn.q);
                            }}
                            className="p-3 text-left border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all duration-350 cursor-pointer group text-[10px] leading-snug flex flex-col justify-between h-16 bg-white dark:bg-slate-900/50 shadow-xs hover:shadow-[0_4px_15px_rgba(99,102,241,0.06)] relative overflow-hidden"
                          >
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-all duration-300" />
                            <span className="font-bold text-slate-800 dark:text-slate-300 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors duration-250">{btn.text}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5">
                              Đặt câu hỏi <ArrowRight className="w-2.5 h-2.5 transition-transform duration-300 group-hover:translate-x-1 text-slate-350 group-hover:text-indigo-500" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat console view (flex-1) */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md flex flex-col justify-start overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="w-full space-y-4 py-4 px-2 m-auto">
                            <div className="flex items-center gap-2 text-indigo-500 font-extrabold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>AI Apexa đang phân tích khối lượng công việc...</span>
                            </div>
                            <div className="space-y-3 max-w-sm mx-auto">
                              <div className="h-3.5 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-5/6 mx-auto" />
                            </div>
                          </div>
                        ) : responseText ? (
                          <div className="space-y-4">
                            <div className="flex gap-3 items-start">
                              <ApexaAiAvatar size="sm" />
                              <div className="flex-1 space-y-2.5 relative pr-8 bg-slate-50/50 dark:bg-slate-800/20 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button
                                    onClick={() => handleCopyText(responseText)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer"
                                    title={copied ? "Đã sao chép!" : "Sao chép phản hồi"}
                                  >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleToggleSpeech(responseText)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer"
                                    title={playingSpeech ? "Mute speech" : "Read message out loud"}
                                  >
                                    {playingSpeech ? <VolumeX className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                {renderMarkdown(responseText)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-2">
                            <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                            <p className="text-[10px] font-extrabold text-slate-700 dark:text-slate-350">Tìm kiếm và phân tích thông tin dự án</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">Chọn một gợi ý nhanh ở trên hoặc nhập câu hỏi về danh sách công việc vào ô bên dưới.</p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>

                    {/* Voice audio listening active feedback */}
                    {isListening && (
                      <div className="p-3 border border-rose-100 bg-rose-50/50 dark:bg-rose-955/20 rounded-xl flex items-center gap-2 animate-pulse shrink-0">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                        </span>
                        <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400">Đang nghe giọng nói (vi-VN)... Hãy nói ngay!</span>
                      </div>
                    )}

                    {recognitionError && (
                      <div className="p-2 border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 text-[10px] text-rose-600 dark:text-rose-400 rounded-xl font-semibold flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>{recognitionError}</span>
                      </div>
                    )}

                    {/* Query Custom input block */}
                    <div className="shrink-0 bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-805 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-505 transition-all flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                          isListening 
                            ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200' 
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400'
                        }`}
                        title={isListening ? "Đang nghe... Nhấp để dừng" : "Nhập bằng giọng nói (Micrô)"}
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
                      </button>

                      <input
                        type="text"
                        placeholder={isListening ? "Đang nghe giọng nói của bạn..." : "Hỏi về tiến độ, hiệu suất, phân bổ..."}
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuery();
                        }}
                        className="flex-1 px-1 py-2 text-xs text-slate-800 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent font-medium"
                        disabled={isListening}
                      />
                      <button
                        type="button"
                        onClick={() => setSearchWeb(!searchWeb)}
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                          searchWeb 
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-650 dark:text-indigo-400 shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400'
                        }`}
                        title={searchWeb ? "Web Search Grounding Enabled" : "Web Search Grounding Disabled"}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleQuery()}
                        disabled={loading || !queryInput.trim() || isListening}
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white cursor-pointer select-none transition-all shrink-0 ${
                          (queryInput.trim() && !isListening) ? 'bg-indigo-650 hover:bg-indigo-700 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}


                {/* --- TAB 2: SUMMARIZE WIKI DOC --- */}
                {activeTab === 'summarize' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                    <div className="space-y-2 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chọn tài liệu hệ thống</label>
                      <select
                        value={selectedDocId}
                        onChange={(e) => {
                          setSelectedDocId(e.target.value);
                          setDocSummary('');
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-semibold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 shadow-sm"
                      >
                        {documents.length === 0 ? (
                          <option value="">Không có tài liệu</option>
                        ) : (
                          documents.map(d => (
                            <option key={d.id} value={d.id}>{d.category} - {d.title}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tùy chọn thao tác AI</label>
                      <div className="flex gap-2">
                        {[
                          { label: "Concise Summary", action: 'summarize' as const },
                          { label: "Professional Edit", action: 'points' as const },
                          { label: "Mở rộng bài viết", action: 'actions' as const }
                        ].map((act, index) => (
                          <button
                            key={index}
                            onClick={() => handleSummarizeDoc(act.action)}
                            disabled={!selectedDocId || loading}
                            className="flex-1 py-2.5 px-1 text-[10px] font-extrabold bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-4 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>AI Apexa đang xử lý bằng Gemini...</span>
                            </div>
                            <div className="space-y-3">
                              <div className="h-4 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-5/6 mx-auto" />
                            </div>
                          </div>
                        ) : docSummary ? (
                          <div className="space-y-1 relative pr-8">
                            <div className="absolute top-0 right-0 flex gap-1">
                              <button
                                onClick={() => handleCopyText(docSummary)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer"
                                title={copied ? "Đã sao chép!" : "Sao chép tài liệu"}
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleToggleSpeech(docSummary)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer"
                                title={playingSpeech ? "Mute speech" : "Read message out loud"}
                              >
                                {playingSpeech ? <VolumeX className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {renderMarkdown(docSummary)}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-1.5">
                            <FileText className="w-6 h-6 text-slate-350 mx-auto" />
                            <p className="text-[10px] font-bold">Soạn và rà soát tài liệu Wiki</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">Chọn tài liệu Wiki ở trên, sau đó chọn thao tác AI để tự động tạo bản nháp.</p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}


                {/* --- TAB 3: SUBTASK GENERATOR --- */}
                {activeTab === 'subtasks' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                    <div className="space-y-2 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Chọn công việc chính</label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(e.target.value);
                          setSuggestedSubtasks([]);
                          setSubtasksApplied(false);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-semibold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 shadow-sm"
                      >
                        {tasks.length === 0 ? (
                          <option value="">Không có công việc</option>
                        ) : (
                          tasks.map(t => (
                            <option key={t.id} value={t.id}>[{t.priority.toUpperCase()}] {t.title}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateSubtasks}
                      disabled={!selectedTaskId || loading}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed border border-indigo-600/20 shrink-0"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>AI Apexa đang tách công việc con...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
                          <span>Đề xuất công việc con bằng AI</span>
                        </>
                      )}
                    </button>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-4 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>Đang phân tích cấu trúc công việc...</span>
                            </div>
                            <div className="space-y-3">
                              <div className="h-4 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                            </div>
                          </div>
                        ) : suggestedSubtasks.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Danh sách công việc con được đề xuất:</span>
                            <div className="space-y-2">
                              {suggestedSubtasks.map((st, i) => (
                                <div key={i} className="flex gap-2.5 items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                                  <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-[10px] font-black text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 shrink-0">
                                    {i + 1}
                                  </div>
                                  <span className="text-xs text-slate-750 dark:text-slate-200 font-semibold leading-snug">{st}</span>
                                </div>
                              ))}
                            </div>

                            {subtasksApplied ? (
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-955/10 border border-emerald-205 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 animate-fade-in shadow-xs">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                                <span>Đã áp dụng vào công việc!</span>
                              </div>
                            ) : (
                              <button
                                onClick={applySubtasksToTask}
                                className="w-full py-2 px-3 mt-2 bg-emerald-50 dark:bg-emerald-955/10 hover:bg-emerald-100 dark:hover:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] rounded-lg transition-colors border border-emerald-200/50 dark:border-emerald-900/30 cursor-pointer text-center shadow-xs"
                              >
                                + Áp dụng danh sách này vào công việc
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-1.5">
                            <CheckSquare className="w-6 h-6 text-slate-350 mx-auto" />
                            <p className="text-[10px] font-bold">Phân rã công việc con thông minh</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">Chọn một công việc phức tạp ở trên, sau đó bấm nút AI đề xuất để tự động chia thành các công việc con có thể thực hiện.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* --- TAB 4: AI TASK GENERATOR --- */}
                {activeTab === 'generate-tasks' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-4 font-sans">
                    <div className="space-y-1.5 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ý tưởng gợi ý nhanh</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { text: "Landing Page", q: "Plan tasks for design and development of a product Landing Page" },
                          { text: "Marketing Campaign", q: "Plan a digital marketing campaign for a new tech product launch" },
                          { text: "Digital Recruitment", q: "Build a hiring and onboarding workflow for Software Developers" },
                          { text: "Kiểm tra bảo mật", q: "Liệt kê các công việc kiểm tra lỗ hổng và kiểm thử xâm nhập hệ thống" }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setTaskPrompt(btn.q);
                              handleGenerateTasks(btn.q);
                            }}
                            className="p-3 text-left border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all duration-350 cursor-pointer group text-[10px] leading-snug flex flex-col justify-between h-14 bg-white dark:bg-slate-900/50 shadow-xs hover:shadow-[0_4px_15px_rgba(99,102,241,0.06)] relative overflow-hidden"
                          >
                            <span className="font-bold text-slate-850 dark:text-slate-350 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors duration-200">{btn.text}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5">
                              Chọn đề xuất 
                              <ArrowRight className="w-2.5 h-2.5 transition-transform duration-300 group-hover:translate-x-1 text-slate-350 group-hover:text-indigo-500" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Mô tả mục tiêu để AI tạo công việc..."
                        value={taskPrompt}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerateTasks();
                        }}
                        className="flex-1 px-2 py-2 text-xs text-slate-850 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent font-medium"
                      />
                      <button
                        onClick={() => handleGenerateTasks()}
                        disabled={loading || !taskPrompt.trim()}
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white cursor-pointer select-none transition-all shrink-0 ${
                          (taskPrompt.trim()) ? 'bg-indigo-650 hover:bg-indigo-700 shadow-sm' : 'bg-slate-105 dark:bg-slate-800 text-slate-400 dark:text-slate-550 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-4 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>AI Apexa đang lập kế hoạch chi tiết...</span>
                            </div>
                            <div className="space-y-3">
                              <div className="h-4 animate-shimmer-fast rounded-lg w-3/4 mx-auto" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-full" />
                              <div className="h-3 animate-shimmer-fast rounded-lg w-5/6 mx-auto" />
                            </div>
                          </div>
                        ) : generatedTasks.length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-55 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/30 dark:border-slate-800/50">
                              <span className="text-[10px] font-bold text-slate-555 dark:text-slate-400 font-sans">Suggested {generatedTasks.length} công việc:</span>
                              {tasksCreated ? (
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 flex items-center gap-1 font-sans">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã thêm thành công!</span>
                                </div>
                              ) : (
                                <button
                                  onClick={applyGeneratedTasks}
                                  className="py-1.5 px-3 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer font-sans shadow-xs"
                                >
                                  + Thêm tất cả vào dự án
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {generatedTasks.map((t, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 shadow-xs space-y-2 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-850 dark:text-slate-100 font-sans leading-tight">{t.title}</span>
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border shrink-0 ${
                                      t.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-955/20 dark:text-rose-450 dark:border-rose-900/30' :
                                      t.priority === 'high' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-955/20 dark:text-amber-450 dark:border-amber-900/30' :
                                      t.priority === 'medium' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-955/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                                      'bg-slate-50 text-slate-650 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800'
                                    }`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">{t.description}</p>
                                  
                                  <div className="flex flex-wrap gap-1.5 items-center pt-1">
                                    <span className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold mr-1 font-sans flex items-center gap-1">⏱️ {t.hoursEstimate} {locale === 'vi' ? 'giờ' : 'hrs'}</span>
                                    {t.tags && t.tags.map((tag: string, tagIdx: number) => (
                                      <span key={tagIdx} className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold font-sans">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>

                                  {t.subtasks && t.subtasks.length > 0 && (
                                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">Danh sách công việc con:</span>
                                      <div className="space-y-1">
                                        {t.subtasks.map((st: string, stIdx: number) => (
                                          <div key={stIdx} className="flex gap-1.5 items-center text-[9px] text-slate-600 dark:text-slate-350 font-sans">
                                            <span className="text-indigo-400 dark:text-indigo-500 shrink-0">•</span>
                                            <span>{st}</span>
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
                            <Sparkles className="w-6 h-6 text-indigo-450 mx-auto animate-pulse" />
                            <p className="text-[10px] font-bold font-sans">Trình lập kế hoạch công việc tự động</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-sans">Nhập mục tiêu dự án (ví dụ: "Thiết kế ứng dụng tài chính") và AI sẽ tự động chia thành các công việc chi tiết, kèm công việc con và ước tính.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer and credits */}
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                <span className="flex items-center gap-1.5">
                  <ApexaAiIcon className="w-3.5 h-3.5 animate-pulse" variant="gradient" />
                  Công cụ AI Apexa đang hoạt động
                </span>
                <span>Vận hành bởi Gemini API</span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
