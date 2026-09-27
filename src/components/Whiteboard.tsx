"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { WhiteboardTool, WhiteboardElement, User, TeamMemberCursor, Task, ShareRole } from '../types';
import ShareSettingsModal from './ShareSettingsModal';
import { supabase, getCleanChannel } from '../supabaseClient';
import { 
  Square, Circle, Edit2, Move, StickyNote, Grid,
  Trash2, Sparkles, Database, Code, 
  Copy, Sliders, Type, Plus, Info, MousePointer, 
  Hand, ZoomIn, ZoomOut, Maximize2, Download, ArrowUpRight,
  Brain, Loader2, Bot, Globe, Check, Layout, FileJson, Image as ImageIcon, Layers, X,
  Cloud, PanelLeftClose, PanelLeftOpen, Share2, Expand, Minimize2, Undo2, Redo2,
  Upload, Keyboard, CheckCircle2, ArrowLeft, FolderKanban, Edit3
} from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';

interface WhiteboardProps {
  members: User[];
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  whiteboardId?: string;
  projectId?: string;
  projectName?: string;
  workspaceId?: string;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  tasks?: Task[];
  currentUser?: any;
  onUpgradePremium?: () => void;
  boardName?: string;
  spaceName?: string;
  spaceId?: string;
  onBackToDashboard?: () => void;
  onRenameBoard?: (name: string) => void;
}

// Helper function to safely derive transparent/light fill styles from hex color codes
const getFillStyle = (hex: string, alpha: number = 0.08) => {
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

const cloneWhiteboardElements = (items: WhiteboardElement[]): WhiteboardElement[] =>
  JSON.parse(JSON.stringify(items));

// Advanced Multi-line Text Wrapper for HTML5 Canvas elements
const wrapText = (
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number
) => {
  const words = text.split(/\s+/);
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Vertical alignment calculation to center text block
  const totalHeight = lines.length * lineHeight;
  let startY = y - (totalHeight / 2) + (lineHeight / 2);

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i].trim(), x, startY);
    startY += lineHeight;
  }
};

// Draw an arrowhead pointing at (toX, toY)
const drawArrowhead = (
  ctx: CanvasRenderingContext2D, 
  fromX: number, 
  fromY: number, 
  toX: number, 
  toY: number, 
  arrowLength = 10, 
  arrowAngle = Math.PI / 6
) => {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - arrowLength * Math.cos(angle - arrowAngle), toY - arrowLength * Math.sin(angle - arrowAngle));
  ctx.lineTo(toX - arrowLength * Math.cos(angle + arrowAngle), toY - arrowLength * Math.sin(angle + arrowAngle));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
};

// Get the 4 connection socket points for a shape
const getElementSockets = (el: WhiteboardElement) => {
  const w = el.width || 120;
  const h = el.height || 80;
  const finalH = el.type === 'sticky' && h === 80 ? w : h;
  return {
    top: { x: el.x + w / 2, y: el.y },
    right: { x: el.x + w, y: el.y + finalH / 2 },
    bottom: { x: el.x + w / 2, y: el.y + finalH },
    left: { x: el.x, y: el.y + finalH / 2 }
  };
};

