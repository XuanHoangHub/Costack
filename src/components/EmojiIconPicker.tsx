"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { 
  Search, LayoutGrid, Sparkles, Folder, Check, X,
  Smile, Zap, Package, Tag, Briefcase, Palette
} from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';

// 🎨 Standard Curated Color Palette for SVG Icons
export const ICON_COLORS = [
  { id: 'indigo', name: 'Indigo (Chàm)', hex: '#6366F1', bg: 'bg-indigo-500', ring: 'ring-indigo-500' },
  { id: 'blue', name: 'Blue (Xanh dương)', hex: '#3B82F6', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { id: 'cyan', name: 'Cyan (Xanh ngọc)', hex: '#06B6D4', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
  { id: 'emerald', name: 'Emerald (Xanh lá)', hex: '#10B981', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { id: 'amber', name: 'Amber (Vàng cam)', hex: '#F59E0B', bg: 'bg-amber-500', ring: 'ring-amber-500' },
  { id: 'rose', name: 'Rose (Đỏ hồng)', hex: '#F43F5E', bg: 'bg-rose-500', ring: 'ring-rose-500' },
  { id: 'pink', name: 'Pink (Hồng cánh sen)', hex: '#EC4899', bg: 'bg-pink-500', ring: 'ring-pink-500' },
  { id: 'purple', name: 'Purple (Tím)', hex: '#8B5CF6', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { id: 'slate', name: 'Slate (Xám titan)', hex: '#64748B', bg: 'bg-slate-500', ring: 'ring-slate-500' },
];

// Intelligent Default Colors for individual icons when color is not explicitly specified
export const ICON_DEFAULT_COLORS: Record<string, string> = {
  // Projects & Folders
  Folder: '#6366F1',
  FolderOpen: '#6366F1',
  FolderPlus: '#6366F1',
  FolderGit2: '#6366F1',
  Package: '#3B82F6',
  Box: '#3B82F6',
  Boxes: '#3B82F6',
  Briefcase: '#64748B',
  Building2: '#64748B',
  ClipboardList: '#3B82F6',
  ClipboardCheck: '#10B981',
  Kanban: '#8B5CF6',
  LayoutDashboard: '#6366F1',
  LayoutGrid: '#6366F1',
  CheckSquare: '#10B981',
  CheckCircle2: '#10B981',
  ListTodo: '#3B82F6',
  ListFilter: '#64748B',
  ListOrdered: '#64748B',
  Calendar: '#F59E0B',
  CalendarDays: '#F59E0B',
  CalendarClock: '#F43F5E',
  Timer: '#F43F5E',
  Clock: '#F59E0B',
  Hourglass: '#F59E0B',
  Layers: '#8B5CF6',
  GitBranch: '#8B5CF6',
  Workflow: '#8B5CF6',
  Milestone: '#F43F5E',
  FileSpreadsheet: '#10B981',
  Table: '#10B981',
  Archive: '#64748B',
  
  // Strategy & Goals
  Target: '#F43F5E',
  Rocket: '#8B5CF6',
  Zap: '#F59E0B',
  Brain: '#EC4899',
  Lightbulb: '#F59E0B',
  Sparkles: '#8B5CF6',
  Sparkle: '#F59E0B',
  Flame: '#F43F5E',
  Trophy: '#F59E0B',
  Award: '#F59E0B',
  Medal: '#F59E0B',
  Crown: '#F59E0B',
  Star: '#F59E0B',
  Flag: '#F43F5E',
  TrendingUp: '#10B981',
  BarChart3: '#6366F1',
  PieChart: '#8B5CF6',
  LineChart: '#10B981',
  Activity: '#10B981',
  Gauge: '#06B6D4',
  Coins: '#10B981',
  DollarSign: '#10B981',
  Wallet: '#10B981',
  Compass: '#06B6D4',
  Crosshair: '#F43F5E',
  Radar: '#06B6D4',
  Sun: '#F59E0B',
  Moon: '#8B5CF6',
  
  // Team & Communication
  Users: '#3B82F6',
  UserCheck: '#10B981',
  UserPlus: '#3B82F6',
  Handshake: '#6366F1',
  MessageSquare: '#3B82F6',
  MessagesSquare: '#3B82F6',
  Mail: '#F59E0B',
  Phone: '#10B981',
  PhoneCall: '#10B981',
  Megaphone: '#F43F5E',
  Bell: '#F59E0B',
  BellRing: '#F43F5E',
  Heart: '#F43F5E',
  Smile: '#F59E0B',
  ThumbsUp: '#3B82F6',
  AtSign: '#6366F1',
  Share2: '#3B82F6',
  Send: '#6366F1',
  Inbox: '#3B82F6',
  Bot: '#8B5CF6',
  
  // Tools & Design
  Palette: '#EC4899',
  PenTool: '#8B5CF6',
  Edit3: '#6366F1',
  Wrench: '#64748B',
  Hammer: '#F59E0B',
  Sliders: '#6366F1',
  SlidersHorizontal: '#6366F1',
  Settings: '#64748B',
  Code: '#06B6D4',
  Terminal: '#10B981',
  Cpu: '#06B6D4',
  Laptop: '#3B82F6',
  Monitor: '#3B82F6',
  Smartphone: '#8B5CF6',
  Search: '#6366F1',
  Filter: '#64748B',
  Tag: '#EC4899',
  Tags: '#EC4899',
  Pin: '#F43F5E',
  Bookmark: '#F59E0B',
  Link: '#3B82F6',
  Key: '#F59E0B',
  Lock: '#F59E0B',
  Unlock: '#10B981',
  Shield: '#10B981',
  ShieldCheck: '#10B981',
  
  // Data & Resources
  Database: '#06B6D4',
  Server: '#3B82F6',
  HardDrive: '#64748B',
  Cloud: '#06B6D4',
  Globe: '#3B82F6',
  Wifi: '#06B6D4',
  FileText: '#3B82F6',
  Files: '#3B82F6',
  BookOpen: '#6366F1',
  Book: '#6366F1',
  Music: '#EC4899',
  Video: '#F43F5E',
  Camera: '#06B6D4',
  Image: '#10B981',
  MapPin: '#F43F5E',
};

// Map legacy emoji strings to modern single-color Lucide Icons
export const EMOJI_TO_LUCIDE_MAP: Record<string, string> = {
  '📦': 'Package',
  '📋': 'ClipboardList',
  '📅': 'Calendar',
  '⏱️': 'Timer',
  '⏱': 'Timer',
  '📊': 'BarChart3',
  '📁': 'Folder',
  '📂': 'FolderOpen',
  '📝': 'FileText',
  '💻': 'Laptop',
  '🎯': 'Target',
  '💡': 'Lightbulb',
  '🧠': 'Brain',
  '🚀': 'Rocket',
  '🧘': 'Activity',
  '🔮': 'Sparkles',
  '📢': 'Megaphone',
  '🤝': 'Handshake',
  '🎉': 'Sparkles',
  '✨': 'Sparkles',
  '🔥': 'Flame',
  '⭐': 'Star',
  '🏆': 'Trophy',
  '🥇': 'Award',
  '🎨': 'Palette',
  '🎵': 'Music',
  '🔑': 'Key',
  '🛡️': 'Shield',
  '🛡': 'Shield',
  '📌': 'Pin',
  '🏷️': 'Tag',
  '🏷': 'Tag',
  '🔗': 'Link',
  '⚡': 'Zap',
  '📞': 'Phone',
  '🚩': 'Flag',
  '❤️': 'Heart',
  '❤': 'Heart',
  '🔍': 'Search',
  '🔔': 'Bell',
  '⚙️': 'Settings',
  '⚙': 'Settings',
  '👥': 'Users',
  '✅': 'CheckSquare',
  '⚠️': 'AlertTriangle',
  '💪': 'Shield',
  '💳': 'CreditCard',
  '🔴': 'AlertOctagon',
  '🟠': 'AlertTriangle',
  '🟡': 'CircleDot',
  '⚪': 'Circle',
};

// 1. Standard SVG Icon Categories (Curated Lucide icons with Vietnamese search keywords)
export interface IconDef {
  name: string;
  tags: string[];
}

export const STANDARD_SVG_CATEGORIES: { name: string; label: string; icon: string; icons: IconDef[] }[] = [
  {
    name: 'projects',
    label: 'Dự án & Quản lý',
    icon: 'Folder',
    icons: [
      { name: 'Folder', tags: ['folder', 'thư mục', 'dự án', 'project'] },
      { name: 'FolderOpen', tags: ['folder', 'thư mục', 'mở'] },
      { name: 'FolderPlus', tags: ['folder', 'thêm thư mục', 'tạo'] },
      { name: 'FolderGit2', tags: ['git', 'code', 'kho lưu trữ', 'repository'] },
      { name: 'Package', tags: ['package', 'gói', 'sản phẩm', 'product', 'box'] },
      { name: 'Box', tags: ['box', 'hộp', 'kiện hàng'] },
      { name: 'Boxes', tags: ['boxes', 'nhiều hộp', 'kho'] },
      { name: 'Briefcase', tags: ['briefcase', 'công việc', 'doanh nghiệp', 'business'] },
      { name: 'Building2', tags: ['building', 'công ty', 'tổ chức', 'company'] },
      { name: 'ClipboardList', tags: ['clipboard', 'danh sách', 'công việc', 'tasks'] },
      { name: 'ClipboardCheck', tags: ['clipboard', 'hoàn thành', 'kiểm tra', 'done'] },
      { name: 'Kanban', tags: ['kanban', 'bảng', 'quy trình', 'workflow'] },
      { name: 'LayoutDashboard', tags: ['dashboard', 'tổng quan', 'bảng điều khiển'] },
      { name: 'LayoutGrid', tags: ['grid', 'lưới', 'bố cục'] },
      { name: 'CheckSquare', tags: ['checkbox', 'tích', 'nhiệm vụ', 'task'] },
      { name: 'CheckCircle2', tags: ['check', 'hoàn thành', 'xong'] },
      { name: 'ListTodo', tags: ['todo', 'việc cần làm', 'list'] },
      { name: 'ListFilter', tags: ['filter', 'lọc', 'danh sách'] },
      { name: 'ListOrdered', tags: ['order', 'thứ tự', 'ưu tiên'] },
      { name: 'Calendar', tags: ['calendar', 'lịch', 'ngày tháng', 'date'] },
      { name: 'CalendarDays', tags: ['calendar', 'lịch tuần', 'lịch tháng'] },
      { name: 'CalendarClock', tags: ['deadline', 'hạn chót', 'thời gian'] },
      { name: 'Timer', tags: ['timer', 'bấm giờ', 'pomodoro'] },
      { name: 'Clock', tags: ['clock', 'đồng hồ', 'thời gian'] },
      { name: 'Hourglass', tags: ['hourglass', 'đồng hồ cát', 'chờ'] },
      { name: 'Layers', tags: ['layers', 'phân tầng', 'cấu trúc'] },
      { name: 'GitBranch', tags: ['git', 'nhánh', 'branch'] },
      { name: 'Workflow', tags: ['workflow', 'luồng công việc', 'tự động'] },
      { name: 'Milestone', tags: ['milestone', 'cột mốc', 'chặng'] },
      { name: 'FileSpreadsheet', tags: ['excel', 'bảng tính', 'sheet'] },
      { name: 'Table', tags: ['table', 'bảng dữ liệu'] },
      { name: 'Archive', tags: ['archive', 'lưu trữ', 'kho'] },
    ]
  },
  {
    name: 'strategy',
    label: 'Chiến lược & Mục tiêu',
    icon: 'Target',
    icons: [
      { name: 'Target', tags: ['target', 'mục tiêu', 'okr', 'goal'] },
      { name: 'Rocket', tags: ['rocket', 'tên lửa', 'phát hành', 'launch', 'startup'] },
      { name: 'Zap', tags: ['zap', 'sấm sét', 'nhanh', 'năng suất', 'flash'] },
      { name: 'Brain', tags: ['brain', 'trí tuệ', 'ai', 'ý tưởng', 'idea'] },
      { name: 'Lightbulb', tags: ['lightbulb', 'bóng đèn', 'sáng tạo', 'idea'] },
      { name: 'Sparkles', tags: ['sparkles', 'ai', 'thông minh', 'magic'] },
      { name: 'Sparkle', tags: ['sparkle', 'lấp lánh', 'sao'] },
      { name: 'Flame', tags: ['flame', 'lửa', 'hot', 'quan trọng', 'urgent'] },
      { name: 'Trophy', tags: ['trophy', 'cúp', 'chiến thắng', 'thành tựu'] },
      { name: 'Award', tags: ['award', 'huy hiệu', 'giải thưởng'] },
      { name: 'Medal', tags: ['medal', 'huy chương', 'top'] },
      { name: 'Crown', tags: ['crown', 'vương miện', 'vip', 'leader'] },
      { name: 'Star', tags: ['star', 'ngôi sao', 'yêu thích', 'favorite'] },
      { name: 'Flag', tags: ['flag', 'cờ', 'đánh dấu', 'milestone'] },
      { name: 'TrendingUp', tags: ['trend', 'tăng trưởng', 'phát triển', 'growth'] },
      { name: 'BarChart3', tags: ['chart', 'biểu đồ cột', 'thống kê', 'analytics'] },
      { name: 'PieChart', tags: ['pie', 'biểu đồ tròn', 'tỷ trọng'] },
      { name: 'LineChart', tags: ['line', 'biểu đồ đường', 'xu hướng'] },
      { name: 'Activity', tags: ['activity', 'hoạt động', 'nhịp tim', 'health'] },
      { name: 'Gauge', tags: ['gauge', 'đo lường', 'tiến độ', 'speed'] },
      { name: 'Coins', tags: ['coins', 'tiền tệ', 'tài chính', 'finance'] },
      { name: 'DollarSign', tags: ['dollar', 'doanh thu', 'tiền'] },
      { name: 'Wallet', tags: ['wallet', 'ví tiền', 'ngân sách', 'budget'] },
      { name: 'Compass', tags: ['compass', 'định hướng', 'la bàn', 'direction'] },
      { name: 'Crosshair', tags: ['focus', 'tiêu điểm', 'tập trung'] },
      { name: 'Radar', tags: ['radar', 'quét', 'theo dõi'] },
      { name: 'Sun', tags: ['sun', 'mặt trời', 'năng lượng'] },
      { name: 'Moon', tags: ['moon', 'mặt trăng', 'ban đêm'] },
    ]
  },
  {
    name: 'team',
    label: 'Đội ngũ & Trao đổi',
    icon: 'Users',
    icons: [
      { name: 'Users', tags: ['users', 'nhóm', 'thành viên', 'team'] },
      { name: 'UserCheck', tags: ['user', 'xác nhận', 'đã duyệt'] },
      { name: 'UserPlus', tags: ['user', 'thêm người', 'tuyển dụng'] },
      { name: 'Handshake', tags: ['handshake', 'bắt tay', 'hợp tác', 'đối tác', 'crm'] },
      { name: 'MessageSquare', tags: ['message', 'tin nhắn', 'chat', 'bình luận'] },
      { name: 'MessagesSquare', tags: ['messages', 'thảo luận', 'hội thoại'] },
      { name: 'Mail', tags: ['mail', 'thư điện tử', 'email'] },
      { name: 'Phone', tags: ['phone', 'điện thoại', 'gọi điện', 'call'] },
      { name: 'PhoneCall', tags: ['call', 'cuộc gọi', 'liên hệ'] },
      { name: 'Megaphone', tags: ['megaphone', 'loa', 'thông báo', 'marketing'] },
      { name: 'Bell', tags: ['bell', 'chuông', 'thông báo', 'notification'] },
      { name: 'BellRing', tags: ['alert', 'chuông rung', 'nhắc nhở'] },
      { name: 'Heart', tags: ['heart', 'trái tim', 'yêu thích', 'care'] },
      { name: 'Smile', tags: ['smile', 'nụ cười', 'vui vẻ', 'cảm xúc'] },
      { name: 'ThumbsUp', tags: ['like', 'thích', 'tuyệt vời', 'đồng ý'] },
      { name: 'AtSign', tags: ['mention', 'nhắc tên', 'tag'] },
      { name: 'Share2', tags: ['share', 'chia sẻ', 'liên kết'] },
      { name: 'Send', tags: ['send', 'gửi', 'chuyển phát'] },
      { name: 'Inbox', tags: ['inbox', 'hộp thư đến', 'tiếp nhận'] },
      { name: 'Bot', tags: ['bot', 'robot', 'trợ lý ảo', 'assistant'] },
    ]
  },
  {
    name: 'tools',
    label: 'Công cụ & Thiết kế',
    icon: 'Palette',
    icons: [
      { name: 'Palette', tags: ['palette', 'thiết kế', 'màu sắc', 'design', 'art'] },
      { name: 'PenTool', tags: ['vector', 'vẽ', 'bút vẽ', 'illustrator'] },
      { name: 'Edit3', tags: ['edit', 'chỉnh sửa', 'soạn thảo', 'write'] },
      { name: 'Wrench', tags: ['wrench', 'cờ lê', 'sửa chữa', 'bảo trì'] },
      { name: 'Hammer', tags: ['hammer', 'búa', 'xây dựng', 'build'] },
      { name: 'Sliders', tags: ['sliders', 'tùy chỉnh', 'cấu hình', 'filter'] },
      { name: 'SlidersHorizontal', tags: ['controls', 'thanh điều khiển'] },
      { name: 'Settings', tags: ['settings', 'cài đặt', 'hệ thống', 'gear'] },
      { name: 'Code', tags: ['code', 'lập trình', 'developer', 'phần mềm'] },
      { name: 'Terminal', tags: ['terminal', 'dòng lệnh', 'cli', 'console'] },
      { name: 'Cpu', tags: ['cpu', 'chip', 'phần cứng', 'xử lý'] },
      { name: 'Laptop', tags: ['laptop', 'máy tính', 'công nghệ'] },
      { name: 'Monitor', tags: ['monitor', 'màn hình', 'desktop'] },
      { name: 'Smartphone', tags: ['mobile', 'điện thoại', 'app'] },
      { name: 'Search', tags: ['search', 'tìm kiếm', 'tra cứu'] },
      { name: 'Filter', tags: ['filter', 'bộ lọc'] },
      { name: 'Tag', tags: ['tag', 'thẻ', 'nhãn', 'label'] },
      { name: 'Tags', tags: ['tags', 'nhiều thẻ', 'phân loại'] },
      { name: 'Pin', tags: ['pin', 'ghim', 'đính kèm'] },
      { name: 'Bookmark', tags: ['bookmark', 'đánh dấu trang', 'lưu lại'] },
      { name: 'Link', tags: ['link', 'đường dẫn', 'url'] },
      { name: 'Key', tags: ['key', 'chìa khóa', 'bảo mật', 'token'] },
      { name: 'Lock', tags: ['lock', 'khóa', 'riêng tư', 'private'] },
      { name: 'Unlock', tags: ['unlock', 'mở khóa', 'công khai', 'public'] },
      { name: 'Shield', tags: ['shield', 'khiên', 'an toàn', 'security'] },
      { name: 'ShieldCheck', tags: ['verified', 'đã xác thực', 'bảo vệ'] },
    ]
  },
  {
    name: 'data',
    label: 'Dữ liệu & Tài nguyên',
    icon: 'Database',
    icons: [
      { name: 'Database', tags: ['database', 'cơ sở dữ liệu', 'sql', 'data'] },
      { name: 'Server', tags: ['server', 'máy chủ', 'hệ thống', 'hosting'] },
      { name: 'HardDrive', tags: ['storage', 'ổ đĩa', 'dung lượng'] },
      { name: 'Cloud', tags: ['cloud', 'đám mây', 'đồng bộ', 'sync'] },
      { name: 'Globe', tags: ['globe', 'toàn cầu', 'website', 'internet'] },
      { name: 'Wifi', tags: ['wifi', 'mạng', 'kết nối'] },
      { name: 'FileText', tags: ['document', 'tài liệu', 'văn bản', 'doc'] },
      { name: 'Files', tags: ['files', 'nhiều tệp', 'hồ sơ'] },
      { name: 'BookOpen', tags: ['book', 'sách', 'wiki', 'hướng dẫn', 'knowledge'] },
      { name: 'Book', tags: ['library', 'tài liệu đọc'] },
      { name: 'Music', tags: ['music', 'âm nhạc', 'audio'] },
      { name: 'Video', tags: ['video', 'phim', 'media'] },
      { name: 'Camera', tags: ['camera', 'máy ảnh', 'chụp hình'] },
      { name: 'Image', tags: ['image', 'hình ảnh', 'photo'] },
      { name: 'MapPin', tags: ['location', 'vị trí', 'địa điểm', 'map'] },
    ]
  }
];

export const ALL_STANDARD_ICONS = STANDARD_SVG_CATEGORIES.flatMap(cat => cat.icons);

// 2. Standard Curated Emojis Categorized (250+ emojis across 9 categories)
export interface EmojiCategoryDef {
  name: string;
  label: string;
  icon: string;
  tags: string[];
  emojis: string[];
}

export const STANDARD_EMOJI_CATEGORIES: EmojiCategoryDef[] = [
  {
    name: 'smileys',
    label: 'Mặt cười & Cảm xúc',
    icon: 'Smile',
    tags: ['cuoi', 'mat cuoi', 'vui', 'cam xuc', 'smile', 'happy', 'face', 'emotion'],
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
      '😎', '🤓', '🧐'
    ]
  },
  {
    name: 'gestures',
    label: 'Bàn tay & Con người',
    icon: 'User',
    tags: ['tay', 'ban tay', 'nguoi', 'team', 'con nguoi', 'hand', 'people', 'person'],
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🧠', '🫀', '👁️', '🧑‍💻',
      '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍🔬', '🧑‍🎨', '🦸', '🥷', '🧙'
    ]
  },
  {
    name: 'work',
    label: 'Công việc & Văn phòng',
    icon: 'Briefcase',
    tags: ['cong viec', 'van phong', 'nhiem vu', 'task', 'work', 'office', 'job'],
    emojis: [
      '📁', '📂', '📄', '📝', '📋', '📊', '📈', '📉', '📌', '📍',
      '📎', '🖇️', '📐', '📏', '✂️', '💼', '🗂️', '🗃️', '🗄️', '📅',
      '📆', '🗓️', '📇', '📦', '🏷️', '🔖', '✉️', '📧', '📨', '📩',
      '📤', '📥', '📬', '📮', '⏰', '⏱️', '⏲️', '⌛', '⏳', '🧮'
    ]
  },
  {
    name: 'tech',
    label: 'Công nghệ & Thiết bị',
    icon: 'Laptop',
    tags: ['cong nghe', 'may tinh', 'laptop', 'code', 'lap trinh', 'tech', 'device', 'software'],
    emojis: [
      '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📱', '📲', '☎️', '📞', '📡',
      '🌐', '🤖', '🔌', '🔋', '💾', '💿', '📀', '🎥', '🕹️', '🎙️',
      '📺', '📷', '📸', '🔍', '🔎', '💡', '⚙️', '🛠️', '🔧', '🪛',
      '🔨', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🛰️', '🧭'
    ]
  },
  {
    name: 'creative',
    label: 'Sáng tạo & Nghệ thuật',
    icon: 'Palette',
    tags: ['sang tao', 'nghe thuat', 'thiet ke', 've', 'am nhac', 'art', 'design', 'music', 'creative'],
    emojis: [
      '🎨', '🖌️', '🖍️', '🧵', '🧶', '✨', '🪄', '🔮', '💎', '🎭',
      '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎸', '🎹', '🥁', '🎷',
      '🎺', '🎻', '🌈', '🧩', '🎪', '🎟️', '🎫', '🖼️', '🖋️', '✒️'
    ]
  },
  {
    name: 'goals',
    label: 'Mục tiêu & Thành tựu',
    icon: 'Target',
    tags: ['muc tieu', 'chien luoc', 'thanh cong', 'top', 'goal', 'target', 'win', 'trophy', 'rocket'],
    emojis: [
      '🎯', '🚀', '🛸', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑',
      '🔥', '⚡', '🌟', '⭐', '💫', '💥', '🚩', '🏁', '🧭', '💯',
      '🛡️', '⚔️', '🏹', '♟️', '🎳', '🎮', '🎲', '🏎️', '🧗', '🏋️'
    ]
  },
  {
    name: 'docs',
    label: 'Sách & Tri thức',
    icon: 'BookOpen',
    tags: ['sach', 'tri thuc', 'tai lieu', 'hoc tap', 'book', 'read', 'knowledge', 'study'],
    emojis: [
      '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📒', '📜', '🗞️',
      '📰', '🎓', '🎒', '🏫', '🏛️', '🧾', '✏️', '🖊️', '🖋️', '🔬',
      '🔭', '🧪', '🧬', '🩺', '📐', '📏', '📎', '📌', '🏷️', '🔖'
    ]
  },
  {
    name: 'lifestyle',
    label: 'Đời sống & Thư giãn',
    icon: 'Zap',
    tags: ['doi song', 'an uong', 'cafe', 'thien nhien', 'life', 'relax', 'food', 'nature', 'coffee'],
    emojis: [
      '☕', '🍵', '🧋', '🥤', '🍺', '🍻', '🍷', '🍎', '🍇', '🍓',
      '🍕', '🍔', '🌮', '🍣', '🍰', '🎂', '🍫', '🍩', '🎁', '🎈',
      '🌿', '🍀', '🌸', '🌺', '🌻', '🌲', '🌳', '☀️', '🌙', '☁️',
      '🌧️', '❄️', '🌊', '🧘', '🏖️', '🚲', '🚗', '✈️', '🛒', '💰',
      '💵', '💳', '🔔', '🔕'
    ]
  },
  {
    name: 'symbols',
    label: 'Ký hiệu & Trạng thái',
    icon: 'Tag',
    tags: ['ky hieu', 'trang thai', 'tim', 'dau', 'symbol', 'status', 'badge', 'heart', 'check'],
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✅', '❌',
      '⚠️', '⛔', '🚫', '❓', '❗', '❕', '❔', '🟢', '🟡', '🔴',
      '🟣', '🔵', '⚪', '⬛', '🔶', '🔷', '🔘', '💬', '💭', '🗯️',
      '🆗', '🆙', '🆕', '🔝'
    ]
  }
];

// Rich bilingual search tags for popular emojis
export const EMOJI_KEYWORDS: Record<string, string[]> = {
  '🔥': ['lua', 'chay', 'fire', 'hot', 'gap', 'urgent', 'chay'],
  '🚀': ['rocket', 'ten lua', 'launch', 'phong', 'startup', 'fast'],
  '🎯': ['target', 'muc tieu', 'goal', 'okr', 'tam ngam', 'dich'],
  '❤️': ['tim', 'trai tim', 'heart', 'love', 'yeu', 'thich', 'love'],
  '⭐': ['star', 'sao', 'favorite', 'danh gia', 'top', 'ngoi sao'],
  '💡': ['lightbulb', 'bong den', 'y tuong', 'idea', 'sang tao', 'tip'],
  '📝': ['note', 'ghi chu', 'viet', 'document', 'tai lieu', 'paper', 'soan thao'],
  '💼': ['briefcase', 'cong viec', 'work', 'kinh doanh', 'business', 'cap'],
  '💻': ['laptop', 'may tinh', 'computer', 'code', 'lap trinh', 'dev'],
  '💰': ['money', 'tien', 'dollar', 'vang', 'rich', 'ngan sach', 'cash'],
  '✅': ['check', 'done', 'xong', 'hoan thanh', 'ok', 'dung', 'success'],
  '❌': ['cross', 'sai', 'huy', 'cancel', 'error', 'xoa', 'fail'],
  '⚠️': ['warning', 'canh bao', 'chu y', 'alert', 'luu y', 'nguy hiem'],
  '🎉': ['party', 'chuc mung', 'le hoi', 'celebrate', 'phao hoa', 'vui'],
  '☕': ['coffee', 'ca phe', 'relax', 'nghi ngoi', 'uong', 'tea'],
  '📚': ['books', 'sach', 'hoc tap', 'doc', 'read', 'tai lieu', 'thu vien'],
  '🏆': ['trophy', 'cup', 'thanh tuu', 'nhat', 'winner', 'giai', 'vo dich'],
  '👏': ['clap', 'vo tay', 'khen', 'bravo', 'hoan ho'],
  '👍': ['like', 'thich', 'dong y', 'ok', 'good', 'tuyet', 'yes'],
  '👎': ['dislike', 'khong thich', 'bad', 'che', 'no'],
  '🤝': ['handshake', 'bat tay', 'hop tac', 'partner', 'dong nghiep'],
  '💪': ['muscle', 'co bap', 'co len', 'manh me', 'strong', 'quyet tam'],
  '✨': ['sparkles', 'lap lanh', 'magic', 'ai', 'sao', 'thong minh'],
  '🔔': ['bell', 'chuong', 'thong bao', 'nhac nho', 'alert', 'notif'],
  '🔑': ['key', 'khoa', 'chia khoa', 'mat ma', 'token', 'pass'],
  '🔒': ['lock', 'khoa', 'rieng tu', 'bao mat', 'private', 'secure'],
  '📱': ['phone', 'dien thoai', 'mobile', 'smartphone', 'alo'],
  '🎨': ['palette', 'mau sac', 've', 'thiet ke', 'art', 'design'],
  '📈': ['chart', 'tang truong', 'bieu do', 'growth', 'up'],
  '📉': ['giam', 'ha', 'bieu do', 'down'],
  '📅': ['calendar', 'lich', 'ngay', 'date', 'thang', 'schedule'],
  '📋': ['clipboard', 'danh sach', 'checklist', 'ke hoach', 'todo']
};

import { renderSpaceIcon, parseIconValue } from './RenderSpaceIcon';
export { renderSpaceIcon, parseIconValue, type RenderSpaceIconOptions } from './RenderSpaceIcon';

export interface EmojiIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  allowClear?: boolean;
  className?: string;
  size?: 'inline' | 'sm' | 'md' | 'lg' | 'custom';
  triggerClassName?: string;
  align?: 'left' | 'right';
  children?: React.ReactNode;
  title?: string;
  defaultTab?: 'icons' | 'emojis';
  preserveEmoji?: boolean;
  disabled?: boolean;
}

