"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, MessageSquare, Share2, MoreHorizontal, Maximize2, 
  Minimize2, Printer, Sparkles, Download, ChevronDown, Check, Trash2,
  Clapperboard, Users, History, Eye, Tag, Play, Film, Sliders,
  HelpCircle, Search, Edit3, ArrowRight, CornerDownLeft, RefreshCw,
  Send, UserCircle, Shield, X, AlertCircle, Copy, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { callAiApi } from '@/lib/aiClient';
import SignedImage from '../SignedImage';

export type ScreenplayElementType = 
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'shot';

export interface ScreenplayElement {
  id: string;
  type: ScreenplayElementType;
  text: string;
  sceneNumber?: number;
}

export interface ScreenplayRevision {
  id: string;
  version: string;
  title: string;
  color: string;
  badgeColor: string;
  updatedAt: string;
  author: string;
  elements: ScreenplayElement[];
}

export interface ScriptComment {
  id: string;
  elementId?: string;
  rowLabel: string;
  author: string;
  authorRole: string;
  avatar?: string;
  text: string;
  createdAt: string;
  replies?: Array<{
    id: string;
    author: string;
    authorRole: string;
    avatar?: string;
    text: string;
    createdAt: string;
  }>;
}

interface ScreenplayEditorProps {
  documentId?: string;
  initialTitle?: string;
  currentUser?: any;
  onBackToDocs?: () => void;
  onSaveScript?: (data: any) => void;
}

