"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Brain, Bot, Send, X, FileText, CheckSquare, 
  TrendingUp, AlertTriangle, Users, ArrowRight, Check, Play, HelpCircle, Loader2,
  Mic, MicOff
} from 'lucide-react';
import { Task, Document, User } from '../types';

interface AvaxaBrainAssistantProps {
  tasks: Task[];
  documents: Document[];
  members: User[];
  isOffline: boolean;
  onUpdateTask: (updatedTask: Task) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  onAddSyncLog: (action: string) => void;
}

type TabType = 'query' | 'summarize' | 'subtasks' | 'generate-tasks';

export default function AvaxaBrainAssistant({
  tasks,
  documents,
  members,
  isOffline,
  onUpdateTask,
  onAddTask,
  onAddSyncLog
}: AvaxaBrainAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [responseText, setResponseText] = useState<string>('');
  const [isAiFallbackActive, setIsAiFallbackActive] = useState(false);
  
  // Voice transcription state variables
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

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
        setResponseText("⚠️ Offline: Avaxa Brain cannot connect to Gemini AI servers at this time. Please enable network connection (Click the SYNCD button in the bottom-left corner) to resume online queries!");
      }, 700);
      return;
    }

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: finalQuery,
          tasks,
          documents,
          members
        })
      });

      const data = await res.json();
      if (data.success && data.text) {
        setResponseText(data.text);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Asked Avaxa Brain: "${finalQuery.slice(0, 20)}..."`);
      } else {
        throw new Error(data.error || "Fail Response");
      }
    } catch (err: any) {
      console.error(err);
      setIsAiFallbackActive(true);
      // Fallback response with beautiful markdown formatting
      setResponseText(`### Task Progress Analysis (Local Fallback)
Based on current information, here is a quick summary:
- 📊 **Completion Rate**: You have completed **${tasks.filter(t => t.status === 'completed').length}/${tasks.length}** tasks.
- ⚠️ **Urgency Level**: You have **${tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}** High/Urgent priority tasks.
- 👥 **Resource Allocation**: **${members.length}** members are actively assigned.

*Hint: Please check your API key configuration or network connection to get the best synchronized results.*`);
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
      const res = await fetch('/api/ai/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          content: doc.content,
          action: actionPrompt
        })
      });

      const data = await res.json();
      if (data.success && data.text) {
        setDocSummary(data.text);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Avaxa Brain analyzed document: "${doc.title}"`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      // Local fallback
      setIsAiFallbackActive(true);
      let fallbackText = `### Document Analysis: ${doc.title}\n\n`;
      if (type === 'summarize') {
        fallbackText += `- **Concise Summary**: The document outlines platform architecture guidelines and operations streamlining.\n- **Keywords**: Productivity, Synchronization, Modern ClickUp Workflows.`;
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
      const res = await fetch('/api/ai/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description
        })
      });

      const data = await res.json();
      if (data.subtasks && data.subtasks.length > 0) {
        setSuggestedSubtasks(data.subtasks);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Avaxa Brain suggested ${data.subtasks.length} subtasks for: "${task.title}"`);
      } else {
        throw new Error("Zero list");
      }
    } catch (err) {
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
        onAddSyncLog(`Avaxa Brain suggested 3 tasks (Offline Fallback)`);
      }, 700);
      return;
    }

    try {
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt })
      });

      const data = await res.json();
      if (data.tasks) {
        setGeneratedTasks(data.tasks);
        setIsAiFallbackActive(false);
        onAddSyncLog(`Avaxa Brain planned ${data.tasks.length} tasks for: "${finalPrompt.slice(0, 20)}..."`);
      } else {
        throw new Error("Response error");
      }
    } catch (err) {
      console.error(err);
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
    onAddSyncLog(`Successfully added ${generatedTasks.length} tasks from Avaxa Brain to Task Manager`);
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
          
          if (trimmed === '') return <div key={i} className="h-1" />;
          
          return <p key={i} className="pl-0.5">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* PERSISTENT FLOATING BUTTON (Avaxa Brain Icon) */}
      <div className="fixed right-6 bottom-6 z-40">
        <motion.button
          id="btn_avaxa_brain_float"
          onClick={() => {
            setIsOpen(!isOpen);
            // Default selections if unselected
            if (documents.length > 0 && !selectedDocId) setSelectedDocId(documents[0].id);
            if (tasks.length > 0 && !selectedTaskId) setSelectedTaskId(tasks[0].id);
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            boxShadow: isOpen 
              ? "0 0 0 4px rgba(99, 102, 241, 0.2)" 
              : ["0 4px 20px rgba(99,102,241,0.3)", "0 4px 24px rgba(236,72,153,0.5)", "0 4px 20px rgba(99,102,241,0.3)"]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-xl cursor-pointer relative"
          title="Avaxa Brain AI Assistant"
        >
          {isOpen ? (
            <X className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <Brain className="w-6 h-6 shrink-0" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-500 rounded-full border border-white text-[8px] font-bold flex items-center justify-center">
                AI
              </div>
            </>
          )}
        </motion.button>
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
              className="fixed inset-0 bg-slate-900 z-40 cursor-default"
            />

            {/* AI Assistant Drawer Container */}
            <motion.div
              id="avaxa_brain_drawer"
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700/80 shadow-2xl z-40 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between border-b border-indigo-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-505 bg-indigo-50/10 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black font-display tracking-tight flex items-center gap-1.5 text-white">
                      Avaxa Brain
                      <span className="bg-indigo-500/20 text-indigo-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-indigo-500/30">Gemini 3.5</span>
                    </h2>
                    <p className="text-[10px] text-slate-300">Smart project coordination AI assistant</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Offline mode warn notification bar */}
              {isOffline && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Network is offline. Some AI features have been switched to local fallback mode.</span>
                </div>
              )}

              {/* Navigation Tabs bar inside Drawer */}
              <div className="flex border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 p-1 gap-1">
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
                      className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-205 border-indigo-100' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* DRAWER CONTENT DISPLAY - WITH INDIVIDUAL TABS SCROLLABLE */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col">
                {(isOffline || isAiFallbackActive) && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-2 shadow-xs leading-normal">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>⚠️ Offline / AI Simulation Mode:</strong> Avaxa Brain is operating in simulation mode because the server is offline or the access key (GEMINI_API_KEY) is not set. The analysis results shown below are sample data for testing.
                    </div>
                  </div>
                )}
                
                {/* --- TAB 1: QUERY STATUS --- */}
                {activeTab === 'query' && (
                  <div className="space-y-4 flex flex-col flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Quick analysis requests</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { text: "Task progress summary", q: "Analyze and summarize the progress status of current tasks. How many tasks are running, overdue, and completed?" },
                          { text: "What are the urgent tasks?", q: "Which tasks have urgent or high priority? What issues require attention?" },
                          { text: "Resource allocation summary", q: "Summarize task allocation for each team member. Who has the most tasks assigned?" },
                          { text: "Operational feedback", q: "Act as a project operations expert and give me performance optimization advice based on the current task list." }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setQueryInput(btn.q);
                              handleQuery(btn.q);
                            }}
                            className="p-2.5 text-left border border-slate-150 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-xl transition-all cursor-pointer group text-[10px] leading-tight flex flex-col justify-between h-16 bg-white dark:bg-slate-900"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-550 group-hover:text-indigo-600 transition-colors">{btn.text}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-normal flex items-center gap-1">
                              Ask question <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative flex-1 flex flex-col min-h-[160px]">
                      {/* Results display console */}
                      <div className="flex-1 p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-start overflow-y-auto max-h-[240px]">
                        {loading ? (
                          <div className="m-auto flex flex-col items-center gap-2 p-6 text-center">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium animate-pulse">Avaxa Brain is analyzing your project workload...</span>
                          </div>
                        ) : responseText ? (
                          <div className="space-y-1">
                            {renderMarkdown(responseText)}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-1.5">
                            <HelpCircle className="w-6 h-6 text-slate-350 mx-auto" />
                            <p className="text-[10px] font-bold">Search & Analyze Project Info</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">Select a quick suggest option above or type any question about the task list in the input bar below.</p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>

                    {/* Voice audio listening active feedback */}
                    {isListening && (
                      <div className="p-2 border border-rose-105 bg-rose-50/50 rounded-xl flex items-center gap-2 animate-pulse">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                        </span>
                        <span className="text-[10px] font-bold text-rose-700">Listening to voice (Vietnamese vi-VN)... Speak now!</span>
                      </div>
                    )}

                    {recognitionError && (
                      <div className="p-2 border border-rose-100 bg-rose-50 text-[10px] text-rose-600 rounded-xl font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{recognitionError}</span>
                      </div>
                    )}

                    {/* Query Custom input block */}
                    <div className="flex gap-2 items-center bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-sm focus-within:border-indigo-400 transition-colors">
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                          isListening 
                            ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                        title={isListening ? "Listening... Click to stop" : "Voice Input (Mic)"}
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
                      </button>

                      <input
                        type="text"
                        placeholder={isListening ? "Listening to your voice..." : "Ask about progress, performance, allocation..."}
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuery();
                        }}
                        className="flex-1 px-1 py-2 text-xs text-slate-800 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        disabled={isListening}
                      />
                      <button
                        onClick={() => handleQuery()}
                        disabled={loading || !queryInput.trim() || isListening}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white cursor-pointer select-none transition-colors shrink-0 ${
                          (queryInput.trim() && !isListening) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}


                {/* --- TAB 2: SUMMARIZE WIKI DOC --- */}
                {activeTab === 'summarize' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Select system document</label>
                      <select
                        value={selectedDocId}
                        onChange={(e) => {
                          setSelectedDocId(e.target.value);
                          setDocSummary('');
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-medium outline-none focus:border-indigo-400 shadow-sm"
                      >
                        {documents.length === 0 ? (
                          <option value="">No documents available</option>
                        ) : (
                          documents.map(d => (
                            <option key={d.id} value={d.id}>{d.category} - {d.title}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">AI Action Options</label>
                      <div className="flex gap-2">
                        {[
                          { label: "Concise Summary", action: 'summarize' as const },
                          { label: "Professional Edit", action: 'points' as const },
                          { label: "Expand Article", action: 'actions' as const }
                        ].map((act, index) => (
                          <button
                            key={index}
                            onClick={() => handleSummarizeDoc(act.action)}
                            disabled={!selectedDocId || loading}
                            className="flex-1 py-2 px-1 text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-150 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 min-h-[160px] flex flex-col">
                      <div className="flex-1 p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col overflow-y-auto max-h-[300px]">
                        {loading ? (
                          <div className="m-auto flex flex-col items-center gap-2 p-6 text-center">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium animate-pulse">Avaxa Brain is editing document using Gemini algorithms...</span>
                          </div>
                        ) : docSummary ? (
                          <div className="space-y-1">
                            {renderMarkdown(docSummary)}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-1.5">
                            <FileText className="w-6 h-6 text-slate-350 mx-auto" />
                            <p className="text-[10px] font-bold">Compose & Review Wiki Docs</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">Select a Wiki document from the options above, then click an AI action to automatically draft immediately.</p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}


                {/* --- TAB 3: SUBTASK GENERATOR --- */}
                {activeTab === 'subtasks' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Select Main Task</label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(e.target.value);
                          setSuggestedSubtasks([]);
                          setSubtasksApplied(false);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-medium outline-none focus:border-indigo-400 shadow-sm"
                      >
                        {tasks.length === 0 ? (
                          <option value="">No tasks available</option>
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
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Avaxa Brain is extracting subtasks...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
                          <span>Suggest Subtasks with AI</span>
                        </>
                      )}
                    </button>

                    <div className="flex-1 min-h-[160px] flex flex-col">
                      <div className="flex-1 p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col overflow-y-auto max-h-[250px]">
                        {suggestedSubtasks.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Suggested subtasks list:</span>
                            <div className="space-y-2">
                              {suggestedSubtasks.map((st, i) => (
                                <div key={i} className="flex gap-2 items-center p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm">
                                  <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100 shrink-0">
                                    {i + 1}
                                  </div>
                                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-tight">{st}</span>
                                </div>
                              ))}
                            </div>

                            {/* Applied indicator or button action */}
                            {subtasksApplied ? (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>Successfully applied to task!</span>
                              </div>
                            ) : (
                              <button
                                onClick={applySubtasksToTask}
                                className="w-full py-2 px-3 mt-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] rounded-lg transition-colors border border-emerald-200 cursor-pointer text-center"
                              >
                                + Apply this list to my Task
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-1.5">
                            <CheckSquare className="w-6 h-6 text-slate-350 mx-auto" />
                            <p className="text-[10px] font-bold">Smart Subtasks Breakdown</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">Select a complex task above, then click the AI Suggest button to automatically break it down into actionable subtasks.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB 4: AI TASK GENERATOR --- */}
                {activeTab === 'generate-tasks' && (
                  <div className="space-y-4 flex-1 flex flex-col font-sans">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Quick Suggested Ideas</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { text: "Landing Page", q: "Plan tasks for design and development of a product Landing Page" },
                          { text: "Marketing Campaign", q: "Plan a digital marketing campaign for a new tech product launch" },
                          { text: "Digital Recruitment", q: "Build a hiring and onboarding workflow for Software Developers" },
                          { text: "Security Audit", q: "List vulnerability audit tasks and system penetration tests" }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setTaskPrompt(btn.q);
                              handleGenerateTasks(btn.q);
                            }}
                            className="p-2 border border-slate-150 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-xl transition-all cursor-pointer group text-[10px] leading-tight flex flex-col justify-between h-14 bg-white dark:bg-slate-900 text-left"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-50 group-hover:text-indigo-600 transition-colors">{btn.text}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-normal flex items-center gap-1">
                              Select proposal <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-sm focus-within:border-indigo-400 transition-colors">
                      <input
                        type="text"
                        placeholder="Describe goal to generate tasks via AI..."
                        value={taskPrompt}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerateTasks();
                        }}
                        className="flex-1 px-2 py-2 text-xs text-slate-800 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent"
                      />
                      <button
                        onClick={() => handleGenerateTasks()}
                        disabled={loading || !taskPrompt.trim()}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white cursor-pointer select-none transition-colors shrink-0 ${
                          (taskPrompt.trim()) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-h-[160px] flex flex-col">
                      <div className="flex-1 p-3 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col overflow-y-auto max-h-[340px]">
                        {loading ? (
                          <div className="m-auto flex flex-col items-center gap-2 p-6 text-center">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium animate-pulse font-sans">Avaxa Brain is planning detailed tasks...</span>
                          </div>
                        ) : generatedTasks.length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-sans">Suggested {generatedTasks.length} tasks:</span>
                              {tasksCreated ? (
                                <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 font-sans">
                                  <Check className="w-3 h-3" />
                                  <span>Successfully added!</span>
                                </div>
                              ) : (
                                <button
                                  onClick={applyGeneratedTasks}
                                  className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer font-sans"
                                >
                                  + Add all to project
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {generatedTasks.map((t, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-left">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-850 dark:text-slate-100 font-sans leading-tight">{t.title}</span>
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border shrink-0 ${
                                      t.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                                      t.priority === 'high' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                                      t.priority === 'medium' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                                      'bg-slate-50 text-slate-650 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800'
                                    }`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">{t.description}</p>
                                  
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[9px] text-slate-450 dark:text-slate-500 font-medium mr-1 font-sans">⏱️ {t.hoursEstimate} giờ</span>
                                    {t.tags && t.tags.map((tag: string, tagIdx: number) => (
                                      <span key={tagIdx} className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold font-sans">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>

                                  {t.subtasks && t.subtasks.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                                      <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-550 block font-sans">Subtasks list:</span>
                                      <div className="space-y-0.5">
                                        {t.subtasks.map((st: string, stIdx: number) => (
                                          <div key={stIdx} className="flex gap-1 items-center text-[9px] text-slate-600 dark:text-slate-350 font-sans">
                                            <span className="text-indigo-400 shrink-0">•</span>
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
                            <Sparkles className="w-6 h-6 text-indigo-400 mx-auto animate-pulse" />
                            <p className="text-[10px] font-bold font-sans">Automated Task Planner</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-sans">Enter your project goal (e.g. "Design a finance app") and AI will automatically break it down into detailed tasks, complete with subtasks and estimations.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer and credits */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-indigo-500" />
                  Avaxa Autonomous Brain Active
                </span>
                <span>Powered by Gemini API</span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
