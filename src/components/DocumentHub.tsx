"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, User } from '../types';
import { 
  FileText, Folder, Plus, Bot, Sparkles, AlertCircle,
  Clock, Trash2, Edit, Check, Eye, HelpCircle, ArrowLeftRight
} from 'lucide-react';

interface DocumentHubProps {
  docs: Document[];
  currentUser: any;
  onAddDoc: (doc: Omit<Document, 'id' | 'updatedAt'>) => void;
  onUpdateDoc: (doc: Document) => void;
  onDeleteDoc: (id: string) => void;
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  initialSelectedDocId?: string | null;
  onClearInitialSelectedDocId?: () => void;
}

export default function DocumentHub({
  docs,
  currentUser,
  onAddDoc,
  onUpdateDoc,
  onDeleteDoc,
  isOffline,
  onAddSyncLog,
  initialSelectedDocId,
  onClearInitialSelectedDocId
}: DocumentHubProps) {
  const [activeDocId, setActiveDocId] = useState<string>(docs[0]?.id || '');

  // Focus and select document specified by global header search
  React.useEffect(() => {
    if (initialSelectedDocId) {
      const doc = docs.find(d => d.id === initialSelectedDocId);
      if (doc) {
        setActiveDocId(initialSelectedDocId);
        if (onClearInitialSelectedDocId) {
          onClearInitialSelectedDocId();
        }
      }
    }
  }, [initialSelectedDocId, docs, onClearInitialSelectedDocId]);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Cover gradients presets of Notion:
  const COVERS = [
    'linear-gradient(to right, #6366f1, #a855f7, #ec4899)', // Sunset Glamour
    'linear-gradient(to right, #10b981, #3b82f6)',        // Forest Mint
    'linear-gradient(to right, #f59e0b, #e11d48)',        // Solar Flare
    'linear-gradient(to right, #00c6ff, #0072ff)',        // Ocean Deep
    'linear-gradient(to right, #24243e, #300030, #0f0c1b)', // Cyber Space
    'linear-gradient(to right, #833ab4, #fd1d1d, #fcb045)'  // Vintage Retro
  ];

  const EMOJIS = ['📝', '🚀', '💡', '💻', '📊', '🎨', '🛠️', '📅', '🗂️', '🏆', '🎯', '✨', '🍀', '🧠', '💼', '🏡'];

  const cycleCover = () => {
    const active = getActiveDoc();
    if (!active) return;
    const currentIdx = (active as any).coverIndex || 0;
    const nextIdx = (currentIdx + 1) % COVERS.length;
    onUpdateDoc({
      ...active,
      coverIndex: nextIdx as any
    });
    onAddSyncLog(`Changed document cover photo to a new style!`);
  };

  const cycleEmoji = (emo: string) => {
    const active = getActiveDoc();
    if (!active) return;
    onUpdateDoc({
      ...active,
      emoji: emo as any
    });
    setShowEmojiPicker(false);
    onAddSyncLog(`Changed document emoji to ${emo}`);
  };

  const insertNotionBlock = (blockType: 'callout' | 'todo' | 'code' | 'quote' | 'table') => {
    const active = getActiveDoc();
    if (!active) return;
    
    let blockText = '';
    switch (blockType) {
      case 'callout':
        blockText = `\n\n> 💡 **Callout block:** Enter important notes or core messages here to highlight the document.`;
        break;
      case 'todo':
        blockText = `\n\n- [ ] [New Task] - Enter task description here.\n- [ ] [Task 2] - Under review`;
        break;
      case 'code':
        blockText = `\n\n\`\`\`typescript\n// Avaxa Agent API Configuration \nconst avaxaConfig = {\n  version: "4.5_Notion_OS",\n  sync: "realtime_supabase"\n};\n\`\`\``;
        break;
      case 'quote':
        blockText = `\n\n> "Core strength comes from execution speed and one-touch real-time synchronization." - *Notion Builder*`;
        break;
      case 'table':
        blockText = `\n\n| KPI Metric | Q2 Goal | Status | Due |\n| :--- | :--- | :--- | :--- |\n| UI/UX Web | Clean & smooth | Completed | 2026-06 |\n| Calendar Sync | Firebase & GCal | Syncing | 2026-06 |`;
        break;
    }
    
    handleUpdateDocContent(active.content + blockText);
    onAddSyncLog(`Inserted Notion block formatting (${blockType})`);
  };
  
  // Create doc form parameters
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Dự án');
  const [newContent, setNewContent] = useState('');

  // AI execution loading
  const [aiWorking, setAiWorking] = useState(false);
  const [aiAction, setAiAction] = useState<'summarize' | 'improve' | 'expand' | null>(null);

  const getActiveDoc = () => {
    return docs.find(d => d.id === activeDocId) || docs[0];
  };

  const handleUpdateDocContent = (text: string) => {
    const active = getActiveDoc();
    if (!active) return;

    onUpdateDoc({
      ...active,
      content: text,
      updatedBy: currentUser?.name || 'Hoàng Benjamin'
    });
  };

  // Triggers Gemini AI Document assistant calling the server Express routes
  const triggerAiDocAction = async (action: 'summarize' | 'improve' | 'expand') => {
    const active = getActiveDoc();
    if (!active) return;

    setAiWorking(true);
    setAiAction(action);
    onAddSyncLog(`Sending AI request to optimize document: "${active.title}"`);

    try {
      const response = await fetch('/api/ai/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: active.title,
          content: active.content,
          action: action
        })
      });

      const data = await response.json();
      if (data.success && data.text) {
        onUpdateDoc({
          ...active,
          content: data.text,
          updatedBy: 'Avaxa Brain AI',
          isAiGenerated: true
        });
        onAddSyncLog(`Avaxa Brain completed AI integration for: "${active.title}"`);
      }
    } catch (err) {
      console.error(err);
      // Fallback local response
      let mockText = active.content;
      if (action === 'summarize') {
        mockText = `### Concise AI Summary\n\n- **Primary Goal**: Maximize collaboration using Avaxa.\n- **Action Plan**: Utilize Kanban boards and whiteboards.\n- **Deadline**: High priority in the weekly alignment of business KPIs.`;
      } else if (action === 'improve') {
        mockText = `${active.content}\n\n*Document structurally polished by Avaxa Brain AI assistant.*`;
      }
      onUpdateDoc({
        ...active,
        content: mockText,
        updatedBy: 'Avaxa Brain AI (Local Fallback)'
      });
    } finally {
      setAiWorking(false);
      setAiAction(null);
    }
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddDoc({
      title: newTitle,
      category: newCategory,
      content: newContent || `### ${newTitle}\n\nEnter document content here...`,
      updatedBy: currentUser?.name || 'Hoàng Benjamin'
    });

    onAddSyncLog(`Created new document: "${newTitle}"`);
    
    // Reset parameters
    setNewTitle('');
    setNewCategory('Dự án');
    setNewContent('');
    setShowAddDocModal(false);
  };

  const currentDoc = getActiveDoc();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl overflow-hidden shadow-sm flex h-[calc(100vh-14rem)] md:h-[620px] min-h-[400px] font-sans">
      
      {/* Sidebar repository browser (Left column) */}
      <div className="w-64 border-r border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between hidden md:flex shrink-0 p-4.5">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Document Wiki</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Smart collaborative documents</span>
            </div>
            <button
              id="btn_open_add_doc"
              onClick={() => setShowAddDocModal(true)}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg cursor-pointer transition-colors"
              title="Create new document"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-0.5">
            {['Dự án', 'Quy trình', 'Ghi chú họp', 'Personal'].map((category) => {
              const catDocs = docs.filter(d => d.category === category);
              if (catDocs.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <Folder className="w-3 h-3 text-indigo-400" />
                    <span>{category}</span>
                  </div>
                  <div className="space-y-0.5">
                    {catDocs.map(doc => (
                      <button
                        key={doc.id}
                        id={`doc_link_${doc.id}`}
                        onClick={() => {
                          setActiveDocId(doc.id);
                          onAddSyncLog(`Loaded document "${doc.title}"`);
                        }}
                        className={`w-full text-left py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 truncate cursor-pointer ${activeDocId === doc.id ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/40'}`}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          Total documents: {docs.length} pages
        </div>
      </div>

      {/* Editor Main Canvas Workspace (Right Column) */}
      <div className="flex-1 flex flex-col justify-between h-full bg-white dark:bg-slate-900">
        {currentDoc ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Document stats and parameters row */}
            <div className="p-4 border-b border-indigo-50 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 font-bold text-[9px] px-1.5 py-0.5 rounded-md border border-indigo-100">
                    {currentDoc.category === 'Dự án' ? 'PROJECT' : currentDoc.category === 'Quy trình' ? 'PROCESS' : currentDoc.category === 'Ghi chú họp' ? 'MEETING NOTES' : currentDoc.category === 'Cá nhân' ? 'PERSONAL' : currentDoc.category.toUpperCase()}
                  </span>
                  <h3 className="font-display font-black text-slate-800 dark:text-slate-50 text-sm tracking-tight">{currentDoc.title}</h3>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>Last edited by: <span className="font-bold text-slate-600 dark:text-slate-300">{currentDoc.updatedBy}</span></span>
                </div>
              </div>

              {/* View options switches */}
              <div className="flex items-center gap-2 select-none self-start sm:self-auto">
                <div className="bg-slate-100 dark:bg-slate-800 px-1 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center">
                  <button
                    id="doc_tab_edit"
                    onClick={() => setActiveTab('edit')}
                    className={`py-1 px-2.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'edit' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-50'}`}
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    id="doc_tab_preview"
                    onClick={() => {
                      setActiveTab('preview');
                      onAddSyncLog("Previewed document Markdown formatting");
                    }}
                    className={`py-1 px-2.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-50'}`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>

                <button
                  id="btn_delete_doc"
                  onClick={() => {
                    const idx = docs.findIndex(d => d.id === currentDoc.id);
                    onDeleteDoc(currentDoc.id);
                    onAddSyncLog(`Deleted document: "${currentDoc.title}"`);
                    if (docs.length > 1) {
                      setActiveDocId(docs[idx === 0 ? 1 : idx - 1].id);
                    }
                  }}
                  className="p-2 hover:bg-red-50 text-red-650 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Avaxa AI Document Editors controllers strip */}
            <div className="px-4 py-2.5 border-b border-indigo-50 bg-indigo-50/20 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                Avaxa AI Document Assistant:
              </span>

              {[
                { id: 'summarize', label: 'Summarize', desc: 'Extract key points' },
                { id: 'improve', label: 'Improve', desc: 'Optimize for professional structure' },
                { id: 'expand', label: 'Expand', desc: 'Add additional action plans' }
              ].map((act) => (
                <button
                  key={act.id}
                  id={`ai_doc_action_${act.id}`}
                  onClick={() => triggerAiDocAction(act.id as any)}
                  disabled={aiWorking}
                  className="py-1 px-2.5 text-[10px] font-bold rounded-lg border border-indigo-200 bg-white dark:bg-slate-900 hover:bg-indigo-50 text-indigo-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title={act.desc}
                >
                  {aiWorking && aiAction === act.id ? (
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Bot className="w-3 h-3 shrink-0" />
                  )}
                  <span>{act.label}</span>
                </button>
              ))}

              {aiWorking && (
                <span className="text-[10px] text-indigo-600 animate-pulse block font-medium">Avaxa Brain AI processing...</span>
              )}
            </div>

            {/* Premium Notion-like Cover Header */}
            <div 
              className="h-28 w-full relative transition-all duration-300 group overflow-hidden select-none"
              style={{ background: COVERS[(currentDoc as any).coverIndex || 0] }}
            >
              <div className="absolute inset-0 bg-black/10 transition-opacity opacity-0 group-hover:opacity-100" />
              <button
                onClick={cycleCover}
                className="absolute right-4 bottom-4 py-1.5 px-3 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-50 text-[10px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>Change Cover Photo 🎨</span>
              </button>
            </div>

            {/* Document stats and parameters row */}
            <div className="p-4.5 border-b border-indigo-50 bg-white dark:bg-slate-900 relative">
              
              {/* Emoji Picker container floating at the boundary */}
              <div className="absolute -top-6 left-6 z-20">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Click to change document icon"
                  >
                    {(currentDoc as any).emoji || '📝'}
                  </button>

                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute top-14 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-xl rounded-2xl p-3 z-30 w-52 grid grid-cols-4 gap-1.5"
                      >
                        {EMOJIS.map(emo => (
                          <button
                            key={emo}
                            onClick={() => cycleEmoji(emo)}
                            className="p-1.5 text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors text-center"
                          >
                            {emo}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-indigo-100">
                      {currentDoc.category === 'Dự án' ? 'PROJECT' : currentDoc.category === 'Quy trình' ? 'PROCESS' : currentDoc.category === 'Ghi chú họp' ? 'MEETING NOTES' : currentDoc.category === 'Cá nhân' ? 'PERSONAL' : currentDoc.category.toUpperCase()}
                    </span>
                    <h3 className="font-display font-black text-slate-800 dark:text-slate-50 text-sm tracking-tight flex items-center gap-1.5">
                      <span>{(currentDoc as any).emoji || '📝'}</span>
                      <span>{currentDoc.title}</span>
                    </h3>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Last edited by: <span className="font-bold text-slate-600 dark:text-slate-300">{currentDoc.updatedBy}</span></span>
                  </div>
                </div>

                {/* View options switches */}
                <div className="flex items-center gap-2 select-none self-start sm:self-auto">
                  <div className="bg-slate-100 dark:bg-slate-800 px-1 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center">
                    <button
                      id="doc_tab_edit"
                      onClick={() => setActiveTab('edit')}
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'edit' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-50'}`}
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      id="doc_tab_preview"
                      onClick={() => {
                        setActiveTab('preview');
                        onAddSyncLog("Previewed document Markdown formatting");
                      }}
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-50'}`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                  </div>

                  <button
                    id="btn_delete_doc"
                    onClick={() => {
                      const idx = docs.findIndex(d => d.id === currentDoc.id);
                      onDeleteDoc(currentDoc.id);
                      onAddSyncLog(`Deleted document: "${currentDoc.title}"`);
                      if (docs.length > 1) {
                        setActiveDocId(docs[idx === 0 ? 1 : idx - 1].id);
                      }
                    }}
                    className="p-2 hover:bg-rose-50 text-red-600 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Notion Block Insertion Panel */}
            <div className="px-4 py-2 border-b border-indigo-50 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-left">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mr-0.5">Notion Block:</span>
                {[
                  { id: 'callout', label: '💡 Callout Box' },
                  { id: 'todo', label: '✓ To-do List' },
                  { id: 'code', label: '💻 Code Block' },
                  { id: 'quote', label: '❝ Quote' },
                  { id: 'table', label: '📊 KPI Table' }
                ].map((blk) => (
                  <button
                    key={blk.id}
                    onClick={() => insertNotionBlock(blk.id as any)}
                    className="py-1 px-2 bg-white dark:bg-slate-900 hover:bg-indigo-50 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-slate-700 dark:text-slate-200 hover:text-indigo-700 text-[9px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    {blk.label}
                  </button>
                ))}
              </div>

              {/* Avaxa AI Document Editors controllers strip */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-extrabold text-indigo-550 text-indigo-650 uppercase tracking-wider flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                  AI Assistant:
                </span>

                {[
                  { id: 'summarize', label: 'Summarize', desc: 'Extract key points' },
                  { id: 'improve', label: 'Improve', desc: 'Optimize for professional structure' },
                  { id: 'expand', label: 'Expand', desc: 'Add additional action plans' }
                ].map((act) => (
                  <button
                    key={act.id}
                    id={`ai_doc_action_${act.id}`}
                    onClick={() => triggerAiDocAction(act.id as any)}
                    disabled={aiWorking}
                    className="py-1 px-2 text-[9px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title={act.desc}
                  >
                    {aiWorking && aiAction === act.id ? (
                      <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Bot className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <span>{act.label}</span>
                  </button>
                ))}

                {aiWorking && (
                  <span className="text-[9px] text-indigo-650 animate-pulse block font-medium">Processing...</span>
                )}
              </div>
            </div>

            {/* Writing Area with high quality Notion spacing */}
            <div className="flex-1 p-6 overflow-hidden relative bg-white dark:bg-slate-900">
              <AnimatePresence mode="wait">
                {activeTab === 'edit' ? (
                  <div className="w-full h-full flex flex-col justify-between">
                    <motion.textarea
                      key="editor"
                      id="doc_text_editor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      value={currentDoc.content}
                      onChange={(e) => handleUpdateDocContent(e.target.value)}
                      placeholder="Type document content here. Use the Notion block insertion tools or AI assistant above to design a wonderful page..."
                      className="w-full flex-1 bg-transparent outline-none resize-none font-sans text-xs sm:text-sm leading-relaxed overflow-y-auto text-slate-700 dark:text-slate-200"
                    />
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-mono flex items-center justify-between">
                      <span>💡 Tip: Use standard Markdown or insert visual components using the Notion block toolbar above.</span>
                      <span>{currentDoc.content.length} characters</span>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full overflow-y-auto max-w-none text-xs sm:text-sm text-slate-705 leading-relaxed font-sans bg-white p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 markdown-body text-left scrollbar-thin space-y-3"
                    id="doc_markdown_preview"
                  >
                    {/* Visual Advanced Markdown Parser Simulation */}
                    {(() => {
                      let inCodeBlock = false;
                      let codeLines: string[] = [];
                      
                      return currentDoc.content.split('\n').map((line, idx) => {
                        // Check code block
                        if (line.startsWith('```')) {
                          if (inCodeBlock) {
                            inCodeBlock = false;
                            const currentBlockLines = [...codeLines];
                            codeLines = [];
                            return (
                              <pre key={idx} className="bg-slate-900 text-indigo-300 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 leading-normal my-3 shadow-inner">
                                <code>{currentBlockLines.join('\n')}</code>
                              </pre>
                            );
                          } else {
                            inCodeBlock = true;
                            return null;
                          }
                        }

                        if (inCodeBlock) {
                          codeLines.push(line);
                          return null;
                        }

                        // Check headings
                        if (line.startsWith('### ')) {
                          return <h4 key={idx} className="text-sm font-black text-slate-850 mt-5 mb-2.5 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-1">{line.replace('### ', '')}</h4>;
                        }
                        if (line.startsWith('## ')) {
                          return <h3 key={idx} className="text-base font-black text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">{line.replace('## ', '')}</h3>;
                        }
                        if (line.startsWith('# ')) {
                          return <h2 key={idx} className="text-lg font-black text-black mt-7 mb-4 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700/80 pb-2">{line.replace('# ', '')}</h2>;
                        }

                        // Check callouts/quotes
                        if (line.startsWith('> ')) {
                          const quoteContent = line.replace('> ', '');
                          if (quoteContent.includes('💡')) {
                            return (
                              <div key={idx} className="p-3 bg-indigo-50/70 border border-indigo-150-custom border-indigo-100 rounded-xl leading-relaxed text-indigo-900 flex items-start gap-2 h-callout my-3.5 shadow-xs">
                                <span className="text-base select-none">💡</span>
                                <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 leading-normal">{quoteContent.replace('💡', '').trim()}</div>
                              </div>
                            );
                          }
                          return (
                            <blockquote key={idx} className="pl-4 border-l-4 border-indigo-500 font-medium italic text-slate-650 my-3 leading-relaxed bg-slate-100/40 py-2 pr-3 rounded-r-xl text-slate-600 dark:text-slate-300">
                              {quoteContent}
                            </blockquote>
                          );
                        }

                        // Check standard table rows
                        if (line.startsWith('|') && line.endsWith('|')) {
                          if (line.includes('---')) return null; // skip dividing lines
                          const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
                          const isHeader = idx === 0 || currentDoc.content.split('\n')[idx - 1]?.startsWith('|') === false;

                          return (
                            <div key={idx} className="overflow-x-auto my-1">
                              <table className="w-full border-collapse border border-slate-150 rounded-lg overflow-hidden text-slate-700 dark:text-slate-200 text-xs text-left">
                                <tbody>
                                  <tr className={isHeader ? 'bg-indigo-50/60 font-black text-indigo-950 border-b border-indigo-150' : 'hover:bg-slate-100/50 border-b border-slate-100 dark:border-slate-800/80'}>
                                    {cols.map((col, colIdx) => (
                                      <td key={colIdx} className="p-2 border-r border-slate-100 dark:border-slate-800/80 font-bold">{col}</td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        // Check checklist items
                        if (line.startsWith('- [ ] ')) {
                          return (
                            <div key={idx} className="flex items-center gap-2 my-1.5 select-none hover:bg-slate-100/40 p-1 rounded-lg">
                              <div className="w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600/80 rounded cursor-pointer flex items-center justify-center bg-white dark:bg-slate-900 shrink-0" />
                              <span className="text-slate-700 dark:text-slate-200 font-medium">{line.replace('- [ ] ', '')}</span>
                            </div>
                          );
                        }
                        if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
                          return (
                            <div key={idx} className="flex items-center gap-2 my-1.5 select-none hover:bg-slate-100/40 p-1 rounded-lg">
                              <div className="w-3.5 h-3.5 border-2 border-indigo-500 bg-indigo-500 rounded cursor-pointer flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                              </div>
                              <span className="text-slate-400 dark:text-slate-500 font-semibold line-through">{line.replace('- [x] ', '').replace('- [X] ', '')}</span>
                            </div>
                          );
                        }

                        // Check bullet list items
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <li key={idx} className="list-disc ml-5 text-slate-600 dark:text-slate-300 my-1 font-medium">{line.replace(/^[-*]\s+/, '')}</li>;
                        }

                        // Empty lines
                        if (line.trim() === '') {
                          return <div key={idx} className="h-2" />;
                        }

                        return <p key={idx} className="text-slate-650 my-1 leading-relaxed text-slate-600 dark:text-slate-300">{line}</p>;
                      });
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-950">
            <h4 className="font-display font-medium text-slate-700 dark:text-slate-200 text-sm">No document selected</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Select a document on the left or click Create (+) to write a new page.</p>
          </div>
        )}
      </div>

      {/* Write Document Modal */}
      <AnimatePresence>
        {showAddDocModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddDocModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/80 cursor-default"
              id="add_doc_modal"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-white">
                <span className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-base">Create New Wiki Document</span>
                <button 
                  onClick={() => setShowAddDocModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDocument} className="p-6 space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Document Title</label>
                  <input 
                    id="input_doc_title"
                    type="text" 
                    required
                    placeholder="e.g. Employee Handbook" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Category</label>
                  <select
                    id="select_doc_cat"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-700/80 outline-none"
                  >
                    <option value="Dự án">Project</option>
                    <option value="Quy trình">Process</option>
                    <option value="Ghi chú họp">Meeting Notes 📋</option>
                    <option value="Cá nhân">Personal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Initial Content (Optional)</label>
                  <textarea 
                    id="input_doc_content"
                    placeholder="Enter initial draft..." 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none resize-none font-mono"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowAddDocModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_submit_create_doc"
                    type="submit"
                    className="py-2.5 px-5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Create Document
                  </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
