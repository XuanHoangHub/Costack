"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, Sun, Palette, Settings, Database, Copy, Check, Volume2, VolumeX, 
  Layers, Sparkles, Bell, BellOff, Info, Clock, Sliders, ShieldCheck,
  Briefcase, Trash2, Edit2, Plus, X, ChevronRight, AlertTriangle
} from 'lucide-react';

interface NotificationSettings {
  enableAll: boolean;
  enableSound: boolean;
  onlyImportant: boolean;
  enableAssignments: boolean;
  enableDeadlines: boolean;
  enableComments: boolean;
  enableStatusChanges: boolean;
  enableFilteringTags: boolean;
  enableSystemNotify: boolean;
  toastDuration: number;
  dndActive: boolean;
  frequencyLimit: 'all' | 'throttled' | 'minimal';
}

export const WORKSPACE_COVERS = [
  { id: 'cover1', name: 'Amethyst', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover2', name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover3', name: 'Green Valley', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover4', name: 'Peaceful Lake', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover5', name: 'City Town', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover6', name: 'Desert Sunrise', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5edd0cd9?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover7', name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1483168527879-c66136b56105?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover8', name: 'Deep Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80' }
];

interface SettingsPanelProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  accentPreset: 'indigo' | 'ocean' | 'forest' | 'sunset';
  setAccentPreset: (val: 'indigo' | 'ocean' | 'forest' | 'sunset') => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  blurIntensity: 'soft' | 'default' | 'immersive';
  setBlurIntensity: (val: 'soft' | 'default' | 'immersive') => void;
  notificationSettings: NotificationSettings;
  setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  workspaces?: any[];
  activeWorkspaceId?: string;
  onUpdateWorkspace?: (id: string, name: string, theme: string, coverUrl?: string, logoUrl?: string, settings?: any) => void;
  onDeleteWorkspace?: (id: string) => void;
  onAddWorkspace?: (name: string, theme: string, coverUrl?: string) => void;
  members?: any[];
}

