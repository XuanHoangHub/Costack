"use client";

import React from 'react';
import {
  Folder, FolderOpen, FolderPlus, FolderGit2, Package, Box, Boxes, Briefcase, Building2,
  ClipboardList, ClipboardCheck, Kanban, LayoutDashboard, LayoutGrid, CheckSquare, CheckCircle2,
  ListTodo, ListFilter, ListOrdered, Calendar, CalendarDays, CalendarClock, Timer, Clock, Hourglass,
  Layers, GitBranch, Workflow, Milestone, FileSpreadsheet, Table, Archive, Target, Rocket, Zap,
  Brain, Lightbulb, Sparkles, Sparkle, Flame, Trophy, Award, Medal, Crown, Star, Flag, TrendingUp,
  BarChart3, PieChart, LineChart, Activity, Gauge, Coins, DollarSign, Wallet, Compass, Crosshair,
  Radar, Sun, Moon, Users, UserCheck, UserPlus, Handshake, MessageSquare, MessagesSquare, Mail,
  Phone, PhoneCall, Megaphone, Bell, BellRing, Heart, Smile, ThumbsUp, AtSign, Share2, Send,
  Inbox, Bot, Palette, PenTool, Edit3, Wrench, Hammer, Sliders, SlidersHorizontal, Settings,
  Code, Terminal, Cpu, Laptop, Monitor, Smartphone, Search, Filter, Tag, Tags, Pin, Bookmark,
  Link, Key, Lock, Unlock, Shield, ShieldCheck, Database, Server, HardDrive, Cloud, Globe, Wifi,
  FileText, Files, BookOpen, Book, Music, Video, Camera, Image, MapPin, CreditCard, AlertOctagon,
  AlertTriangle, CircleDot, Circle
} from 'lucide-react';

// Dedicated tree-shakeable icon dictionary for spaces
const SPACE_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Folder, FolderOpen, FolderPlus, FolderGit2, Package, Box, Boxes, Briefcase, Building2,
  ClipboardList, ClipboardCheck, Kanban, LayoutDashboard, LayoutGrid, CheckSquare, CheckCircle2,
  ListTodo, ListFilter, ListOrdered, Calendar, CalendarDays, CalendarClock, Timer, Clock, Hourglass,
  Layers, GitBranch, Workflow, Milestone, FileSpreadsheet, Table, Archive, Target, Rocket, Zap,
  Brain, Lightbulb, Sparkles, Sparkle, Flame, Trophy, Award, Medal, Crown, Star, Flag, TrendingUp,
  BarChart3, PieChart, LineChart, Activity, Gauge, Coins, DollarSign, Wallet, Compass, Crosshair,
  Radar, Sun, Moon, Users, UserCheck, UserPlus, Handshake, MessageSquare, MessagesSquare, Mail,
  Phone, PhoneCall, Megaphone, Bell, BellRing, Heart, Smile, ThumbsUp, AtSign, Share2, Send,
  Inbox, Bot, Palette, PenTool, Edit3, Wrench, Hammer, Sliders, SlidersHorizontal, Settings,
  Code, Terminal, Cpu, Laptop, Monitor, Smartphone, Search, Filter, Tag, Tags, Pin, Bookmark,
  Link, Key, Lock, Unlock, Shield, ShieldCheck, Database, Server, HardDrive, Cloud, Globe, Wifi,
  FileText, Files, BookOpen, Book, Music, Video, Camera, Image, MapPin, CreditCard, AlertOctagon,
  AlertTriangle, CircleDot, Circle
};

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

