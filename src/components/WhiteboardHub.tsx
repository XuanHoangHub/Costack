"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WhiteboardProject, WhiteboardBoard, WhiteboardElement, Task, User } from '../types';
import Whiteboard from './Whiteboard';
import { 
  Plus, Search, Pencil, Trash2, Check, X, LayoutGrid, List,
  Sparkles, ChevronRight, FolderKanban, Star, Clock, Copy,
  ArrowRight, FolderPlus, Layers, Layout, ArrowLeft, MoreVertical,
  MoveRight, SlidersHorizontal, Shapes, FileText, CheckCircle2,
  Share2, Download, ExternalLink, Palette, Smile
} from 'lucide-react';

interface WhiteboardHubProps {
  activeWorkspaceId: string;
  members: User[];
  tasks: Task[];
  isOffline: boolean;
  currentUser?: any;
  onUpgradePremium?: () => void;
  onAddSyncLog: (action: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  spaces?: any[]; // optional backwards compatibility
  onSaveSpaces?: any;
}

// Preset Color Palettes for Projects
const PROJECT_COLORS = [
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800/60', text: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'Sky', value: '#0ea5e9', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800/60', text: 'text-sky-600 dark:text-sky-400' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/60', text: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800/60', text: 'text-amber-600 dark:text-amber-400' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/60', text: 'text-rose-600 dark:text-rose-400' },
  { name: 'Purple', value: '#a855f7', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800/60', text: 'text-purple-600 dark:text-purple-400' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800/60', text: 'text-pink-600 dark:text-pink-400' },
  { name: 'Slate', value: '#64748b', bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700/60', text: 'text-slate-600 dark:text-slate-400' },
];

const PROJECT_EMOJIS = ['🚀', '🏗️', '🎨', '💡', '📊', '⚡', '📱', '🏛️', '🎯', '⚙️', '🌟', '🔥'];

// Preset Templates
const TEMPLATE_DEFINITIONS = [
  {
    id: 'mindmap',
    name: 'Sơ đồ Tư duy (Mindmap)',
    category: 'Brainstorming',
    desc: 'Ý tưởng cốt lõi ở trung tâm với các nhánh tỏa ra xung quanh cho từng hạng mục',
    icon: '🗺️',
    gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    accentColor: '#6366f1'
  },
  {
    id: 'flowchart',
    name: 'Lưu đồ Quy trình (Flowchart)',
    category: 'Engineering',
    desc: 'Các khối Bắt đầu, Xử lý tiến trình, Điểm rẽ nhánh điều kiện và Cơ sở dữ liệu',
    icon: '🔀',
    gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
    accentColor: '#0ea5e9'
  },
  {
    id: 'kanban',
    name: 'Sprint Retro & Kanban Sticky',
    category: 'Agile',
    desc: '3 cột To Do, In Progress, Done trực quan với các thẻ Sticky note đa màu sắc',
    icon: '📋',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    accentColor: '#10b981'
  },
  {
    id: 'swot',
    name: 'Ma trận Phân tích SWOT',
    category: 'Strategy',
    desc: '4 ô Điểm mạnh (Strengths), Điểm yếu (Weaknesses), Cơ hội (Opportunities), Thách thức (Threats)',
    icon: '💡',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    accentColor: '#f59e0b'
  },
  {
    id: 'userjourney',
    name: 'Hành trình Khách hàng (User Journey)',
    category: 'Product UX',
    desc: '4 giai đoạn: Khám phá, Trải nghiệm thử, Đăng ký mua và Gắn bó thân thiết',
    icon: '🚀',
    gradient: 'from-pink-500/20 via-rose-500/10 to-transparent',
    accentColor: '#ec4899'
  },
  {
    id: 'architecture',
    name: 'Kiến trúc Hệ thống (System Architecture)',
    category: 'Engineering',
    desc: 'Sơ đồ luồng Client Web/Mobile, API Gateway, Microservices và CSDL Cloud',
    icon: '🏛️',
    gradient: 'from-violet-500/20 via-indigo-500/10 to-transparent',
    accentColor: '#8b5cf6'
  },
  {
    id: 'wireframe',
    name: 'Khung Giao diện (UI Wireframe)',
    category: 'Design',
    desc: 'Bố cục khung Navbar, Hero banner, Lưới thẻ tính năng và Nút kêu gọi hành động (CTA)',
    icon: '📱',
    gradient: 'from-cyan-500/20 via-sky-500/10 to-transparent',
    accentColor: '#06b6d4'
  }
];

// Helper to generate template elements for a new board
const generateTemplateElements = (type: string): WhiteboardElement[] => {
  const now = Date.now();
  switch (type) {
    case 'mindmap':
      return [
        { id: `m-0-${now}`, type: 'circle', x: 280, y: 180, width: 140, height: 90, color: '#6366f1', text: 'Ý TƯỞNG CỐT LÕI\n(Core Concept)' },
        { id: `m-1-${now}`, type: 'sticky', x: 80, y: 60, width: 130, height: 110, color: '#fef08a', text: 'Thiết kế UI/UX\n- Giao diện tối/sáng\n- Mobile responsive' },
        { id: `m-2-${now}`, type: 'sticky', x: 480, y: 60, width: 130, height: 110, color: '#bae6fd', text: 'Backend & API\n- Realtime Sync\n- Microservices' },
        { id: `m-3-${now}`, type: 'sticky', x: 80, y: 310, width: 130, height: 110, color: '#bbf7d0', text: 'Trí tuệ Nhân tạo AI\n- Tự động hóa tác vụ\n- Phân tích sơ đồ' },
        { id: `m-4-${now}`, type: 'sticky', x: 480, y: 310, width: 130, height: 110, color: '#fbcfe8', text: 'Vận hành & Mở rộng\n- Đa người dùng\n- Bảo mật dữ liệu' },
        { id: `m-l1-${now}`, type: 'line', x: 210, y: 120, points: { fromId: `m-1-${now}`, toId: `m-0-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#6366f1' },
        { id: `m-l2-${now}`, type: 'line', x: 480, y: 120, points: { fromId: `m-2-${now}`, toId: `m-0-${now}`, fromSocket: 'left', toSocket: 'right' }, color: '#6366f1' },
        { id: `m-l3-${now}`, type: 'line', x: 210, y: 340, points: { fromId: `m-3-${now}`, toId: `m-0-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#6366f1' },
        { id: `m-l4-${now}`, type: 'line', x: 480, y: 340, points: { fromId: `m-4-${now}`, toId: `m-0-${now}`, fromSocket: 'left', toSocket: 'right' }, color: '#6366f1' },
      ];
    case 'flowchart':
      return [
        { id: `f-1-${now}`, type: 'pill', x: 80, y: 160, width: 120, height: 60, color: '#6366f1', text: 'Bắt đầu (Start)' },
        { id: `f-2-${now}`, type: 'rectangle', x: 260, y: 155, width: 140, height: 70, color: '#0ea5e9', text: 'Xử lý Yêu cầu\n(Process Request)' },
        { id: `f-3-${now}`, type: 'diamond', x: 460, y: 140, width: 130, height: 100, color: '#f59e0b', text: 'Hợp lệ?\n(Validate)' },
        { id: `f-4-${now}`, type: 'cylinder', x: 465, y: 290, width: 120, height: 75, color: '#10b981', text: 'Ghi vào CSDL\n(Save DB)' },
        { id: `f-5-${now}`, type: 'pill', x: 650, y: 160, width: 120, height: 60, color: '#6366f1', text: 'Hoàn tất (End)' },
        { id: `f-l1-${now}`, type: 'line', x: 200, y: 190, points: { fromId: `f-1-${now}`, toId: `f-2-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#0ea5e9' },
        { id: `f-l2-${now}`, type: 'line', x: 400, y: 190, points: { fromId: `f-2-${now}`, toId: `f-3-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#0ea5e9' },
        { id: `f-l3-${now}`, type: 'line', x: 590, y: 190, points: { fromId: `f-3-${now}`, toId: `f-5-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#10b981' },
        { id: `f-l4-${now}`, type: 'line', x: 525, y: 240, points: { fromId: `f-3-${now}`, toId: `f-4-${now}`, fromSocket: 'bottom', toSocket: 'top' }, color: '#f59e0b' },
      ];
    case 'kanban':
      return [
        { id: `k-1-${now}`, type: 'sticky', x: 60, y: 60, width: 160, height: 160, color: '#fef08a', text: '📌 CẦN LÀM (TO DO)\n\n• Thiết kế layout dự án\n• Viết API docs\n• Chuẩn bị slide thuyết trình' },
        { id: `k-2-${now}`, type: 'sticky', x: 260, y: 60, width: 160, height: 160, color: '#bae6fd', text: '⚡ ĐANG LÀM (IN PROGRESS)\n\n• Tích hợp AI Whiteboard\n• Nâng cấp giao diện Canvas\n• Test đồng bộ Realtime' },
        { id: `k-3-${now}`, type: 'sticky', x: 460, y: 60, width: 160, height: 160, color: '#bbf7d0', text: '✅ HOÀN THÀNH (DONE)\n\n• Setup cơ sở dữ liệu\n• Tách độc lập khỏi Space\n• Thêm bộ chọn mẫu Template' },
      ];
    case 'swot':
      return [
        { id: `s-1-${now}`, type: 'sticky', x: 60, y: 60, width: 180, height: 150, color: '#bbf7d0', text: '💪 STRENGTHS (Điểm mạnh)\n\n• Giao diện trực quan, mượt mà\n• Hỗ trợ AI tự động trích xuất Task\n• Hoạt động độc lập không phụ thuộc' },
        { id: `s-2-${now}`, type: 'sticky', x: 280, y: 60, width: 180, height: 150, color: '#fecaca', text: '⚠️ WEAKNESSES (Điểm yếu)\n\n• Người dùng mới cần làm quen\n• Cần thêm các icon linh kiện mẫu' },
        { id: `s-3-${now}`, type: 'sticky', x: 60, y: 240, width: 180, height: 150, color: '#bae6fd', text: '🚀 OPPORTUNITIES (Cơ hội)\n\n• Nhu cầu sơ đồ hóa ý tưởng cao\n• Mở rộng hợp tác nhóm thời gian thực' },
        { id: `s-4-${now}`, type: 'sticky', x: 280, y: 240, width: 180, height: 150, color: '#fef08a', text: '🛡️ THREATS (Thách thức)\n\n• Nhiều công cụ vẽ cạnh tranh\n• Yêu cầu tối ưu hiệu năng liên tục' },
      ];
    case 'userjourney':
      return [
        { id: `uj-1-${now}`, type: 'sticky', x: 50, y: 90, width: 140, height: 140, color: '#bae6fd', text: '1. KHÁM PHÁ (Discover)\n\n• Tìm kiếm qua Google\n• Xem video demo\n• Đọc bài viết giới thiệu' },
        { id: `uj-2-${now}`, type: 'sticky', x: 220, y: 90, width: 140, height: 140, color: '#fef08a', text: '2. TRẢI NGHIỆM (Try)\n\n• Tạo tài khoản miễn phí\n• Khởi tạo dự án đầu tiên\n• Mời bạn bè cùng vẽ' },
        { id: `uj-3-${now}`, type: 'sticky', x: 390, y: 90, width: 140, height: 140, color: '#bbf7d0', text: '3. NÂNG CẤP (Buy)\n\n• Chọn gói Premium\n• Sử dụng AI không giới hạn\n• Xuất báo cáo chất lượng cao' },
        { id: `uj-4-${now}`, type: 'sticky', x: 560, y: 90, width: 140, height: 140, color: '#fbcfe8', text: '4. GẮN BÓ (Love)\n\n• Sử dụng hàng ngày\n• Giới thiệu cho đồng nghiệp\n• Đánh giá 5 sao' },
      ];
    case 'architecture':
      return [
        { id: `ar-1-${now}`, type: 'rectangle', x: 60, y: 150, width: 130, height: 80, color: '#0ea5e9', text: 'Client Web / App\n(Next.js & React)' },
        { id: `ar-2-${now}`, type: 'rectangle', x: 240, y: 150, width: 130, height: 80, color: '#6366f1', text: 'API Gateway &\nAuth Shield' },
        { id: `ar-3-${now}`, type: 'rectangle', x: 420, y: 70, width: 140, height: 75, color: '#ec4899', text: 'Whiteboard Engine\n(WebSocket Realtime)' },
        { id: `ar-4-${now}`, type: 'rectangle', x: 420, y: 230, width: 140, height: 75, color: '#f59e0b', text: 'AI Analysis Worker\n(Gemini)' },
        { id: `ar-5-${now}`, type: 'cylinder', x: 620, y: 150, width: 130, height: 85, color: '#10b981', text: 'Supabase Cloud\nPostgreSQL & Storage' },
        { id: `ar-l1-${now}`, type: 'line', x: 190, y: 190, points: { fromId: `ar-1-${now}`, toId: `ar-2-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#0ea5e9' },
        { id: `ar-l2-${now}`, type: 'line', x: 370, y: 160, points: { fromId: `ar-2-${now}`, toId: `ar-3-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#ec4899' },
        { id: `ar-l3-${now}`, type: 'line', x: 370, y: 210, points: { fromId: `ar-2-${now}`, toId: `ar-4-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#f59e0b' },
        { id: `ar-l4-${now}`, type: 'line', x: 560, y: 110, points: { fromId: `ar-3-${now}`, toId: `ar-5-${now}`, fromSocket: 'right', toSocket: 'left' }, color: '#10b981' },
      ];
    case 'wireframe':
      return [
        { id: `wf-1-${now}`, type: 'rectangle', x: 60, y: 50, width: 500, height: 50, color: '#64748b', text: 'Header Navigation: Logo | Trang chủ | Dự án | Tính năng | [Đăng nhập]' },
        { id: `wf-2-${now}`, type: 'rectangle', x: 60, y: 115, width: 500, height: 110, color: '#6366f1', text: 'Hero Section:\nTIÊU ĐỀ CHÍNH NỔI BẬT\nMô tả giải pháp & Nút dùng thử miễn phí' },
        { id: `wf-3-${now}`, type: 'rectangle', x: 60, y: 240, width: 155, height: 100, color: '#0ea5e9', text: 'Thẻ Tính năng 1:\nQuản lý Dự án' },
        { id: `wf-4-${now}`, type: 'rectangle', x: 232, y: 240, width: 155, height: 100, color: '#10b981', text: 'Thẻ Tính năng 2:\nVẽ Sơ đồ AI' },
        { id: `wf-5-${now}`, type: 'rectangle', x: 405, y: 240, width: 155, height: 100, color: '#f59e0b', text: 'Thẻ Tính năng 3:\nĐồng bộ Realtime' },
      ];
    default:
      return [];
  }
};

export default function WhiteboardHub({
  activeWorkspaceId,
  members,
  tasks,
  isOffline,
  currentUser,
  onUpgradePremium,
  onAddSyncLog,
  onAddTask,
  triggerToast
}: WhiteboardHubProps) {
  // Navigation & Studio State
  const [currentView, setCurrentView] = useState<'dashboard' | 'studio'>('dashboard');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  
  // Filter & Search
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all'); // 'all' | 'unassigned' | projectId
  const [filterCategory, setFilterCategory] = useState<'all' | 'favorites' | 'recent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Core Data Collections
  const [projects, setProjects] = useState<WhiteboardProject[]>([]);
  const [boards, setBoards] = useState<WhiteboardBoard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<WhiteboardProject | null>(null);
  const [movingBoard, setMovingBoard] = useState<WhiteboardBoard | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'project' | 'board'; item: any } | null>(null);

  // Form states for Create Project
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0].value);
  const [newProjectEmoji, setNewProjectEmoji] = useState(PROJECT_EMOJIS[0]);

  // Form states for Create Board
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardProjectId, setNewBoardProjectId] = useState<string>('');
  const [newBoardTemplate, setNewBoardTemplate] = useState<string>('blank');

  // Studio Drawer State
  const [isStudioDrawerOpen, setIsStudioDrawerOpen] = useState(false);

  // 1. Initial Data Loading & Seeding
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const projectStorageKey = `apexa_wb_projects_${activeWorkspaceId}`;
    const boardStorageKey = `apexa_wb_boards_${activeWorkspaceId}`;

    try {
      const savedProjects = localStorage.getItem(projectStorageKey);
      const savedBoards = localStorage.getItem(boardStorageKey);

      let parsedProjects: WhiteboardProject[] = savedProjects ? JSON.parse(savedProjects) : [];
      let parsedBoards: WhiteboardBoard[] = savedBoards ? JSON.parse(savedBoards) : [];

      // Seed if workspace has no whiteboard projects yet
      if (parsedProjects.length === 0 && parsedBoards.length === 0) {
        const now = new Date().toISOString();
        const p1Id = `proj-strategy-${Date.now()}`;
        const p2Id = `proj-arch-${Date.now() + 1}`;
        const p3Id = `proj-design-${Date.now() + 2}`;

        parsedProjects = [
          {
            id: p1Id,
            workspaceId: activeWorkspaceId,
            name: 'Kế hoạch Sản phẩm & Chiến lược',
            description: 'Sơ đồ tư duy định hướng sản phẩm, lộ trình tính năng và trải nghiệm người dùng',
            color: '#6366f1',
            emoji: '🚀',
            createdAt: now,
            updatedAt: now,
            isFavorite: true
          },
          {
            id: p2Id,
            workspaceId: activeWorkspaceId,
            name: 'Kiến trúc Hệ thống & Kỹ thuật',
            description: 'Lưu đồ xử lý dữ liệu, thiết kế Microservices và cơ chế đồng bộ',
            color: '#0ea5e9',
            emoji: '🏗️',
            createdAt: now,
            updatedAt: now,
            isFavorite: false
          },
          {
            id: p3Id,
            workspaceId: activeWorkspaceId,
            name: 'Thiết kế UI/UX & Ý tưởng',
            description: 'Wireframe giao diện, sơ đồ màn hình và bảng Agile Retrospective',
            color: '#ec4899',
            emoji: '🎨',
            createdAt: now,
            updatedAt: now,
            isFavorite: false
          }
        ];

        const b1Id = `wb-seed-1-${Date.now()}`;
        const b2Id = `wb-seed-2-${Date.now() + 1}`;
        const b3Id = `wb-seed-3-${Date.now() + 2}`;
        const b4Id = `wb-seed-4-${Date.now() + 3}`;

        parsedBoards = [
          {
            id: b1Id,
            projectId: p1Id,
            workspaceId: activeWorkspaceId,
            name: 'Sơ đồ Tư duy Tính năng (Mindmap)',
            description: 'Phân tích các trụ cột phát triển chính của nền tảng',
            createdAt: now,
            updatedAt: now,
            isFavorite: true,
            templateType: 'mindmap',
            elementsCount: 9
          },
          {
            id: b2Id,
            projectId: p1Id,
            workspaceId: activeWorkspaceId,
            name: 'Hành trình Khách hàng (User Journey)',
            description: 'Quy trình trải nghiệm từ Khám phá đến Mua hàng và Gắn bó',
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
            templateType: 'userjourney',
            elementsCount: 4
          },
          {
            id: b3Id,
            projectId: p2Id,
            workspaceId: activeWorkspaceId,
            name: 'Lưu đồ Xử lý Yêu cầu (Flowchart)',
            description: 'Quy trình tiếp nhận, xác thực và ghi nhận dữ liệu',
            createdAt: now,
            updatedAt: now,
            isFavorite: true,
            templateType: 'flowchart',
            elementsCount: 9
          },
          {
            id: b4Id,
            projectId: p3Id,
            workspaceId: activeWorkspaceId,
            name: 'Khung Giao diện Màn hình (Wireframe)',
            description: 'Bố cục trang chủ và các khối chức năng tương tác',
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
            templateType: 'wireframe',
            elementsCount: 5
          }
        ];

        // Seed initial elements into local storage for each board
        localStorage.setItem(`apexa_whiteboard_${b1Id}`, JSON.stringify(generateTemplateElements('mindmap')));
        localStorage.setItem(`apexa_whiteboard_${b2Id}`, JSON.stringify(generateTemplateElements('userjourney')));
        localStorage.setItem(`apexa_whiteboard_${b3Id}`, JSON.stringify(generateTemplateElements('flowchart')));
        localStorage.setItem(`apexa_whiteboard_${b4Id}`, JSON.stringify(generateTemplateElements('wireframe')));

        localStorage.setItem(projectStorageKey, JSON.stringify(parsedProjects));
        localStorage.setItem(boardStorageKey, JSON.stringify(parsedBoards));
      }

      setProjects(parsedProjects);
      setBoards(parsedBoards);
      setIsLoaded(true);
    } catch (e) {
      console.error('Failed to load whiteboard projects data:', e);
    }
  }, [activeWorkspaceId]);

  // Save projects to localStorage
  const saveProjects = useCallback((newProjects: WhiteboardProject[]) => {
    setProjects(newProjects);
    if (activeWorkspaceId) {
      localStorage.setItem(`apexa_wb_projects_${activeWorkspaceId}`, JSON.stringify(newProjects));
    }
  }, [activeWorkspaceId]);

  // Save boards to localStorage
  const saveBoards = useCallback((newBoards: WhiteboardBoard[]) => {
    setBoards(newBoards);
    if (activeWorkspaceId) {
      localStorage.setItem(`apexa_wb_boards_${activeWorkspaceId}`, JSON.stringify(newBoards));
    }
  }, [activeWorkspaceId]);

  // Filtered Boards Computation
  const filteredBoards = useMemo(() => {
    let result = [...boards];

    // Filter by Project
    if (selectedProjectFilter === 'unassigned') {
      result = result.filter(b => !b.projectId);
    } else if (selectedProjectFilter !== 'all') {
      result = result.filter(b => b.projectId === selectedProjectFilter);
    }

    // Filter by Category
    if (filterCategory === 'favorites') {
      result = result.filter(b => b.isFavorite);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.name.toLowerCase().includes(q) || 
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Sort by recent updatedAt descending
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return result;
  }, [boards, selectedProjectFilter, filterCategory, searchQuery]);

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, WhiteboardProject>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  // Active Board object
  const activeBoard = useMemo(() => {
    return boards.find(b => b.id === activeBoardId) || null;
  }, [boards, activeBoardId]);

  // Active Project for the current active board
  const activeBoardProject = useMemo(() => {
    if (!activeBoard || !activeBoard.projectId) return null;
    return projectMap.get(activeBoard.projectId) || null;
  }, [activeBoard, projectMap]);

  // Metrics computation
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const totalBoards = boards.length;
    const totalFavorites = boards.filter(b => b.isFavorite).length;
    const totalElements = boards.reduce((acc, b) => acc + (b.elementsCount || 0), 0);
    return { totalProjects, totalBoards, totalFavorites, totalElements };
  }, [projects, boards]);

  // ─── PROJECT CRUD HANDLERS ───
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const now = new Date().toISOString();
    const newProject: WhiteboardProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: activeWorkspaceId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      color: newProjectColor,
      emoji: newProjectEmoji,
      createdAt: now,
      updatedAt: now,
      isFavorite: false
    };

    const updated = [newProject, ...projects];
    saveProjects(updated);
    setShowCreateProjectModal(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setSelectedProjectFilter(newProject.id);
    onAddSyncLog(`Whiteboard: Tạo dự án "${newProject.name}"`);
    if (triggerToast) triggerToast('success', 'Đã tạo Dự án', `Dự án "${newProject.name}" đã được khởi tạo thành công.`);
  };

  const handleUpdateProject = (proj: WhiteboardProject) => {
    const updated = projects.map(p => p.id === proj.id ? { ...proj, updatedAt: new Date().toISOString() } : p);
    saveProjects(updated);
    setEditingProject(null);
    onAddSyncLog(`Whiteboard: Cập nhật dự án "${proj.name}"`);
    if (triggerToast) triggerToast('success', 'Đã cập nhật Dự án', 'Thông tin dự án đã được lưu.');
  };

  const handleToggleFavoriteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = projects.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
    saveProjects(updated);
  };

  const handleDeleteProject = (proj: WhiteboardProject) => {
    const updatedProjects = projects.filter(p => p.id !== proj.id);
    // Unassign boards from this project
    const updatedBoards = boards.map(b => b.projectId === proj.id ? { ...b, projectId: undefined } : b);
    saveProjects(updatedProjects);
    saveBoards(updatedBoards);
    if (selectedProjectFilter === proj.id) setSelectedProjectFilter('all');
    setDeleteConfirmTarget(null);
    onAddSyncLog(`Whiteboard: Xóa dự án "${proj.name}"`);
    if (triggerToast) triggerToast('info', 'Đã xóa Dự án', `Dự án "${proj.name}" đã được gỡ bỏ.`);
  };

  // ─── BOARD CRUD HANDLERS ───
  const handleCreateBoard = () => {
    if (!newBoardName.trim()) return;
    const now = new Date().toISOString();
    const newBoardId = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Generate template elements if chosen
    let initialCount = 0;
    if (newBoardTemplate && newBoardTemplate !== 'blank') {
      const templateEls = generateTemplateElements(newBoardTemplate);
      initialCount = templateEls.length;
      localStorage.setItem(`apexa_whiteboard_${newBoardId}`, JSON.stringify(templateEls));
    }

    const newBoard: WhiteboardBoard = {
      id: newBoardId,
      projectId: newBoardProjectId || (selectedProjectFilter !== 'all' && selectedProjectFilter !== 'unassigned' ? selectedProjectFilter : undefined),
      workspaceId: activeWorkspaceId,
      name: newBoardName.trim(),
      description: newBoardDesc.trim(),
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      templateType: newBoardTemplate,
      elementsCount: initialCount
    };

    const updated = [newBoard, ...boards];
    saveBoards(updated);
    setShowCreateBoardModal(false);
    setNewBoardName('');
    setNewBoardDesc('');
    setNewBoardProjectId('');
    setNewBoardTemplate('blank');

    // Open newly created board immediately in Studio
    setActiveBoardId(newBoardId);
    setCurrentView('studio');
    onAddSyncLog(`Whiteboard: Tạo bảng trắng "${newBoard.name}"`);
    if (triggerToast) triggerToast('success', 'Đã tạo Bảng trắng', `Bảng "${newBoard.name}" đã sẵn sàng.`);
  };

  const handleCreateBoardFromTemplate = (templateId: string) => {
    const template = TEMPLATE_DEFINITIONS.find(t => t.id === templateId);
    const now = new Date().toISOString();
    const newBoardId = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    const templateEls = generateTemplateElements(templateId);
    localStorage.setItem(`apexa_whiteboard_${newBoardId}`, JSON.stringify(templateEls));

    const newBoard: WhiteboardBoard = {
      id: newBoardId,
      projectId: selectedProjectFilter !== 'all' && selectedProjectFilter !== 'unassigned' ? selectedProjectFilter : (projects[0]?.id || undefined),
      workspaceId: activeWorkspaceId,
      name: `${template?.name || 'Mẫu Sơ đồ'} (${new Date().toLocaleDateString('vi-VN')})`,
      description: template?.desc || '',
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      templateType: templateId,
      elementsCount: templateEls.length
    };

    const updated = [newBoard, ...boards];
    saveBoards(updated);
    setShowTemplateModal(false);

    setActiveBoardId(newBoardId);
    setCurrentView('studio');
    onAddSyncLog(`Whiteboard: Khởi tạo bảng từ mẫu "${template?.name}"`);
    if (triggerToast) triggerToast('success', 'Đã tạo từ Mẫu', `Đã tạo "${newBoard.name}".`);
  };

  const handleRenameBoard = (boardId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = boards.map(b => b.id === boardId ? { ...b, name: newName.trim(), updatedAt: new Date().toISOString() } : b);
    saveBoards(updated);
    onAddSyncLog(`Whiteboard: Đổi tên bảng thành "${newName.trim()}"`);
  };

  const handleDuplicateBoard = (board: WhiteboardBoard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const now = new Date().toISOString();
    const newBoardId = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Copy element storage
    const originalElements = localStorage.getItem(`apexa_whiteboard_${board.id}`);
    if (originalElements) {
      localStorage.setItem(`apexa_whiteboard_${newBoardId}`, originalElements);
    }

    const duplicated: WhiteboardBoard = {
      ...board,
      id: newBoardId,
      name: `${board.name} (Bản sao)`,
      createdAt: now,
      updatedAt: now,
      isFavorite: false
    };

    const updated = [duplicated, ...boards];
    saveBoards(updated);
    onAddSyncLog(`Whiteboard: Nhân bản bảng "${board.name}"`);
    if (triggerToast) triggerToast('success', 'Đã nhân bản Bảng', `Đã tạo "${duplicated.name}".`);
  };

  const handleToggleFavoriteBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = boards.map(b => b.id === id ? { ...b, isFavorite: !b.isFavorite } : b);
    saveBoards(updated);
  };