export default function SettingsPanel({
  isDarkMode,
  setIsDarkMode,
  accentPreset,
  setAccentPreset,
  soundEnabled,
  setSoundEnabled,
  blurIntensity,
  setBlurIntensity,
  notificationSettings,
  setNotificationSettings,
  workspaces = [],
  activeWorkspaceId = 'w2',
  onUpdateWorkspace,
  onDeleteWorkspace,
  onAddWorkspace,
  members = []
}: SettingsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'personal' | 'workspace'>('personal');

  // Local states for editing individual workspaces inline
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editWSName, setEditWSName] = useState<string>('');
  const [editWSTheme, setEditWSTheme] = useState<'indigo' | 'ocean' | 'forest' | 'sunset'>('indigo');
  const [editWSCover, setEditWSCover] = useState<string>('');

  // Local state for quickly creating a workspace inline
  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [newWSName, setNewWSName] = useState<string>('');
  const [newWSTheme, setNewWSTheme] = useState<'indigo' | 'ocean' | 'forest' | 'sunset'>('indigo');
  const [newWSCover, setNewWSCover] = useState<string>('');

  // Confirmation state for deleting a workspace
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  const startEditWorkspace = (ws: any) => {
    setEditingWorkspaceId(ws.id);
    setEditWSName(ws.name);
    setEditWSTheme(ws.theme || 'indigo');
    setEditWSCover(ws.coverUrl || '');
  };

  const saveWorkspaceEdit = (id: string) => {
    if (!editWSName.trim()) return;
    if (onUpdateWorkspace) {
      onUpdateWorkspace(id, editWSName.trim(), editWSTheme, editWSCover);
    }
    setEditingWorkspaceId(null);
  };

  const handleQuickCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWSName.trim()) return;
    if (onAddWorkspace) {
      onAddWorkspace(newWSName.trim(), newWSTheme, newWSCover);
    }
    setNewWSName('');
    setNewWSCover('');
    setShowQuickCreate(false);
  };

  const sqlCode = `-- 1. Tạo bảng workspaces lưu trữ Không gian làm việc
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT DEFAULT 'indigo',
    initial TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    "coverUrl" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật Row Level Security (RLS) để cô lập dữ liệu người dùng
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Tạo nguyên tắc truy cập (Policies) cho người dùng đăng nhập
CREATE POLICY "Cho phép đọc mọi workspaces" ON public.workspaces
    FOR SELECT USING (true);

CREATE POLICY "Cho phép người dùng tạo workspace của họ" ON public.workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép cập nhật workspace của chính mình" ON public.workspaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Cho phép xóa workspace của chính mình" ON public.workspaces
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Thêm cột workspace_id vào các bảng Tasks, Docs và Members hiện có
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS workspace_id TEXT;

-- 2b. Tạo các bảng Spaces và Lists và cột liên kết cho Tasks
CREATE TABLE IF NOT EXISTS public.spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    theme_color TEXT,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    folders JSONB DEFAULT '[]'::jsonb,
    whiteboards JSONB DEFAULT '[]'::jsonb,
    channels JSONB DEFAULT '[]'::jsonb,
    statuses JSONB DEFAULT '[]'::jsonb,
    click_apps JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép đọc spaces của chính mình" ON public.spaces
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Cho phép tạo spaces của họ" ON public.spaces
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Cho phép cập nhật spaces của chính mình" ON public.spaces
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Cho phép xóa spaces của chính mình" ON public.spaces
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE TABLE IF NOT EXISTS public.lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    space_id TEXT REFERENCES public.spaces(id) ON DELETE CASCADE,
    folder_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép đọc lists của chính mình" ON public.lists
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Cho phép tạo lists của họ" ON public.lists
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Cho phép cập nhật lists của chính mình" ON public.lists
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Cho phép xóa lists của chính mình" ON public.lists
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS space_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS list_id TEXT;

-- Bật Realtime cho các bảng Spaces và Lists nếu publication tồn tại
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'spaces'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.spaces;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'lists'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.lists;
        END IF;
    END IF;
END $$;

-- 3. Tạo bảng calendar_events lưu trữ sự kiện lịch biểu cục bộ đồng bộ
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    description TEXT,
    start_time TEXT, -- dateTime ISO string
    end_time TEXT,   -- dateTime ISO string
    color TEXT DEFAULT '#4285F4',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc calendar_events của chính mình" ON public.calendar_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Cho phép tạo calendar_events của họ" ON public.calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cho phép cập nhật calendar_events của chính mình" ON public.calendar_events
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Cho phép xóa calendar_events của chính mình" ON public.calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Tạo bảng habits lưu trữ thói quen kỷ luật bản thân
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    history JSONB DEFAULT '{}'::jsonb,
    streak INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc habits của chính mình" ON public.habits
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Cho phép tạo habits của họ" ON public.habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cho phép cập nhật habits của chính mình" ON public.habits
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Cho phép xóa habits của chính mình" ON public.habits
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Tạo bảng focus_sessions lưu trữ phiên tập trung Pomodoro
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id TEXT PRIMARY KEY,
    duration_minutes INTEGER NOT NULL,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc focus_sessions của chính mình" ON public.focus_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Cho phép tạo focus_sessions của họ" ON public.focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cho phép cập nhật focus_sessions của chính mình" ON public.focus_sessions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Cho phép xóa focus_sessions của chính mình" ON public.focus_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Cấu hình Storage Bucket và chính sách cho Avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Cho phép truy cập công khai ảnh đại diện" ON storage.objects;
CREATE POLICY "Cho phép truy cập công khai ảnh đại diện" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Cho phép người dùng tải ảnh lên thư mục của mình" ON storage.objects;
CREATE POLICY "Cho phép người dùng tải ảnh lên thư mục của mình" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Cho phép người dùng cập nhật ảnh của mình" ON storage.objects;
CREATE POLICY "Cho phép người dùng cập nhật ảnh của mình" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Cho phép người dùng xóa ảnh của mình" ON storage.objects;
CREATE POLICY "Cho phép người dùng xóa ảnh của mình" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presets = [
    { id: 'indigo', name: 'Avaxa Violet', color: 'bg-indigo-500', hex: '#7B61FF' },
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-sky-500', hex: '#0ea5e9' },
    { id: 'forest', name: 'Forest Green', color: 'bg-emerald-500', hex: '#10b981' },
    { id: 'sunset', name: 'Sunset Pink', color: 'bg-rose-500', hex: '#f43f5e' }
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 dark:text-slate-55 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            System Settings
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Configure personalization and fine-tune your Avaxa OS workspace interface</p>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
        <button 
          onClick={() => setActiveSubTab('personal')}
          className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer ${activeSubTab === 'personal' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'}`}
        >
          System Personalization
          {activeSubTab === 'personal' && (
            <motion.div layoutId="settingsTabIndicator" className="absolute bottom-0 inset-x-2 h-[2px] bg-indigo-650 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveSubTab('workspace')}
          className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer ${activeSubTab === 'workspace' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'}`}
        >
          Workspace Settings
          {activeSubTab === 'workspace' && (
            <motion.div layoutId="settingsTabIndicator" className="absolute bottom-0 inset-x-2 h-[2px] bg-indigo-650 rounded-full" />
          )}
        </button>
      </div>

      {activeSubTab === 'personal' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dark Mode Card - Forced light mode */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <Sun className="w-5 h-5 text-indigo-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pure Light Mode</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">App is locked to pure crystalline light theme</p>
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
            ✨ <span className="font-bold text-slate-800">Minimalism:</span> To ensure visual harmony and consistency, dark mode and custom blur panels have been disabled in favor of the pure light theme layout.
          </div>
        </motion.div>

        {/* Accent Colors */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-5"
        >
           <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <Palette className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-50">Accent Color</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Personalize your primary workspace highlight color</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-55/40 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-800/60 transition-colors">
            <span className="text-xs font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none font-sans">
              ACCENT COLOR
            </span>
            <div className="flex items-center gap-4">
              {presets.map(p => {
                const isActive = accentPreset === p.id;
                let ringColorClass = '';
                if (p.id === 'indigo') ringColorClass = 'ring-indigo-500';
                else if (p.id === 'ocean') ringColorClass = 'ring-sky-500';
                else if (p.id === 'forest') ringColorClass = 'ring-emerald-500';
                else ringColorClass = 'ring-rose-500';

                return (
                  <button
                    key={p.id}
                    onClick={() => setAccentPreset(p.id as any)}
                    className={`w-6 h-6 rounded-full transition-all duration-200 cursor-pointer outline-none ${
                      isActive 
                        ? `ring-2 ring-offset-2 ${ringColorClass} scale-110 dark:ring-offset-slate-900` 
                        : 'hover:scale-110 opacity-90 hover:opacity-100'
                    } ${p.color}`}
                    title={p.name}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Interactive Sound Effects Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-indigo-500">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-500 animate-pulse" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-50">Interactive Sound Effects (Haptic Audio)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Play subtle interface sounds when switching tabs, clicking buttons, or completing tasks</p>
            </div>
          </div>

          <div className="flex w-full bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            <button
              onClick={() => {
                setSoundEnabled(true);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${soundEnabled ? 'bg-white shadow-sm text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 border border-slate-200/40 dark:border-slate-700/60' : 'text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Enable Sound
            </button>
            <button
              onClick={() => setSoundEnabled(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${!soundEnabled ? 'bg-white shadow-sm text-slate-700 dark:bg-slate-800 dark:text-slate-450 border border-slate-200/40 dark:border-slate-700/60' : 'text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              Mute
            </button>
          </div>
        </motion.div>

        {/* Glassmorphism Blur Strength Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-indigo-500">
              <Layers className="w-5 h-5 text-indigo-500 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-55 flex items-center gap-1.5">
                <span>Glassmorphism Blur Strength (Blur Effect)</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Customize the glass blur effect depth on background panels</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            {[
              { id: 'soft', name: 'Soft (8px)' },
              { id: 'default', name: 'Default (16px)' },
              { id: 'immersive', name: 'Immersive (28px)' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setBlurIntensity(b.id as any)}
                className={`py-2 px-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${blurIntensity === b.id ? 'bg-white shadow-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 border border-slate-200/40 dark:border-slate-700/60' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350'}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 🔔 CÀI ĐẶT THÔNG BÁO CO-WORKING MASTER CONTROL */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-6 md:p-8 bg-white dark:bg-slate-905 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-500 relative">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {notificationSettings.dndActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-55 flex items-center gap-2">
                Smart Notification Settings
                {notificationSettings.dndActive && (
                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-100 dark:border-rose-900/30">
                    DND Enabled
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Fine-tune notification frequency, alerts, and sounds to maintain maximum focus and productivity.
              </p>
            </div>
          </div>

          {/* Master quick switches */}
          <div className="flex items-center gap-2.5 bg-slate-105 dark:bg-slate-950 p-1 rounded-xl self-start sm:self-center">
            <button
              type="button"
              onClick={() => setNotificationSettings(prev => ({ ...prev, enableAll: !prev.enableAll }))}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                notificationSettings.enableAll
                  ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/20 dark:border-slate-750'
                  : 'text-slate-505 dark:text-slate-400'
              }`}
            >
              Enable Notifications
            </button>
            <button
              type="button"
              onClick={() => setNotificationSettings(prev => ({ ...prev, dndActive: !prev.dndActive }))}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                notificationSettings.dndActive
                  ? 'bg-rose-505 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 shadow-xs border border-rose-200/40 dark:border-rose-900/50'
                  : 'text-slate-505 dark:text-slate-400'
              }`}
            >
              Do Not Disturb Mode (DND)
            </button>
          </div>
        </div>

        {/* 1. Tần suất & Tránh gây phiền */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-350 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Frequency & Spam Filter
            </h4>
            <p className="text-[11px] text-slate-455 dark:text-slate-500 leading-relaxed mb-3">
              Smart soundproofing moderates rapid consecutive updates (such as clicking tag filters quickly, moving boards, or rapid chat messages).
            </p>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800/80">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="frequencyLimit"
                  checked={notificationSettings.frequencyLimit === 'all'}
                  onChange={() => setNotificationSettings(prev => ({ ...prev, frequencyLimit: 'all' }))}
                  className="mt-0.5 rounded-full text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <div>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">All Notifications (Real-time)</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500">Deliver all notifications immediately in real time.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none border-t border-slate-200/40 dark:border-slate-800/50 pt-2.5">
                <input
                  type="radio"
                  name="frequencyLimit"
                  checked={notificationSettings.frequencyLimit === 'throttled'}
                  onChange={() => setNotificationSettings(prev => ({ ...prev, frequencyLimit: 'throttled' }))}
                  className="mt-0.5 rounded-full text-indigo-505 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <div>
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block flex items-center gap-1">
                    Throttled (Anti-Annoy) 🛡️
                  </span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500">
                    Debounce duplicate notifications for 3s, capped at 1 notification per 1.5s.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none border-t border-slate-200/40 dark:border-slate-800/50 pt-2.5">
                <input
                  type="radio"
                  name="frequencyLimit"
                  checked={notificationSettings.frequencyLimit === 'minimal'}
                  onChange={() => setNotificationSettings(prev => ({ ...prev, frequencyLimit: 'minimal' }))}
                  className="mt-0.5 rounded-full text-indigo-505 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <div>
                  <span className="text-xs font-extrabold text-slate-705 dark:text-slate-300 block">Minimal (Essential Only)</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500">Only notify urgent/high priority events, limited to once every 5 seconds.</span>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Thiết lập bộ lọc theo phân loại */}
          <div className="space-y-3 lg:col-span-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-350 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              Alert Content Subscriptions
            </h4>
            <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-relaxed mb-1">
              Toggle specific event categories to narrow down the floating notification popups in the corner.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80">
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-305">New Assignments (Assignments)</span>
                  <p className="text-[9.5px] text-slate-450 dark:text-slate-500">Alert when a new task is assigned to a member</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.enableAssignments}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableAssignments: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-305">Task Deadlines (Deadlines)</span>
                  <p className="text-[9.5px] text-slate-455 dark:text-slate-500">Alert for approaching due dates and deadlines</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.enableDeadlines}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableDeadlines: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-305">Comments & Chat (Comments)</span>
                  <p className="text-[9.5px] text-slate-455 dark:text-slate-500">Alert when colleagues send chat messages or comments</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.enableComments}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableComments: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-305">Status Transitions (Status)</span>
                  <p className="text-[9.5px] text-slate-455 dark:text-slate-500">Alert when a task changes status columns</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.enableStatusChanges}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableStatusChanges: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-105 dark:hover:bg-slate-900/40 transition-colors cursor-pointer select-none border border-amber-500/10 bg-amber-500/5">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">Tag Filtering Popup (Anti-Annoy)</span>
                  <p className="text-[9.5px] text-slate-455 dark:text-slate-550">Show a floating notification every time a hashtag is filtered</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.enableFilteringTags}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableFilteringTags: e.target.checked }))}
                  className="rounded text-rose-505 focus:ring-rose-505 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-305">System Activity (System Logs)</span>
                  <p className="text-[9.5px] text-slate-455 dark:text-slate-500">Alert when workspaces are created, synced, deleted, or restored</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.enableSystemNotify}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableSystemNotify: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 3. Tùy chỉnh chi tiết khác */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-150 dark:border-slate-800/80 pt-4">
          {/* Thời lượng hiển thị */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-705 dark:text-slate-350 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              Notification Toast Duration
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              {[
                { id: 2200, label: 'Fast (2.2s)' },
                { id: 4000, label: 'Medium (4.0s)' },
                { id: 7500, label: 'Persistent (7.5s)' }
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setNotificationSettings(prev => ({ ...prev, toastDuration: item.id }))}
                  className={`py-2 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                    notificationSettings.toastDuration === item.id
                      ? 'bg-white shadow-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 border border-slate-200/40'
                      : 'text-slate-505 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-305'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Âm báo & bộ lọc nâng cao */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-750 dark:text-slate-350 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              Activity Event Sound Alerts
            </span>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificationSettings.enableSound}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableSound: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-650 dark:text-slate-350">Chime sounds</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificationSettings.onlyImportant}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, onlyImportant: e.target.checked }))}
                  className="rounded text-indigo-505 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-650 dark:text-slate-350">Urgent events only</span>
              </label>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 💼 QUẢN TRỊ KHÔNG GIAN LÀM VIỆC (WORKSPACE ADMINISTRATION) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="p-6 md:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-500">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2">
                Workspace Administration
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Create new, edit details, or delete workspaces to segment workflows systematically.
              </p>
            </div>
          </div>

          <button
            id="ws_btn_quick_create_toggle"
            type="button"
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 transition-colors text-xs font-black text-indigo-600 dark:text-indigo-400 cursor-pointer self-start sm:self-center"
          >
            {showQuickCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showQuickCreate ? 'Cancel' : 'Add Workspace'}</span>
          </button>
        </div>

        {/* Inline Quick Create Workspace Panel */}
        <AnimatePresence>
          {showQuickCreate && (
            <motion.form
              id="ws_form_quick_create"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleQuickCreateWorkspace}
              className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="new_ws_name" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">New Workspace Name</label>
                  <input
                    id="new_ws_name"
                    type="text"
                    required
                    value={newWSName}
                    onChange={(e) => setNewWSName(e.target.value)}
                    placeholder="E.g., Web Design, Finance..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Choose Accent Theme</span>
                  <div className="flex gap-2.5 pt-1">
                    {[
                      { id: 'indigo', color: 'bg-indigo-500', name: 'Purple' },
                      { id: 'ocean', color: 'bg-sky-500', name: 'Blue' },
                      { id: 'forest', color: 'bg-emerald-500', name: 'Green' },
                      { id: 'sunset', color: 'bg-rose-500', name: 'Rose' }
                    ].map(themeItem => (
                      <button
                        key={themeItem.id}
                        type="button"
                        onClick={() => setNewWSTheme(themeItem.id as any)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${newWSTheme === themeItem.id ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950' : 'opacity-80 hover:scale-105'}`}
                      >
                        <span className={`w-5 h-5 rounded-full ${themeItem.color} block`} title={themeItem.name} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cover choice section */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Select Background Cover (Cover Gallery)</span>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setNewWSCover('')}
                    className={`relative shrink-0 w-16 h-11 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${!newWSCover ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-sm' : 'border-dashed border-slate-200 dark:border-slate-850'}`}
                  >
                    <span className="text-[8px] font-bold text-slate-400">Default</span>
                    {!newWSCover && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                  </button>
                  {WORKSPACE_COVERS.map(cover => (
                    <button
                      key={cover.id}
                      type="button"
                      onClick={() => setNewWSCover(cover.url)}
                      className={`relative shrink-0 w-16 h-11 rounded-lg border overflow-hidden transition-all group cursor-pointer ${newWSCover === cover.url ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30' : 'border-slate-200/65 dark:border-slate-800 opacity-80 hover:opacity-100'}`}
                    >
                      <img
                        src={cover.url}
                        alt={cover.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 text-[6px] font-black text-white text-center py-0.5 truncate px-1 uppercase tracking-tight">
                        {cover.name}
                      </div>
                      {newWSCover === cover.url && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800/60">
                <button
                  id="ws_btn_quick_create_cancel"
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  id="ws_btn_quick_create_submit"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-xs font-black"
                >
                  Create Workspace
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Workspaces List and Inline Editing panels */}
        <div className="space-y-3.5">
          {workspaces.map((ws) => {
            const isEditing = editingWorkspaceId === ws.id;
            const isActive = activeWorkspaceId === ws.id;
            const badgeBg = ws.theme === 'indigo' ? 'bg-indigo-500' :
                            ws.theme === 'ocean' ? 'bg-sky-500' :
                            ws.theme === 'forest' ? 'bg-emerald-500' : 'bg-rose-500';

            return (
              <div 
                key={ws.id}
                id={`ws_item_${ws.id}`}
                className={`p-4 rounded-2xl border transition-all ${isActive ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-950/40'}`}
              >
                {isEditing ? (
                  // Inline edit mode
                  <div className="space-y-4">
                    <div className="text-[10px] font-extrabold uppercase text-indigo-500 tracking-wider">Editing Workspace</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor={`edit_ws_name_${ws.id}`} className="text-[9.5px] font-bold text-slate-400 block">Workspace Name</label>
                        <input
                          id={`edit_ws_name_${ws.id}`}
                          type="text"
                          value={editWSName}
                          onChange={(e) => setEditWSName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-bold text-slate-400 block">Accent Color</span>
                        <div className="flex gap-2.5 pt-0.5">
                          {[
                            { id: 'indigo', color: 'bg-indigo-500' },
                            { id: 'ocean', color: 'bg-sky-500' },
                            { id: 'forest', color: 'bg-emerald-500' },
                            { id: 'sunset', color: 'bg-rose-500' }
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setEditWSTheme(t.id as any)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${editWSTheme === t.id ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950' : 'opacity-80'}`}
                            >
                              <span className={`w-4 h-4 rounded-full ${t.color} block`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cover selection for inline edit */}
                      <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800/45">
                        <span className="text-[9.5px] font-bold text-slate-400 block">Change Background Cover (Cover Background)</span>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => setEditWSCover('')}
                            className={`relative shrink-0 w-16 h-11 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${!editWSCover ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-sm' : 'border-dashed border-slate-200 dark:border-slate-850'}`}
                          >
                            <span className="text-[8px] font-bold text-slate-400">Default</span>
                            {!editWSCover && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                          </button>
                          {WORKSPACE_COVERS.map(cover => (
                            <button
                              key={cover.id}
                              type="button"
                              onClick={() => setEditWSCover(cover.url)}
                              className={`relative shrink-0 w-16 h-11 rounded-lg border overflow-hidden transition-all group cursor-pointer ${editWSCover === cover.url ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30' : 'border-slate-200/65 dark:border-slate-800 opacity-80 hover:opacity-100'}`}
                            >
                              <img
                                src={cover.url}
                                alt={cover.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-black/50 text-[6px] font-black text-white text-center py-0.5 truncate px-1 uppercase tracking-tight">
                                {cover.name}
                              </div>
                              {editWSCover === cover.url && (
                                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">
                                  ✓
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800/50">
                      <button
                        id={`ws_edit_cancel_${ws.id}`}
                        type="button"
                        onClick={() => setEditingWorkspaceId(null)}
                        className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        id={`ws_edit_save_${ws.id}`}
                        type="button"
                        onClick={() => saveWorkspaceEdit(ws.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-black"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ) : (
                  // Standard view mode
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-16 h-10 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0 select-none overflow-hidden relative"
                        style={ws.coverUrl ? {
                          backgroundImage: `url(${ws.coverUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        } : undefined}
                      >
                        {!ws.coverUrl && <div className={`absolute inset-0 ${badgeBg}`} />}
                        {ws.coverUrl && <div className="absolute inset-0 bg-slate-950/40" />}
                        <span className="relative z-10 font-sans font-extrabold tracking-wide drop-shadow-sm">{ws.initial || ws.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{ws.name}</span>
                          {isActive && (
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          ID: <code className="font-mono text-indigo-500/90">{ws.id}</code> · Accent Theme: 
                          <span className="capitalize font-semibold ml-1">
                            {ws.theme === 'indigo' ? 'Purple' :
                             ws.theme === 'ocean' ? 'Blue' :
                             ws.theme === 'forest' ? 'Green' : 'Rose'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0 shrink-0">
                      <button
                        id={`ws_action_edit_${ws.id}`}
                        onClick={() => startEditWorkspace(ws)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isActive && (
                        <button
                          id={`ws_action_delete_${ws.id}`}
                          onClick={() => {
                            if (workspaces.length <= 1) {
                              return;
                            }
                            setWorkspaceToDelete(ws);
                            setDeleteConfirmText('');
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                          title="Delete Workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Supabase Integration SQL Setup Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
              <Database className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-50">Workspace Sync Integration via Supabase</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Initialize and structure your workspaces tables on your Supabase project backend.</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 max-sm:w-full justify-center transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy SQL Setup Code'}</span>
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
          <p>
            The <strong>Avaxa OS</strong> management system integrates a built-in real-time two-way synchronization data channel (Realtime Postgres Engine) with Supabase. By establishing the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-indigo-500 text-[10px]">workspaces</code> table and database relation columns, activities across different workspaces are perfectly partitioned.
          </p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <span className="text-base select-none mt-0.5">💡</span>
            <span>
              <strong>Tip:</strong> Please log in to your <strong>Supabase Dashboard</strong>, navigate to the <strong>SQL Editor</strong>, open a new query sheet, paste the SQL script below, and click <strong>Run</strong> to finalize the database schema initialization.
            </span>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] max-h-[220px] overflow-y-auto p-4 text-slate-700 dark:text-slate-300">
          <pre className="whitespace-pre-wrap">{sqlCode}</pre>
        </div>
      </motion.div>
        </>
      )}

      {activeSubTab === 'workspace' && (() => {
         const activeWS = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
         if (!activeWS) return <div className="text-center py-10 text-slate-400 italic">No active workspaces found.</div>;

         const clickApps = activeWS.settings?.defaultClickApps || {
           timeTracking: true,
           multipleAssignees: true,
           customFields: true,
           relationships: true,
           subtasks: true,
           priorities: true
         };

         return (
           <div className="space-y-6">
             {/* Logo and Name edit */}
             <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4 text-left">
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <Briefcase className="w-4 h-4 text-indigo-500" />
                 General Workspace Info
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-405 dark:text-slate-500">Workspace Name</label>
                   <input
                     type="text"
                     value={activeWS.name}
                     onChange={e => {
                       onUpdateWorkspace?.(activeWS.id, e.target.value, activeWS.theme, activeWS.coverUrl, activeWS.logoUrl, activeWS.settings);
                     }}
                     className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white outline-none"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-405 dark:text-slate-500">Logo URL</label>
                   <input
                     type="text"
                     value={activeWS.logoUrl || ''}
                     onChange={e => {
                       onUpdateWorkspace?.(activeWS.id, activeWS.name, activeWS.theme, activeWS.coverUrl, e.target.value, activeWS.settings);
                     }}
                     placeholder="e.g. https://domain.com/logo.png"
                     className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white outline-none"
                   />
                 </div>
               </div>
             </div>

             {/* Global ClickApps Settings */}
             <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4 text-left">
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <Sliders className="w-4 h-4 text-indigo-500" />
                 Global ClickApps
               </h3>
               <p className="text-[11px] text-slate-455 dark:text-slate-500">Enable or disable advanced features globally for this entire workspace</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                 {[
                   { key: 'timeTracking', label: 'Time Tracking' },
                   { key: 'multipleAssignees', label: 'Multiple Assignees' },
                   { key: 'customFields', label: 'Custom Fields' },
                   { key: 'relationships', label: 'Relationships' },
                   { key: 'subtasks', label: 'Subtasks' },
                   { key: 'priorities', label: 'Priorities' }
                 ].map(app => (
                   <label key={app.key} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors text-xs font-bold text-slate-700 dark:text-slate-350">
                     <span>{app.label}</span>
                     <input
                       type="checkbox"
                       checked={!!clickApps[app.key]}
                       onChange={e => {
                         const updatedClickApps = { ...clickApps, [app.key]: e.target.checked };
                         const updatedSettings = { ...activeWS.settings, defaultClickApps: updatedClickApps };
                         onUpdateWorkspace?.(activeWS.id, activeWS.name, activeWS.theme, activeWS.coverUrl, activeWS.logoUrl, updatedSettings);
                       }}
                       className="rounded text-indigo-650 w-4 h-4 cursor-pointer"
                     />
                   </label>
                 ))}
               </div>
             </div>

             {/* Member Management */}
             <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4 text-left">
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-indigo-500" />
                 Manage Workspace Members
               </h3>
               
               <div className="space-y-3.5">
                 {members.map(member => (
                   <div key={member.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50/70 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                     <div className="flex items-center gap-3">
                       <img src={member.avatar} className="w-8 h-8 rounded-full border border-slate-200 object-cover" alt={member.name} />
                       <div>
                         <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{member.name}</span>
                         <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Email: {member.name.toLowerCase().replace(/\s+/g, '')}@avaxa.com</span>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                       <select
                         value={member.role || 'member'}
                         onChange={e => {
                           alert(`Changed ${member.name}'s role to: ${e.target.value.toUpperCase()}`);
                         }}
                         className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-300 cursor-pointer outline-none"
                       >
                         <option value="owner">Owner</option>
                         <option value="admin">Admin</option>
                         <option value="member">Member</option>
                         <option value="guest">Guest</option>
                       </select>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         );
      })()}

      {/* Secure Workspace Delete Confirmation Popup Modal */}
      <AnimatePresence>
        {workspaceToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-150 dark:border-slate-800"
              id="delete_workspace_confirmation_modal"
            >
              {/* Header */}
              <div className="p-6 border-b border-rose-100 dark:border-rose-950/30 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/10">
                <div className="flex items-center gap-2 text-rose-650 dark:text-rose-450">
                  <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
                  <span className="font-display font-black text-rose-600 dark:text-rose-405 text-base">Confirm Workspace Deletion</span>
                </div>
                <button
                  onClick={() => setWorkspaceToDelete(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 font-sans text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  This action <strong>cannot be undone</strong>. All data related to the workspace <strong className="text-slate-800 dark:text-slate-100">"{workspaceToDelete.name}"</strong>, including tasks, wiki summaries, and chats, will be permanently deleted from this device and the cloud.
                </p>

                <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 p-3.5 rounded-2xl text-[11px] text-amber-700 dark:text-amber-300">
                  Please type the exact name of the workspace below to confirm you want to delete it:
                  <div className="mt-1.5 font-mono bg-amber-500/5 dark:bg-black/20 p-1 px-2 rounded border border-amber-550/20 text-center text-xs select-all text-amber-800 dark:text-amber-200 font-black">
                    {workspaceToDelete.name}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm_ws_name_input" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Enter the Workspace name to confirm</label>
                  <input
                    id="confirm_ws_name_input"
                    type="text"
                    required
                    placeholder={`E.g., ${workspaceToDelete.name}`}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-750 focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none dark:text-slate-100 font-semibold"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 px-6 bg-slate-50/50 dark:bg-slate-850/20 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3">
                <button
                  id="confirm_cancel_delete_ws"
                  type="button"
                  onClick={() => setWorkspaceToDelete(null)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-[11px] font-extrabold text-slate-500 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm_submit_delete_ws"
                  type="button"
                  disabled={deleteConfirmText !== workspaceToDelete.name}
                  onClick={() => {
                    if (onDeleteWorkspace) {
                      onDeleteWorkspace(workspaceToDelete.id);
                    }
                    (window as any).playSystemSound?.('success');
                    setWorkspaceToDelete(null);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 ${
                    deleteConfirmText === workspaceToDelete.name
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-150 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