export const ICON_DEFAULT_COLORS: Record<string, string> = {
  Folder: '#6366F1', FolderOpen: '#6366F1', FolderPlus: '#6366F1', FolderGit2: '#6366F1',
  Package: '#3B82F6', Box: '#3B82F6', Boxes: '#3B82F6', Briefcase: '#64748B',
  Building2: '#64748B', ClipboardList: '#3B82F6', ClipboardCheck: '#10B981', Kanban: '#8B5CF6',
  LayoutDashboard: '#6366F1', LayoutGrid: '#6366F1', CheckSquare: '#10B981', CheckCircle2: '#10B981',
  ListTodo: '#3B82F6', ListFilter: '#64748B', ListOrdered: '#64748B', Calendar: '#F59E0B',
  CalendarDays: '#F59E0B', CalendarClock: '#F43F5E', Timer: '#F43F5E', Clock: '#F59E0B',
  Hourglass: '#F59E0B', Layers: '#8B5CF6', GitBranch: '#8B5CF6', Workflow: '#8B5CF6',
  Milestone: '#F43F5E', FileSpreadsheet: '#10B981', Table: '#10B981', Archive: '#64748B',
  Target: '#F43F5E', Rocket: '#8B5CF6', Zap: '#F59E0B', Brain: '#EC4899',
  Lightbulb: '#F59E0B', Sparkles: '#8B5CF6', Sparkle: '#F59E0B', Flame: '#F43F5E',
  Trophy: '#F59E0B', Award: '#F59E0B', Medal: '#F59E0B', Crown: '#F59E0B',
  Star: '#F59E0B', Flag: '#F43F5E', TrendingUp: '#10B981', BarChart3: '#6366F1',
  PieChart: '#8B5CF6', LineChart: '#10B981', Activity: '#10B981', Gauge: '#06B6D4',
  Coins: '#10B981', DollarSign: '#10B981', Wallet: '#10B981', Compass: '#06B6D4',
  Crosshair: '#F43F5E', Radar: '#06B6D4', Sun: '#F59E0B', Moon: '#8B5CF6',
  Users: '#3B82F6', UserCheck: '#10B981', UserPlus: '#3B82F6', Handshake: '#6366F1',
  MessageSquare: '#3B82F6', MessagesSquare: '#3B82F6', Mail: '#F59E0B', Phone: '#10B981',
  PhoneCall: '#10B981', Megaphone: '#F43F5E', Bell: '#F59E0B', BellRing: '#F43F5E',
  Heart: '#F43F5E', Smile: '#F59E0B', ThumbsUp: '#3B82F6', AtSign: '#6366F1',
  Share2: '#3B82F6', Send: '#6366F1', Inbox: '#3B82F6', Bot: '#8B5CF6',
  Palette: '#EC4899', PenTool: '#8B5CF6', Edit3: '#6366F1', Wrench: '#64748B',
  Hammer: '#F59E0B', Sliders: '#6366F1', SlidersHorizontal: '#6366F1', Settings: '#64748B',
  Code: '#06B6D4', Terminal: '#10B981', Cpu: '#06B6D4', Laptop: '#3B82F6',
  Monitor: '#3B82F6', Smartphone: '#8B5CF6', Search: '#6366F1', Filter: '#64748B',
  Tag: '#EC4899', Tags: '#EC4899', Pin: '#F43F5E', Bookmark: '#F59E0B',
  Link: '#3B82F6', Key: '#F59E0B', Lock: '#F59E0B', Unlock: '#10B981',
  Shield: '#10B981', ShieldCheck: '#10B981', Database: '#06B6D4', Server: '#3B82F6',
  HardDrive: '#64748B', Cloud: '#06B6D4', Globe: '#3B82F6', Wifi: '#06B6D4',
  FileText: '#3B82F6', Files: '#3B82F6', BookOpen: '#6366F1', Book: '#6366F1',
  Music: '#EC4899', Video: '#F43F5E', Camera: '#06B6D4', Image: '#10B981',
  MapPin: '#F43F5E'
};