export default function Whiteboard({ 
  members, 
  isOffline, 
  onAddSyncLog, 
  whiteboardId,
  projectId,
  projectName,
  spaceId,
  workspaceId,
  onAddTask,
  tasks = [],
  currentUser,
  onUpgradePremium,
  boardName = 'Bảng trắng Demo',
  spaceName = 'Không gian làm việc',
  onBackToDashboard,
  onRenameBoard
}: WhiteboardProps) {
  const { t, locale } = useTranslation();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveState, setSaveState] = useState<'saving' | 'saved'>('saved');
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(boardName);
  
  // Custom tools state (extend with Hand tool support)
  const [activeTool, setActiveTool] = useState<WhiteboardTool | 'hand'>('select');
  const [brushColor, setBrushColor] = useState('#6366f1');
  const [brushWidth, setBrushWidth] = useState(4);
  const [stickyText, setStickyText] = useState('Idea Note');
  // Board Templates & Canvas background states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [bgStyle, setBgStyle] = useState<'grid' | 'dots' | 'dark' | 'plain'>('grid');
  const [showLibrary, setShowLibrary] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  // JSON Export / Import
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `whiteboard-data-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAddSyncLog("Đã xuất dữ liệu JSON của bảng trắng");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          recordHistory();
          setElements(parsed);
          setSelectedElementId(null);
          onAddSyncLog("Đã nhập dữ liệu JSON vào bảng trắng");
        }
      } catch (err) {}
    };
    reader.readAsText(file);
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [whiteboardIsPrivate, setWhiteboardIsPrivate] = useState(false);
  const [whiteboardShareSettings, setWhiteboardShareSettings] = useState<Record<string, ShareRole>>({});

  useEffect(() => {
    try {
      const key = `apexa_whiteboard_share_${whiteboardId || 'default'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isPrivate !== undefined) setWhiteboardIsPrivate(parsed.isPrivate);
        if (parsed.shareSettings) setWhiteboardShareSettings(parsed.shareSettings);
      }
    } catch {}
  }, [whiteboardId]);

  const handleSaveWhiteboardShare = (newIsPrivate: boolean, newShareSettings: Record<string, ShareRole>) => {
    setWhiteboardIsPrivate(newIsPrivate);
    setWhiteboardShareSettings(newShareSettings);
    try {
      const key = `apexa_whiteboard_share_${whiteboardId || 'default'}`;
      localStorage.setItem(key, JSON.stringify({ isPrivate: newIsPrivate, shareSettings: newShareSettings }));
    } catch {}
    onAddSyncLog(`Whiteboard: Đã cập nhật quyền chia sẻ bảng "${boardName}"`);
  };

  const handleCopyShareLink = () => {
    setIsShareModalOpen(true);
  };

  // Preset Board Templates loader
  const handleLoadBoardTemplate = (type: 'kanban' | 'swot' | 'mindmap' | 'userjourney') => {
    let newElements: WhiteboardElement[] = [];
    const now = Date.now();

    if (type === 'kanban') {
      newElements = [
        { id: `k-1-${now}`, type: 'sticky', x: 50, y: 50, width: 140, height: 140, color: '#fef08a', text: 'CẦN LÀM (TO DO)\n\n- Thiết kế UI\n- Viết API docs' },
        { id: `k-2-${now}`, type: 'sticky', x: 220, y: 50, width: 140, height: 140, color: '#bfdbfe', text: 'ĐANG LÀM (IN PROGRESS)\n\n- Tích hợp AI Assistant\n- Review Code' },
        { id: `k-3-${now}`, type: 'sticky', x: 390, y: 50, width: 140, height: 140, color: '#bbf7d0', text: 'HOÀN THÀNH (DONE)\n\n- Khởi tạo repo\n- Setup CSDL & Cloud' }
      ];
    } else if (type === 'swot') {
      newElements = [
        { id: `s-1-${now}`, type: 'sticky', x: 50, y: 50, width: 150, height: 130, color: '#bbf7d0', text: 'STRENGTHS (Điểm mạnh)\n\n- Đội ngũ nhạy bén\n- Công nghệ tiên tiến' },
        { id: `s-2-${now}`, type: 'sticky', x: 230, y: 50, width: 150, height: 130, color: '#fecaca', text: 'WEAKNESSES (Điểm yếu)\n\n- Tài nguyên hạn chế\n- Tiến độ gấp' },
        { id: `s-3-${now}`, type: 'sticky', x: 50, y: 200, width: 150, height: 130, color: '#bfdbfe', text: 'OPPORTUNITIES (Cơ hội)\n\n- Thị trường mở rộng\n- Nhu cầu AI tăng cao' },
        { id: `s-4-${now}`, type: 'sticky', x: 230, y: 200, width: 150, height: 130, color: '#fef08a', text: 'THREATS (Thách thức)\n\n- Đối thủ cạnh tranh\n- Biến động thị trường' }
      ];
    } else if (type === 'mindmap') {
      newElements = [
        { id: `m-0-${now}`, type: 'circle', x: 200, y: 150, width: 120, height: 80, color: '#6366f1', text: 'PROJECT CORE' },
        { id: `m-1-${now}`, type: 'sticky', x: 40, y: 40, width: 120, height: 100, color: '#fef08a', text: 'Design UI/UX' },
        { id: `m-2-${now}`, type: 'sticky', x: 360, y: 40, width: 120, height: 100, color: '#bfdbfe', text: 'Backend API' },
        { id: `m-3-${now}`, type: 'sticky', x: 40, y: 260, width: 120, height: 100, color: '#bbf7d0', text: 'Analytics Engine' },
        { id: `m-4-${now}`, type: 'sticky', x: 360, y: 260, width: 120, height: 100, color: '#fecaca', text: 'Deployment' }
      ];
    } else if (type === 'userjourney') {
      newElements = [
        { id: `uj-1-${now}`, type: 'sticky', x: 40, y: 80, width: 130, height: 120, color: '#bfdbfe', text: 'DISCOVER (Khám phá)\n\n- Tìm kiếm Google\n- Xem quảng cáo' },
        { id: `uj-2-${now}`, type: 'sticky', x: 190, y: 80, width: 130, height: 120, color: '#fef08a', text: 'TRY (Trải nghiệm)\n\n- Đăng ký dùng thử\n- Tạo dự án đầu tiên' },
        { id: `uj-3-${now}`, type: 'sticky', x: 340, y: 80, width: 130, height: 120, color: '#bbf7d0', text: 'BUY (Mua dịch vụ)\n\n- Nâng cấp Pro Plan\n- Thanh toán thẻ' },
        { id: `uj-4-${now}`, type: 'sticky', x: 490, y: 80, width: 130, height: 120, color: '#fecaca', text: 'LOVE (Gắn bó)\n\n- Giới thiệu bạn bè\n- Đánh giá 5 sao' }
      ];
    }

    recordHistory();
    setElements(prev => [...prev, ...newElements]);
    setShowTemplateModal(false);
    onAddSyncLog(`Loaded Whiteboard Template: ${type.toUpperCase()}`);
  };

  // Zoom & Pan states for Miro navigation feel
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Connection line drawing state
  const [connectionStart, setConnectionStart] = useState<{
    elementId: string;
    socket: 'top' | 'right' | 'bottom' | 'left';
    x: number;
    y: number;
  } | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{ x: number; y: number } | null>(null);

  // Inline text editing states
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Elements state
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const elementsRef = useRef<WhiteboardElement[]>([]);
  const historyRef = useRef<{ past: WhiteboardElement[][]; future: WhiteboardElement[][] }>({ past: [], future: [] });
  const historyGroupRef = useRef<{ key: string; at: number } | null>(null);
  const dragSnapshotRef = useRef<WhiteboardElement[] | null>(null);
  const clipboardElementRef = useRef<WhiteboardElement | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [collaborators, setCollaborators] = useState<Array<{ userId: string; name: string; avatar: string; color: string }>>([]);

  // AI Analyst Sidepanel states
  const [showAiAnalyst, setShowAiAnalyst] = useState(false);
  const [aiMode, setAiMode] = useState<'explain' | 'optimize' | 'tasks'>('explain');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<any[]>([]);
  const [tasksAdded, setTasksAdded] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const getWhiteboardBase64 = (): string | null => {
    if (elements.length === 0) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    elements.forEach(el => {
      if (el.type === 'pencil' && Array.isArray(el.points)) {
        el.points.forEach((p: any) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      } else {
        const w = el.width || 120;
        const h = el.height || 80;
        const finalH = el.type === 'sticky' && h === 80 ? w : h;
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + w);
        maxY = Math.max(maxY, el.y + finalH);
      }
    });

    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;
    
    if (exportWidth <= 0 || exportHeight <= 0) return null;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return null;
    
    // Fill white png canvas background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, exportWidth, exportHeight);
    
    // Draw background grid lines
    tempCtx.strokeStyle = '#f1f5f9';
    tempCtx.lineWidth = 1;
    const gSize = 25;
    for (let x = Math.floor(minX / gSize) * gSize; x < maxX; x += gSize) {
      tempCtx.beginPath();
      tempCtx.moveTo(x - minX, 0);
      tempCtx.lineTo(x - minX, exportHeight);
      tempCtx.stroke();
    }
    for (let y = Math.floor(minY / gSize) * gSize; y < maxY; y += gSize) {
      tempCtx.beginPath();
      tempCtx.moveTo(0, y - minY);
      tempCtx.lineTo(exportWidth, y - minY);
      tempCtx.stroke();
    }
    
    // Draw all components onto temp canvas
    elements.forEach(el => {
      tempCtx.strokeStyle = el.color;
      tempCtx.fillStyle = el.color;
      tempCtx.lineWidth = el.lineWidth || 2;
      tempCtx.lineCap = 'round';
      tempCtx.lineJoin = 'round';
      
      const drawX = el.x - minX;
      const drawY = el.y - minY;
      const sw = el.width || 120;
      const sh = el.height || 80;
      
      tempCtx.shadowColor = 'rgba(15, 23, 42, 0.04)';
      tempCtx.shadowBlur = 4;
      tempCtx.shadowOffsetX = 1;
      tempCtx.shadowOffsetY = 2;
      
      if (el.type === 'pencil' && Array.isArray(el.points) && el.points.length > 0) {
        tempCtx.shadowBlur = 0;
        tempCtx.shadowOffsetX = 0;
        tempCtx.shadowOffsetY = 0;
        tempCtx.beginPath();
        tempCtx.moveTo((el.points as any[])[0].x - minX, (el.points as any[])[0].y - minY);
        for (let i = 1; i < (el.points as any[]).length; i++) {
          tempCtx.lineTo((el.points as any[])[i].x - minX, (el.points as any[])[i].y - minY);
        }
        tempCtx.stroke();
      } else if (el.type === 'rectangle') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        tempCtx.rect(drawX, drawY, sw, sh);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 16, 14);
      } else if (el.type === 'circle') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        const radius = Math.sqrt(Math.pow(sw, 2) + Math.pow(sh, 2)) / 2;
        tempCtx.arc(drawX + sw/2, drawY + sh/2, radius, 0, 2 * Math.PI);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 16, 14);
      } else if (el.type === 'line') {
        tempCtx.shadowBlur = 0;
        tempCtx.shadowOffsetX = 0;
        tempCtx.shadowOffsetY = 0;
        if (el.points && !Array.isArray(el.points) && 'fromId' in el.points && 'toId' in el.points) {
          const pts: any = el.points;
          const fromEl = elements.find(item => item.id === pts.fromId);
          const toEl = elements.find(item => item.id === pts.toId);
          if (fromEl && toEl) {
            const socketsFrom = getElementSockets(fromEl);
            const socketsTo = getElementSockets(toEl);
            const sFrom = socketsFrom[pts.fromSocket as keyof typeof socketsFrom] || socketsFrom.top;
            const sTo = socketsTo[pts.toSocket as keyof typeof socketsTo] || socketsTo.top;
            
            tempCtx.beginPath();
            tempCtx.moveTo(sFrom.x - minX, sFrom.y - minY);
            tempCtx.lineTo(sTo.x - minX, sTo.y - minY);
            tempCtx.stroke();
            
            drawArrowhead(tempCtx, sFrom.x - minX, sFrom.y - minY, sTo.x - minX, sTo.y - minY);
          }
        } else {
          tempCtx.beginPath();
          tempCtx.moveTo(drawX, drawY);
          tempCtx.lineTo(drawX + sw, drawY + sh);
          tempCtx.stroke();
        }
      } else if (el.type === 'sticky') {
        tempCtx.fillStyle = el.color;
        tempCtx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        tempCtx.lineWidth = 1;
        tempCtx.beginPath();
        const finalSh = sh === 80 ? sw : sh;
        tempCtx.roundRect(drawX, drawY, sw, finalSh, 10);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 12px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + finalSh/2, sw - 16, 16);
      } else if (el.type === 'diamond') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        tempCtx.moveTo(drawX + sw / 2, drawY);
        tempCtx.lineTo(drawX + sw, drawY + sh / 2);
        tempCtx.lineTo(drawX + sw / 2, drawY + sh);
        tempCtx.lineTo(drawX, drawY + sh / 2);
        tempCtx.closePath();
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 24, 14);
      } else if (el.type === 'parallelogram') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        const skew = sw * 0.15;
        tempCtx.moveTo(drawX + skew, drawY);
        tempCtx.lineTo(drawX + sw, drawY);
        tempCtx.lineTo(drawX + sw - skew, drawY + sh);
        tempCtx.lineTo(drawX, drawY + sh);
        tempCtx.closePath();
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 32, 14);
      } else if (el.type === 'pill') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        const r = sh / 2;
        tempCtx.roundRect(drawX, drawY, sw, sh, r);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 24, 14);
      } else if (el.type === 'cylinder') {
        const rx = sw / 2;
        const ry = sh * 0.14;
        tempCtx.beginPath();
        tempCtx.ellipse(drawX + rx, drawY + ry, rx, ry, 0, 0, 2 * Math.PI);
        tempCtx.rect(drawX, drawY + ry, sw, sh - 2 * ry);
        tempCtx.ellipse(drawX + rx, drawY + sh - ry, rx, ry, 0, 0, 2 * Math.PI);
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        tempCtx.fill();
        
        tempCtx.beginPath();
        tempCtx.ellipse(drawX + rx, drawY + sh - ry, rx, ry, 0, 0, Math.PI);
        tempCtx.stroke();
        
        tempCtx.beginPath();
        tempCtx.moveTo(drawX, drawY + ry);
        tempCtx.lineTo(drawX, drawY + sh - ry);
        tempCtx.moveTo(drawX + sw, drawY + ry);
        tempCtx.lineTo(drawX + sw, drawY + sh - ry);
        tempCtx.stroke();
        
        tempCtx.beginPath();
        tempCtx.ellipse(drawX + rx, drawY + ry, rx, ry, 0, 0, 2 * Math.PI);
        tempCtx.stroke();
        
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + rx, drawY + sh/2 + (ry/2), sw - 16, 14);
      }
      
      tempCtx.shadowBlur = 0;
      tempCtx.shadowOffsetX = 0;
      tempCtx.shadowOffsetY = 0;
    });

    return tempCanvas.toDataURL('image/png');
  };

  const handleOpenAiAnalyst = () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    if (elements.length === 0) {
      setShowAiAnalyst(true);
      setAiError(locale === 'vi' ? "Hãy vẽ hình hoặc thêm ghi chú trên bảng trước khi bắt đầu phân tích!" : "Please draw or add notes on the whiteboard before analyzing!");
      return;
    }
    setShowAiAnalyst(true);
    setAiResult('');
    setAiGeneratedTasks([]);
    setTasksAdded(false);
    setAiError(null);
  };

  const handleRunAiAnalysis = async () => {
    const base64Image = getWhiteboardBase64();
    if (!base64Image) {
      setAiError("Không thể chụp hình ảnh bảng vẽ.");
      return;
    }

    setAiLoading(true);
    setAiResult('');
    setAiGeneratedTasks([]);
    setTasksAdded(false);
    setAiError(null);

    try {
      const response = await callAiApi('/api/ai/whiteboard-analyze', {
        image: base64Image,
        mode: aiMode,
        prompt: aiPrompt
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Gặp lỗi khi phân tích.");
      }

      if (aiMode === 'tasks') {
        setAiGeneratedTasks(data.tasks || []);
      } else {
        setAiResult(data.text || '');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to communicate with AI server.';
      console.error(err);
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAiTasks = () => {
    if (aiGeneratedTasks.length === 0 || !onAddTask) return;

    aiGeneratedTasks.forEach(t => {
      onAddTask({
        title: t.title,
        description: t.description,
        priority: t.priority || 'medium',
        hoursEstimate: t.hoursEstimate || 4,
        tags: t.tags || [],
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'todo',
        assigneeId: members[0]?.id || '',
        subtasks: t.subtasks || []
      });
    });

    setTasksAdded(true);
    onAddSyncLog(`Imported ${aiGeneratedTasks.length} tasks from Whiteboard AI Analyst`);
  };

  // Load elements based on whiteboardId
  useEffect(() => {
    if (!whiteboardId) return;
    historyRef.current = { past: [], future: [] };
    historyGroupRef.current = null;
    setHistoryState({ canUndo: false, canRedo: false });
    setSelectedElementId(null);
    try {
      const saved = localStorage.getItem(`apexa_whiteboard_${whiteboardId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setElements(Array.isArray(parsed) ? parsed : []);
      } else {
        setElements([]);
      }

      const savedView = localStorage.getItem(`apexa_whiteboard_view_${whiteboardId}`);
      if (savedView) {
        const parsedView = JSON.parse(savedView);
        if (typeof parsedView.zoom === 'number') setZoom(Math.max(0.15, Math.min(4, parsedView.zoom)));
        if (parsedView.pan && typeof parsedView.pan.x === 'number' && typeof parsedView.pan.y === 'number') {
          setPan({ x: parsedView.pan.x, y: parsedView.pan.y });
        }
        if (['grid', 'dots', 'dark', 'plain'].includes(parsedView.bgStyle)) setBgStyle(parsedView.bgStyle);
      }
    } catch (e) {
      setElements([]);
    }
  }, [whiteboardId]);

  // Save elements when they change
  useEffect(() => {
    if (!whiteboardId) return;
    setSaveState('saving');
    try {
      localStorage.setItem(`apexa_whiteboard_${whiteboardId}`, JSON.stringify(elements));
    } catch (e) {}
    const timer = window.setTimeout(() => setSaveState('saved'), 260);
    return () => window.clearTimeout(timer);
  }, [elements, whiteboardId]);

  useEffect(() => {
    if (!whiteboardId) return;
    try {
      localStorage.setItem(
        `apexa_whiteboard_view_${whiteboardId}`,
        JSON.stringify({ zoom, pan, bgStyle })
      );
    } catch (e) {}
  }, [bgStyle, pan, whiteboardId, zoom]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pencilPoints, setPencilPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected element for dragging/moving or customizing in Sidebar
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [didMoveElem, setDidMoveElem] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState(false);

  // Multiplayer simulation state
  const [enableSim, setEnableSim] = useState(false);
  const [simCursors, setSimCursors] = useState<TeamMemberCursor[]>([]);

  // Coordinate conversion helpers
  const modelToScreen = (modelX: number, modelY: number) => {
    return {
      x: modelX * zoom + pan.x,
      y: modelY * zoom + pan.y
    };
  };

  // Listen for space key down to trigger Hand tool panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' && 
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === editorRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Connect custom Wheel Event to handle Zoom & Pan relative to pointer coords
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (e.ctrlKey) {
        // Zoom action relative to mouse position
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
        const modelX = (screenX - pan.x) / zoom;
        const modelY = (screenY - pan.y) / zoom;
        
        const newZoom = Math.max(0.15, Math.min(4, zoom * zoomFactor));
        setPan({
          x: screenX - modelX * newZoom,
          y: screenY - modelY * newZoom
        });
        setZoom(newZoom);
      } else {
        // Normal pan action
        const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
        const dy = e.shiftKey ? 0 : -e.deltaY;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, pan]);

  // Load elements from Supabase
  useEffect(() => {
    let active = true;
    let boardChannel: any = null; // TODO: Replace with proper RealtimeChannel type

    const loadElements = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const { data, error } = await supabase
          .from('whiteboard_elements')
          .select('*')
          .eq('whiteboard_id', whiteboardId);
        
        if (!active) return;
        if (!error && data && data.length > 0) {
          setElements(data.map(m => ({
            id: m.id,
            type: m.type as any,
            x: m.x,
            y: m.y,
            width: m.width,
            height: m.height,
            color: m.color,
            lineWidth: m.line_width,
            text: m.text,
            points: m.points
          })));
        }
      } catch (err) {
        console.warn('Supabase whiteboard load warning:', err);
      }
    };

    if (!isOffline) {
      loadElements();
      
      try {
        boardChannel = getCleanChannel(`realtime-whiteboard-elements-${whiteboardId}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'whiteboard_elements',
            filter: `whiteboard_id=eq.${whiteboardId}`
          }, payload => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const m = payload.new;
              if (!m) return;
              const formatted: WhiteboardElement = {
                 id: m.id,
                 type: m.type as any,
                 x: m.x,
                 y: m.y,
                 width: m.width,
                 height: m.height,
                 color: m.color,
                 lineWidth: m.line_width,
                 text: m.text,
                 points: m.points
              };
              setElements(prev => {
                const copy = [...prev];
                const index = copy.findIndex(x => x.id === formatted.id);
                if (index !== -1) copy[index] = formatted;
                else copy.push(formatted);
                return copy;
              });
            } else if (payload.eventType === 'DELETE') {
              if (payload.old?.id) {
                setElements(prev => prev.filter(m => m.id !== payload.old.id));
              }
            }
          })
          .on('presence', { event: 'sync' }, () => {
            if (!boardChannel) return;
            const state = boardChannel.presenceState();
            const users: Array<{ userId: string; name: string; avatar: string; color: string }> = [];
            const seen = new Set<string>();
            for (const presences of Object.values(state)) {
              for (const p of (presences as any[])) {
                if (p?.userId && !seen.has(p.userId)) {
                  seen.add(p.userId);
                  users.push({
                    userId: p.userId,
                    name: p.name || 'Thành viên',
                    avatar: p.avatar || '',
                    color: p.color || '#6366f1'
                  });
                }
              }
            }
            setCollaborators(users);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && boardChannel) {
              const { data: { session } } = await supabase.auth.getSession();
              const user = session?.user;
              if (user) {
                void boardChannel.track({
                  userId: user.id,
                  name: currentUser?.name || user.user_metadata?.full_name || user.user_metadata?.name || 'Thành viên',
                  avatar: currentUser?.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.avatar || '',
                  color: '#6366f1'
                });
              }
            }
          });
      } catch(e) {}
    }

    return () => {
      active = false;
      if (boardChannel) supabase.removeChannel(boardChannel);
    };
  }, [currentUser?.avatar, currentUser?.name, isOffline, whiteboardId]);

  // Sync back to Supabase
  const saveToSupabase = async (el: WhiteboardElement) => {
    if (isOffline) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('whiteboard_elements').upsert({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        color: el.color,
        line_width: el.lineWidth,
        text: el.text,
        points: el.points,
        whiteboard_id: whiteboardId,
        space_id: spaceId,
        workspace_id: workspaceId,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
      });
    } catch (err) {}
  };

  const deleteFromSupabase = async (id: string) => {
    if (isOffline) return;
    try {
      await supabase.from('whiteboard_elements').delete().eq('id', id);
    } catch (err) {}
  };

  const recordHistory = (snapshot = elementsRef.current, groupKey?: string) => {
    const now = Date.now();
    if (
      groupKey &&
      historyGroupRef.current?.key === groupKey &&
      now - historyGroupRef.current.at < 650
    ) {
      historyGroupRef.current.at = now;
      return;
    }

    const cloned = cloneWhiteboardElements(snapshot);
    const last = historyRef.current.past.at(-1);
    if (!last || JSON.stringify(last) !== JSON.stringify(cloned)) {
      historyRef.current.past = [...historyRef.current.past.slice(-49), cloned];
    }
    historyRef.current.future = [];
    historyGroupRef.current = groupKey ? { key: groupKey, at: now } : null;
    setHistoryState({
      canUndo: historyRef.current.past.length > 0,
      canRedo: false,
    });
  };

  const syncSnapshotToSupabase = (next: WhiteboardElement[], current: WhiteboardElement[]) => {
    const nextIds = new Set(next.map((element) => element.id));
    current.forEach((element) => {
      if (!nextIds.has(element.id)) deleteFromSupabase(element.id);
    });
    next.forEach((element) => saveToSupabase(element));
  };

  const handleUndo = () => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    const current = cloneWhiteboardElements(elementsRef.current);
    historyRef.current.past = historyRef.current.past.slice(0, -1);
    historyRef.current.future = [current, ...historyRef.current.future].slice(0, 50);
    historyGroupRef.current = null;
    const next = cloneWhiteboardElements(previous);
    elementsRef.current = next;
    setElements(next);
    setSelectedElementId(null);
    syncSnapshotToSupabase(next, current);
    setHistoryState({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    });
    onAddSyncLog('Whiteboard: Undo');
  };

  const handleRedo = () => {
    const nextSnapshot = historyRef.current.future[0];
    if (!nextSnapshot) return;
    const current = cloneWhiteboardElements(elementsRef.current);
    historyRef.current.future = historyRef.current.future.slice(1);
    historyRef.current.past = [...historyRef.current.past.slice(-49), current];
    historyGroupRef.current = null;
    const next = cloneWhiteboardElements(nextSnapshot);
    elementsRef.current = next;
    setElements(next);
    setSelectedElementId(null);
    syncSnapshotToSupabase(next, current);
    setHistoryState({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    });
    onAddSyncLog('Whiteboard: Redo');
  };

  const handleCopySelected = () => {
    const selected = elementsRef.current.find((element) => element.id === selectedElementId);
    if (!selected) return;
    clipboardElementRef.current = cloneWhiteboardElements([selected])[0];
    onAddSyncLog('Whiteboard: Copied selected element');
  };

  const handlePasteSelected = () => {
    const copied = clipboardElementRef.current;
    if (!copied) return;
    recordHistory();
    const pasted: WhiteboardElement = {
      ...cloneWhiteboardElements([copied])[0],
      id: `el-${Date.now()}`,
      x: copied.x + 28,
      y: copied.y + 28
    };
    const next = [...elementsRef.current, pasted];
    elementsRef.current = next;
    setElements(next);
    setSelectedElementId(pasted.id);
    clipboardElementRef.current = pasted;
    saveToSupabase(pasted);
    onAddSyncLog('Whiteboard: Pasted element');
  };

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === editorRef.current) {
        await document.exitFullscreen();
      } else {
        await editorRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen is unavailable:', error);
    }
  };

  const handleFitToContent = () => {
    const canvas = canvasRef.current;
    if (!canvas || elementsRef.current.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    elementsRef.current.forEach((element) => {
      if (element.type === 'pencil' && Array.isArray(element.points)) {
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else if (element.type !== 'line' || !element.points || Array.isArray(element.points)) {
        const width = element.width || 120;
        const height = element.type === 'sticky' && (element.height || 80) === 80 ? width : (element.height || 80);
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + width);
        maxY = Math.max(maxY, element.y + height);
      }
    });

    if (!Number.isFinite(minX)) return;
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const padding = 120;
    const nextZoom = Math.max(0.15, Math.min(2, Math.min(
      (canvas.width - padding) / contentWidth,
      (canvas.height - padding) / contentHeight
    )));
    setZoom(nextZoom);
    setPan({
      x: (canvas.width - contentWidth * nextZoom) / 2 - minX * nextZoom,
      y: (canvas.height - contentHeight * nextZoom) / 2 - minY * nextZoom
    });
    onAddSyncLog('Whiteboard: Fit content to viewport');
  };

  const { canUndo, canRedo } = historyState;

  const activeSelectedElement = elements.find(el => el.id === selectedElementId);

  // Keep the bitmap in sync with the actual editor viewport. A ResizeObserver
  // matters because opening a side panel changes width without resizing the window.
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const resizeObserver = new ResizeObserver(() => updateCanvasDimensions());
    resizeObserver.observe(parent);
    updateCanvasDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  const updateCanvasDimensions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      const nextWidth = Math.max(1, parent.clientWidth);
      const nextHeight = Math.max(1, parent.clientHeight);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        setCanvasRevision((revision) => revision + 1);
      }
    }
  };

  // Redraws elements whenever elements list or metadata modifies
  useEffect(() => {
    drawAllElements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, brushColor, activeTool, simCursors, selectedElementId, zoom, pan, connectionStart, connectionEnd, bgStyle, canvasRevision]);

  const drawAllElements = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and paint the selected infinite-canvas background.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgStyle === 'dark' ? '#111827' : '#fbfbfd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Transform coordinates using pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Infinite Grid pattern styling
    ctx.strokeStyle = bgStyle === 'dark' ? 'rgba(148, 163, 184, 0.16)' : '#e9eaf0';
    ctx.fillStyle = bgStyle === 'dark' ? 'rgba(148, 163, 184, 0.34)' : '#d7d9e1';
    ctx.lineWidth = 0.8 / zoom;
    const gridSize = 25;
    
    // Bounds of the current canvas viewport in model coordinates
    const minX = -pan.x / zoom;
    const minY = -pan.y / zoom;
    const maxX = (canvas.width - pan.x) / zoom;
    const maxY = (canvas.height - pan.y) / zoom;

    const startGridX = Math.floor(minX / gridSize) * gridSize;
    const startGridY = Math.floor(minY / gridSize) * gridSize;

    if (bgStyle === 'grid' || bgStyle === 'dark') {
      for (let x = startGridX; x < maxX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
        ctx.stroke();
      }
      for (let y = startGridY; y < maxY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
      }
    } else if (bgStyle === 'dots') {
      for (let x = startGridX; x < maxX; x += gridSize) {
        for (let y = startGridY; y < maxY; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.15 / zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Render defined elements
    elements.forEach(el => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.lineWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const sw = el.width || 120;
      const sh = el.height || 80;

      // Drop shadow mock for all shape components
      ctx.shadowColor = 'rgba(15, 23, 42, 0.04)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      if (el.type === 'pencil' && Array.isArray(el.points) && el.points.length > 0) {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        const pts: any[] = el.points as any[];
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'rectangle') {
        ctx.beginPath();
        ctx.fillStyle = getFillStyle(el.color, 0.05);
        ctx.rect(el.x, el.y, sw, sh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + sw/2, el.y + sh/2, sw - 12, 14);
      } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.fillStyle = getFillStyle(el.color, 0.05);
        const radius = Math.sqrt(Math.pow(sw, 2) + Math.pow(sh, 2)) / 2;
        ctx.arc(el.x + sw/2, el.y + sh/2, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + sw/2, el.y + sh/2, sw - 16, 14);
      } else if (el.type === 'line') {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // If it's a connected arrow
        if (el.points && !Array.isArray(el.points) && 'fromId' in el.points && 'toId' in el.points) {
          const pts: any = el.points;
          const fromEl = elements.find(item => item.id === pts.fromId);
          const toEl = elements.find(item => item.id === pts.toId);
          if (fromEl && toEl) {
            const socketsFrom = getElementSockets(fromEl);
            const socketsTo = getElementSockets(toEl);
            const sFrom = socketsFrom[pts.fromSocket as keyof typeof socketsFrom] || socketsFrom.top;
            const sTo = socketsTo[pts.toSocket as keyof typeof socketsTo] || socketsTo.top;
            
            ctx.beginPath();
            ctx.moveTo(sFrom.x, sFrom.y);
            ctx.lineTo(sTo.x, sTo.y);
            ctx.stroke();

            // Draw arrowhead at target socket
            drawArrowhead(ctx, sFrom.x, sFrom.y, sTo.x, sTo.y, 10 / zoom);
          }
        } else {
          // Static line
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + sw, el.y + sh);
          ctx.stroke();
        }
      } else if (el.type === 'sticky') {
        ctx.fillStyle = el.color; 
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        const finalSh = sh === 80 ? sw : sh;
        ctx.roundRect(el.x, el.y, sw, finalSh, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + sw/2, el.y + finalSh/2, sw - 16, 16);
      } else if (el.type === 'diamond') {
        ctx.beginPath();
        ctx.fillStyle = getFillStyle(el.color, 0.05);
        ctx.moveTo(el.x + sw / 2, el.y);
        ctx.lineTo(el.x + sw, el.y + sh / 2);
        ctx.lineTo(el.x + sw / 2, el.y + sh);
        ctx.lineTo(el.x, el.y + sh / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + sw/2, el.y + sh/2, sw - 24, 14);
      } else if (el.type === 'parallelogram') {
        ctx.beginPath();
        ctx.fillStyle = getFillStyle(el.color, 0.05);
        const skew = sw * 0.15;
        ctx.moveTo(el.x + skew, el.y);
        ctx.lineTo(el.x + sw, el.y);
        ctx.lineTo(el.x + sw - skew, el.y + sh);
        ctx.lineTo(el.x, el.y + sh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + sw/2, el.y + sh/2, sw - 32, 14);
      } else if (el.type === 'pill') {
        ctx.beginPath();
        ctx.fillStyle = getFillStyle(el.color, 0.05);
        const r = sh / 2;
        ctx.roundRect(el.x, el.y, sw, sh, r);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + sw/2, el.y + sh/2, sw - 24, 14);
      } else if (el.type === 'cylinder') {
        const rx = sw / 2;
        const ry = sh * 0.14;

        ctx.beginPath();
        ctx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.rect(el.x, el.y + ry, sw, sh - 2 * ry);
        ctx.ellipse(el.x + rx, el.y + sh - ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fillStyle = getFillStyle(el.color, 0.05);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(el.x + rx, el.y + sh - ry, rx, ry, 0, 0, Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(el.x, el.y + ry);
        ctx.lineTo(el.x, el.y + sh - ry);
        ctx.moveTo(el.x + sw, el.y + ry);
        ctx.lineTo(el.x + sw, el.y + sh - ry);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, el.text || '', el.x + rx, el.y + sh/2 + (ry/2), sw - 16, 14);
      }

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });

    // Draw active drawing connection line preview
    if (connectionStart && connectionEnd) {
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(connectionStart.x, connectionStart.y);
      ctx.lineTo(connectionEnd.x, connectionEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw outline indicator and sockets around active selected element
    if (selectedElementId && !isDrawing) {
      const sel = elements.find(el => el.id === selectedElementId);
      if (sel && sel.type !== 'pencil') {
        const sw = sel.width || 120;
        const sh = sel.height || 80;
        const finalSh = sel.type === 'sticky' && sh === 80 ? sw : sh;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.6 / zoom;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(sel.x - 4, sel.y - 4, sw + 8, finalSh + 8, 6);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw connection handles (sockets) if in Select mode
        if (activeTool === 'select' && sel.type !== 'line') {
          const sockets = getElementSockets(sel);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2 / zoom;
          for (const sVal of Object.values(sockets)) {
            ctx.beginPath();
            ctx.arc(sVal.x, sVal.y, 5 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }

    // Render multiplayer cursors indicators inside canvas view
    simCursors.forEach(cur => {
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 4 / zoom, 0, 2 * Math.PI);
      ctx.fill();

      // Cursors labeling layout
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.font = `bold ${Math.max(8, 9 / zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      
      const textWidth = ctx.measureText(cur.name).width;
      const labelW = textWidth + 8 / zoom;
      const labelH = 16 / zoom;
      
      ctx.roundRect(cur.x + 8 / zoom, cur.y - 10 / zoom, labelW, labelH, 4 / zoom);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(cur.name, cur.x + 12 / zoom, cur.y);
    });

    ctx.restore();
  };

  // Mouse canvas gesture management
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDidMoveElem(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 1. Support Middle click Panning
    if (e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
      return;
    }

    // 2. Support Spacebar or Hand Tool Panning
    if (activeTool === 'hand' || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Transform screen position to relative canvas coordinate
    const modelX = (screenX - pan.x) / zoom;
    const modelY = (screenY - pan.y) / zoom;

    // 3. Connect line initiation from a shape socket
    if (activeTool === 'select' && selectedElementId) {
      const sel = elements.find(el => el.id === selectedElementId);
      if (sel && sel.type !== 'pencil' && sel.type !== 'line') {
        const sockets = getElementSockets(sel);
        let clickedSocket: 'top' | 'right' | 'bottom' | 'left' | null = null;
        let socketCoord = { x: 0, y: 0 };
        
        for (const [key, val] of Object.entries(sockets)) {
          const sScreen = modelToScreen(val.x, val.y);
          const dist = Math.sqrt(
            Math.pow(screenX - sScreen.x, 2) + Math.pow(screenY - sScreen.y, 2)
          );
          if (dist < 12) {
            clickedSocket = key as any;
            socketCoord = val;
            break;
          }
        }

        if (clickedSocket) {
          setConnectionStart({
            elementId: sel.id,
            socket: clickedSocket,
            x: socketCoord.x,
            y: socketCoord.y
          });
          setConnectionEnd({ x: modelX, y: modelY });
          setIsDrawing(true);
          return;
        }
      }
    }

    // 4. Element Selection tool
    if (activeTool === 'select') {
      const found = elements.slice().reverse().find(el => {
        if (el.type !== 'pencil') {
          const w = el.width || 120;
          const h = el.height || 80;
          const finalH = el.type === 'sticky' && h === 80 ? w : h;
          // Ignore connection lines click-checking in simple select bounds
          if (el.type === 'line' && el.points && !Array.isArray(el.points) && 'fromId' in el.points) return false;
          return modelX >= el.x && modelX <= el.x + w && modelY >= el.y && modelY <= el.y + finalH;
        }
        return false;
      });

      if (found) {
        setSelectedElementId(found.id);
        setDragOffset({ x: modelX - found.x, y: modelY - found.y });
        setIsDraggingElement(true);
        dragSnapshotRef.current = cloneWhiteboardElements(elementsRef.current);
      } else {
        setSelectedElementId(null);
        setIsDraggingElement(false);
        dragSnapshotRef.current = null;
      }
      return;
    }

    // 5. Drawing shapes / Pencil gestures
    setIsDrawing(true);
    setStartPoint({ x: modelX, y: modelY });

    if (activeTool === 'pencil') {
      setPencilPoints([{ x: modelX, y: modelY }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 1. Panning state
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const modelX = (screenX - pan.x) / zoom;
    const modelY = (screenY - pan.y) / zoom;

    // 2. Connector line drag preview
    if (connectionStart && isDrawing) {
      setConnectionEnd({ x: modelX, y: modelY });
      return;
    }

    // 3. Selection movement drag logic
    if (activeTool === 'select' && selectedElementId && isDraggingElement) {
      setDidMoveElem(true);
      setElements(prev => {
        const next = prev.map(el => {
          if (el.id === selectedElementId) {
            return {
              ...el,
              x: modelX - dragOffset.x,
              y: modelY - dragOffset.y
            };
          }
          return el;
        });
        elementsRef.current = next;
        return next;
      });
      return;
    }

    if (!isDrawing) return;

    // 4. Brush line coordinates
    if (activeTool === 'pencil') {
      const updatedPoints = [...pencilPoints, { x: modelX, y: modelY }];
      setPencilPoints(updatedPoints);

      // Render temporary path on canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pencilPoints[pencilPoints.length - 1].x, pencilPoints[pencilPoints.length - 1].y);
        ctx.lineTo(modelX, modelY);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Shape dragging previews
      drawAllElements();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        if (activeTool === 'rectangle') {
          ctx.rect(startPoint.x, startPoint.y, modelX - startPoint.x, modelY - startPoint.y);
        } else if (activeTool === 'circle') {
          const radius = Math.sqrt(Math.pow(modelX - startPoint.x, 2) + Math.pow(modelY - startPoint.y, 2)) / 2;
          ctx.arc(startPoint.x + (modelX - startPoint.x)/2, startPoint.y + (modelY - startPoint.y)/2, radius, 0, 2 * Math.PI);
        } else if (activeTool === 'line') {
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(modelX, modelY);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // 1. Connection line creation
    if (connectionStart && isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const modelX = (screenX - pan.x) / zoom;
      const modelY = (screenY - pan.y) / zoom;

      // Find connection target shape
      const target = elements.find(el => {
        if (el.id === connectionStart.elementId) return false;
        if (el.type === 'pencil' || el.type === 'line') return false;
        const w = el.width || 120;
        const h = el.height || 80;
        const finalH = el.type === 'sticky' && h === 80 ? w : h;
        return modelX >= el.x && modelX <= el.x + w && modelY >= el.y && modelY <= el.y + finalH;
      });

      if (target) {
        // Find nearest socket of target shape
        const sockets = getElementSockets(target);
        let closestSocket: 'top' | 'right' | 'bottom' | 'left' = 'top';
        let minDist = Infinity;
        for (const [key, val] of Object.entries(sockets)) {
          const dist = Math.sqrt(Math.pow(modelX - val.x, 2) + Math.pow(modelY - val.y, 2));
          if (dist < minDist) {
            minDist = dist;
            closestSocket = key as any;
          }
        }

        const id = `el-${Date.now()}`;
        const newConnection: WhiteboardElement = {
          id,
          type: 'line',
          x: 0,
          y: 0,
          color: brushColor,
          lineWidth: 2,
          points: {
            fromId: connectionStart.elementId,
            fromSocket: connectionStart.socket,
            toId: target.id,
            toSocket: closestSocket
          }
        };

        recordHistory();
        setElements(prev => [...prev, newConnection]);
        saveToSupabase(newConnection);
        onAddSyncLog(`Whiteboard: Linked process chart with arrow connector`);
      }

      setConnectionStart(null);
      setConnectionEnd(null);
      return;
    }

    if (activeTool === 'select') {
      if (selectedElementId && didMoveElem && isDraggingElement) {
        if (dragSnapshotRef.current) recordHistory(dragSnapshotRef.current);
        setDidMoveElem(false);
        const movedEl = elementsRef.current.find(el => el.id === selectedElementId);
        if (movedEl) saveToSupabase(movedEl);
        onAddSyncLog(`Moved flowchart object position`);
      }
      setIsDraggingElement(false);
      dragSnapshotRef.current = null;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const modelX = (screenX - pan.x) / zoom;
    const modelY = (screenY - pan.y) / zoom;

    let newElement: WhiteboardElement | null = null;
    const id = `el-${Date.now()}`;

    if (activeTool === 'pencil') {
      newElement = {
        id,
        type: 'pencil',
        x: startPoint.x,
        y: startPoint.y,
        color: brushColor,
        lineWidth: brushWidth,
        points: pencilPoints
      };
    } else if (activeTool === 'line') {
      newElement = {
        id,
        type: 'line',
        x: startPoint.x,
        y: startPoint.y,
        width: modelX - startPoint.x,
        height: modelY - startPoint.y,
        color: brushColor,
        lineWidth: brushWidth,
        points: undefined
      };
    } else if (['rectangle', 'circle', 'diamond', 'parallelogram', 'pill', 'cylinder'].includes(activeTool)) {
      newElement = {
        id,
        type: activeTool as any,
        x: Math.min(startPoint.x, modelX),
        y: Math.min(startPoint.y, modelY),
        width: Math.abs(modelX - startPoint.x) < 10 ? 120 : Math.abs(modelX - startPoint.x),
        height: Math.abs(modelY - startPoint.y) < 10 ? 80 : Math.abs(modelY - startPoint.y),
        text: activeTool === 'rectangle' ? 'Process' : activeTool === 'circle' ? 'Idea' : activeTool === 'diamond' ? 'Decision' : 'Object',
        color: brushColor,
        lineWidth: brushWidth
      };
    } else if (activeTool === 'sticky') {
      newElement = {
        id,
        type: 'sticky',
        x: modelX - 65,
        y: modelY - 65,
        width: 130,
        height: 130,
        color: brushColor === '#6366f1' ? '#fef08a' : brushColor, 
        text: stickyText
      };
    }

    if (newElement) {
      const updatedElements = [...elements, newElement];
      recordHistory();
      setElements(updatedElements);
      setSelectedElementId(id);
      setActiveTool('select');
      saveToSupabase(newElement);
      onAddSyncLog(`Whiteboard: Created draw object [${activeTool.toUpperCase()}]`);
    }

    setPencilPoints([]);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const modelX = (screenX - pan.x) / zoom;
    const modelY = (screenY - pan.y) / zoom;

    // Find if double click selects an editable shape
    const found = elements.slice().reverse().find(el => {
      if (el.type !== 'pencil' && el.type !== 'line') {
        const w = el.width || 120;
        const h = el.height || 80;
        const finalH = el.type === 'sticky' && h === 80 ? w : h;
        return modelX >= el.x && modelX <= el.x + w && modelY >= el.y && modelY <= el.y + finalH;
      }
      return false;
    });

    if (found) {
      setEditingElementId(found.id);
      setEditingText(found.text || '');
    }
  };

  // Drag and Drop Widgets from Sidebar directly onto Board
  const handleDragStartFromSidebar = (
    e: React.DragEvent, 
    type: WhiteboardTool, 
    color: string, 
    text: string
  ) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.setData('widgetColor', color);
    e.dataTransfer.setData('widgetText', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Transform drop position
    const modelX = (screenX - pan.x) / zoom;
    const modelY = (screenY - pan.y) / zoom;

    const widgetType = e.dataTransfer.getData('widgetType') as WhiteboardTool;
    const widgetColor = e.dataTransfer.getData('widgetColor');
    const widgetText = e.dataTransfer.getData('widgetText');

    if (!widgetType) return;

    const id = `el-${Date.now()}`;
    const sw = widgetType === 'sticky' ? 130 : 120;
    const sh = widgetType === 'sticky' ? 130 : 80;

    const newElement: WhiteboardElement = {
      id,
      type: widgetType,
      x: modelX - sw / 2,
      y: modelY - sh / 2,
      width: sw,
      height: sh,
      color: widgetColor || brushColor,
      text: widgetText || 'Note',
      lineWidth: 2
    };

    recordHistory();
    setElements(prev => [...prev, newElement]);
    saveToSupabase(newElement);
    setSelectedElementId(id);
    setActiveTool('select');
    onAddSyncLog(`Whiteboard: Placed widget [${widgetType.toUpperCase()}] into empty space.`);
  };

  // Spawn widget in center of canvas (alternative helper on click)
  const handleSpawnWidget = (type: WhiteboardTool, color: string, text: string) => {
    const canvas = canvasRef.current;
    
    // Default zoom-aware viewport center calculation
    const cx = canvas ? (canvas.width / 2 - pan.x) / zoom - 60 : 300;
    const cy = canvas ? (canvas.height / 2 - pan.y) / zoom - 40 : 180;
    const offset = (elements.length * 15) % 150;

    const id = `el-${Date.now()}`;
    const sw = type === 'sticky' ? 130 : 120;
    const sh = type === 'sticky' ? 130 : 80;

    const newElement: WhiteboardElement = {
      id,
      type,
      x: cx + offset,
      y: cy + offset,
      width: sw,
      height: sh,
      color,
      text,
      lineWidth: 2
    };

    recordHistory();
    setElements(prev => [...prev, newElement]);
    saveToSupabase(newElement);
    setSelectedElementId(id);
    setActiveTool('select');
    onAddSyncLog(`Whiteboard: Added ${type === 'sticky' ? 'sticky note' : 'shape'} "${text}" successfully`);
  };

  // Clone an existing element
  const handleCloneElement = (el: WhiteboardElement) => {
    const id = `el-${Date.now()}`;
    const cloned: WhiteboardElement = {
      ...el,
      id,
      x: el.x + 24,
      y: el.y + 24
    };
    recordHistory();
    setElements(prev => [...prev, cloned]);
    saveToSupabase(cloned);
    setSelectedElementId(id);
    onAddSyncLog(`Whiteboard: Duplicating geometric object`);
  };

  // Delete an existing element
  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    recordHistory();
    const removedIds = new Set<string>([id]);
    elementsRef.current.forEach((element) => {
      if (element.type === 'line' && element.points && !Array.isArray(element.points)) {
        const connection = element.points as Record<string, unknown>;
        if (connection.fromId === id || connection.toId === id) removedIds.add(element.id);
      }
    });
    setElements(prev => prev.filter(el => !removedIds.has(el.id)));
    removedIds.forEach((removedId) => deleteFromSupabase(removedId));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    onAddSyncLog(`Whiteboard: Removed an element from whiteboard`);
  };

  // Update properties of the actively selected elements
  const updateSelectedElementProps = (props: Partial<WhiteboardElement>) => {
    if (!selectedElementId) return;
    recordHistory(elementsRef.current, `property-${selectedElementId}`);
    setElements(prev => prev.map(el => {
      if (el.id === selectedElementId) {
        const updated = {
          ...el,
          ...props
        };
        saveToSupabase(updated);
        return updated;
      }
      return el;
    }));
  };

  // Export full canvas space to high quality PNG
  const handleExportPNG = () => {
    if (elements.length === 0) return;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    elements.forEach(el => {
      if (el.type === 'pencil' && Array.isArray(el.points)) {
        (el.points as any[]).forEach((p: { x: number; y: number }) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      } else {
        const w = el.width || 120;
        const h = el.height || 80;
        const finalH = el.type === 'sticky' && h === 80 ? w : h;
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + w);
        maxY = Math.max(maxY, el.y + finalH);
      }
    });

    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;
    
    if (exportWidth <= 0 || exportHeight <= 0) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Fill white png canvas background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, exportWidth, exportHeight);
    
    // Draw background grid lines
    tempCtx.strokeStyle = '#f1f5f9';
    tempCtx.lineWidth = 1;
    const gSize = 25;
    for (let x = Math.floor(minX / gSize) * gSize; x < maxX; x += gSize) {
      tempCtx.beginPath();
      tempCtx.moveTo(x - minX, 0);
      tempCtx.lineTo(x - minX, exportHeight);
      tempCtx.stroke();
    }
    for (let y = Math.floor(minY / gSize) * gSize; y < maxY; y += gSize) {
      tempCtx.beginPath();
      tempCtx.moveTo(0, y - minY);
      tempCtx.lineTo(exportWidth, y - minY);
      tempCtx.stroke();
    }
    
    // Draw all components onto temp canvas
    elements.forEach(el => {
      tempCtx.strokeStyle = el.color;
      tempCtx.fillStyle = el.color;
      tempCtx.lineWidth = el.lineWidth || 2;
      tempCtx.lineCap = 'round';
      tempCtx.lineJoin = 'round';
      
      const drawX = el.x - minX;
      const drawY = el.y - minY;
      const sw = el.width || 120;
      const sh = el.height || 80;
      
      tempCtx.shadowColor = 'rgba(15, 23, 42, 0.04)';
      tempCtx.shadowBlur = 4;
      tempCtx.shadowOffsetX = 1;
      tempCtx.shadowOffsetY = 2;
      
      if (el.type === 'pencil' && Array.isArray(el.points) && el.points.length > 0) {
        const pts: any[] = el.points as any[];
        tempCtx.shadowBlur = 0;
        tempCtx.shadowOffsetX = 0;
        tempCtx.shadowOffsetY = 0;
        tempCtx.beginPath();
        tempCtx.moveTo(pts[0].x - minX, pts[0].y - minY);
        for (let i = 1; i < pts.length; i++) {
          tempCtx.lineTo(pts[i].x - minX, pts[i].y - minY);
        }
        tempCtx.stroke();
      } else if (el.type === 'rectangle') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        tempCtx.rect(drawX, drawY, sw, sh);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 12, 14);
      } else if (el.type === 'circle') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        const radius = Math.sqrt(Math.pow(sw, 2) + Math.pow(sh, 2)) / 2;
        tempCtx.arc(drawX + sw/2, drawY + sh/2, radius, 0, 2 * Math.PI);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 16, 14);
      } else if (el.type === 'line') {
        tempCtx.shadowBlur = 0;
        tempCtx.shadowOffsetX = 0;
        tempCtx.shadowOffsetY = 0;
            if (el.points && !Array.isArray(el.points) && 'fromId' in el.points && 'toId' in el.points) {
              const pts: any = el.points;
              const fromEl = elements.find(item => item.id === pts.fromId);
              const toEl = elements.find(item => item.id === pts.toId);
          if (fromEl && toEl) {
            const socketsFrom = getElementSockets(fromEl);
            const socketsTo = getElementSockets(toEl);
            const sFrom = socketsFrom[el.points.fromSocket as keyof typeof socketsFrom] || socketsFrom.top;
            const sTo = socketsTo[el.points.toSocket as keyof typeof socketsTo] || socketsTo.top;
            
            tempCtx.beginPath();
            tempCtx.moveTo(sFrom.x - minX, sFrom.y - minY);
            tempCtx.lineTo(sTo.x - minX, sTo.y - minY);
            tempCtx.stroke();
            
            drawArrowhead(tempCtx, sFrom.x - minX, sFrom.y - minY, sTo.x - minX, sTo.y - minY);
          }
        } else {
          tempCtx.beginPath();
          tempCtx.moveTo(drawX, drawY);
          tempCtx.lineTo(drawX + sw, drawY + sh);
          tempCtx.stroke();
        }
      } else if (el.type === 'sticky') {
        tempCtx.fillStyle = el.color;
        tempCtx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        tempCtx.lineWidth = 1;
        tempCtx.beginPath();
        const finalSh = sh === 80 ? sw : sh;
        tempCtx.roundRect(drawX, drawY, sw, finalSh, 10);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 12px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + finalSh/2, sw - 16, 16);
      } else if (el.type === 'diamond') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        tempCtx.moveTo(drawX + sw / 2, drawY);
        tempCtx.lineTo(drawX + sw, drawY + sh / 2);
        tempCtx.lineTo(drawX + sw / 2, drawY + sh);
        tempCtx.lineTo(drawX, drawY + sh / 2);
        tempCtx.closePath();
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 24, 14);
      } else if (el.type === 'parallelogram') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        const skew = sw * 0.15;
        tempCtx.moveTo(drawX + skew, drawY);
        tempCtx.lineTo(drawX + sw, drawY);
        tempCtx.lineTo(drawX + sw - skew, drawY + sh);
        tempCtx.lineTo(drawX, drawY + sh);
        tempCtx.closePath();
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 32, 14);
      } else if (el.type === 'pill') {
        tempCtx.beginPath();
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        const r = sh / 2;
        tempCtx.roundRect(drawX, drawY, sw, sh, r);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + sw/2, drawY + sh/2, sw - 24, 14);
      } else if (el.type === 'cylinder') {
        const rx = sw / 2;
        const ry = sh * 0.14;
        tempCtx.beginPath();
        tempCtx.ellipse(drawX + rx, drawY + ry, rx, ry, 0, 0, 2 * Math.PI);
        tempCtx.rect(drawX, drawY + ry, sw, sh - 2 * ry);
        tempCtx.ellipse(drawX + rx, drawY + sh - ry, rx, ry, 0, 0, 2 * Math.PI);
        tempCtx.fillStyle = getFillStyle(el.color, 0.05);
        tempCtx.fill();
        
        tempCtx.beginPath();
        tempCtx.ellipse(drawX + rx, drawY + sh - ry, rx, ry, 0, 0, Math.PI);
        tempCtx.stroke();
        
        tempCtx.beginPath();
        tempCtx.moveTo(drawX, drawY + ry);
        tempCtx.lineTo(drawX, drawY + sh - ry);
        tempCtx.moveTo(drawX + sw, drawY + ry);
        tempCtx.lineTo(drawX + sw, drawY + sh - ry);
        tempCtx.stroke();
        
        tempCtx.beginPath();
        tempCtx.ellipse(drawX + rx, drawY + ry, rx, ry, 0, 0, 2 * Math.PI);
        tempCtx.stroke();
        
        tempCtx.fillStyle = '#1e293b';
        tempCtx.font = 'bold 11px Inter, sans-serif';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        wrapText(tempCtx, el.text || '', drawX + rx, drawY + sh/2 + (ry/2), sw - 16, 14);
      }
      
      tempCtx.shadowBlur = 0;
      tempCtx.shadowOffsetX = 0;
      tempCtx.shadowOffsetY = 0;
    });
    
    // Download triggers
    const dataUrl = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `whiteboard-apexa-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    onAddSyncLog('Whiteboard: Exported diagram to PNG image successfully');
  };

  // Multiplayer simulations triggers
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (enableSim) {
      setSimCursors([
        { id: 'sim-1', name: 'Lan Anh (Engineering)', avatar: '', x: 200, y: 150 },
        { id: 'sim-2', name: 'Thao Vy (Design)', avatar: '', x: 450, y: 300 }
      ]);

      timer = setInterval(() => {
        setSimCursors(prev => prev.map(c => {
          const dx = (Math.random() - 0.5) * 50;
          const dy = (Math.random() - 0.5) * 55;
          const nextX = Math.max(50, Math.min(750, c.x + dx));
          const nextY = Math.max(50, Math.min(450, c.y + dy));

          return { ...c, x: nextX, y: nextY };
        }));

        if (Math.random() < 0.12) {
          const rx = 100 + Math.random() * 320;
          const ry = 100 + Math.random() * 220;
          const rColor = ['#ef4444', '#3b82f6', '#10b981', '#fecaca'][Math.floor(Math.random() * 4)];
          
          const newEl: WhiteboardElement = {
            id: `sim-shape-${Date.now()}`,
            type: Math.random() > 0.5 ? 'sticky' : 'rectangle',
            x: rx,
            y: ry,
            width: 120,
            height: 120,
            text: 'Peer drawing',
            color: rColor,
            lineWidth: 2
          };
          setElements(prev => [...prev, newEl]);
        }

      }, 1800);
    } else {
      setSimCursors([]);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [enableSim]);

  const handleClearBoard = () => {
    const current = cloneWhiteboardElements(elementsRef.current);
    if (current.length === 0) {
      setShowClearConfirm(false);
      return;
    }
    recordHistory(current);
    elementsRef.current = [];
    setElements([]);
    setSelectedElementId(null);
    current.forEach((element) => deleteFromSupabase(element.id));
    setShowClearConfirm(false);
    onAddSyncLog("Đã xóa toàn bộ nội dung bảng trắng chính");
  };

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;

      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (command && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (command && key === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }
      if (command && key === 'c') {
        event.preventDefault();
        handleCopySelected();
        return;
      }
      if (command && key === 'v') {
        event.preventDefault();
        handlePasteSelected();
        return;
      }
      if (command && key === 'd') {
        const selected = elementsRef.current.find((element) => element.id === selectedElementId);
        if (selected) {
          event.preventDefault();
          handleCloneElement(selected);
        }
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedElementId) {
          event.preventDefault();
          handleDeleteElement(selectedElementId);
        }
        return;
      }
      if (event.key === 'Escape') {
        setActiveTool('select');
        setSelectedElementId(null);
        setShowShortcutHelp(false);
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        handleFitToContent();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((value) => Math.min(4, value + 0.15));
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        setZoom((value) => Math.max(0.15, value - 0.15));
        return;
      }
      if (event.shiftKey && key === 'f') {
        event.preventDefault();
        handleToggleFullscreen();
        return;
      }

      const toolShortcuts: Record<string, WhiteboardTool | 'hand'> = {
        v: 'select',
        h: 'hand',
        n: 'sticky',
        p: 'pencil',
        r: 'rectangle',
        o: 'circle',
        l: 'line'
      };
      const shortcutTool = toolShortcuts[key];
      if (shortcutTool && !command && !event.altKey) {
        setActiveTool(shortcutTool);
        if (shortcutTool !== 'select') setSelectedElementId(null);
      }
    };

    window.addEventListener('keydown', handleEditorShortcut);
    return () => window.removeEventListener('keydown', handleEditorShortcut);
  });

  // Determine standard cursor based on active tools and dragging state
  const getCanvasCursor = () => {
    if (activeTool === 'hand' || isSpacePressed) {
      return isPanning ? 'grabbing' : 'grab';
    }
    return activeTool === 'select' ? 'default' : 'crosshair';
  };

  return (
    <div ref={editorRef} className="relative h-full min-h-0 flex overflow-hidden bg-[#f3f4f7] dark:bg-slate-950">
      
      {/* 1. SIDEBAR: BRAINSTORM WIDGETS & MODIFIERS PANEL */}
      <aside className={`${showLibrary ? 'flex' : 'hidden'} w-[248px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-200/80 bg-white/95 p-3 dark:border-slate-800 dark:bg-slate-950 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-2xl`}>
        
        {/* Active Selection / Config Editor Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/70 p-3.5 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-[13px] uppercase">
              Thuộc tính phần tử
            </h3>
          </div>

          {activeSelectedElement ? (
            <div className="space-y-3.5 select-none" id="whiteboard_element_editor">
              {/* Type tag */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Loại tiện ích</span>
                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 uppercase">
                  {activeSelectedElement.type}
                </span>
              </div>

              {/* Text Editor (Only show for shapes with text capabilities) */}
              {activeSelectedElement.type !== 'pencil' && activeSelectedElement.type !== 'line' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Type className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>Nội dung ghi chú</span>
                  </label>
                  <input
                    id="edit_element_text"
                    type="text"
                    value={activeSelectedElement.text || ''}
                    onChange={(e) => updateSelectedElementProps({ text: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/20 outline-none font-medium text-slate-800 dark:text-slate-50"
                    placeholder="Thay đổi ghi chú..."
                  />
                </div>
              )}

              {/* Core resizing widget dials */}
              {activeSelectedElement.type !== 'pencil' && activeSelectedElement.type !== 'line' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Width</label>
                    <input 
                      type="range"
                      min="60"
                      max="300"
                      value={activeSelectedElement.width || 120}
                      onChange={(e) => updateSelectedElementProps({ width: Number(e.target.value) })}
                      className="w-full h-1 accent-indigo-600 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5 block">
                      {activeSelectedElement.width || 120}px
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Height</label>
                    <input 
                      type="range"
                      min="40"
                      max="300"
                      value={activeSelectedElement.height || 80}
                      onChange={(e) => updateSelectedElementProps({ height: Number(e.target.value) })}
                      className="w-full h-1 accent-indigo-600 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5 block">
                      {activeSelectedElement.height || 80}px
                    </span>
                  </div>
                </div>
              )}

              {/* Switch Background or Outline coloring */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Bảng màu phần tử</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    '#6366f1', // Indigo
                    '#bae6fd', // Pale Blue (nice sticky)
                    '#fef08a', // Pale Yellow (default sticky)
                    '#bbf7d0', // Pale Green (approved sticky)
                    '#fbcfe8', // Pale Pink (goal)
                    '#fed7aa', // Pale Orange (discussion)
                    '#fecaca', // Pale Red (risk)
                    '#0ea5e9', // Sky Blue
                    '#f3f4f6'  // Light grey
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateSelectedElementProps({ color: c })}
                      className={`w-5.5 h-5.5 rounded-full transition-all border border-slate-300/40 cursor-pointer ${
                        activeSelectedElement.color === c ? 'scale-125 ring-2 ring-indigo-500/30' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Action elements shortcuts */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => handleCloneElement(activeSelectedElement)}
                  className="flex-1 py-1.8 px-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Nhân bản"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => handleDeleteElement(activeSelectedElement.id)}
                  className="py-1.8 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <Info className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                Chọn một phần tử để tùy chỉnh phông chữ, màu sắc và vị trí. Nhấp đúp vào hình để sửa văn bản trực tiếp.
              </p>
            </div>
          )}
        </div>

        {/* DRAGGABLE STICKY NOTES SPOOLER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/70 p-3.5 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <StickyNote className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-[13px] uppercase">
              Ghi chú dán
            </h3>
          </div>
          
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Kéo thả ghi chú lên bảng hoặc nhấp để chèn vào giữa:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'st-yellow', color: '#fef08a', text: 'New Idea', label: 'Idea' },
              { id: 'st-blue', color: '#bae6fd', text: 'New Plan', label: 'Action' },
              { id: 'st-green', color: '#bbf7d0', text: 'Approved', label: 'Approve' },
              { id: 'st-orange', color: '#fed7aa', text: 'Revision Needed', label: 'Review' },
              { id: 'st-pink', color: '#fbcfe8', text: 'Project Goal', label: 'Goal' },
              { id: 'st-red', color: '#fecaca', text: 'Risk identified', label: 'Risk' }
            ].map((st) => (
              <div
                key={st.id}
                draggable="true"
                onDragStart={(e) => handleDragStartFromSidebar(e, 'sticky', st.color, st.text)}
                onClick={() => handleSpawnWidget('sticky', st.color, st.text)}
                style={{ backgroundColor: st.color }}
                className="p-2.5 rounded-xl border border-black/5 cursor-grab hover:-translate-y-0.5 active:cursor-grabbing hover:shadow-md transition-all text-center select-none"
              >
                <span className="text-[11px] font-extrabold text-[#1E293B] block truncate">{st.label}</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold block mt-1 uppercase">Kéo hoặc nhấp</span>
              </div>
            ))}
          </div>
        </div>

        {/* DRAGGABLE DIAGRAM FLOWCHART ELEMENTS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/70 p-3.5 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <Grid className="w-4 h-4 text-cyan-600" />
            <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-[13px] uppercase">
              Hình khối lưu đồ
            </h3>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Dùng các hình khối chuyên dụng để xây dựng quy trình vận hành:
          </p>

          <div className="space-y-2">
            {[
              { type: 'pill', icon: Circle, color: '#6366f1', text: 'Start / End', label: 'Pill shape (Start/End)' },
              { type: 'rectangle', icon: Square, color: '#0ea5e9', text: 'Execute Process', label: 'Rectangle (Process)' },
              { type: 'diamond', icon: Circle, color: '#f59e0b', text: 'Logic Decision', label: 'Diamond (Decision)' },
              { type: 'parallelogram', icon: Circle, color: '#ec4899', text: 'Input / Output', label: 'Parallelogram (I/O)' },
              { type: 'cylinder', icon: Database, color: '#10b981', text: 'Database Storage', label: 'Cylinder (Database)' }
            ].map((sh, idx) => (
              <div
                key={idx}
                draggable="true"
                onDragStart={(e) => handleDragStartFromSidebar(e, sh.type as WhiteboardTool, sh.color, sh.text)}
                onClick={() => handleSpawnWidget(sh.type as WhiteboardTool, sh.color, sh.text)}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 rounded-xl cursor-grab hover:shadow-xs transition-all select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className="p-1.5 rounded-lg text-white"
                    style={{ backgroundColor: sh.color }}
                  >
                    <sh.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-50 block leading-none">{sh.text}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{sh.type.toUpperCase()}</span>
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 cursor-pointer" />
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* 2. MAIN COMPONENT: INTERACTIVE WHITEBOARD CANVA ARENA */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fbfbfd] dark:bg-slate-900">
        
        {/* Title & Multiplayer actions header */}
        <div className="z-30 flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-slate-200/90 bg-white text-slate-700 font-bold text-xs shadow-xs transition hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shrink-0"
                title="Quay lại danh sách dự án bảng trắng"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dự án</span>
              </button>
            )}

            <button
              onClick={() => setShowLibrary((value) => !value)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              title={showLibrary ? 'Ẩn thư viện phần tử' : 'Mở thư viện phần tử'}
            >
              {showLibrary ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <FolderKanban className="w-3 h-3 text-indigo-500" />
                <span className="truncate max-w-[140px] font-bold text-slate-600 dark:text-slate-400">{projectName || spaceName || 'Dự án Bảng trắng'}</span>
                <span>/</span>
                <span>Canvas</span>
              </div>

              {isEditingBoardTitle && onRenameBoard ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingTitleValue.trim()) onRenameBoard(editingTitleValue.trim());
                        setIsEditingBoardTitle(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingBoardTitle(false);
                      }
                    }}
                    autoFocus
                    className="px-2 py-0.5 text-xs font-extrabold rounded-md border border-indigo-400 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      if (editingTitleValue.trim()) onRenameBoard(editingTitleValue.trim());
                      setIsEditingBoardTitle(false);
                    }}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingBoardTitle(false)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => {
                  if (onRenameBoard) {
                    setEditingTitleValue(boardName);
                    setIsEditingBoardTitle(true);
                  }
                }}>
                  <h2 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{boardName}</h2>
                  {onRenameBoard && (
                    <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              )}
            </div>

            <div className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold sm:flex border ${
              saveState === 'saved'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/40'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/40'
            }`}>
              {saveState === 'saved' ? <CheckCircle2 className="h-3 w-3" /> : <Cloud className="h-3 w-3 animate-pulse" />}
              {saveState === 'saved' ? 'Đã lưu' : 'Đang lưu'}
            </div>
            <div className="hidden items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5 md:flex dark:border-slate-700 dark:bg-slate-800">
              <button onClick={handleUndo} disabled={!canUndo} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700" title="Hoàn tác (Ctrl+Z)">
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleRedo} disabled={!canRedo} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700" title="Làm lại (Ctrl+Y)">
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn_multiplayer_sim"
              onClick={() => {
                setEnableSim(!enableSim);
                onAddSyncLog(enableSim ? "Đã tắt mô phỏng thiết kế cộng tác" : "Đã bật mô phỏng thiết kế nhiều người");
              }}
              className={`hidden lg:flex py-2 px-3 text-[11px] font-bold rounded-xl transition-all cursor-pointer items-center gap-1.5 ${
                enableSim 
                  ? 'bg-pink-100 text-pink-700 border border-pink-200' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${enableSim ? 'animate-spin' : ''}`} />
              <span>{enableSim ? 'Stop Peer Drawing' : 'Simulate Peer Drawing'}</span>
            </button>

            <button
              onClick={() => setShowTemplateModal(true)}
              className="py-2 px-3 text-[11px] font-extrabold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-900/60"
              title="Chọn mẫu sơ đồ"
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Mẫu Sơ đồ</span>
            </button>

            <button
              id="btn_ai_analyst"
              onClick={handleOpenAiAnalyst}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 hover:bg-indigo-55/35 rounded-xl transition-colors cursor-pointer flex items-center justify-center animate-pulse"
              title="Phân tích bảng trắng bằng AI"
            >
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
            </button>

            {collaborators.length > 0 && (
              <div className="flex items-center -space-x-1.5 mr-1" title={`${collaborators.length} người đang trực tiếp trên bảng vẽ`}>
                {collaborators.slice(0, 4).map((c) => (
                  <div
                    key={c.userId}
                    className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 relative"
                    title={`${c.name} (Đang trực tiếp)`}
                  >
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      c.name.charAt(0).toUpperCase()
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                  </div>
                ))}
                {collaborators.length > 4 && (
                  <div className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                    +{collaborators.length - 4}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
              title="Chia sẻ và phân quyền bảng trắng"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Chia sẻ</span>
            </button>

            <button
              id="btn_export_png"
              onClick={handleExportPNG}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-55/35 rounded-xl transition-colors cursor-pointer"
              title="Xuất bảng trắng thành PNG"
            >
              <Download className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleExportJSON}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-55/35 rounded-xl transition-colors cursor-pointer"
              title="Xuất dữ liệu dạng JSON"
            >
              <FileJson className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="hidden lg:block p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-55/35 rounded-xl transition-colors cursor-pointer"
              title="Nhập dữ liệu JSON"
            >
              <Upload className="w-4.5 h-4.5" />
            </button>

            <input 
              type="file"
              ref={jsonFileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />

            <button
              id="btn_clear_whiteboard"
              onClick={() => setShowClearConfirm(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Xóa toàn bộ bảng trắng"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={() => setShowShortcutHelp(true)}
              className="hidden xl:block p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
              title="Phím tắt"
            >
              <Keyboard className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Thoát toàn màn hình (Shift+F)' : 'Toàn màn hình (Shift+F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Expand className="w-4.5 h-4.5" />}
            </button>

          </div>
        </div>

        {/* Interactive control settings toolbar */}
        <div className="absolute left-1/2 top-[78px] z-30 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl select-none dark:border-slate-700 dark:bg-slate-900/95">
          {/* Drawing brush selection and selectors */}
          <div className="flex items-center gap-0.5">
            {[
              { id: 'select', icon: MousePointer, label: 'Select & Drag' },
              { id: 'hand', icon: Hand, label: 'Pan Canvas' },
              { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
              { id: 'pencil', icon: Edit2, label: 'Free Draw' },
              { id: 'rectangle', icon: Square, label: 'Rectangle' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'line', icon: ArrowUpRight, label: 'Arrow Connector' }
            ].map((tool) => (
              <button
                key={tool.id}
                id={`tool_${tool.id}`}
                onClick={() => {
                  setActiveTool(tool.id as any);
                  if (tool.id !== 'select') {
                    setSelectedElementId(null); // Deselect when moving to drawing tools
                  }
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold ${
                  activeTool === tool.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'
                }`}
                title={tool.label}
              >
                <tool.icon className="w-4 h-4 shrink-0" />
                <span className="hidden 2xl:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Color pickers selection */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-700">
            <div className="hidden sm:flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
              {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#1e293b'].map((hexColor) => (
                <button
                  key={hexColor}
                  onClick={() => setBrushColor(hexColor)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    brushColor === hexColor ? 'scale-125 ring-2 ring-slate-300' : ''
                  }`}
                  style={{ backgroundColor: hexColor }}
                />
              ))}
            </div>

            {activeTool === 'pencil' && (
              <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input 
                  type="range" 
                  min="2" 
                  max="12" 
                  value={brushWidth} 
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-16 accent-indigo-600 cursor-pointer" 
                />
                <span className="font-bold text-slate-700 dark:text-slate-200 min-w-4">{brushWidth}px</span>
              </div>
            )}
          </div>
        </div>

        {/* HTML5 Canvas drop targets */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          className="relative min-h-0 flex-1 overflow-hidden bg-[#fbfbfd]"
          style={{ cursor: getCanvasCursor() }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label={locale === 'vi' ? 'Vùng vẽ bảng trắng' : 'Whiteboard drawing canvas'}
            onMouseDown={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              handleMouseDown(event);
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            className="block w-full h-full"
            style={{ height: '100%', width: '100%' }}
          />

          {/* Floating Inline Text Editor Input overlay */}
          {editingElementId && (() => {
            const el = elements.find(item => item.id === editingElementId);
            if (!el) return null;
            
            const w = el.width || 120;
            const h = el.height || 80;
            const finalH = el.type === 'sticky' && h === 80 ? w : h;
            
            // Convert model positions to screen positions on absolute overlay
            const screenX = el.x * zoom + pan.x;
            const screenY = el.y * zoom + pan.y;
            const screenW = w * zoom;
            const screenH = finalH * zoom;
            
            return (
              <textarea
                value={editingText}
                autoFocus
                onChange={(e) => {
                  setEditingText(e.target.value);
                  updateSelectedElementProps({ text: e.target.value });
                }}
                onBlur={() => setEditingElementId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setEditingElementId(null);
                  }
                  if (e.key === 'Escape') {
                    setEditingElementId(null);
                  }
                }}
                className="absolute shadow-sm border border-indigo-400 bg-white/95 dark:bg-slate-900/95 dark:text-white rounded-md p-1 focus:ring-2 focus:ring-indigo-500/20"
                style={{
                  left: `${screenX + 6}px`,
                  top: `${screenY + 6}px`,
                  width: `${screenW - 12}px`,
                  height: `${screenH - 12}px`,
                  fontSize: `${Math.max(10, 11 * zoom)}px`,
                  lineHeight: '1.3',
                  textAlign: 'center',
                  resize: 'none',
                  outline: 'none',
                  overflow: 'hidden',
                  fontWeight: 'bold',
                  zIndex: 50
                }}
              />
            );
          })()}

          {/* Zoom Overlay (Miro style) */}
          <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md flex items-center gap-1.5 sm:gap-2 select-none z-10">
            <button
              onClick={() => {
                const newZoom = Math.max(0.15, zoom - 0.15);
                setZoom(newZoom);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-200 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                const newZoom = Math.min(4, zoom + 0.15);
                setZoom(newZoom);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={handleFitToContent}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Vừa nội dung vào màn hình (0)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1 sm:p-1.5 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            {([
              { id: 'grid', label: 'Lưới' },
              { id: 'dots', label: 'Chấm' },
              { id: 'plain', label: 'Trơn' },
              { id: 'dark', label: 'Tối' }
            ] as const).map((background) => (
              <button
                key={background.id}
                onClick={() => setBgStyle(background.id)}
                className={`rounded-xl px-2 py-1.5 text-[9px] font-bold transition ${
                  bgStyle === background.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
                title={`Nền ${background.label.toLowerCase()}`}
              >
                {background.label}
              </button>
            ))}
            <span className="ml-1 border-l border-slate-200 pl-2 text-[9px] font-mono text-slate-400 dark:border-slate-700">
              {elements.length} đối tượng
            </span>
          </div>

          {elements.length === 0 && (
            <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-8 ${bgStyle === 'dark' ? 'bg-slate-950/10' : 'bg-slate-50/10'}`}>
              <Grid className="w-12 h-12 text-slate-300 stroke-[1.1] mb-3 animate-pulse" />
              <h4 className={`font-display font-extrabold text-xs uppercase tracking-wider ${bgStyle === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                Bảng trống — Sẵn sàng sáng tạo
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mt-1 leading-normal font-medium">
                Chọn bút vẽ ở trên hoặc <span className="font-bold text-indigo-500">kéo thả ghi chú hoặc hình khối lưu đồ</span> từ thanh bên trái vào bảng!
              </p>
            </div>
          )}
        </div>

      </section>

      {/* 3. AI ANALYST SIDEPANEL */}
      <AnimatePresence>
        {showAiAnalyst && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute inset-y-[66px] right-0 z-40 flex w-[340px] max-w-[calc(100%-24px)] flex-col justify-between space-y-4 border-l border-slate-200/80 bg-white p-5 text-left shadow-[-12px_0_36px_rgba(15,23,42,0.1)] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-55 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-500 animate-pulse" />
                {t('aiWhiteboardAnalyst') || 'AI Whiteboard Analyst'}
              </h3>
              <button 
                onClick={() => setShowAiAnalyst(false)} 
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[460px] scrollbar-thin">
              {/* Task Mode Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {(['explain', 'optimize', 'tasks'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setAiMode(mode);
                      setAiResult('');
                      setAiGeneratedTasks([]);
                      setTasksAdded(false);
                      setAiError(null);
                    }}
                    className={`flex-1 py-1 text-[9px] font-extrabold rounded-lg capitalize transition-all cursor-pointer ${
                      aiMode === mode 
                        ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {mode === 'explain' ? (t('explain') || 'Explain') : mode === 'optimize' ? (t('optimize') || 'Optimize') : (t('extractTasks') || 'Extract Tasks')}
                  </button>
                ))}
              </div>

              {/* Custom Prompt */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('additionalRequest') || 'Additional Request (Optional)'}</label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder={aiMode === 'tasks' ? (t('aiTasksPromptPlaceholder') || "e.g. Only fetch dev tasks...") : (t('aiExplainPromptPlaceholder') || "e.g. Short summary...")}
                  className="w-full px-3.5 py-2 text-[10.5px] font-semibold rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunAiAnalysis}
                disabled={aiLoading}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('analyzing') || 'Analyzing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('startAiAnalysis') || 'Start AI Analysis'}</span>
                  </>
                )}
              </button>

              {/* Error */}
              {aiError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-455 rounded-xl text-[10px] font-semibold leading-relaxed">
                  ⚠️ {t('error') || 'Error'}: {aiError}
                </div>
              )}

              {/* Results */}
              {aiLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-center select-none">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold animate-pulse">{t('geminiLookingAtBoard') || 'Gemini is analyzing your whiteboard elements...'}</span>
                </div>
              ) : aiResult ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150/60 dark:border-slate-800 rounded-2xl text-[11px] leading-relaxed text-slate-650 dark:text-slate-350 max-h-[260px] overflow-y-auto font-sans space-y-2 whitespace-pre-wrap scrollbar-thin">
                  {aiResult}
                </div>
              ) : aiGeneratedTasks.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">{(t('extractedTasksCount') || 'Extracted').replace('{count}', String(aiGeneratedTasks.length))}</span>
                    <button
                      onClick={handleAddAiTasks}
                      disabled={tasksAdded}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                        tasksAdded 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                          : 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400'
                      }`}
                    >
                      {tasksAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('savedToBoard') || 'Saved to Board'}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('saveToBoard') || 'Save to Board'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {aiGeneratedTasks.map((t, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150/60 dark:border-slate-850 rounded-2xl space-y-1.5 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-[11px] font-black text-slate-850 dark:text-slate-150 leading-tight">{t.title}</h4>
                          <span className={`text-[7.5px] uppercase px-1.5 py-0.5 rounded font-black leading-none ${
                            t.priority === 'urgent' ? 'bg-rose-500 text-white' :
                            t.priority === 'high' ? 'bg-orange-500 text-white' :
                            t.priority === 'medium' ? 'bg-indigo-500 text-white' : 'bg-slate-400 text-white'
                          }`}>{t.priority}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold leading-normal">{t.description}</p>
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex gap-1 pt-1 flex-wrap">
                            {t.tags.map((tag: string, tagIdx: number) => (
                              <span key={tagIdx} className="text-[7.5px] bg-slate-205 dark:bg-slate-800 text-slate-500 dark:text-slate-405 px-1.5 py-0.5 rounded font-black">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !aiLoading && (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-550 italic text-[10.5px] leading-relaxed select-none">
                    {t('aiAnalysisPlaceholder') || 'Click analyze to start! AI can read and understand drawings, flowcharts, or Sticky Notes on your board.'}
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board Templates Selector Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-indigo-500" />
                  {locale === 'vi' ? 'Mẫu Sơ đồ Bảng vẽ (Whiteboard Templates)' : 'Whiteboard Templates'}
                </h3>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {[
                  { id: 'kanban', title: 'Kanban Board', desc: locale === 'vi' ? 'Cần làm, Đang làm, Hoàn thành' : 'To Do, In Progress, Done', color: 'from-amber-500/10 to-emerald-500/10' },
                  { id: 'swot', title: 'SWOT Analysis', desc: 'Strengths, Weaknesses, Opportunities, Threats', color: 'from-blue-500/10 to-indigo-500/10' },
                  { id: 'mindmap', title: 'Mind Map', desc: locale === 'vi' ? 'Ý tưởng trung tâm kết nối nhánh phụ' : 'Central idea connecting sub-branches', color: 'from-blue-500/10 to-cyan-500/10' },
                  { id: 'userjourney', title: 'User Journey Map', desc: 'Discover, Try, Buy, Love', color: 'from-emerald-500/10 to-teal-500/10' }
                ].map((tmpl) => (
                  <div 
                    key={tmpl.id}
                    onClick={() => handleLoadBoardTemplate(tmpl.id as any)}
                    className={`p-4 rounded-2xl bg-gradient-to-br ${tmpl.color} border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500 transition-all cursor-pointer space-y-1.5 group`}
                  >
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{tmpl.title}</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{tmpl.desc}</p>
                    <span className="inline-block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 pt-1 group-hover:translate-x-1 transition-transform">
                      {locale === 'vi' ? 'Nạp mẫu này →' : 'Load Template →'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Xóa toàn bộ bảng?</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Tất cả ghi chú, hình khối và đường nối sẽ bị xóa. Bạn vẫn có thể hoàn tác ngay sau thao tác này.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowClearConfirm(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  Hủy
                </button>
                <button onClick={handleClearBoard} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700">
                  Xóa bảng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShortcutHelp && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setShowShortcutHelp(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Phím tắt Whiteboard</h3>
                </div>
                <button onClick={() => setShowShortcutHelp(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {[
                  ['V', 'Chọn và di chuyển'], ['H / Space', 'Kéo canvas'],
                  ['N', 'Ghi chú dán'], ['P', 'Vẽ tự do'],
                  ['R / O', 'Chữ nhật / hình tròn'], ['L', 'Đường nối'],
                  ['Ctrl + Z', 'Hoàn tác'], ['Ctrl + Y', 'Làm lại'],
                  ['Ctrl + C / V', 'Sao chép / dán'], ['Ctrl + D', 'Nhân bản'],
                  ['Delete', 'Xóa phần tử'], ['0', 'Vừa nội dung'],
                  ['+ / −', 'Phóng to / thu nhỏ'], ['Shift + F', 'Toàn màn hình']
                ].map(([shortcut, label]) => (
                  <div key={shortcut} className="flex items-center justify-between gap-4 rounded-xl px-2 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/70">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <kbd className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{shortcut}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share & Permissions Modal */}
      {isShareModalOpen && (
        <ShareSettingsModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          targetType="whiteboard"
          targetId={whiteboardId || 'default'}
          targetName={boardName || 'Bảng trắng'}
          isPrivate={whiteboardIsPrivate}
          shareSettings={whiteboardShareSettings}
          members={members}
          currentUser={currentUser || members[0] || { name: 'Tôi' }}
          canEdit={true}
          spaceId={spaceId}
          onSave={handleSaveWhiteboardShare}
        />
      )}

    </div>
  );
}