// Industry Standard Hollywood Revision Colors
const REVISION_COLORS = [
  { version: 'v7', name: 'Rev. 7 (Pink)', badge: 'bg-rose-500 text-white', pill: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  { version: 'v6', name: 'Rev. 6 (Salmon/Orange)', badge: 'bg-orange-500 text-white', pill: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  { version: 'v5', name: 'Rev. 5 (Green)', badge: 'bg-emerald-500 text-white', pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { version: 'v4', name: 'Rev. 4 (Yellow)', badge: 'bg-amber-400 text-slate-900', pill: 'bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-400/30' },
  { version: 'v3', name: 'Rev. 3 (Pink/Magenta)', badge: 'bg-pink-400 text-white', pill: 'bg-pink-400/15 text-pink-700 dark:text-pink-300 border-pink-400/30' },
  { version: 'v2', name: 'Rev. 2 (Blue)', badge: 'bg-sky-500 text-white', pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  { version: 'v1', name: 'Rev. 1 (White / First Draft)', badge: 'bg-slate-400 text-white', pill: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
];

const SAMPLE_SCRIPT_ELEMENTS: ScreenplayElement[] = [
  { id: 'el-1', type: 'scene_heading', text: 'EXT. BIRCH GROVE - DAY', sceneNumber: 1 },
  { id: 'el-2', type: 'action', text: 'MAYA, a beautiful maiden, stands in a BIRCH GROVE, practicing her magic. She kneels in front of a dying FLOWER and whispers an incantation. BLUE SPARKLES appear between her fingers, and the flower suddenly blooms back to life.' },
  { id: 'el-3', type: 'action', text: 'In the distance, she hears a cacophony of sounds: men shouting, hounds howling, and the clop of horse hooves.' },
  { id: 'el-4', type: 'character', text: 'MAYA' },
  { id: 'el-5', type: 'dialogue', text: "The King's hunters." },
  { id: 'el-6', type: 'action', text: 'Maya stands just as a red FOX races passed her.' },
  { id: 'el-7', type: 'character', text: 'MAYA' },
  { id: 'el-8', type: 'dialogue', text: 'Oh, you poor thing!' },
  { id: 'el-9', type: 'action', text: 'As the RIDERS appear, following their bloodthirsty HOUNDS, Maya steps in their path and raises her arms to stop them.' },
  { id: 'el-10', type: 'action', text: 'But the riders take no heed and barrel passed her. Maya drops to the ground, inches from being run down.' },
  { id: 'el-11', type: 'character', text: 'MAYA' },
  { id: 'el-12', type: 'dialogue', text: 'Are you hurt?' },
  { id: 'el-13', type: 'character', text: 'HUGO' },
  { id: 'el-14', type: 'dialogue', text: 'No, Your Highness.' },
  { id: 'el-15', type: 'action', text: 'Hugo helps Maya to her feet. Their eyes lock for a moment.' },
  { id: 'el-16', type: 'scene_heading', text: 'EXT. NEIGHBORHOOD - DAY', sceneNumber: 2 },
  { id: 'el-17', type: 'action', text: 'Stuart hops out of his car in a hurry.' },
  { id: 'el-18', type: 'character', text: 'STUART' },
  { id: 'el-19', type: 'parenthetical', text: '(shouting back)' },
  { id: 'el-20', type: 'dialogue', text: "Don't forget the files on the backseat!" },
  { id: 'el-21', type: 'transition', text: 'CUT TO:' },
];

const INITIAL_COMMENTS: ScriptComment[] = [
  {
    id: 'cmt-1',
    elementId: 'el-2',
    rowLabel: 'Row 1.1',
    author: 'Jared Prost',
    authorRole: 'Producer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    text: 'Really liking this opener!',
    createdAt: '10m ago'
  },
  {
    id: 'cmt-2',
    elementId: 'el-4',
    rowLabel: 'Row 1.2',
    author: 'Jamie Martin',
    authorRole: 'Director',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    text: 'Lets add captions to the video and emphasize the sound of hounds.',
    createdAt: '25m ago'
  }
];

export default function ScreenplayEditor({
  documentId = 'screenplay-default',
  initialTitle = 'The Girl & the Fox',
  currentUser,
  onBackToDocs,
  onSaveScript
}: ScreenplayEditorProps) {
  const [scriptTitle, setScriptTitle] = useState(initialTitle);
  const [activeTab, setActiveTab] = useState<'screenplay' | 'docs' | 'av_scripts'>('screenplay');
  const [workflowTab, setWorkflowTab] = useState<'write' | 'breakdown' | 'plan' | 'visualize' | 'shoot' | 'settings' | 'resources'>('write');
  
  // Revisions State
  const [revisions, setRevisions] = useState<ScreenplayRevision[]>([
    { id: 'rev-7', version: 'v7', title: `${initialTitle} - Rev. 7`, color: 'bg-rose-500', badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', updatedAt: 'Just now', author: currentUser?.name || 'Writer', elements: SAMPLE_SCRIPT_ELEMENTS },
    { id: 'rev-6', version: 'v6', title: `${initialTitle} - Rev. 6`, color: 'bg-orange-500', badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300', updatedAt: '2 days ago', author: 'Jamie Martin', elements: SAMPLE_SCRIPT_ELEMENTS.slice(0, 15) },
    { id: 'rev-5', version: 'v5', title: `${initialTitle} - Rev. 5`, color: 'bg-emerald-500', badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', updatedAt: '5 days ago', author: 'Jared Prost', elements: SAMPLE_SCRIPT_ELEMENTS.slice(0, 12) },
    { id: 'rev-4', version: 'v4', title: `${initialTitle} - Rev. 4`, color: 'bg-amber-400', badgeColor: 'bg-amber-400/15 text-amber-700 dark:text-amber-300', updatedAt: '1 week ago', author: 'Writer', elements: SAMPLE_SCRIPT_ELEMENTS.slice(0, 10) },
    { id: 'rev-3', version: 'v3', title: `${initialTitle} - Rev. 3`, color: 'bg-pink-400', badgeColor: 'bg-pink-400/15 text-pink-700 dark:text-pink-300', updatedAt: '2 weeks ago', author: 'Writer', elements: SAMPLE_SCRIPT_ELEMENTS.slice(0, 8) },
    { id: 'rev-2', version: 'v2', title: `${initialTitle} - Rev. 2`, color: 'bg-sky-500', badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', updatedAt: '3 weeks ago', author: 'Writer', elements: SAMPLE_SCRIPT_ELEMENTS.slice(0, 5) },
    { id: 'rev-1', version: 'v1', title: `${initialTitle} - Rev. 1`, color: 'bg-slate-400', badgeColor: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300', updatedAt: '1 month ago', author: 'Writer', elements: SAMPLE_SCRIPT_ELEMENTS.slice(0, 3) },
  ]);

  const [activeRevisionId, setActiveRevisionId] = useState<string>('rev-7');
  const activeRevision = useMemo(() => revisions.find(r => r.id === activeRevisionId) || revisions[0], [revisions, activeRevisionId]);
  
  // Script Elements in active revision
  const [elements, setElements] = useState<ScreenplayElement[]>(activeRevision.elements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Mobile & Responsive Sidebar States
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);
  const [isMobileWorkflowOpen, setIsMobileWorkflowOpen] = useState(false);
  
  // Right Sidebar States
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [rightTab, setRightTab] = useState<'comments' | 'access' | 'breakdown'>('comments');
  const [comments, setComments] = useState<ScriptComment[]>(INITIAL_COMMENTS);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Page Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  // Sync elements when revision changes
  useEffect(() => {
    if (activeRevision) {
      setElements(activeRevision.elements);
    }
  }, [activeRevision]);

  // Recalculate Scene Numbers
  const numberedElements = useMemo(() => {
    let currentSceneNum = 0;
    return elements.map(el => {
      if (el.type === 'scene_heading') {
        currentSceneNum += 1;
        return { ...el, sceneNumber: currentSceneNum };
      }
      return el;
    });
  }, [elements]);

  // Insert or Update element
  const handleUpdateElementText = (id: string, text: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, text } : el));
  };

  const handleChangeElementType = (id: string, type: ScreenplayElementType) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, type } : el));
  };

  const handleAddElement = (type: ScreenplayElementType, afterId?: string) => {
    let defaultText = '';
    if (type === 'scene_heading') defaultText = 'INT. NEW LOCATION - DAY';
    if (type === 'character') defaultText = 'CHARACTER NAME';
    if (type === 'parenthetical') defaultText = '(beat)';
    if (type === 'dialogue') defaultText = 'Dialogue text goes here...';
    if (type === 'transition') defaultText = 'CUT TO:';
    if (type === 'shot') defaultText = 'CLOSE UP ON:';
    if (type === 'action') defaultText = 'Action description...';

    const newEl: ScreenplayElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      text: defaultText
    };

    if (afterId) {
      const idx = elements.findIndex(e => e.id === afterId);
      if (idx !== -1) {
        const next = [...elements];
        next.splice(idx + 1, 0, newEl);
        setElements(next);
        setSelectedElementId(newEl.id);
        return;
      }
    }

    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const handleDeleteElement = (id: string) => {
    if (elements.length <= 1) return;
    setElements(prev => prev.filter(el => el.id !== id));
  };

  // Keyboard navigation for fast scriptwriting
  const handleKeyDown = (e: React.KeyboardEvent, el: ScreenplayElement, idx: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle element type: Action -> Character -> Parenthetical -> Dialogue -> Transition
      const cycleMap: Record<ScreenplayElementType, ScreenplayElementType> = {
        action: 'character',
        character: 'dialogue',
        dialogue: 'parenthetical',
        parenthetical: 'action',
        scene_heading: 'action',
        transition: 'scene_heading',
        shot: 'action'
      };
      handleChangeElementType(el.id, cycleMap[el.type]);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Flow logic on enter: Character -> Dialogue; Dialogue -> Character or Action; Scene Heading -> Action
      let nextType: ScreenplayElementType = 'action';
      if (el.type === 'scene_heading') nextType = 'action';
      else if (el.type === 'character') nextType = 'dialogue';
      else if (el.type === 'parenthetical') nextType = 'dialogue';
      else if (el.type === 'dialogue') nextType = 'character';
      else if (el.type === 'transition') nextType = 'scene_heading';

      handleAddElement(nextType, el.id);
    }
  };

  // AI Script Assistant
  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const currentScriptContext = elements.map(e => `[${e.type.toUpperCase()}] ${e.text}`).join('\n');
      const systemPrompt = `Bạn là một biên kịch phim điện ảnh và truyền hình chuyên nghiệp (Hollywood Screenwriter). 
Hãy viết tiếp hoặc cải thiện kịch bản theo yêu cầu dưới đây với định dạng chuẩn Screenplay:
Các element hợp lệ:
- SCENE_HEADING: INT./EXT. LOCATION - TIME
- ACTION: mô tả hành động
- CHARACTER: TÊN NHÂN VẬT VIẾT HOA
- PARENTHETICAL: (chỉ dẫn biểu cảm/hành động nhỏ)
- DIALOGUE: lời thoại
- TRANSITION: CUT TO:, FADE IN:
Đưa ra kết quả dạng mảng JSON: [{"type": "scene_heading"|"action"|"character"|"parenthetical"|"dialogue"|"transition", "text": "..."}]`;

      const res = await callAiApi('/api/ai/chat', { 
        message: `${systemPrompt}\n\nKịch bản hiện tại:\n${currentScriptContext}\n\nYêu cầu tạo mới: ${aiPrompt}` 
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.reply || data.text || JSON.stringify(data);
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newGenerated: ScreenplayElement[] = parsed.map((item: any) => ({
              id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              type: item.type || 'action',
              text: item.text || ''
            }));
            setElements(prev => [...prev, ...newGenerated]);
            setShowAiModal(false);
            setAiPrompt('');
          }
        }
      }
    } catch (err) {
      console.error('AI Script generation failed:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Comments Management
  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newCmt: ScriptComment = {
      id: `cmt-${Date.now()}`,
      elementId: selectedElementId || undefined,
      rowLabel: selectedElementId ? `Scene Element` : 'Row 1.1',
      author: currentUser?.name || 'Producer',
      authorRole: 'Producer',
      avatar: currentUser?.avatar || undefined,
      text: newCommentText,
      createdAt: 'Just now'
    };
    setComments(prev => [newCmt, ...prev]);
    setNewCommentText('');
  };

  const handleAddReply = (commentId: string) => {
    if (!replyText.trim()) return;
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const newReply = {
          id: `reply-${Date.now()}`,
          author: currentUser?.name || 'Writer',
          authorRole: 'Writer',
          avatar: currentUser?.avatar || undefined,
          text: replyText,
          createdAt: 'Just now'
        };
        return { ...c, replies: [...(c.replies || []), newReply] };
      }
      return c;
    }));
    setReplyText('');
    setReplyingToId(null);
  };

  // Create New Revision
  const handleCreateNewRevision = () => {
    const nextVerNum = revisions.length + 1;
    const colorInfo = REVISION_COLORS[(nextVerNum - 1) % REVISION_COLORS.length];
    const newRev: ScreenplayRevision = {
      id: `rev-${nextVerNum}`,
      version: `v${nextVerNum}`,
      title: `${scriptTitle} - Rev. ${nextVerNum}`,
      color: colorInfo.badge,
      badgeColor: colorInfo.pill,
      updatedAt: 'Just now',
      author: currentUser?.name || 'Writer',
      elements: [...elements]
    };
    setRevisions([newRev, ...revisions]);
    setActiveRevisionId(newRev.id);
  };

  return (
    <div className={`flex h-screen w-full bg-[#f4f5f7] dark:bg-slate-950 text-slate-850 dark:text-slate-100 overflow-hidden font-sans select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      
      {/* ═══ 1. LEFT-MOST DARK ICON RIBBON (Desktop) ═══ */}
      <div className="hidden lg:flex w-16 bg-[#181a24] dark:bg-[#0a0a0a] flex-col items-center justify-between py-3.5 border-r border-slate-800/80 z-20 shrink-0">
        <div className="flex flex-col items-center gap-5 w-full">
          {/* Brand / Logo Ribbon Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 cursor-pointer">
            <Film className="w-5 h-5 stroke-[2.5]" />
          </div>

          {/* Workflow Steps */}
          <div className="flex flex-col items-center gap-2 w-full px-2">
            {[
              { id: 'write', label: 'Write', icon: Edit3 },
              { id: 'breakdown', label: 'Breakdown', icon: Tag },
              { id: 'plan', label: 'Plan', icon: BookOpen },
              { id: 'visualize', label: 'Visualize', icon: Eye },
              { id: 'shoot', label: 'Shoot', icon: Clapperboard },
            ].map(item => {
              const isActive = workflowTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWorkflowTab(item.id as any)}
                  className={`w-full py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative group ${
                    isActive 
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-4 h-4 stroke-[2.2]" />
                  <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Utility Tools */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          <button
            type="button"
            onClick={() => setWorkflowTab('settings')}
            className={`w-full py-2 rounded-xl flex flex-col items-center text-slate-400 hover:text-white transition-colors ${workflowTab === 'settings' ? 'text-amber-400' : ''}`}
            title="Settings"
          >
            <Sliders className="w-4 h-4" />
            <span className="text-[8.5px] font-semibold mt-0.5">Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkflowTab('resources')}
            className={`w-full py-2 rounded-xl flex flex-col items-center text-slate-400 hover:text-white transition-colors ${workflowTab === 'resources' ? 'text-amber-400' : ''}`}
            title="Resources"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[8.5px] font-semibold mt-0.5">Resources</span>
          </button>
        </div>
      </div>

      {/* ═══ 2. SCREENPLAY REVISIONS SIDEBAR (Desktop) ═══ */}
      <div className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 text-left z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Screenplay Revisions
          </h3>
          <button
            type="button"
            onClick={handleCreateNewRevision}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
            title="New Revision"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Revisions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {revisions.map((rev) => {
            const isSelected = rev.id === activeRevisionId;
            const revColorMatch = REVISION_COLORS.find(c => c.version === rev.version) || REVISION_COLORS[0];

            return (
              <div
                key={rev.id}
                onClick={() => setActiveRevisionId(rev.id)}
                className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs' 
                    : 'bg-white dark:bg-slate-900/60 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${revColorMatch.badge}`}>
                    {rev.version}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-rose-900 dark:text-rose-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {rev.title}
                    </p>
                    <span className="text-[9.5px] text-slate-400 block font-medium">
                      {rev.updatedAt} · {rev.author}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Revisions Footer Stats */}
        <div className="p-3.5 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
          <span>{revisions.length} Revisions Logged</span>
          <span className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">Compare</span>
        </div>
      </div>

      {/* ═══ MOBILE REVISIONS DRAWER OVERLAY ═══ */}
      <AnimatePresence>
        {isRevisionsOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRevisionsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-[min(85vw,300px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-10 text-left"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Revisions & Tools
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRevisionsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Revisions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {revisions.map((rev) => {
                  const isSelected = rev.id === activeRevisionId;
                  const revColorMatch = REVISION_COLORS.find(c => c.version === rev.version) || REVISION_COLORS[0];
                  return (
                    <div
                      key={rev.id}
                      onClick={() => {
                        setActiveRevisionId(rev.id);
                        setIsRevisionsOpen(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-xs' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${revColorMatch.badge}`}>
                          {rev.version}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{rev.title}</p>
                          <span className="text-[9px] text-slate-400">{rev.updatedAt}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleCreateNewRevision();
                    setIsRevisionsOpen(false);
                  }}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Revision</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ 3. MAIN WORKSPACE AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#eaedf1] dark:bg-[#000000] overflow-hidden">
        
        {/* ── TOP NAVIGATION BAR ── */}
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between shrink-0 z-20">
          
          {/* Left: Mobile Menu Toggle + Breadcrumb / Dropdown */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsRevisionsOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
              title="Revisions Menu"
            >
              <Film className="w-4 h-4" />
            </button>

            <div 
              onClick={() => setIsRevisionsOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-black text-slate-800 dark:text-white cursor-pointer hover:bg-slate-200 transition-colors max-w-[140px] sm:max-w-[220px]"
            >
              <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black shrink-0">{activeRevision.version}</span>
              <span className="truncate">{scriptTitle}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Document Mode Tabs */}
            <div className="hidden sm:flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-800 pl-2 md:pl-4">
              <button
                type="button"
                onClick={() => setActiveTab('screenplay')}
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-extrabold relative transition-colors cursor-pointer ${
                  activeTab === 'screenplay'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Screenplay</span>
                {activeTab === 'screenplay' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onBackToDocs) onBackToDocs();
                  else setActiveTab('docs');
                }}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Docs</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('av_scripts')}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
              >
                <Clapperboard className="w-3.5 h-3.5" />
                <span className="hidden md:inline">AV Scripts</span>
              </button>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* AI Assistant Button */}
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/20 hover:opacity-90 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Co-Writer</span>
            </button>

            {/* Toggle Comments Sidebar */}
            <button
              type="button"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isRightSidebarOpen 
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Toggle Comments"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Share / Export */}
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:block p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              title="Print Script"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:block p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── 4. SUB-TOOLBAR: SCREENPLAY ELEMENTS INJECTION BAR ── */}
        <div className="min-h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-1.5 flex items-center justify-between gap-3 shrink-0 z-10 overflow-x-auto scrollbar-none">
          
          {/* Current Script Revision Banner */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
              {activeRevision.title}
            </span>
          </div>

          {/* Quick Screenplay Elements Injector Buttons */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-none">
            {[
              { type: 'scene_heading', label: 'Scene Heading' },
              { type: 'action', label: 'Action' },
              { type: 'character', label: 'Character' },
              { type: 'parenthetical', label: 'Parenthetical' },
              { type: 'dialogue', label: 'Dialogue' },
              { type: 'transition', label: 'Transition' },
              { type: 'shot', label: 'Shot' },
            ].map(elem => (
              <button
                key={elem.type}
                type="button"
                onClick={() => handleAddElement(elem.type as any, selectedElementId || undefined)}
                className="px-2 sm:px-2.5 py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer shrink-0"
                title={`Add ${elem.label} (Press Tab to cycle)`}
              >
                {elem.label}
              </button>
            ))}
          </div>

          {/* Canvas Zoom Controls */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
              className="p-1 hover:text-slate-800 dark:hover:text-white"
            >
              -
            </button>
            <span>{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              className="p-1 hover:text-slate-800 dark:hover:text-white"
            >
              +
            </button>
          </div>
        </div>

        {/* ── 5. CENTER PAPER CANVAS ("Một tờ giấy" - Physical Page Canvas) ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-10 flex justify-center items-start scrollbar-thin">
          
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-full flex justify-center transition-transform duration-150"
          >
            {/* Authentic US Letter / A4 Screenplay Page */}
            <div className="w-full max-w-[820px] min-h-[900px] sm:min-h-[1100px] bg-white text-slate-900 shadow-2xl shadow-slate-900/15 rounded-sm p-5 sm:p-10 md:p-16 border border-slate-200/90 font-mono text-[12.5px] sm:text-[13.5px] leading-relaxed relative flex flex-col justify-between">
              
              {/* Header / Page Number (Screenplay Standard: Top Right) */}
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-8 select-none border-b border-dashed border-slate-100 pb-2">
                <span className="uppercase tracking-widest">{scriptTitle}</span>
                <span>1.</span>
              </div>

              {/* Screenplay Content Body */}
              <div className="space-y-4 flex-1 text-left">
                {numberedElements.map((el, idx) => {
                  const isSelected = selectedElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`relative group rounded p-1 transition-all ${
                        isSelected 
                          ? 'ring-2 ring-indigo-400 bg-indigo-50/20' 
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Left Hover Element Controls */}
                      <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(el.id);
                          }}
                          className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-500 shadow-xs"
                          title="Delete Element"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* 🎬 SCENE HEADING */}
                      {el.type === 'scene_heading' && (
                        <div className="flex items-center justify-between font-bold uppercase tracking-wider text-slate-950 font-mono my-4">
                          <span className="text-slate-400 font-bold select-none mr-3">{el.sceneNumber}</span>
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value.toUpperCase())}
                            onKeyDown={(e) => handleKeyDown(e, el, idx)}
                            className="flex-1 bg-transparent font-bold outline-none uppercase tracking-wider"
                          />
                          <span className="text-slate-400 font-bold select-none ml-3">{el.sceneNumber}</span>
                        </div>
                      )}

                      {/* 🏃 ACTION */}
                      {el.type === 'action' && (
                        <textarea
                          rows={Math.max(1, Math.ceil(el.text.length / 75))}
                          value={el.text}
                          onChange={(e) => handleUpdateElementText(el.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, el, idx)}
                          className="w-full bg-transparent resize-none outline-none leading-relaxed text-slate-900 font-mono block"
                        />
                      )}

                      {/* 👤 CHARACTER */}
                      {el.type === 'character' && (
                        <div className="w-full text-center mt-3 mb-0.5">
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value.toUpperCase())}
                            onKeyDown={(e) => handleKeyDown(e, el, idx)}
                            className="bg-transparent font-bold uppercase text-center outline-none tracking-widest text-slate-950 font-mono w-64"
                          />
                        </div>
                      )}

                      {/* 💭 PARENTHETICAL */}
                      {el.type === 'parenthetical' && (
                        <div className="w-full text-center my-0.5">
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, el, idx)}
                            className="bg-transparent italic text-center outline-none text-slate-600 font-mono text-xs w-64"
                          />
                        </div>
                      )}

                      {/* 💬 DIALOGUE */}
                      {el.type === 'dialogue' && (
                        <div className="max-w-[440px] mx-auto text-left">
                          <textarea
                            rows={Math.max(1, Math.ceil(el.text.length / 50))}
                            value={el.text}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, el, idx)}
                            className="w-full bg-transparent resize-none outline-none leading-normal text-slate-900 font-mono block"
                          />
                        </div>
                      )}

                      {/* ➡️ TRANSITION */}
                      {el.type === 'transition' && (
                        <div className="w-full text-right my-3">
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value.toUpperCase())}
                            onKeyDown={(e) => handleKeyDown(e, el, idx)}
                            className="bg-transparent font-bold uppercase text-right outline-none tracking-widest text-slate-900 font-mono w-48"
                          />
                        </div>
                      )}

                      {/* 🎥 SHOT */}
                      {el.type === 'shot' && (
                        <div className="w-full text-left font-bold uppercase tracking-wider text-slate-950 font-mono my-2">
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value.toUpperCase())}
                            onKeyDown={(e) => handleKeyDown(e, el, idx)}
                            className="w-full bg-transparent font-bold outline-none uppercase tracking-wider text-slate-950 font-mono"
                          />
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Footer Page Marking */}
              <div className="mt-12 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
                <span>DRAFT REVISION · STUDIOBINDER FORMAT</span>
                <span>END OF SCENE 2</span>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ═══ 6. RIGHT COLLABORATION & COMMENTS SIDEBAR ═══ */}
      <AnimatePresence>
        {isRightSidebarOpen && (
          <>
            {/* Mobile / Tablet Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRightSidebarOpen(false)}
              className="xl:hidden fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed xl:relative inset-y-0 right-0 z-40 w-[min(90vw,340px)] xl:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 text-left overflow-hidden shadow-2xl xl:shadow-none"
            >
            {/* Header / Project Name */}
            <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  Mission: Space Destro...
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsRightSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs: Comments | Who has access */}
            <div className="flex items-center border-b border-slate-150 dark:border-slate-800 px-4">
              <button
                type="button"
                onClick={() => setRightTab('comments')}
                className={`py-2.5 px-3 text-xs font-bold transition-colors relative cursor-pointer ${
                  rightTab === 'comments'
                    ? 'text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Comments
                {rightTab === 'comments' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setRightTab('access')}
                className={`py-2.5 px-3 text-xs font-bold transition-colors relative cursor-pointer ${
                  rightTab === 'access'
                    ? 'text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Who has access
                {rightTab === 'access' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              
              {/* TAB 1: COMMENTS */}
              {rightTab === 'comments' && (
                <div className="space-y-4">
                  {/* Top Add Comment trigger */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-850 dark:text-slate-200">
                      {selectedElementId ? 'Scene Element Selected' : 'Row 1.1'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingToId('new_root')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Add Comment
                    </button>
                  </div>

                  {/* New Comment Input Box */}
                  {replyingToId === 'new_root' && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <textarea
                        rows={2}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Write a feedback note on this row..."
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 outline-none focus:border-indigo-500 font-medium"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddComment}
                          className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments Thread List */}
                  <div className="space-y-3.5">
                    {comments.map(cmt => (
                      <div key={cmt.id} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={cmt.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                            alt={cmt.author}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{cmt.author}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{cmt.authorRole}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block">{cmt.createdAt}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {cmt.text}
                        </p>

                        {/* Reply Action */}
                        <div className="pt-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setReplyingToId(cmt.id)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Threaded Replies */}
                        {cmt.replies && cmt.replies.length > 0 && (
                          <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                            {cmt.replies.map(reply => (
                              <div key={reply.id} className="text-xs space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{reply.author}</span>
                                  <span className="text-[9px] text-slate-400">{reply.authorRole}</span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 font-normal">{reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Reply Form */}
                        {replyingToId === cmt.id && (
                          <div className="pt-2 flex gap-1.5">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Reply to this feedback..."
                              className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddReply(cmt.id)}
                              className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: WHO HAS ACCESS */}
              {rightTab === 'access' && (
                <div className="space-y-3 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Production Team Collaborators
                  </p>
                  {[
                    { name: 'Jared Prost', role: 'Producer', email: 'jared@studiobinder.com' },
                    { name: 'Jamie Martin', role: 'Director', email: 'jamie@studiobinder.com' },
                    { name: 'Xuan Hoang', role: 'Lead Screenwriter', email: 'writer@apexa.io' }
                  ].map(person => (
                    <div key={person.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{person.name}</p>
                        <p className="text-[10px] text-slate-400">{person.email}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        {person.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* ═══ 7. AI SCRIPT CO-WRITER MODAL ═══ */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Screenplay Assistant</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Tự động phát triển cảnh quay, hội thoại và cấu trúc theo chuẩn kịch bản</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Yêu cầu nội dung kịch bản:
                </label>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ví dụ: Viết tiếp cảnh Maya và Hugo chạy trốn khỏi rừng Birch, đối mặt với thủ lĩnh thợ săn..."
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-medium resize-none"
                />
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Viết tiếp cảnh tiếp theo',
                  'Tạo cao trào kịch tính',
                  'Thêm lời thoại sâu sắc',
                  'Chuyển cảnh sang đêm'
                ].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAiPrompt(p)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  onClick={handleGenerateWithAi}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAiGenerating ? 'Đang viết kịch bản...' : 'Tạo cảnh ngay'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