  const handleMoveBoard = (boardId: string, targetProjectId?: string) => {
    const updated = boards.map(b => b.id === boardId ? { ...b, projectId: targetProjectId || undefined, updatedAt: new Date().toISOString() } : b);
    saveBoards(updated);
    setMovingBoard(null);
    onAddSyncLog(`Whiteboard: Chuyển bảng sang dự án mới`);
    if (triggerToast) triggerToast('success', 'Đã di chuyển Bảng', 'Bảng trắng đã được phân bổ vào dự án đích.');
  };

  const handleDeleteBoard = (board: WhiteboardBoard) => {
    const updated = boards.filter(b => b.id !== board.id);
    saveBoards(updated);
    try {
      localStorage.removeItem(`apexa_whiteboard_${board.id}`);
    } catch {}
    if (activeBoardId === board.id) {
      setActiveBoardId(null);
      setCurrentView('dashboard');
    }
    setDeleteConfirmTarget(null);
    onAddSyncLog(`Whiteboard: Xóa bảng "${board.name}"`);
    if (triggerToast) triggerToast('info', 'Đã xóa Bảng trắng', `Bảng "${board.name}" đã được xóa.`);
  };

  const handleOpenBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    setCurrentView('studio');
    // Update board element count from local storage
    try {
      const raw = localStorage.getItem(`apexa_whiteboard_${boardId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = boards.map(b => b.id === boardId ? { ...b, elementsCount: parsed.length, updatedAt: new Date().toISOString() } : b);
          saveBoards(updated);
        }
      }
    } catch {}
  };

  return (
    <div className="w-full h-[calc(100dvh-130px)] min-h-[640px] flex flex-col bg-[#f8f9fc] dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden select-none">
      
      {/* ========================================================================= */}
      {/* 1. STUDIO VIEW (FULLSCREEN-CAPABLE CANVAS STUDIO)                          */}
      {/* ========================================================================= */}
      {currentView === 'studio' && activeBoard ? (
        <div className="relative w-full h-full flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-slate-900">
          
          {/* Collapsible Left Project/Board Switcher Drawer for Studio Mode */}
          <AnimatePresence>
            {isStudioDrawerOpen && (
              <motion.div
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                className="absolute inset-y-0 left-0 z-50 w-[270px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{activeBoardProject?.emoji || '📁'}</span>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-white truncate">
                      {activeBoardProject?.name || 'Tất cả Bảng trắng'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsStudioDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1">
                    Bảng vẽ trong dự án
                  </div>
                  {boards
                    .filter(b => activeBoard.projectId ? b.projectId === activeBoard.projectId : true)
                    .map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          handleOpenBoard(b.id);
                          setIsStudioDrawerOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          b.id === activeBoard.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                        {b.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </button>
                    ))}
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsStudioDrawerOpen(false);
                      setCurrentView('dashboard');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại Dashboard</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Integrated Canvas Engine */}
          <div className="flex-1 min-h-0 relative">
            <Whiteboard
              members={members}
              isOffline={isOffline}
              onAddSyncLog={onAddSyncLog}
              whiteboardId={activeBoard.id}
              projectId={activeBoard.projectId}
              projectName={activeBoardProject?.name || 'Dự án chung'}
              workspaceId={activeWorkspaceId}
              onAddTask={onAddTask}
              tasks={tasks}
              currentUser={currentUser}
              onUpgradePremium={onUpgradePremium}
              boardName={activeBoard.name}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onRenameBoard={(name) => handleRenameBoard(activeBoard.id, name)}
            />
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. DASHBOARD VIEW (WHITEBOARD PROJECTS & BOARDS HUB)                     */
        /* ========================================================================= */
        <div className="apexa-whiteboards w-full h-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          
          {/* Hero Banner & Global Actions */}
          <div className="p-5 md:p-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Branding and Title */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Bảng trắng & ý tưởng
                    </h1>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Không gian sáng tạo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quản lý không gian tư duy đa dự án, phác thảo lưu đồ quy trình, kiến trúc hệ thống và wireframe trực quan
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Kho Mẫu Sơ đồ</span>
                </button>

                <button
                  onClick={() => {
                    setNewProjectName('');
                    setNewProjectDesc('');
                    setShowCreateProjectModal(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>+ Tạo Dự án</span>
                </button>

                <button
                  onClick={() => {
                    setNewBoardName('');
                    setNewBoardDesc('');
                    setNewBoardProjectId(selectedProjectFilter !== 'all' && selectedProjectFilter !== 'unassigned' ? selectedProjectFilter : (projects[0]?.id || ''));
                    setShowCreateBoardModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo Bảng trắng</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  📁
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Dự án hoạt động</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{metrics.totalProjects} dự án</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                  🎨
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Tổng số Bảng vẽ</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{metrics.totalBoards} bảng</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                  ⭐
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Bảng Yêu thích</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{metrics.totalFavorites} bảng</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  💡
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Ý tưởng & Hình khối</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{metrics.totalElements} phần tử</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Body: Projects & Whiteboard Grid */}
          <div className="p-5 md:p-6 space-y-6 flex-1">
            
            {/* Project Filter Pills & Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => {
                    setSelectedProjectFilter('all');
                    setFilterCategory('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedProjectFilter === 'all' && filterCategory === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span>Tất cả Bảng</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 dark:bg-slate-200 text-slate-200 dark:text-slate-800">
                    {boards.length}
                  </span>
                </button>

                <button
                  onClick={() => setFilterCategory('favorites')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filterCategory === 'favorites'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Yêu thích</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                    {metrics.totalFavorites}
                  </span>
                </button>

                <div className="w-[1px] h-5 bg-slate-200 dark:border-slate-800 mx-1 shrink-0" />

                {/* Individual Projects */}
                {projects.map(proj => {
                  const count = boards.filter(b => b.projectId === proj.id).length;
                  const isSelected = selectedProjectFilter === proj.id && filterCategory !== 'favorites';
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectFilter(proj.id);
                        setFilterCategory('all');
                      }}
                      className={`group px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">{proj.emoji || '📁'}</span>
                      <span className="truncate max-w-[130px]">{proj.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected ? 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {count}
                      </span>
                      
                      {/* Project action dropdown trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(proj);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-opacity"
                        title="Tùy chỉnh Dự án"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Search & Layout toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm bảng trắng, ý tưởng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none w-48 lg:w-60 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs">
                  <button
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${layoutMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Hiển thị dạng lưới"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${layoutMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Hiển thị dạng danh sách"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Template Starters Showcase Row */}
            <div className="apexa-whiteboard-templates bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 p-4 rounded-2xl border border-indigo-100/80 dark:border-indigo-950/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                    Khởi tạo nhanh từ Mẫu Sơ đồ Chuẩn (Templates)
                  </h3>
                </div>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Xem tất cả {TEMPLATE_DEFINITIONS.length} mẫu</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {TEMPLATE_DEFINITIONS.slice(0, 6).map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleCreateBoardFromTemplate(tpl.id)}
                    className="group text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xl mb-1.5 group-hover:scale-110 transition-transform origin-left">
                        {tpl.icon}
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block truncate group-hover:text-indigo-600">
                        {tpl.name.split(' (')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                        {tpl.category}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Dùng mẫu</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Whiteboard Cards Grid or List */}
            {filteredBoards.length > 0 ? (
              layoutMode === 'grid' ? (
                <div className="apexa-module-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBoards.map(board => {
                    const project = board.projectId ? projectMap.get(board.projectId) : null;
                    return (
                      <motion.div
                        key={board.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="apexa-whiteboard-card group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                        onClick={() => handleOpenBoard(board.id)}
                      >
                        {/* Canvas Miniature Header / Visual Pattern */}
                        <div className="h-28 relative bg-slate-50 dark:bg-slate-950 p-3 flex flex-col justify-between overflow-hidden border-b border-slate-100 dark:border-slate-800/60">
                          {/* Background Grid Pattern */}
                          <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:12px_12px]" />
                          
                          {/* Top Badges */}
                          <div className="relative z-10 flex items-center justify-between gap-2">
                            {project ? (
                              <span 
                                className="px-2 py-0.5 text-[10px] font-bold rounded-lg flex items-center gap-1 border"
                                style={{
                                  backgroundColor: `${project.color}15`,
                                  borderColor: `${project.color}40`,
                                  color: project.color
                                }}
                              >
                                <span>{project.emoji || '📁'}</span>
                                <span className="truncate max-w-[110px]">{project.name}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                Bảng độc lập
                              </span>
                            )}

                            {/* Favorite Button */}
                            <button
                              onClick={(e) => handleToggleFavoriteBoard(board.id, e)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                board.isFavorite 
                                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' 
                                  : 'text-slate-300 hover:text-amber-400 hover:bg-white dark:hover:bg-slate-800'
                              }`}
                              title={board.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                            >
                              <Star className={`w-3.5 h-3.5 ${board.isFavorite ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>

                          {/* Center Abstract Preview Shapes */}
                          <div className="relative z-10 flex items-center justify-center gap-2 opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all">
                            <div className="w-7 h-5 rounded bg-indigo-500/20 border border-indigo-500/40" />
                            <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/40" />
                            <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 rotate-45" />
                          </div>

                          {/* Bottom Stats */}
                          <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            <span>{board.elementsCount ? `${board.elementsCount} phần tử` : 'Bảng trống'}</span>
                            <span className="capitalize">{board.templateType ? `Mẫu ${board.templateType}` : 'Tùy chỉnh'}</span>
                          </div>
                        </div>

                        {/* Card Content & Action footer */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {board.name}
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 mt-1">
                              {board.description || 'Không có mô tả chi tiết cho bảng này.'}
                            </p>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(board.updatedAt).toLocaleDateString('vi-VN')}</span>
                            </div>

                            {/* Actions Dropdown / Quick Buttons */}
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDuplicateBoard(board)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Nhân bản bảng vẽ"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setMovingBoard(board)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                title="Chuyển sang Dự án khác"
                              >
                                <FolderKanban className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTarget({ type: 'board', item: board })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Xóa bảng trắng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBoards.map(board => {
                    const project = board.projectId ? projectMap.get(board.projectId) : null;
                    return (
                      <div
                        key={board.id}
                        onClick={() => handleOpenBoard(board.id)}
                        className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 shrink-0">
                            <Shapes className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {board.name}
                              </h4>
                              {board.isFavorite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {board.description || 'Chưa có mô tả'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {project && (
                            <span 
                              className="hidden sm:flex px-2.5 py-1 text-[10px] font-bold rounded-lg items-center gap-1 border"
                              style={{
                                backgroundColor: `${project.color}15`,
                                borderColor: `${project.color}40`,
                                color: project.color
                              }}
                            >
                              <span>{project.emoji || '📁'}</span>
                              <span className="truncate max-w-[120px]">{project.name}</span>
                            </span>
                          )}

                          <span className="hidden md:inline text-[11px] font-semibold text-slate-400">
                            {new Date(board.updatedAt).toLocaleDateString('vi-VN')}
                          </span>

                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDuplicateBoard(board)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Nhân bản"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setMovingBoard(board)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              title="Chuyển dự án"
                            >
                              <FolderKanban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTarget({ type: 'board', item: board })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Empty State */
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-500 shadow-sm">
                  <Shapes className="w-8 h-8" />
                </div>
                <div className="max-w-sm">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Chưa tìm thấy Bảng trắng nào
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {searchQuery 
                      ? 'Không có kết quả khớp với từ khóa tìm kiếm. Hãy thử lại từ khóa khác.'
                      : 'Hãy tạo bảng trắng đầu tiên hoặc chọn một mẫu sơ đồ có sẵn để bắt đầu động não.'}
                  </p>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Dùng Mẫu có sẵn
                  </button>
                  <button
                    onClick={() => {
                      setNewBoardName('');
                      setShowCreateBoardModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    + Tạo Bảng mới
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODALS (CREATE PROJECT, CREATE BOARD, TEMPLATES, MOVE, DELETE)          */}
      {/* ========================================================================= */}

      {/* CREATE PROJECT MODAL */}
      <AnimatePresence>
        {showCreateProjectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateProjectModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 cursor-default"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FolderPlus className="w-5 h-5 text-indigo-600" />
                  <span className="font-extrabold text-slate-800 dark:text-white text-base">
                    Tạo Dự án Bảng trắng Mới
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateProjectModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tên Dự án</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Thiết kế App Mobile, Kiến trúc Hệ thống..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); }}
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mô tả mục tiêu</label>
                  <textarea
                    placeholder="Ghi chú ngắn về phạm vi dự án bảng trắng này..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                {/* Emoji Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Biểu tượng nhận diện</label>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewProjectEmoji(emoji)}
                        className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                          newProjectEmoji === emoji
                            ? 'bg-indigo-100 dark:bg-indigo-950 border-2 border-indigo-600 scale-110 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Theme */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Màu chủ đạo</label>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewProjectColor(c.value)}
                        className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                          newProjectColor === c.value
                            ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    Tạo Dự án
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT PROJECT MODAL */}
      <AnimatePresence>
        {editingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingProject(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 cursor-default"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-white text-base">
                  Chỉnh sửa Dự án Bảng trắng
                </span>
                <button
                  onClick={() => setEditingProject(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tên Dự án</label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mô tả</label>
                  <textarea
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Biểu tượng</label>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditingProject({ ...editingProject, emoji })}
                        className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                          editingProject.emoji === emoji
                            ? 'bg-indigo-100 dark:bg-indigo-950 border-2 border-indigo-600 scale-110'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Màu chủ đạo</label>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditingProject({ ...editingProject, color: c.value })}
                        className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                          editingProject.color === c.value
                            ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingProject;
                      setEditingProject(null);
                      setDeleteConfirmTarget({ type: 'project', item: target });
                    }}
                    className="py-2 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Dự án</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleUpdateProject(editingProject)}
                      disabled={!editingProject.name.trim()}
                      className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE BOARD MODAL */}
      <AnimatePresence>
        {showCreateBoardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateBoardModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 cursor-default"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shapes className="w-5 h-5 text-indigo-600" />
                  <span className="font-extrabold text-slate-800 dark:text-white text-base">
                    Tạo Bảng Trắng Mới
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateBoardModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tên Bảng trắng</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Sơ đồ luồng thanh toán, Mindmap chiến dịch..."
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBoard(); }}
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Dự án trực thuộc</label>
                  <select
                    value={newBoardProjectId}
                    onChange={(e) => setNewBoardProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">Không thuộc dự án nào (Bảng độc lập)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.emoji || '📁'} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Chọn mẫu sơ đồ ban đầu</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    <div
                      onClick={() => setNewBoardTemplate('blank')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        newBoardTemplate === 'blank'
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-sm block">📄</span>
                      <span className="text-xs font-bold block mt-1">Bảng trắng trống</span>
                      <span className="text-[9px] text-slate-400 block">Khởi tạo từ đầu</span>
                    </div>

                    {TEMPLATE_DEFINITIONS.map(tpl => (
                      <div
                        key={tpl.id}
                        onClick={() => setNewBoardTemplate(tpl.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          newBoardTemplate === tpl.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-sm block">{tpl.icon}</span>
                        <span className="text-xs font-bold block mt-1 truncate">{tpl.name.split(' (')[0]}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{tpl.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateBoardModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreateBoard}
                    disabled={!newBoardName.trim()}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    Tạo & Mở Bảng vẽ
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TEMPLATE GALLERY MODAL */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTemplateModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 cursor-default flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                      Thư Viện Mẫu Sơ Đồ & Khung Tư Duy Chuẩn
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Chọn mẫu để khởi tạo nhanh bảng trắng với cấu trúc chuyên nghiệp có sẵn
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TEMPLATE_DEFINITIONS.map(tpl => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 bg-white dark:bg-slate-950"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{tpl.icon}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {tpl.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                        {tpl.desc}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCreateBoardFromTemplate(tpl.id)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Sử dụng Mẫu này</span>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOVE BOARD TO PROJECT MODAL */}
      <AnimatePresence>
        {movingBoard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMovingBoard(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 cursor-default p-6 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                <span className="font-extrabold text-slate-800 dark:text-white text-base">
                  Chuyển Dự án cho Bảng trắng
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chọn Dự án đích cho bảng <strong className="text-slate-800 dark:text-slate-200">"{movingBoard.name}"</strong>:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => handleMoveBoard(movingBoard.id, undefined)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    !movingBoard.projectId
                      ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>📄 Bảng độc lập (Không thuộc dự án nào)</span>
                  {!movingBoard.projectId && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                {projects.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleMoveBoard(movingBoard.id, p.id)}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      movingBoard.projectId === p.id
                        ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{p.emoji || '📁'}</span>
                      <span>{p.name}</span>
                    </div>
                    {movingBoard.projectId === p.id && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setMovingBoard(null)}
                  className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmTarget(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 cursor-default p-6 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Xác nhận xóa {deleteConfirmTarget.type === 'project' ? 'Dự án' : 'Bảng trắng'}?
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  {deleteConfirmTarget.type === 'project'
                    ? `Bạn có chắc muốn xóa dự án "${deleteConfirmTarget.item.name}"? Các bảng vẽ bên trong sẽ được giữ lại dưới dạng bảng độc lập.`
                    : `Bạn có chắc muốn xóa vĩnh viễn bảng trắng "${deleteConfirmTarget.item.name}"?`}
                </p>
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmTarget.type === 'project') {
                      handleDeleteProject(deleteConfirmTarget.item);
                    } else {
                      handleDeleteBoard(deleteConfirmTarget.item);
                    }
                  }}
                  className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Xác nhận Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
