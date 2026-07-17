"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { WhiteboardTool, WhiteboardElement, User, TeamMemberCursor, Task } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Square, Circle, Edit2, Move, StickyNote, Grid,
  Trash2, Users, Sparkles, Database, Code, 
  Copy, Sliders, Type, Plus, Info, MousePointer, 
  Hand, ZoomIn, ZoomOut, Maximize2, Download, ArrowUpRight,
  Brain, Loader2, Bot, Globe, Check
} from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';

interface WhiteboardProps {
  members: User[];
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  whiteboardId?: string;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  tasks?: Task[];
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
  onAddTask,
  tasks = []
}: WhiteboardProps) {
  const { t, locale } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Custom tools state (extend with Hand tool support)
  const [activeTool, setActiveTool] = useState<WhiteboardTool | 'hand'>('select');
  const [brushColor, setBrushColor] = useState('#6366f1');
  const [brushWidth, setBrushWidth] = useState(4);
  const [stickyText, setStickyText] = useState('Idea Note');

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

  // AI Analyst Sidepanel states
  const [showAiAnalyst, setShowAiAnalyst] = useState(false);
  const [aiMode, setAiMode] = useState<'explain' | 'optimize' | 'tasks'>('explain');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<any[]>([]);
  const [tasksAdded, setTasksAdded] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
    if (elements.length === 0) {
      alert("Hãy vẽ nội dung gì đó trên bảng trước khi phân tích!");
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
    try {
      const saved = localStorage.getItem(`avaxa_whiteboard_${whiteboardId}`);
      if (saved) {
        setElements(JSON.parse(saved));
      } else {
        setElements([]);
      }
    } catch (e) {
      setElements([]);
    }
  }, [whiteboardId]);

  // Save elements when they change
  useEffect(() => {
    if (!whiteboardId) return;
    try {
      localStorage.setItem(`avaxa_whiteboard_${whiteboardId}`, JSON.stringify(elements));
    } catch (e) {}
  }, [elements, whiteboardId]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pencilPoints, setPencilPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected element for dragging/moving or customizing in Sidebar
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [didMoveElem, setDidMoveElem] = useState(false);

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
        
        const { data, error } = await supabase.from('whiteboard_elements').select('*');
        
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
        boardChannel = supabase.channel('realtime-whiteboard-elements')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'whiteboard_elements' }, payload => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const m = payload.new;
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
              setElements(prev => prev.filter(m => m.id !== payload.old.id));
            }
          })
          .subscribe();
      } catch(e) {}
    }

    return () => {
      active = false;
      if (boardChannel) supabase.removeChannel(boardChannel);
    };
  }, [isOffline]);

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
        user_id: session.user.id,
        updated_at: new Date().toISOString()
      });
    } catch (err) {}
  };

  const deleteFromSupabase = async (id: string) => {
    if (isOffline) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('whiteboard_elements').delete().eq('id', id).eq('user_id', session.user.id);
    } catch (err) {}
  };

  const activeSelectedElement = elements.find(el => el.id === selectedElementId);

  // Initialize Canvas layout and responsiveness
  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [elements]);

  const updateCanvasDimensions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = 550;
      drawAllElements();
    }
  };

  // Redraws elements whenever elements list or metadata modifies
  useEffect(() => {
    drawAllElements();
  }, [elements, brushColor, activeTool, simCursors, selectedElementId, zoom, pan, connectionStart, connectionEnd]);

  const drawAllElements = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous view
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Transform coordinates using pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Infinite Grid pattern styling
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.8 / zoom;
    const gridSize = 25;
    
    // Bounds of the current canvas viewport in model coordinates
    const minX = -pan.x / zoom;
    const minY = -pan.y / zoom;
    const maxX = (canvas.width - pan.x) / zoom;
    const maxY = (canvas.height - pan.y) / zoom;

    const startGridX = Math.floor(minX / gridSize) * gridSize;
    const startGridY = Math.floor(minY / gridSize) * gridSize;

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
      } else {
        setSelectedElementId(null);
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
    if (activeTool === 'select' && selectedElementId && !isDrawing) {
      setDidMoveElem(true);
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            x: modelX - dragOffset.x,
            y: modelY - dragOffset.y
          };
        }
        return el;
      }));
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

        setElements(prev => [...prev, newConnection]);
        saveToSupabase(newConnection);
        onAddSyncLog(`Whiteboard: Linked process chart with arrow connector`);
      }

      setConnectionStart(null);
      setConnectionEnd(null);
      return;
    }

    if (activeTool === 'select') {
      if (selectedElementId && didMoveElem) {
        setDidMoveElem(false);
        const movedEl = elements.find(el => el.id === selectedElementId);
        if (movedEl) saveToSupabase(movedEl);
        onAddSyncLog(`Moved flowchart object position`);
      }
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
    setElements(prev => [...prev, cloned]);
    saveToSupabase(cloned);
    setSelectedElementId(id);
    onAddSyncLog(`Whiteboard: Duplicating geometric object`);
  };

  // Delete an existing element
  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setElements(prev => prev.filter(el => el.id !== id));
    deleteFromSupabase(id);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    onAddSyncLog(`Whiteboard: Removed an element from whiteboard`);
  };

  // Update properties of the actively selected elements
  const updateSelectedElementProps = (props: Partial<WhiteboardElement>) => {
    if (!selectedElementId) return;
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
    link.download = `whiteboard-avaxa-${Date.now()}.png`;
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
    setElements([]);
    setSelectedElementId(null);
    onAddSyncLog("Cleared main whiteboard workspace");
  };

  // Determine standard cursor based on active tools and dragging state
  const getCanvasCursor = () => {
    if (activeTool === 'hand' || isSpacePressed) {
      return isPanning ? 'grabbing' : 'grab';
    }
    return 'crosshair';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* 1. SIDEBAR: BRAINSTORM WIDGETS & MODIFIERS PANEL */}
      <div className="lg:col-span-1 space-y-4">
        
        {/* Active Selection / Config Editor Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 p-4.5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-[13px] uppercase">
              Element Properties
            </h3>
          </div>

          {activeSelectedElement ? (
            <div className="space-y-3.5 select-none" id="whiteboard_element_editor">
              {/* Type tag */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Widget Type</span>
                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 uppercase">
                  {activeSelectedElement.type}
                </span>
              </div>

              {/* Text Editor (Only show for shapes with text capabilities) */}
              {activeSelectedElement.type !== 'pencil' && activeSelectedElement.type !== 'line' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Type className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>Note Content</span>
                  </label>
                  <input
                    id="edit_element_text"
                    type="text"
                    value={activeSelectedElement.text || ''}
                    onChange={(e) => updateSelectedElementProps({ text: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/20 outline-none font-medium text-slate-800 dark:text-slate-50"
                    placeholder="Change note..."
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
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Element Color Palette</span>
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
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => handleDeleteElement(activeSelectedElement.id)}
                  className="py-1.8 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Delete"
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
                Select an element to customize its font, color palette, and position. Double-click the shape to edit text directly.
              </p>
            </div>
          )}
        </div>

        {/* DRAGGABLE STICKY NOTES SPOOLER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 p-4.5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <StickyNote className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-[13px] uppercase">
              Sticky Notes
            </h3>
          </div>
          
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Drag and drop sticky notes onto the board, or click directly to insert at the center:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'st-yellow', color: '#fef08a', text: '💡 New Idea', label: 'Idea' },
              { id: 'st-blue', color: '#bae6fd', text: '🚀 New Plan', label: 'Action' },
              { id: 'st-green', color: '#bbf7d0', text: '✅ Approved', label: 'Approve' },
              { id: 'st-orange', color: '#fed7aa', text: '🔍 Revision Needed', label: 'Review' },
              { id: 'st-pink', color: '#fbcfe8', text: '🎯 Project Goal', label: 'Goal' },
              { id: 'st-red', color: '#fecaca', text: '⚠️ Risk identified', label: 'Risk' }
            ].map((st) => (
              <div
                key={st.id}
                draggable="true"
                onDragStart={(e) => handleDragStartFromSidebar(e, 'sticky', st.color, st.text)}
                onClick={() => handleSpawnWidget('sticky', st.color, st.text)}
                style={{ backgroundColor: st.color }}
                className="p-3 rounded-2xl border border-slate-200/40 dark:border-slate-700/40 cursor-grab hover:scale-103 active:cursor-grabbing hover:shadow-md transition-all text-center select-none"
              >
                <span className="text-[11px] font-extrabold text-[#1E293B] block truncate">{st.label}</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold block mt-1 uppercase">Drag or Click</span>
              </div>
            ))}
          </div>
        </div>

        {/* DRAGGABLE DIAGRAM FLOWCHART ELEMENTS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 p-4.5 rounded-3xl shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <Grid className="w-4 h-4 text-cyan-600" />
            <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-[13px] uppercase">
              Flowchart Shapes
            </h3>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Use specialized flowchart shapes to build operational workflows:
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

      </div>

      {/* 2. MAIN COMPONENT: INTERACTIVE WHITEBOARD CANVA ARENA */}
      <div className={`${showAiAnalyst ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5 flex flex-col justify-between relative transition-all duration-300`}>
        
        {/* Title & Multiplayer actions header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-base md:text-lg font-bold font-display text-slate-800 dark:text-slate-50 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Brainstorming & Flowchart Board (Miro-style)
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Infinite design space. Scroll to Zoom, Middle-click or Hold Spacebar to Pan canvas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn_multiplayer_sim"
              onClick={() => {
                setEnableSim(!enableSim);
                onAddSyncLog(enableSim ? "Disabled peer design simulation" : "Enabled multi-peer design simulation");
              }}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                enableSim 
                  ? 'bg-pink-100 text-pink-700 border border-pink-200' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${enableSim ? 'animate-spin' : ''}`} />
              <span>{enableSim ? 'Stop Peer Drawing' : 'Simulate Peer Drawing'}</span>
            </button>

            <button
              id="btn_ai_analyst"
              onClick={handleOpenAiAnalyst}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 hover:bg-indigo-55/35 rounded-xl transition-colors cursor-pointer flex items-center justify-center animate-pulse"
              title="Analyze whiteboard with AI"
            >
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
            </button>

            <button
              id="btn_export_png"
              onClick={handleExportPNG}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-55/35 rounded-xl transition-colors cursor-pointer"
              title="Export whiteboard as PNG"
            >
              <Download className="w-4.5 h-4.5" />
            </button>

            <button
              id="btn_clear_whiteboard"
              onClick={handleClearBoard}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Clear Whiteboard"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Interactive control settings toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl select-none">
          {/* Drawing brush selection and selectors */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: 'select', icon: MousePointer, label: 'Select & Drag' },
              { id: 'hand', icon: Hand, label: 'Pan Canvas' },
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
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  activeTool === tool.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'
                }`}
                title={tool.label}
              >
                <tool.icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Color pickers selection */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/45 dark:border-slate-700/45">
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
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Size:</span>
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
          className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 overflow-hidden"
          style={{ height: '550px', cursor: getCanvasCursor() }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
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
          <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md flex items-center gap-2 select-none z-10">
            <button
              onClick={() => {
                const newZoom = Math.max(0.15, zoom - 0.15);
                setZoom(newZoom);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Zoom Out"
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
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                onAddSyncLog("Whiteboard: Reset zoom");
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Reset view 100%"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {elements.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
              <Grid className="w-12 h-12 text-slate-300 stroke-[1.1] mb-3 animate-pulse" />
              <h4 className="font-display font-extrabold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                Empty Board - Ready to Create
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mt-1 leading-normal font-medium">
                Select draw brush above, or <span className="font-bold text-indigo-500">drag & drop sticky notes or flowchart shapes</span> from the left sidebar directly to the board!
              </p>
            </div>
          )}
        </div>

        {/* Status markers */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
          <span>
            Vectors: <span className="text-slate-700 dark:text-slate-200 font-bold">{elements.length} elements</span>
          </span>
          <span className="hidden sm:inline">
            💡 Tip: Double-click shapes to edit text. Click small circle handle to drag connection arrow to another shape.
          </span>
        </div>

      </div>

      {/* 3. AI ANALYST SIDEPANEL */}
      <AnimatePresence>
        {showAiAnalyst && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between relative shadow-sm space-y-4 text-left"
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
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
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

    </div>
  );
}