export const EMOJI_TO_LUCIDE_MAP: Record<string, string> = {
  '📦': 'Package', '📋': 'ClipboardList', '📅': 'Calendar', '⏱️': 'Timer', '⏱': 'Timer',
  '📊': 'BarChart3', '📁': 'Folder', '📂': 'FolderOpen', '📝': 'FileText', '💻': 'Laptop',
  '🎯': 'Target', '💡': 'Lightbulb', '🧠': 'Brain', '🚀': 'Rocket', '🧘': 'Activity',
  '🔮': 'Sparkles', '📢': 'Megaphone', '🤝': 'Handshake', '🎉': 'Sparkles', '✨': 'Sparkles',
  '🔥': 'Flame', '⭐': 'Star', '🏆': 'Trophy', '🥇': 'Award', '🎨': 'Palette',
  '🎵': 'Music', '🔑': 'Key', '🛡️': 'Shield', '🛡': 'Shield', '📌': 'Pin',
  '🏷️': 'Tag', '🏷': 'Tag', '🔗': 'Link', '⚡': 'Zap', '📞': 'Phone',
  '🚩': 'Flag', '❤️': 'Heart', '❤': 'Heart', '🔍': 'Search', '🔔': 'Bell',
  '⚙️': 'Settings', '⚙': 'Settings', '👥': 'Users', '✅': 'CheckSquare',
  '⚠️': 'AlertTriangle', '💪': 'Shield', '💳': 'CreditCard', '🔴': 'AlertOctagon',
  '🟠': 'AlertTriangle', '🟡': 'CircleDot', '⚪': 'Circle',
};

export const parseIconValue = (val: string): { iconName: string; color?: string } => {
  if (!val || typeof val !== 'string') return { iconName: 'Package', color: 'indigo' };
  const trimmed = val.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    return { iconName: parts[0].trim(), color: parts[1]?.trim() };
  }
  return { iconName: trimmed };
};

export interface RenderSpaceIconOptions {
  preserveEmoji?: boolean;
}

export const renderSpaceIcon = (
  iconStr: string,
  className = "w-4 h-4",
  forcedColor?: string,
  options?: RenderSpaceIconOptions
) => {
  if (!iconStr) {
    return <Package className={`${className} shrink-0 text-indigo-500`} />;
  }

  const { iconName, color: customColor } = parseIconValue(iconStr);
  const isEmojiChar = /\p{Extended_Pictographic}/u.test(iconName);

  // If it is a real Unicode emoji and preserveEmoji is not explicitly false, render native emoji
  if (isEmojiChar && options?.preserveEmoji !== false) {
    return (
      <span className="inline-flex items-center justify-center leading-none select-none text-[1.15em] shrink-0">
        {iconName}
      </span>
    );
  }

  // Resolve Lucide icon component name
  const targetName = options?.preserveEmoji ? iconName : (EMOJI_TO_LUCIDE_MAP[iconName] || iconName);
  const IconComponent = SPACE_ICON_MAP[targetName] || SPACE_ICON_MAP[iconName];

  if (IconComponent) {
    let iconHex = forcedColor || customColor;
    if (!iconHex) {
      iconHex = ICON_DEFAULT_COLORS[targetName] || ICON_DEFAULT_COLORS[iconName] || '#6366F1';
    } else if (!iconHex.startsWith('#')) {
      const found = ICON_COLORS.find(c => c.id === iconHex);
      if (found) iconHex = found.hex;
      else iconHex = ICON_DEFAULT_COLORS[targetName] || ICON_DEFAULT_COLORS[iconName] || '#6366F1';
    }

    return (
      <IconComponent
        className={`${className} shrink-0 transition-colors`}
        style={{ color: iconHex }}
      />
    );
  }

  // Fallback: If it's a real emoji character, render it; otherwise render safe Package icon, NEVER raw identifier text
  if (isEmojiChar) {
    return (
      <span className="inline-flex items-center justify-center leading-none select-none text-[1.15em] shrink-0">
        {iconName}
      </span>
    );
  }

  return <Package className={`${className} shrink-0 text-indigo-500`} />;
};

export default renderSpaceIcon;

