"use client";

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Document } from '../types';
import { 
  FileText, Folder, FolderOpen, Plus, Bot, Sparkles, Star, Lock, Unlock,
  Clock, Trash2, Edit, Check, Eye, HelpCircle, LayoutGrid, ChevronRight, ChevronDown, Award,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Download, Printer, Code, ChevronUp
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Automatically close mobile sidebar when the active document changes
  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeDocId]);
  
  // Custom ClickUp Docs states
  const [expandedDocIds, setExpandedDocIds] = useState<string[]>([]);
  const [fullWidth, setFullWidth] = useState(false);
  const [newParentId, setNewParentId] = useState<string | undefined>(undefined);
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const formatLineMarkdown = (text: string) => {
    let cleanText = text;
    let alignment: 'left' | 'center' | 'right' | 'justify' = 'left';
    
    if (cleanText.includes('<p align="center">') || cleanText.includes('<p align=\'center\'>')) {
      alignment = 'center';
      cleanText = cleanText.replace(/<p align=["']center["']>/g, '').replace(/<\/p>/g, '');
    } else if (cleanText.includes('<p align="right">') || cleanText.includes('<p align=\'right\'>')) {
      alignment = 'right';
      cleanText = cleanText.replace(/<p align=["']right["']>/g, '').replace(/<\/p>/g, '');
    } else if (cleanText.includes('<p align="justify">') || cleanText.includes('<p align=\'justify\'>')) {
      alignment = 'justify';
      cleanText = cleanText.replace(/<p align=["']justify["']>/g, '').replace(/<\/p>/g, '');
    } else if (cleanText.includes('<p align="left">') || cleanText.includes('<p align=\'left\'>')) {
      alignment = 'left';
      cleanText = cleanText.replace(/<p align=["']left["']>/g, '').replace(/<\/p>/g, '');
    }

    // Split text for formatting
    const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|~~.*?~~|`.*?`|\[.*?\]\(.*?\))/g);
    
    const elements = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-700 dark:text-slate-350">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
        return <span key={i} className="underline decoration-indigo-400 decoration-1.5">{part.slice(3, -4)}</span>;
      }
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return <span key={i} className="line-through text-slate-400 dark:text-slate-500">{part.slice(2, -2)}</span>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-105 dark:bg-slate-800 border border-slate-150 dark:border-slate-705 text-indigo-650 dark:text-indigo-400 font-mono text-[11px] font-bold mx-0.5">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const textEnd = part.indexOf('](');
        const linkText = part.substring(1, textEnd);
        const url = part.substring(textEnd + 2, part.length - 1);
        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{linkText}</a>;
      }
      return part;
    });

    return { elements, alignment };
  };

  const applyFormatting = (formatType: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'align-left' | 'align-center' | 'align-right' | 'align-justify') => {
    const textarea = document.getElementById('doc_text_editor') as HTMLTextAreaElement;
    const active = getActiveDoc();
    if (!textarea || !active || active.isProtected) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'Text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'Text'}*`;
        break;
      case 'underline':
        replacement = `<u>${selectedText || 'Text'}</u>`;
        break;
      case 'strike':
        replacement = `~~${selectedText || 'Text'}~~`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'code'}\``;
        break;
      case 'h1':
        replacement = `\n# ${selectedText || 'Heading 1'}\n`;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Heading 2'}\n`;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || 'Heading 3'}\n`;
        break;
      case 'ul':
        replacement = `\n- ${selectedText || 'List item'}\n`;
        break;
      case 'ol':
        replacement = `\n1. ${selectedText || 'List item'}\n`;
        break;
      case 'align-left':
        replacement = `\n<p align="left">${selectedText || 'Text'}</p>\n`;
        break;
      case 'align-center':
        replacement = `\n<p align="center">${selectedText || 'Text'}</p>\n`;
        break;
      case 'align-right':
        replacement = `\n<p align="right">${selectedText || 'Text'}</p>\n`;
        break;
      case 'align-justify':
        replacement = `\n<p align="justify">${selectedText || 'Text'}</p>\n`;
        break;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateDocContent(newContent);
    onAddSyncLog(`Applied formatting: ${formatType}`);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  const handlePrint = () => {
    const active = getActiveDoc();
    if (!active) return;
    onAddSyncLog(`Printed document: "${active.title}"`);
    window.print();
  };

  const handleDownloadMD = () => {
    const active = getActiveDoc();
    if (!active) return;
    const element = document.createElement("a");
    const file = new Blob([active.content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${active.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onAddSyncLog(`Downloaded Markdown for: "${active.title}"`);
  };

  const handleDownloadHTML = () => {
    const active = getActiveDoc();
    if (!active) return;
    const element = document.createElement("a");
    const previewContent = document.getElementById('doc_markdown_preview')?.innerHTML || active.content;
    const docHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${active.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 24px; font-size: 2em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-top: 24px; }
    h3 { font-size: 1.25em; margin-top: 20px; }
    blockquote { border-left: 4px solid #7B61FF; padding-left: 16px; font-style: italic; color: #475569; background: #f8fafc; padding: 8px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    pre { background: #0f172a; color: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; }
    code { font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>${active.title}</h1>
  ${previewContent}
</body>
</html>
    `;
    const file = new Blob([docHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `${active.title.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onAddSyncLog(`Downloaded HTML for: "${active.title}"`);
  };

  const handleDownloadWord = () => {
    const active = getActiveDoc();
    if (!active) return;
    const element = document.createElement("a");
    const previewContent = document.getElementById('doc_markdown_preview')?.innerHTML || active.content;
    const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <title>${active.title}</title>
  <!--[if gte mso 9]>
  <xml>
  <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; padding: 20px; }
    h1 { font-size: 24pt; font-weight: bold; border-bottom: 2px solid #ccc; margin-bottom: 20px; padding-bottom: 5px; }
    h2 { font-size: 18pt; margin-top: 20px; }
    h3 { font-size: 14pt; margin-top: 15px; }
    p { font-size: 11pt; margin-bottom: 10px; }
    blockquote { border-left: 3px solid #777; padding-left: 10px; color: #555; background: #eee; margin: 10px 0; padding: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 5px; }
    th { background: #ddd; }
  </style>
</head>
<body>
  <h1>${active.title}</h1>
  ${previewContent}
</body>
</html>
    `;
    const file = new Blob([docHtml], {type: 'application/msword'});
    element.href = URL.createObjectURL(file);
    element.download = `${active.title.toLowerCase().replace(/\s+/g, '-')}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onAddSyncLog(`Exported Word document for: "${active.title}"`);
  };

  const insertNotionBlock = (blockType: 'callout' | 'todo' | 'code' | 'quote' | 'table') => {
    const active = getActiveDoc();
    if (!active || active.isProtected) return;
    
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
    if (!active || active.isProtected) return;

    onUpdateDoc({
      ...active,
      content: text,
      updatedBy: currentUser?.name || 'Hoàng Benjamin'
    });
  };

  // Triggers Gemini AI Document assistant calling the server Express routes
  const triggerAiDocAction = async (action: 'summarize' | 'improve' | 'expand') => {
    const active = getActiveDoc();
    if (!active || active.isProtected) return;

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
      updatedBy: currentUser?.name || 'Hoàng Benjamin',
      parentId: newParentId
    } as any);

    onAddSyncLog(`Created new document: "${newTitle}"${newParentId ? ` (subpage of ${docs.find(d => d.id === newParentId)?.title})` : ''}`);
    
    // Reset parameters
    setNewTitle('');
    setNewCategory('Dự án');
    setNewContent('');
    setShowAddDocModal(false);
    setNewParentId(undefined);
  };

  const handleToggleFavorite = () => {
    const active = getActiveDoc();
    if (!active) return;
    onUpdateDoc({
      ...active,
      isFavorite: !active.isFavorite
    });
    onAddSyncLog(`Toggled favorite for document: "${active.title}"`);
  };

  const handleToggleProtected = () => {
    const active = getActiveDoc();
    if (!active) return;
    onUpdateDoc({
      ...active,
      isProtected: !active.isProtected
    });
    onAddSyncLog(`Toggled protected mode for document: "${active.title}"`);
  };

  const handleOpenAddSubpage = (parentDocId: string, parentCategory: string) => {
    setNewParentId(parentDocId);
    setNewCategory(parentCategory);
    setNewTitle('');
    setNewContent('');
    setShowAddDocModal(true);
  };

  const toggleExpand = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDocIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Memoized Favorites list
  const favoriteDocs = useMemo(() => {
    return docs.filter(d => d.isFavorite);
  }, [docs]);

  const currentDoc = getActiveDoc();

  // Word count and reading time statistics
  const stats = useMemo(() => {
    if (!currentDoc) return { words: 0, characters: 0, readTime: 0 };
    const charCount = currentDoc.content.length;
    const wordsList = currentDoc.content.trim().split(/\s+/).filter(Boolean);
    const wordCount = wordsList.length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    return { words: wordCount, characters: charCount, readTime };
  }, [currentDoc?.content]);

  // Recursive document tree renderer
  const renderDocTree = (parentDocId: string | undefined, category: string, level: number = 0) => {
    const levelDocs = docs.filter(d => d.category === category && d.parentId === parentDocId);
    if (levelDocs.length === 0) return null;

    return (
      <div className={`space-y-0.5 ${level > 0 ? 'ml-3 border-l border-slate-200/50 dark:border-slate-800 pl-1.5' : ''}`}>
        {levelDocs.map(doc => {
          const hasChildren = docs.some(d => d.parentId === doc.id);
          const isExpanded = expandedDocIds.includes(doc.id);
          const isActive = activeDocId === doc.id;

          return (
            <div key={doc.id} className="space-y-0.5">
              <div
                id={`doc_link_${doc.id}`}
                onClick={() => {
                  setActiveDocId(doc.id);
                  onAddSyncLog(`Loaded document "${doc.title}"`);
                }}
                className={`group w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {hasChildren ? (
                    <button 
                      onClick={(e) => toggleExpand(doc.id, e)}
                      className={`p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 shrink-0 ${isActive ? 'hover:bg-indigo-700 hover:text-white' : ''}`}
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <div className="w-4.5 h-4.5 flex items-center justify-center shrink-0">
                      <span className="text-[10px]">{(doc as any).emoji || '📝'}</span>
                    </div>
                  )}
                  <span className="truncate">{doc.title}</span>
                </div>

                {/* Inline Hover Action for adding subpage */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenAddSubpage(doc.id, category)}
                    className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 ${isActive ? 'hover:bg-indigo-700 text-indigo-100' : ''}`}
                    title="Add a nested subpage"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Render children subpages recursively */}
              {hasChildren && isExpanded && renderDocTree(doc.id, category, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex h-full min-h-[400px] font-sans">
      
      {/* Backdrop overlay for mobile Docs sidebar */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 cursor-pointer"
        />
      )}

      {/* Sidebar repository browser (Left column) */}
      <div className={`bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-between shrink-0 p-4 select-none transition-all duration-200 ${
        isMobileSidebarOpen
          ? 'fixed inset-y-0 left-0 w-[270px] max-w-[80vw] z-50 shadow-2xl flex border-r border-slate-200 dark:border-slate-800'
          : 'hidden md:flex w-64 border-r border-slate-200/60 dark:border-slate-800/80'
      }`}>
        <div className="space-y-4 overflow-y-auto max-h-[calc(100%-40px)] pr-1 scrollbar-none">
          
          <div className="flex items-center justify-between px-1 shrink-0">
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider block">Docs</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Wiki nested pages & drafts</span>
            </div>
            <button
              id="btn_open_add_doc"
              onClick={() => {
                setNewParentId(undefined);
                setShowAddDocModal(true);
              }}
              className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-lg cursor-pointer transition-colors shadow-3xs"
              title="Create root document"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 🌟 Favorites Section */}
          {favoriteDocs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Favorites</span>
              </div>
              <div className="space-y-0.5">
                {favoriteDocs.map(doc => (
                  <button
                    key={`fav-${doc.id}`}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      onAddSyncLog(`Loaded favorite document "${doc.title}"`);
                    }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 truncate cursor-pointer ${
                      activeDocId === doc.id 
                        ? 'bg-indigo-55/65 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' 
                        : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-[10px]">{(doc as any).emoji || '📝'}</span>
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document Category Trees */}
          <div className="space-y-4">
            {['Dự án', 'Quy trình', 'Ghi chú họp', 'Personal'].map((category) => {
              // Only render categories that have root level documents
              const rootCatDocs = docs.filter(d => d.category === category && (d.parentId === undefined || d.parentId === null));
              if (rootCatDocs.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{category}</span>
                  </div>
                  {/* Render the hierarchical tree starting from root level */}
                  {renderDocTree(undefined, category)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-3 border-t border-slate-200/50 dark:border-slate-800/80 shrink-0">
          Total docs: {docs.length} pages
        </div>
      </div>

      {/* Editor Main Canvas Workspace (Right Column) */}
      <div className="flex-1 flex flex-col justify-between h-full bg-white dark:bg-slate-900 overflow-hidden">
        {currentDoc ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            
            {/* Notion-style Cover Header */}
            <div 
              className="h-28 w-full relative transition-all duration-300 group overflow-hidden select-none shrink-0"
              style={{ background: COVERS[currentDoc.coverIndex || 0] }}
            >
              <div className="absolute inset-0 bg-black/10 transition-opacity opacity-0 group-hover:opacity-100" />
              <button
                onClick={cycleCover}
                className="absolute right-4 bottom-4 py-1.5 px-3 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-50 text-[10px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>Change Cover Photo 🎨</span>
              </button>
            </div>

            {/* Document Header Info & Toolbars */}
            <div className="px-5.5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative shrink-0">
              
              {/* Emoji Picker container floating at the boundary */}
              <div className="absolute -top-6 left-6 z-20">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={currentDoc.isProtected}
                    className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-90 disabled:cursor-not-allowed"
                    title="Click to change document icon"
                  >
                    {currentDoc.emoji || '📝'}
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

              {/* Title & Metadata Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 select-none">
                <div>
                  <div className="flex items-center gap-2">
                    {/* Mobile explorer trigger menu icon */}
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="md:hidden p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700/80 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-350 cursor-pointer shrink-0 transition-colors mr-1"
                      title="Mở thư mục Docs"
                    >
                      <FolderOpen className="w-4 h-4 text-indigo-500" />
                    </button>
                    <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                      {currentDoc.category === 'Dự án' ? 'PROJECT' : currentDoc.category === 'Quy trình' ? 'PROCESS' : currentDoc.category === 'Ghi chú họp' ? 'MEETING NOTES' : currentDoc.category === 'Cá nhân' ? 'PERSONAL' : currentDoc.category.toUpperCase()}
                    </span>
                    <h3 className="font-display font-black text-slate-805 dark:text-slate-100 text-sm tracking-tight flex items-center gap-1.5">
                      <span>{currentDoc.emoji || '📝'}</span>
                      <span>{currentDoc.title}</span>
                      {currentDoc.isProtected && <Lock className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />}
                    </h3>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Last edited by: <span className="font-bold text-slate-600 dark:text-slate-350">{currentDoc.updatedBy}</span></span>
                  </div>
                </div>

                {/* Editor Action buttons */}
                <div className="flex items-center gap-1.5 select-none self-start sm:self-auto flex-wrap">
                  {/* Star/Favorite Toggle */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-xl transition-all cursor-pointer border ${
                      currentDoc.isFavorite 
                        ? 'bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-950/20' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50'
                    }`}
                    title={currentDoc.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Star className={`w-3.5 h-3.5 ${currentDoc.isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  {/* Lock/Protection Toggle */}
                  <button
                    onClick={handleToggleProtected}
                    className={`p-2 rounded-xl transition-all cursor-pointer border ${
                      currentDoc.isProtected 
                        ? 'bg-rose-50 border-rose-250 text-rose-550 dark:bg-rose-955/10' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50'
                    }`}
                    title={currentDoc.isProtected ? "Unlock Editing" : "Lock / Protect Page"}
                  >
                    {currentDoc.isProtected ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Width Layout Toggle */}
                  <button
                    onClick={() => setFullWidth(!fullWidth)}
                    className={`p-2 rounded-xl transition-all cursor-pointer border ${
                      fullWidth 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-950/20' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50'
                    }`}
                    title={fullWidth ? "Standard Layout width" : "Full Width layout"}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>

                  {/* Export & Print Suite Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className={`p-2 rounded-xl transition-all cursor-pointer border ${showExportMenu ? 'bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50'}`}
                      title="Xuất bản & In ấn"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {showExportMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                        <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-fadeIn text-left">
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              handlePrint();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-500" />
                            <span>In / Xuất PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              handleDownloadWord();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-550" />
                            <span>Xuất sang MS Word</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              handleDownloadMD();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Tải về Markdown (.md)</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              handleDownloadHTML();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Code className="w-3.5 h-3.5 text-orange-500" />
                            <span>Tải về HTML (.html)</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Tabs layout switcher */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center">
                    <button
                      id="doc_tab_edit"
                      onClick={() => setActiveTab('edit')}
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'edit' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
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
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
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
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-550 dark:text-rose-455 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Word Standard formatting toolbar */}
            {activeTab === 'edit' && (
              <div className="px-5 py-2 border-b border-slate-150/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-1.5 select-none text-left shrink-0">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mr-1">Văn bản:</span>
                
                {/* Headers */}
                <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                  <button 
                    onClick={() => applyFormatting('h1')} 
                    className="py-0.5 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold cursor-pointer transition-all active:scale-95"
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button 
                    onClick={() => applyFormatting('h2')} 
                    className="py-0.5 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold cursor-pointer transition-all active:scale-95"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button 
                    onClick={() => applyFormatting('h3')} 
                    className="py-0.5 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold cursor-pointer transition-all active:scale-95"
                    title="Heading 3"
                  >
                    H3
                  </button>
                </div>

                {/* Inline Styles */}
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                  <button 
                    onClick={() => applyFormatting('bold')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="In đậm"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('italic')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="In nghiêng"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('underline')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Gạch chân"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('strike')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Gạch đè"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('code')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Mã nguồn inline"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                  <button 
                    onClick={() => applyFormatting('align-left')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Căn trái"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('align-center')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Căn giữa"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('align-right')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Căn phải"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('align-justify')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Căn đều hai bên"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => applyFormatting('ul')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Danh sách dấu chấm"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('ol')} 
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
                    title="Danh sách số"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Smart Notion Block Insertion Panel */}
            <div className="px-5 py-2 border-b border-slate-150/60 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-left shrink-0 select-none">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mr-0.5">Chèn nhanh:</span>
                {[
                  { id: 'callout', label: '💡 Hộp chú thích' },
                  { id: 'todo', label: '✓ Danh sách việc cần làm' },
                  { id: 'code', label: '💻 Khối mã nguồn' },
                  { id: 'quote', label: '❝ Trích dẫn' },
                  { id: 'table', label: '📊 Bảng KPI' }
                ].map((blk) => (
                  <button
                    key={blk.id}
                    onClick={() => insertNotionBlock(blk.id as any)}
                    disabled={currentDoc.isProtected}
                    className="py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 hover:bg-indigo-50/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-205 text-[9px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {blk.label}
                  </button>
                ))}
              </div>

              {/* Avaxa AI Document Editors controllers strip */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                  Trợ lý AI:
                </span>

                {[
                  { id: 'summarize', label: 'Tóm tắt', desc: 'Trích xuất ý chính' },
                  { id: 'improve', label: 'Tối ưu', desc: 'Đánh bóng cấu trúc chuyên nghiệp' },
                  { id: 'expand', label: 'Mở rộng', desc: 'Thêm kế hoạch hành động chi tiết' }
                ].map((act) => (
                  <button
                    key={act.id}
                    id={`ai_doc_action_${act.id}`}
                    onClick={() => triggerAiDocAction(act.id as any)}
                    disabled={aiWorking || currentDoc.isProtected}
                    className="py-1 px-2 text-[9px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={act.desc}
                  >
                    {aiWorking && aiAction === act.id ? (
                      <div className="w-2.5 h-2.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Bot className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <span>{act.label}</span>
                  </button>
                ))}

                  {aiWorking && (
                    <span className="text-[9px] text-indigo-650 animate-pulse block font-medium">Đang xử lý...</span>
                  )}
                </div>
              </div>

            {/* Writing Area with high quality Notion spacing */}
            <div className={`flex-1 overflow-hidden relative flex flex-col justify-between ${activeTab === 'preview' ? 'bg-slate-100/50 dark:bg-slate-950/40' : 'bg-white dark:bg-slate-900'}`}>
              
              <div className={`flex-1 overflow-y-auto ${activeTab === 'preview' ? 'p-4 sm:p-8' : 'p-5 pr-1'}`}>
                <div className={activeTab === 'preview' ? 'w-full' : (fullWidth ? "w-full px-6 py-2" : "max-w-3xl mx-auto px-4 py-2")}>
                  <AnimatePresence mode="wait">
                    {activeTab === 'edit' ? (
                      <motion.textarea
                        key="editor"
                        id="doc_text_editor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        value={currentDoc.content}
                        onChange={(e) => handleUpdateDocContent(e.target.value)}
                        readOnly={currentDoc.isProtected}
                        placeholder={currentDoc.isProtected ? "This page is locked. Click the Unlock button in the toolbar to edit." : "Type document content here. Use the Notion block insertion tools or AI assistant above to design a wonderful page..."}
                        className={`w-full min-h-[350px] bg-transparent outline-none resize-none font-sans text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 ${currentDoc.isProtected ? 'cursor-not-allowed select-none opacity-80' : ''}`}
                      />
                    ) : (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`w-full overflow-y-auto text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 markdown-body text-left space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] rounded-xl ${fullWidth ? 'w-full p-8 sm:p-12' : 'max-w-[800px] mx-auto p-8 sm:p-14 md:p-16 min-h-[1050px]'}`}
                        id="doc_print_content"
                      >
                        {/* Visual Advanced Markdown Parser Simulation */}
                        {(() => {
                          let inCodeBlock = false;
                          let codeLines: string[] = [];
                          
                          return currentDoc.content.split('\n').map((line, idx) => {
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

                            // Run inline markdown format parsing
                            const { elements, alignment } = formatLineMarkdown(line);
                            const alignClass = alignment === 'center' ? 'text-center justify-center' :
                                               alignment === 'right' ? 'text-right justify-end' :
                                               alignment === 'justify' ? 'text-justify' : 'text-left';

                            if (line.startsWith('### ')) {
                              const cleanHeading = line.replace('### ', '');
                              const hParsed = formatLineMarkdown(cleanHeading);
                              const hAlignClass = hParsed.alignment === 'center' ? 'text-center justify-center' :
                                                 hParsed.alignment === 'right' ? 'text-right justify-end' :
                                                 hParsed.alignment === 'justify' ? 'text-justify' : 'text-left';
                              return <h4 key={idx} className={`text-sm font-black text-slate-850 dark:text-white mt-5 mb-2.5 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1 ${hAlignClass}`}>{hParsed.elements}</h4>;
                            }
                            if (line.startsWith('## ')) {
                              const cleanHeading = line.replace('## ', '');
                              const hParsed = formatLineMarkdown(cleanHeading);
                              const hAlignClass = hParsed.alignment === 'center' ? 'text-center justify-center' :
                                                 hParsed.alignment === 'right' ? 'text-right justify-end' :
                                                 hParsed.alignment === 'justify' ? 'text-justify' : 'text-left';
                              return <h3 key={idx} className={`text-base font-black text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5 ${hAlignClass}`}>{hParsed.elements}</h3>;
                            }
                            if (line.startsWith('# ')) {
                              const cleanHeading = line.replace('# ', '');
                              const hParsed = formatLineMarkdown(cleanHeading);
                              const hAlignClass = hParsed.alignment === 'center' ? 'text-center justify-center' :
                                                 hParsed.alignment === 'right' ? 'text-right justify-end' :
                                                 hParsed.alignment === 'justify' ? 'text-justify' : 'text-left';
                              return <h2 key={idx} className={`text-lg font-black text-slate-950 dark:text-white mt-7 mb-4 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2 ${hAlignClass}`}>{hParsed.elements}</h2>;
                            }

                            if (line.startsWith('> ')) {
                              const quoteContent = line.replace('> ', '');
                              const qParsed = formatLineMarkdown(quoteContent);
                              if (quoteContent.includes('💡')) {
                                return (
                                  <div key={idx} className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 rounded-xl leading-relaxed text-indigo-900 dark:text-indigo-300 flex items-start gap-2 h-callout my-3.5 shadow-xs">
                                    <span className="text-base select-none">💡</span>
                                    <div className="text-[11px] sm:text-xs text-slate-750 dark:text-slate-200 leading-normal">{formatLineMarkdown(quoteContent.replace('💡', '').trim()).elements}</div>
                                  </div>
                                );
                              }
                              return (
                                <blockquote key={idx} className="pl-4 border-l-4 border-indigo-500 font-medium italic text-slate-600 dark:text-slate-350 my-3 leading-relaxed bg-slate-55 py-2 pr-3 rounded-r-xl">
                                  {qParsed.elements}
                                </blockquote>
                              );
                            }

                            if (line.startsWith('|') && line.endsWith('|')) {
                              if (line.includes('---')) return null;
                              const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
                              const isHeader = idx === 0 || currentDoc.content.split('\n')[idx - 1]?.startsWith('|') === false;

                              return (
                                <div key={idx} className="overflow-x-auto my-1">
                                  <table className="w-full border-collapse border border-slate-150 dark:border-slate-800 rounded-lg overflow-hidden text-slate-750 dark:text-slate-250 text-xs text-left">
                                    <tbody>
                                      <tr className={isHeader ? 'bg-indigo-50/60 dark:bg-indigo-950/40 font-black text-indigo-950 dark:text-indigo-200 border-b border-indigo-150 dark:border-indigo-800' : 'hover:bg-slate-105 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800'}>
                                        {cols.map((col, colIdx) => (
                                          <td key={colIdx} className="p-2 border-r border-slate-100 dark:border-slate-800 font-bold">{formatLineMarkdown(col).elements}</td>
                                        ))}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }

                            if (line.startsWith('- [ ] ')) {
                              const todoText = line.replace('- [ ] ', '');
                              return (
                                <div key={idx} className="flex items-center gap-2 my-1.5 select-none hover:bg-slate-105 p-1 rounded-lg">
                                  <div className="w-3.5 h-3.5 border-2 border-slate-305 dark:border-slate-600 rounded cursor-pointer flex items-center justify-center bg-white dark:bg-slate-900 shrink-0" />
                                  <span className="text-slate-705 dark:text-slate-250 font-medium">{formatLineMarkdown(todoText).elements}</span>
                                </div>
                              );
                            }
                            if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
                              const todoText = line.replace('- [x] ', '').replace('- [X] ', '');
                              return (
                                <div key={idx} className="flex items-center gap-2 my-1.5 select-none hover:bg-slate-105 p-1 rounded-lg">
                                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 bg-indigo-500 rounded cursor-pointer flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                                  </div>
                                  <span className="text-slate-400 dark:text-slate-550 font-semibold line-through">{formatLineMarkdown(todoText).elements}</span>
                                </div>
                              );
                            }

                            if (line.startsWith('- ') || line.startsWith('* ')) {
                              const listText = line.replace(/^[-*]\s+/, '');
                              return <li key={idx} className={`list-disc ml-5 text-slate-655 dark:text-slate-300 my-1.5 font-medium ${alignClass}`}>{formatLineMarkdown(listText).elements}</li>;
                            }

                            if (line.trim() === '') {
                              return <div key={idx} className="h-2" />;
                            }

                                                    return <p key={idx} className={`text-slate-655 dark:text-slate-300 my-1.5 leading-relaxed ${alignClass}`}>{elements}</p>;
                          });
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Statistics Footer Bar */}
              <div className="text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-150/40 dark:border-slate-800/80 pt-2 font-mono flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-3">
                  <span>Words: <span className="font-bold text-slate-600 dark:text-slate-400">{stats.words}</span></span>
                  <span>Characters: <span className="font-bold text-slate-600 dark:text-slate-400">{stats.characters}</span></span>
                  <span>Estimated Reading Time: <span className="font-bold text-slate-600 dark:text-slate-400">{stats.readTime} min</span></span>
                </div>
                {currentDoc.isProtected && (
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Protected / Read-Only Mode
                  </span>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-950">
            <div className="w-12 h-12 rounded-full bg-slate-105 border border-slate-200/30 flex items-center justify-center text-slate-400 dark:text-slate-650 shadow-3xs mb-3">
              <FileText className="w-5 h-5" />
            </div>
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
            onClick={() => {
              setShowAddDocModal(false);
              setNewParentId(undefined);
            }}
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
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-white dark:bg-slate-900">
                <span className="font-display font-extrabold text-slate-855 dark:text-slate-50 text-base">
                  {newParentId ? `Create Nested Subpage under "${docs.find(d => d.id === newParentId)?.title}"` : 'Create New Document'}
                </span>
                <button 
                  onClick={() => {
                    setShowAddDocModal(false);
                    setNewParentId(undefined);
                  }}
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
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-55 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Category</label>
                  <select
                    id="select_doc_cat"
                    value={newCategory}
                    disabled={!!newParentId}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-55 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 outline-none font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <option value="Dự án">Project</option>
                    <option value="Quy trình">Process</option>
                    <option value="Ghi chú họp">Meeting Notes 📋</option>
                    <option value="Personal">Personal</option>
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
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-55 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none resize-none font-semibold"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDocModal(false);
                      setNewParentId(undefined);
                    }}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
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