export default function EmojiIconPicker({ 
  value, 
  onChange, 
  onRemove,
  allowClear = false,
  className = "",
  size = 'md',
  triggerClassName,
  align = 'left',
  children,
  title,
  defaultTab,
  preserveEmoji = true,
  disabled = false
}: EmojiIconPickerProps) {
  const { isVietnamese } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const isEmojiVal = Boolean(value && /\p{Extended_Pictographic}/u.test(value));
  const [activeTab, setActiveTab] = useState<'icons' | 'emojis'>(() => {
    if (defaultTab) return defaultTab;
    return isEmojiVal ? 'emojis' : 'emojis';
  });

  const [activeSvgCat, setActiveSvgCat] = useState<string>('all');
  const [activeEmojiCat, setActiveEmojiCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract current icon name and color
  const { iconName: currentIconName, color: initialColor } = parseIconValue(value);
  const [selectedColor, setSelectedColor] = useState<string>(initialColor || 'indigo');

  useEffect(() => {
    const { color } = parseIconValue(value);
    if (color) setSelectedColor(color);
  }, [value]);

  const updateCoords = useCallback(() => {
    if (triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 384;
      const popoverHeight = 490;
      let left = align === 'right' ? (rect.right - popoverWidth) : rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      if (left < 12) left = 12;

      let top = rect.bottom + 6;
      if (top + popoverHeight > window.innerHeight - 12) {
        if (rect.top - popoverHeight - 6 > 12) {
          top = rect.top - popoverHeight - 6;
        } else {
          top = Math.max(12, window.innerHeight - popoverHeight - 12);
        }
      }
      setCoords({ top, left });
    }
  }, [align]);

  // Close popover on outside click or Escape, track scroll/resize
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        triggerRef.current && 
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      updateCoords();
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  // Active color object
  const activeColorObj = useMemo(() => {
    return ICON_COLORS.find(c => c.id === selectedColor) || ICON_COLORS[0];
  }, [selectedColor]);

  const normalizeSearchText = (val: string) => val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

  // Filter SVG Icons based on Category & Search
  const filteredSvgIcons = useMemo(() => {
    let list = ALL_STANDARD_ICONS;
    if (activeSvgCat !== 'all') {
      const cat = STANDARD_SVG_CATEGORIES.find(c => c.name === activeSvgCat);
      if (cat) list = cat.icons;
    }

    if (!searchQuery.trim()) return list;
    const q = normalizeSearchText(searchQuery);
    return ALL_STANDARD_ICONS.filter(item => 
      normalizeSearchText(item.name).includes(q) || item.tags.some(tag => normalizeSearchText(tag).includes(q))
    );
  }, [activeSvgCat, searchQuery]);

  // Filter Emojis based on Category & Search
  const filteredEmojis = useMemo(() => {
    let list = STANDARD_EMOJI_CATEGORIES;
    if (activeEmojiCat !== 'all') {
      const cat = STANDARD_EMOJI_CATEGORIES.find(c => c.name === activeEmojiCat);
      if (cat) list = [cat];
    }

    if (!searchQuery.trim()) {
      return list;
    }
    const q = normalizeSearchText(searchQuery);
    return STANDARD_EMOJI_CATEGORIES.map(category => {
      const catMatches = normalizeSearchText(category.label).includes(q) || 
        category.tags.some(t => normalizeSearchText(t).includes(q));

      const matching = category.emojis.filter(e => {
        if (e.includes(searchQuery.trim())) return true;
        if (catMatches) return true;
        const tags = EMOJI_KEYWORDS[e];
        if (tags && tags.some(t => normalizeSearchText(t).includes(q))) {
          return true;
        }
        return false;
      });

      return {
        ...category,
        emojis: matching
      };
    }).filter(cat => cat.emojis.length > 0);
  }, [activeEmojiCat, searchQuery]);

  const handleSelectIcon = (iconName: string, colorId?: string) => {
    const c = colorId || selectedColor;
    onChange(`${iconName}:${c}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectEmoji = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleColorChange = (colorId: string) => {
    setSelectedColor(colorId);
    // If currently an SVG icon, immediately update color
    if (currentIconName && !EMOJI_TO_LUCIDE_MAP[value] && !/\p{Extended_Pictographic}/u.test(value)) {
      onChange(`${currentIconName}:${colorId}`);
    }
  };

  const handleRandomSelect = () => {
    if (activeTab === 'emojis') {
      const allEmojis = STANDARD_EMOJI_CATEGORIES.flatMap(c => c.emojis);
      const randEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
      handleSelectEmoji(randEmoji);
    } else {
      const randIcon = ALL_STANDARD_ICONS[Math.floor(Math.random() * ALL_STANDARD_ICONS.length)];
      const randColor = ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)];
      setSelectedColor(randColor.id);
      handleSelectIcon(randIcon.name, randColor.id);
    }
  };

  const handleRemoveIcon = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const targetIconName = EMOJI_TO_LUCIDE_MAP[currentIconName] || currentIconName;

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={triggerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={`
          flex items-center justify-center transition-all cursor-pointer select-none active:scale-[0.96] group
          ${size === 'inline' 
            ? 'p-0.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-750/70 border border-transparent hover:border-slate-300/60 dark:hover:border-slate-700/60' 
            : size === 'sm'
            ? 'w-8 h-8 rounded-lg bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-3xs'
            : size === 'lg'
            ? 'w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md shadow-3xs'
            : size === 'custom'
            ? (triggerClassName || '')
            : 'w-10 h-10 rounded-xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-3xs'
          }
        `}
        title={title || (isVietnamese ? "Nhấn để chọn Biểu tượng & Màu sắc" : "Click to pick icon & color")}
      >
        {children ? children : renderSpaceIcon(
          value, 
          size === 'inline' ? "w-4.5 h-4.5 group-hover:scale-110 transition-transform" : size === 'sm' ? "w-4 h-4" : size === 'lg' ? "w-8 h-8" : "w-5.5 h-5.5",
          undefined,
          { preserveEmoji }
        )}
      </button>

      {/* Popover Dropdown rendered via Portal */}
      {isOpen && mounted && coords && createPortal(
        <div 
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 99999
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-96 max-w-[94vw] bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 font-sans select-none text-left"
        >
          
          {/* Header Tab Switcher (Emojis vs SVG Icons) */}
          <div className="flex items-center justify-between gap-1 p-1 bg-slate-100/90 dark:bg-slate-850/90 rounded-2xl mb-3">
            <button
              type="button"
              onClick={() => { setActiveTab('emojis'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'emojis'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>{isVietnamese ? '😀 Emoji' : '😀 Emojis'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('icons'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'icons'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isVietnamese ? '⚡ Biểu tượng màu' : '⚡ Color Icons'}</span>
            </button>
          </div>

          {/* Color Palette Selector for SVG Icons */}
          {activeTab === 'icons' && (
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  {isVietnamese ? 'Màu sắc biểu tượng' : 'Icon Color'}
                </span>
                <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                  {activeColorObj.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                {ICON_COLORS.map(color => {
                  const isColorActive = selectedColor === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleColorChange(color.id)}
                      title={color.name}
                      style={{ backgroundColor: color.hex }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-3xs relative ${
                        isColorActive ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-105' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {isColorActive && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder={activeTab === 'icons' 
                ? (isVietnamese ? "Tìm icon (VD: Folder, Rocket, Target, Dự án)..." : "Search icons (e.g. Folder, Rocket, Target)...") 
                : (isVietnamese ? "Tìm emoji (VD: cười, lửa, tim, sách, việc, tiền)..." : "Search emojis (e.g. smile, fire, heart)...")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 pr-7 py-2 text-xs font-semibold outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* TAB 1: EMOJIS */}
          {activeTab === 'emojis' && (
            <>
              {/* Category Pills for Emojis */}
              {!searchQuery && (
                <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2 mb-2 pr-1">
                  <button
                    type="button"
                    onClick={() => setActiveEmojiCat('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black whitespace-nowrap transition-all cursor-pointer ${
                      activeEmojiCat === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isVietnamese ? 'Tất cả' : 'All'}
                  </button>
                  {STANDARD_EMOJI_CATEGORIES.map(cat => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setActiveEmojiCat(cat.name)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black whitespace-nowrap transition-all cursor-pointer ${
                        activeEmojiCat === cat.name
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Emoji Grid */}
              <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                {filteredEmojis.length === 0 ? (
                  <div className="text-center text-slate-400 font-semibold text-[11px] py-10">
                    {isVietnamese ? 'Không tìm thấy emoji phù hợp' : 'No matching emoji found'}
                  </div>
                ) : (
                  filteredEmojis.map(category => (
                    <div key={category.name} className="space-y-1.5">
                      {activeEmojiCat === 'all' && (
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs py-0.5 z-1">
                          {category.label}
                        </div>
                      )}
                      <div className="grid grid-cols-8 gap-1 p-0.5">
                        {category.emojis.map((emoji, eIdx) => {
                          const isSelected = value === emoji;
                          return (
                            <button
                              key={`${emoji}-${eIdx}`}
                              type="button"
                              onClick={() => handleSelectEmoji(emoji)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:scale-120 transition-all cursor-pointer select-none active:scale-95 border ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs ring-2 ring-indigo-500/20'
                                  : 'border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/40'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* TAB 2: SVG ICONS WITH COLORS */}
          {activeTab === 'icons' && (
            <>
              {/* Category Chips */}
              {!searchQuery && (
                <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2 mb-2 pr-1">
                  <button
                    type="button"
                    onClick={() => setActiveSvgCat('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black whitespace-nowrap transition-all cursor-pointer ${
                      activeSvgCat === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isVietnamese ? 'Tất cả' : 'All'} ({ALL_STANDARD_ICONS.length})
                  </button>
                  {STANDARD_SVG_CATEGORIES.map(cat => {
                    const localizedLabel = isVietnamese ? cat.label : (
                      cat.name === 'projects' ? 'Projects' :
                      cat.name === 'strategy' ? 'Strategy' :
                      cat.name === 'team' ? 'Team' :
                      cat.name === 'tools' ? 'Tools' :
                      cat.name === 'data' ? 'Data' : cat.label
                    );
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setActiveSvgCat(cat.name)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black whitespace-nowrap transition-all cursor-pointer ${
                          activeSvgCat === cat.name
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {localizedLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Icon Grid */}
              <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {filteredSvgIcons.length === 0 ? (
                  <div className="text-center text-slate-400 font-semibold text-[11px] py-10">
                    {isVietnamese ? 'Không tìm thấy biểu tượng phù hợp' : 'No matching icon found'}
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-1.5 p-0.5">
                    {filteredSvgIcons.map(item => {
                      const IconComponent = (LucideIcons as any)[item.name];
                      if (!IconComponent) return null;
                      const isSelected = targetIconName === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleSelectIcon(item.name)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 border ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs ring-2 ring-indigo-500/20'
                              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                          }`}
                          title={`${item.name} (${item.tags.slice(0, 3).join(', ')})`}
                        >
                          <IconComponent 
                            className="w-5 h-5 transition-transform group-hover:scale-110" 
                            style={{ color: activeColorObj.hex }} 
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bottom Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleRandomSelect}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title={isVietnamese ? "Chọn biểu tượng ngẫu nhiên" : "Pick random icon"}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>{isVietnamese ? 'Ngẫu nhiên' : 'Random'}</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] max-w-[140px] truncate">
                <span className="text-[10px] uppercase font-bold text-slate-400">Đang chọn:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate flex items-center gap-1">
                  {renderSpaceIcon(value, "w-3.5 h-3.5", undefined, { preserveEmoji: true })}
                  <span className="truncate">{currentIconName || 'Trống'}</span>
                </span>
              </div>

              {(allowClear || onRemove || value) && (
                <button
                  type="button"
                  onClick={handleRemoveIcon}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                >
                  {isVietnamese ? 'Gỡ biểu tượng' : 'Remove icon'}
                </button>
              )}
            </div>
          </div>

        </div>,
        document.body
      )}
    </div>
  );
}

