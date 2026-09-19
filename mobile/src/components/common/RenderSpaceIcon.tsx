import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FolderGit2,
  Package,
  Box,
  Boxes,
  Briefcase,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Kanban,
  LayoutDashboard,
  LayoutGrid,
  CheckSquare,
  CheckCircle2,
  ListTodo,
  ListFilter,
  ListOrdered,
  Calendar,
  CalendarDays,
  CalendarClock,
  Timer,
  Clock,
  Hourglass,
  Layers,
  GitBranch,
  Workflow,
  Milestone,
  FileSpreadsheet,
  Table,
  Archive,
  Target,
  Rocket,
  Zap,
  Brain,
  Lightbulb,
  Sparkles,
  Flame,
  Trophy,
  Award,
  Medal,
  Crown,
  Star,
  Flag,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Gauge,
  Coins,
  DollarSign,
  Wallet,
  Compass,
  Crosshair,
  Users,
  UserCheck,
  UserPlus,
  Handshake,
  MessageSquare,
  MessagesSquare,
  Mail,
  Phone,
  Megaphone,
  Bell,
  Heart,
  Smile,
  ThumbsUp,
  Send,
  Inbox,
  Bot,
  Palette,
  Edit3,
  Wrench,
  Hammer,
  Sliders,
  Settings,
  Code,
  Terminal,
  Cpu,
  Laptop,
  Monitor,
  Smartphone,
  Search,
  Tag,
  Pin,
  Bookmark,
  Link,
  Key,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Database,
  Server,
  Cloud,
  Globe,
  FileText,
  Files,
  BookOpen,
  Music,
  Video,
  Camera,
  Image,
  MapPin,
  CreditCard,
  AlertTriangle,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Folder,
  FolderOpen,
  FolderPlus,
  FolderGit2,
  Package,
  Box,
  Boxes,
  Briefcase,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Kanban,
  LayoutDashboard,
  LayoutGrid,
  CheckSquare,
  CheckCircle2,
  ListTodo,
  ListFilter,
  ListOrdered,
  Calendar,
  CalendarDays,
  CalendarClock,
  Timer,
  Clock,
  Hourglass,
  Layers,
  GitBranch,
  Workflow,
  Milestone,
  FileSpreadsheet,
  Table,
  Archive,
  Target,
  Rocket,
  Zap,
  Brain,
  Lightbulb,
  Sparkles,
  Flame,
  Trophy,
  Award,
  Medal,
  Crown,
  Star,
  Flag,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Gauge,
  Coins,
  DollarSign,
  Wallet,
  Compass,
  Crosshair,
  Users,
  UserCheck,
  UserPlus,
  Handshake,
  MessageSquare,
  MessagesSquare,
  Mail,
  Phone,
  Megaphone,
  Bell,
  Heart,
  Smile,
  ThumbsUp,
  Send,
  Inbox,
  Bot,
  Palette,
  Edit3,
  Wrench,
  Hammer,
  Sliders,
  Settings,
  Code,
  Terminal,
  Cpu,
  Laptop,
  Monitor,
  Smartphone,
  Search,
  Tag,
  Pin,
  Bookmark,
  Link,
  Key,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Database,
  Server,
  Cloud,
  Globe,
  FileText,
  Files,
  BookOpen,
  Music,
  Video,
  Camera,
  Image,
  MapPin,
  CreditCard,
  AlertTriangle,
};

const COLOR_MAP: Record<string, string> = {
  indigo: '#2563EB',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  emerald: '#10B981',
  green: '#10B981',
  amber: '#F59E0B',
  orange: '#F97316',
  rose: '#F43F5E',
  red: '#EF4444',
  pink: '#EC4899',
  purple: '#8B5CF6',
  violet: '#8B5CF6',
  slate: '#64748B',
  gray: '#64748B',
};

const EMOJI_TO_LUCIDE: Record<string, string> = {
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
  '🎨': 'Palette',
  '🔑': 'Key',
  '🛡️': 'Shield',
  '🛡': 'Shield',
  '⚡': 'Zap',
  '🔔': 'Bell',
  '👥': 'Users',
  '✅': 'CheckSquare',
};

export const parseSpaceIconValue = (
  raw: string
): { iconName: string; colorHex: string; isNativeEmoji: boolean } => {
  if (!raw || typeof raw !== 'string') {
    return { iconName: 'Package', colorHex: '#2563EB', isNativeEmoji: false };
  }

  const trimmed = raw.trim();

  // Split colon e.g. "Rocket:indigo" or "Briefcase:#6366f1"
  let iconPart = trimmed;
  let colorPart = '';
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    iconPart = parts[0].trim();
    colorPart = parts[1]?.trim() || '';
  }

  const isEmoji = /\p{Extended_Pictographic}/u.test(iconPart);

  let resolvedColor = '#2563EB';
  if (colorPart) {
    if (colorPart.startsWith('#')) {
      resolvedColor = colorPart;
    } else if (COLOR_MAP[colorPart.toLowerCase()]) {
      resolvedColor = COLOR_MAP[colorPart.toLowerCase()];
    }
  }

  return {
    iconName: iconPart,
    colorHex: resolvedColor,
    isNativeEmoji: isEmoji,
  };
};

interface RenderSpaceIconProps {
  icon?: string | null;
  size?: number;
  color?: string;
  preserveEmoji?: boolean;
}

export const RenderSpaceIcon: React.FC<RenderSpaceIconProps> = ({
  icon,
  size = 18,
  color,
  preserveEmoji = true,
}) => {
  if (!icon) {
    return <Folder size={size} color={color || '#2563EB'} strokeWidth={2} />;
  }

  const { iconName, colorHex, isNativeEmoji } = parseSpaceIconValue(icon);

  // If it's a native Unicode emoji and preserveEmoji is true
  if (isNativeEmoji && preserveEmoji) {
    return (
      <Text
        style={{
          fontSize: Math.round(size * 1.05),
          lineHeight: Math.round(size * 1.2),
          textAlign: 'center',
        }}
      >
        {iconName}
      </Text>
    );
  }

  // Look up Lucide component
  const lookupName = isNativeEmoji ? EMOJI_TO_LUCIDE[iconName] || 'Folder' : iconName;
  const IconComponent = ICON_MAP[lookupName] || ICON_MAP[iconName];

  if (IconComponent) {
    return (
      <IconComponent
        size={size}
        color={color || colorHex}
        strokeWidth={2}
      />
    );
  }

  // Fallback if it's an emoji
  if (isNativeEmoji) {
    return (
      <Text
        style={{
          fontSize: Math.round(size * 1.05),
          lineHeight: Math.round(size * 1.2),
          textAlign: 'center',
        }}
      >
        {iconName}
      </Text>
    );
  }

  // Fallback to Folder
  return <Folder size={size} color={color || colorHex} strokeWidth={2} />;
};

export default RenderSpaceIcon;
