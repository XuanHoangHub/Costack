"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, Copy, Check,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Eye, FlipHorizontal,
  Layers, ExternalLink, Calendar, User
} from 'lucide-react';
import SignedImage from '../SignedImage';
import { supabase } from '../../supabaseClient';

export interface LightboxImageItem {
  url: string;
  name: string;
  size?: number;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: string;
  messageId?: string;
}

interface ChatImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: LightboxImageItem | null;
  allImages?: LightboxImageItem[];
  onSelectImage?: (img: LightboxImageItem) => void;
  triggerToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export default function ChatImageLightbox({
  isOpen,
  onClose,
  currentImage,
  allImages = [],
  onSelectImage,
  triggerToast,
}: ChatImageLightboxProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Compute active index within allImages
  const currentIndex = allImages.findIndex(img => 
    (currentImage?.messageId && img.messageId === currentImage.messageId) || 
    img.url === currentImage?.url
  );

  const hasNext = currentIndex >= 0 && currentIndex < allImages.length - 1;
  const hasPrev = currentIndex > 0;

  // Reset transforms whenever active image changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, [currentImage?.url, currentImage?.messageId]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectImage) {
      onSelectImage(allImages[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, allImages, onSelectImage]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectImage) {
      onSelectImage(allImages[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, allImages, onSelectImage]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(4, Number((prev + 0.25).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleRotateCw = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleRotateCcw = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360);
  }, []);

  const handleToggleFlipH = useCallback(() => {
    setFlipH(prev => !prev);
  }, []);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleRotateCw();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, handleZoomIn, handleZoomOut, handleResetZoom, handleRotateCw]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Resolve download url (handles Supabase storage paths)
  const resolveActualUrl = async (url: string): Promise<string> => {
    if (/^(https?:|blob:|data:|\/)/.test(url)) {
      return url;
    }
    const cleanPath = url.startsWith('chat-attachments/')
      ? url.slice('chat-attachments/'.length)
      : url;
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(cleanPath, 3600);
    return data?.signedUrl || url;
  };

  // Direct file download
  const handleDownload = async () => {
    if (!currentImage?.url || downloading) return;
    setDownloading(true);
    try {
      const directUrl = await resolveActualUrl(currentImage.url);
      const res = await fetch(directUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = currentImage.name || 'image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      triggerToast?.('success', 'Tải ảnh thành công', `Đã tải ${currentImage.name}`);
    } catch {
      // Fallback
      window.open(currentImage.url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  // Copy image link or image blob to clipboard
  const handleCopy = async () => {
    if (!currentImage?.url) return;
    try {
      const directUrl = await resolveActualUrl(currentImage.url);
      try {
        const res = await fetch(directUrl);
        const blob = await res.blob();
        if (blob.type === 'image/png') {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          triggerToast?.('success', 'Đã sao chép ảnh', 'Hình ảnh đã được sao chép vào bộ nhớ tạm.');
          return;
        }
      } catch {
        // Blob copy fallback
      }
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      triggerToast?.('success', 'Đã sao chép liên kết', 'Đường dẫn ảnh đã được lưu vào clipboard.');
    } catch {
      triggerToast?.('error', 'Lỗi sao chép', 'Không thể sao chép hình ảnh.');
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom(prev => {
      const next = Math.min(4, Math.max(0.5, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Double click toggles between fit (1x) and 2.5x zoom
  const handleDoubleClick = () => {
    if (zoom !== 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  };

  // Dragging / Pan when zoom > 1
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-xl flex flex-col justify-between select-none overflow-hidden"
        onClick={onClose}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* ── Top Header Toolbar ── */}
        <div 
          className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent border-b border-white/[0.06] backdrop-blur-md"
          onClick={e => e.stopPropagation()}
        >
          {/* Sender & File Information */}
          <div className="flex items-center gap-3 min-w-0 mr-4">
            {currentImage.senderAvatar ? (
              <SignedImage
                filePath={currentImage.senderAvatar}
                alt={currentImage.senderName || 'Avatar'}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20 shrink-0 bg-white/10"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/20 shrink-0">
                {currentImage.senderName?.charAt(0) || 'U'}
              </div>
            )}

            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {currentImage.name}
                </h4>
                {allImages.length > 1 && currentIndex >= 0 && (
                  <span className="text-[10.5px] font-bold text-white/70 bg-white/15 px-2 py-0.5 rounded-full shrink-0 font-mono">
                    {currentIndex + 1} / {allImages.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/60 flex items-center gap-2 mt-0.5 truncate">
                {currentImage.senderName && (
                  <span className="font-semibold text-white/80">{currentImage.senderName}</span>
                )}
                {currentImage.timestamp && (
                  <>
                    <span>·</span>
                    <span>{currentImage.timestamp}</span>
                  </>
                )}
                {currentImage.size ? (
                  <>
                    <span>·</span>
                    <span className="font-mono">{(currentImage.size / 1024).toFixed(1)} KB</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {/* Action Toolbar Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-0.5 border border-white/10 shadow-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 sm:p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Thu nhỏ (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-mono font-bold text-white/90 hover:text-white hover:bg-white/15 rounded-md transition-all cursor-pointer min-w-[50px] text-center"
                title="Đặt lại phóng to (0)"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1.5 sm:p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Phóng to (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate & Flip */}
            <div className="hidden sm:flex items-center bg-white/10 backdrop-blur-md rounded-xl p-0.5 border border-white/10 shadow-sm">
              <button
                type="button"
                onClick={handleRotateCcw}
                className="p-1.5 sm:p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                title="Xoay ngược chiều kim đồng hồ"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotateCw}
                className="p-1.5 sm:p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                title="Xoay theo chiều kim đồng hồ (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleFlipH}
                className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${flipH ? 'bg-indigo-600 text-white' : 'text-white/80 hover:text-white hover:bg-white/15'}`}
                title="Lật gương ngang"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Copy Link / Image */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Sao chép ảnh hoặc liên kết"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>

            {/* Direct Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              title="Tải ảnh về máy"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{downloading ? 'Đang tải...' : 'Tải về'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="hidden md:flex p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:px-2.5 rounded-xl bg-white/15 hover:bg-rose-600 hover:border-rose-500 border border-white/15 text-white transition-all cursor-pointer ml-1"
              title="Đóng (Esc)"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* ── Main Interactive Image Canvas ── */}
        <div 
          ref={imageContainerRef}
          className="relative flex-1 flex items-center justify-center overflow-hidden w-full h-full select-none"
          onClick={e => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* Previous Gallery Arrow Button */}
          {hasPrev && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
              title="Ảnh trước (Phím ←)"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          )}

          {/* Next Gallery Arrow Button */}
          {hasNext && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
              title="Ảnh tiếp theo (Phím →)"
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          )}

          {/* Rendered Image with Smooth Transforms */}
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
            }}
            className="max-w-full max-h-full flex items-center justify-center pointer-events-none p-4"
          >
            <SignedImage
              filePath={currentImage.url}
              alt={currentImage.name}
              bucket="chat-attachments"
              className="max-w-[90vw] max-h-[72vh] sm:max-h-[76vh] object-contain rounded-2xl shadow-2xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto"
            />
          </div>
        </div>

        {/* ── Bottom Filmstrip Thumbnail Carousel & Shortcuts ── */}
        <div 
          className="relative z-20 flex flex-col items-center gap-2 px-4 py-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent border-t border-white/[0.06] backdrop-blur-md"
          onClick={e => e.stopPropagation()}
        >
          {/* Filmstrip Carousel when multiple images exist */}
          {allImages.length > 1 && showThumbnails && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1 px-2 no-scrollbar">
              {allImages.map((img, idx) => {
                const isActive = (currentImage.messageId && img.messageId === currentImage.messageId) || img.url === currentImage.url;
                return (
                  <button
                    key={img.messageId || `${img.url}-${idx}`}
                    type="button"
                    onClick={() => onSelectImage?.(img)}
                    className={`relative rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer ${
                      isActive 
                        ? 'ring-2 ring-indigo-400 scale-105 shadow-lg shadow-indigo-500/30' 
                        : 'opacity-50 hover:opacity-100 hover:scale-102 ring-1 ring-white/10'
                    }`}
                  >
                    <SignedImage
                      filePath={img.url}
                      alt={img.name}
                      bucket="chat-attachments"
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-indigo-500/15 pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Keyboard Shortcuts & Hints */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/50 pointer-events-none">
            <span>
              <kbd className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono text-[10px]">Esc</kbd> Đóng
            </span>
            {allImages.length > 1 && (
              <span>
                <kbd className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono text-[10px]">← / →</kbd> Chuyển ảnh
              </span>
            )}
            <span>
              <kbd className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono text-[10px]">Cuộn chuột</kbd> Thu phóng
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono text-[10px]">Double click</kbd> Phóng đại
            </span>
            {zoom > 1 && (
              <span className="text-indigo-400 font-semibold">
                <kbd className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono text-[10px]">Kéo chuột</kbd> Di chuyển chi tiết
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
