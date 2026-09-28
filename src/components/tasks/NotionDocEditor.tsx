"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Minus, 
  Table, 
  Lightbulb, 
  Sparkles, 
  Bot, 
  RefreshCw, 
  Eye, 
  Edit3, 
  Copy, 
  Check, 
  FileText, 
  CornerDownLeft, 
  BookOpen, 
  Wand2, 
  Sliders, 
  Layers, 
  Hash, 
  Type, 
  AlignLeft,
  ChevronDown,
  Globe
} from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';
import { useTranslation } from '../../contexts/TranslationContext';

interface NotionDocEditorProps {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  taskTitle?: string;
  initialMode?: 'edit' | 'preview';
}

interface SlashCommandItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  insertText: string;
  cursorOffset?: number;
}

export default function NotionDocEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Nhập nội dung tài liệu, gõ / để mở danh mục khối, hoặc dùng AI để soạn thảo...',
  taskTitle = '',
  initialMode = 'edit'
}: NotionDocEditorProps) {
  const { isVietnamese } = useTranslation();
  const [mode, setMode] = useState<'edit' | 'preview'>(initialMode);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea to fit content
  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(140, el.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    autoResize();
  }, [value, mode]);

  // Word & Character count
  const wordCount = useMemo(() => {
    if (!value || !value.trim()) return 0;
    return value.trim().split(/\s+/).length;
  }, [value]);

  const charCount = value ? value.length : 0;

  // Insert markdown snippet at cursor position
  const insertSnippet = (prefix: string, suffix: string = '', defaultContent: string = '') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + prefix + defaultContent + suffix);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = value.substring(start, end) || defaultContent;
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      el.focus();
      const newCursor = start + prefix.length + selectedText.length;
      el.setSelectionRange(newCursor, newCursor);
      autoResize();
    }, 0);
  };

  // Slash commands catalog
  const slashCommands: SlashCommandItem[] = [
    {
      id: 'h1',
      label: 'Tiêu đề 1 (Heading 1)',
      sublabel: 'Tiêu đề lớn nhất cho mục chính',
      icon: <Heading1 className="w-4 h-4 text-indigo-500" />,
      insertText: '# '
    },
    {
      id: 'h2',
      label: 'Tiêu đề 2 (Heading 2)',
      sublabel: 'Tiêu đề vừa cho phần phụ',
      icon: <Heading2 className="w-4 h-4 text-sky-500" />,
      insertText: '## '
    },
    {
      id: 'h3',
      label: 'Tiêu đề 3 (Heading 3)',
      sublabel: 'Tiêu đề nhỏ cho chi tiết',
      icon: <Heading3 className="w-4 h-4 text-cyan-500" />,
      insertText: '### '
    },
    {
      id: 'todo',
      label: 'Danh sách việc cần làm (To-do list)',
      sublabel: 'Mục kiểm tra với ô vuông checkbox',
      icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
      insertText: '- [ ] '
    },
    {
      id: 'bullet',
      label: 'Danh sách dấu chấm (Bulleted list)',
      sublabel: 'Liệt kê không theo thứ tự',
      icon: <List className="w-4 h-4 text-slate-500" />,
      insertText: '- '
    },
    {
      id: 'numbered',
      label: 'Danh sách đánh số (Numbered list)',
      sublabel: 'Liệt kê các bước 1, 2, 3',
      icon: <ListOrdered className="w-4 h-4 text-amber-500" />,
      insertText: '1. '
    },
    {
      id: 'callout',
      label: 'Khối lưu ý nổi bật (Callout Box)',
      sublabel: 'Hộp thông điệp quan trọng với icon',
      icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
      insertText: '> 💡 **Lưu ý quan trọng:** '
    },
    {
      id: 'quote',
      label: 'Trích dẫn (Quote)',
      sublabel: 'Khối trích dẫn ý kiến hoặc ghi chú',
      icon: <Quote className="w-4 h-4 text-violet-500" />,
      insertText: '> '
    },
    {
      id: 'code',
      label: 'Khối mã nguồn (Code Block)',
      sublabel: 'Chèn đoạn code hoặc cú pháp lệnh',
      icon: <Code className="w-4 h-4 text-indigo-500" />,
      insertText: '```js\n// Nhập mã nguồn ở đây...\n```\n'
    },
    {
      id: 'table',
      label: 'Bảng dữ liệu (Table)',
      sublabel: 'Tạo bảng cột và dòng',
      icon: <Table className="w-4 h-4 text-blue-500" />,
      insertText: '| Tiêu chí | Mô tả | Trạng thái |\n| :--- | :--- | :--- |\n| Mục 1 | Nội dung chi tiết | Đạt |\n| Mục 2 | Nội dung chi tiết | Chờ duyệt |\n'
    },
    {
      id: 'divider',
      label: 'Đường phân cách (Divider)',
      sublabel: 'Đường kẻ ngang phân tách nội dung',
      icon: <Minus className="w-4 h-4 text-slate-400" />,
      insertText: '\n---\n\n'
    }
  ];

  const filteredCommands = slashCommands.filter(c => 
    c.label.toLowerCase().includes(slashQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(slashQuery.toLowerCase())
  );

  // Handle Key Down in Textarea for Slash Commands & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/' && !slashMenuOpen) {
      setSlashMenuOpen(true);
      setSlashQuery('');
    } else if (slashMenuOpen) {
      if (e.key === 'Escape') {
        setSlashMenuOpen(false);
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        handleExecuteSlashCommand(filteredCommands[0]);
      }
    }

    // Standard markdown shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        insertSnippet('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        insertSnippet('*', '*');
      } else if (e.key === 'e') {
        e.preventDefault();
        insertSnippet('`', '`');
      }
    }
  };

  const handleExecuteSlashCommand = (cmd: SlashCommandItem) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    // Remove the trailing slash if present
    const beforeCursor = value.substring(0, start);
    const slashIdx = beforeCursor.lastIndexOf('/');
    
    let cleanPrefix = beforeCursor;
    if (slashIdx !== -1) {
      cleanPrefix = beforeCursor.substring(0, slashIdx);
    }

    const afterCursor = value.substring(start);
    const newText = cleanPrefix + cmd.insertText + afterCursor;
    
    onChange(newText);
    setSlashMenuOpen(false);
    
    setTimeout(() => {
      el.focus();
      const pos = cleanPrefix.length + cmd.insertText.length;
      el.setSelectionRange(pos, pos);
      autoResize();
    }, 0);
  };

  // AI Prompt Helpers
  const handleRunAiAction = async (actionType: 'continue' | 'summarize' | 'improve' | 'table' | 'checklist' | 'brainstorm' | 'translate_en' | 'translate_vi') => {
    setIsAiLoading(true);
    setAiMenuOpen(false);

    let prompt = '';
    const taskContext = taskTitle ? `Cho công việc "${taskTitle}".` : '';
    const currentDoc = value.trim() ? `Nội dung tài liệu hiện tại:\n"""\n${value}\n"""` : '';

    if (actionType === 'continue') {
      prompt = `${taskContext} Hãy viết tiếp phần tiếp theo của tài liệu một cách chuyên nghiệp, chi tiết và súc tích theo chuẩn tài liệu dự án/kỹ thuật. ${currentDoc}`;
    } else if (actionType === 'summarize') {
      prompt = `${taskContext} Tóm tắt ngắn gọn 3-4 điểm chính của tài liệu này thành định dạng gạch đầu dòng Markdown. ${currentDoc}`;
    } else if (actionType === 'improve') {
      prompt = `${taskContext} Hãy chỉnh sửa, cải thiện văn phong, ngữ pháp và định dạng lại tài liệu sau cho chuẩn mực, rõ ràng, dễ đọc: ${currentDoc}`;
    } else if (actionType === 'table') {
      prompt = `${taskContext} Hãy tạo một bảng Markdown tổng hợp các tiêu chí kỹ thuật / tiêu chí nghiệm thu (Acceptance Criteria) cho công việc này. ${currentDoc}`;
    } else if (actionType === 'checklist') {
      prompt = `${taskContext} Hãy trích xuất và tạo danh sách checklist các bước thực hiện chi tiết theo định dạng \`- [ ] Bước...\` cho công việc này. ${currentDoc}`;
    } else if (actionType === 'brainstorm') {
      prompt = `${taskContext} Hãy đóng vai trò Cố vấn Sản phẩm & Kiến trúc sư Giải pháp: Đề xuất 4-5 ý tưởng đột phá, tính năng mở rộng và giải pháp kỹ thuật tối ưu liên quan đến nội dung tài liệu này. Định dạng Markdown có cấu trúc rõ ràng. ${currentDoc}`;
    } else if (actionType === 'translate_en') {
      prompt = `Hãy dịch toàn bộ nội dung tài liệu sau sang Tiếng Anh chuyên nghiệp, tự nhiên, giữ nguyên cấu trúc Markdown: ${currentDoc}`;
    } else if (actionType === 'translate_vi') {
      prompt = `Hãy dịch toàn bộ nội dung tài liệu sau sang Tiếng Việt lưu loát, tự nhiên và chuẩn thuật ngữ công nghệ, giữ nguyên cấu trúc Markdown: ${currentDoc}`;
    }

    try {
      const res = await callAiApi('/api/ai/chat', {
        message: `Bạn là chuyên gia soạn thảo tài liệu kỹ thuật và quản trị sản phẩm Costack AI. Sử dụng Markdown rõ ràng và có thể áp dụng ngay.\n\n${prompt}`,
        history: []
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.text || data.reply || '';
        if (text && text.trim()) {
          if (actionType === 'improve' || actionType === 'translate_en' || actionType === 'translate_vi') {
            onChange(text.trim());
          } else {
            onChange(value ? `${value}\n\n${text.trim()}` : text.trim());
          }
        }
      }
    } catch (err) {
      console.error('Notion AI action error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Interactive Checklist Toggler in Preview Mode
  const toggleCheckboxInText = (lineIndex: number) => {
    const lines = value.split('\n');
    if (lines[lineIndex] !== undefined) {
      const line = lines[lineIndex];
      if (line.includes('- [ ] ')) {
        lines[lineIndex] = line.replace('- [ ] ', '- [x] ');
      } else if (line.includes('- [x] ') || line.includes('- [X] ')) {
        lines[lineIndex] = line.replace(/- \[[xX]\] /, '- [ ] ');
      }
      onChange(lines.join('\n'));
    }
  };

  // Copy text handler
  const handleCopyDoc = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy document error:', error);
    }
  };

  return (
    <div className="task-document space-y-3 text-left font-sans">
      
      {/* ── Doc Header & Notion Action Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        
        {/* Left: Notion Doc Badge & Word Count */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-3xs">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {isVietnamese ? 'Mô tả công việc' : 'Description'}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {wordCount} {isVietnamese ? 'từ' : 'words'} · {charCount} {isVietnamese ? 'ký tự' : 'chars'}
            </span>
          </div>
        </div>

        {/* Right: AI Tools & Edit/Preview Toggle */}
        <div className="flex items-center gap-1.5">
          
          {/* AI Writer Suite Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              disabled={isAiLoading}
              onClick={() => setAiMenuOpen(!aiMenuOpen)}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-955/40 dark:to-sky-955/30 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-650 dark:text-indigo-300 hover:border-indigo-400 text-[10.5px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              {isAiLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                  <span>Costack AI đang soạn...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span>Costack AI</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </>
              )}
            </button>

            {/* AI Menu Popover */}
            <AnimatePresence>
              {aiMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAiMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-0 mt-1.5 z-50 w-64 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-0.5 font-sans"
                  >
                    <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Trợ lý văn bản Costack AI
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRunAiAction('continue')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>✍️ Viết tiếp nội dung</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('summarize')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      <span>⚡ Tóm tắt ý chính</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('improve')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>🎯 Trau chuốt văn phong & ngữ pháp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('table')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Table className="w-3.5 h-3.5 text-blue-500" />
                      <span>📊 Tạo bảng tiêu chí nghiệm thu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('checklist')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>✅ Bẻ nhỏ thành checklist chi tiết</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('brainstorm')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>💡 Phát triển ý tưởng & giải pháp mở rộng</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('translate_en')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Globe className="w-3.5 h-3.5 text-purple-500" />
                      <span>🌐 Dịch sang Tiếng Anh chuyên nghiệp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunAiAction('translate_vi')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      <Globe className="w-3.5 h-3.5 text-rose-500" />
                      <span>🇻🇳 Dịch sang Tiếng Việt chuẩn mực</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Copy Doc Content */}
          <button
            type="button"
            onClick={handleCopyDoc}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Sao chép toàn bộ tài liệu"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'edit'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>{isVietnamese ? 'Soạn thảo' : 'Write'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>{isVietnamese ? 'Xem trước' : 'Preview'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Notion Formatting Toolbar (Available in Edit Mode) ── */}
      {mode === 'edit' && (
        <div className="task-editor-toolbar flex flex-wrap items-center gap-0.5 py-1 px-1 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 text-xs transition-colors">
          {/* Headings */}
          <button
            type="button"
            onClick={() => insertSnippet('# ')}
            className="px-1.5 py-1 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md font-black text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('## ')}
            className="px-1.5 py-1 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('### ')}
            className="px-1.5 py-1 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
            title="Heading 3"
          >
            H3
          </button>

          <span className="w-px h-3.5 bg-slate-200 dark:bg-zinc-700 mx-1" />

          {/* Text Styles */}
          <button
            type="button"
            onClick={() => insertSnippet('**', '**')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="In đậm (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('*', '*')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="In nghiêng (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('~~', '~~')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Gạch ngang"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('`', '`')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Mã nội dòng (Ctrl+E)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-slate-200 dark:bg-zinc-700 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => insertSnippet('\n- [ ] ')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
            title="Checklist công việc"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n- ')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Danh sách dấu chấm"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n1. ')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Danh sách đánh số"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-slate-200 dark:bg-zinc-700 mx-1" />

          {/* Special Blocks */}
          <button
            type="button"
            onClick={() => insertSnippet('> 💡 **Lưu ý:** ')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-amber-500 transition-colors cursor-pointer"
            title="Khối Callout Box"
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n> ')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-violet-500 transition-colors cursor-pointer"
            title="Trích dẫn"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n| Tiêu chí | Mô tả | Trạng thái |\n| :--- | :--- | :--- |\n| Mục 1 | Nội dung... | Đạt |\n')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-blue-500 transition-colors cursor-pointer"
            title="Bảng Markdown"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n```js\n// Code snippet\n```\n')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-indigo-500 transition-colors cursor-pointer"
            title="Khối Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n---\n\n')}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md text-slate-400 dark:text-zinc-500 hover:text-slate-600 transition-colors cursor-pointer"
            title="Đường phân cách"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Document Canvas Writing Area ── */}
      <div className="relative">
        {mode === 'edit' ? (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => {
                onChange(e.target.value);
                autoResize();
              }}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full min-h-[160px] py-2 px-1 text-[13.5px] text-slate-850 dark:text-slate-100 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 shadow-none transition-colors leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans resize-none"
              style={{ lineHeight: '1.75' }}
            />

            {/* Slash Command Palette Popover */}
            <AnimatePresence>
              {slashMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSlashMenuOpen(false)} />
                  <motion.div
                    ref={slashMenuRef}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute left-6 top-12 z-50 w-72 max-h-72 overflow-y-auto custom-scrollbar p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-0.5 font-sans"
                  >
                    <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                      <span>Khối cơ bản Notion</span>
                      <span className="font-mono">Esc để đóng</span>
                    </div>

                    {filteredCommands.map(cmd => (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => handleExecuteSlashCommand(cmd)}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 group transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shrink-0 mt-0.5">
                          {cmd.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                            {cmd.label}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {cmd.sublabel}
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* ── Interactive Notion Preview Canvas ── */
          <div className="task-document-preview w-full min-h-[160px] py-2 px-1 text-slate-800 dark:text-slate-200 font-sans space-y-3 leading-relaxed">
            {!value.trim() ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                {isVietnamese ? 'Tài liệu chưa có nội dung. Chuyển sang chế độ Soạn thảo để viết.' : 'Empty document. Switch to Write mode to add content.'}
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none text-[13.5px] leading-relaxed space-y-2.5">
                {value.split('\n').map((line, idx) => {
                  // Heading 1
                  if (line.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="text-xl font-black text-slate-900 dark:text-white pt-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                        {line.replace('# ', '')}
                      </h1>
                    );
                  }
                  // Heading 2
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-lg font-black text-slate-900 dark:text-white pt-2">
                        {line.replace('## ', '')}
                      </h2>
                    );
                  }
                  // Heading 3
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-base font-extrabold text-slate-850 dark:text-slate-100 pt-1">
                        {line.replace('### ', '')}
                      </h3>
                    );
                  }
                  // Interactive Checklist
                  if (line.includes('- [ ] ') || line.includes('- [x] ') || line.includes('- [X] ')) {
                    const isChecked = line.includes('- [x] ') || line.includes('- [X] ');
                    const content = line.replace(/- \[[ xX]\] /, '');
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleCheckboxInText(idx)}
                        className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none"
                      >
                        <div className={`w-4 h-4 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-150 group-hover:scale-105 active:scale-95 ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_2px_6px_-1px_rgba(79,70,229,0.45)]' 
                            : 'bg-white dark:bg-slate-900/60 border-slate-300/90 dark:border-slate-700 group-hover:border-indigo-500/70 group-hover:shadow-xs'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-semibold ${isChecked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {content}
                        </span>
                      </div>
                    );
                  }
                  // Callout Box
                  if (line.startsWith('> 💡') || line.startsWith('> [!NOTE]') || line.startsWith('> [!TIP]')) {
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-955/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-start gap-2 shadow-3xs">
                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="leading-relaxed flex-1">
                          {line.replace(/^> (💡|\[!NOTE\]|\[!TIP\])\s*/, '')}
                        </div>
                      </div>
                    );
                  }
                  // Quote
                  if (line.startsWith('> ')) {
                    return (
                      <blockquote key={idx} className="pl-4 border-l-3 border-indigo-500 text-slate-600 dark:text-slate-300 italic text-xs my-1">
                        {line.replace('> ', '')}
                      </blockquote>
                    );
                  }
                  // Divider
                  if (line.trim() === '---' || line.trim() === '***') {
                    return <hr key={idx} className="border-slate-200 dark:border-slate-800 my-3" />;
                  }
                  // Bullet point
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                      <li key={idx} className="ml-4 list-disc text-xs font-medium text-slate-700 dark:text-slate-300">
                        {line.replace(/^[-*]\s+/, '')}
                      </li>
                    );
                  }
                  // Numbered list item
                  const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
                  if (numMatch) {
                    const num = numMatch[1];
                    const content = numMatch[2];
                    return (
                      <div key={idx} className="flex items-start gap-2.5 py-0.5 group">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-[10px] font-black flex items-center justify-center shadow-3xs mt-0.5 select-none font-sans">
                          {num}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pt-0.5 flex-1">
                          {content}
                        </span>
                      </div>
                    );
                  }
                  // Empty line
                  if (!line.trim()) {
                    return <div key={idx} className="h-2" />;
                  }
                  // Default text paragraph
                  return (
                    <p key={idx} className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
