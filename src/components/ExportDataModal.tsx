"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Database,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { Task, Document, User } from '@/types';

export interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  docs: Document[];
  members: User[];
  activeWorkspaceId: string;
  addSyncLog?: (log: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  tasks,
  docs,
  members,
  activeWorkspaceId,
  addSyncLog,
  triggerToast,
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'report'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'tasks' | 'docs'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const downloadFile = (filename: string, content: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    setIsExporting(true);

    setTimeout(() => {
      try {
        const timestamp = new Date().toISOString().slice(0, 10);

        if (exportFormat === 'json') {
          const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            workspaceId: activeWorkspaceId,
            tasks: exportScope === 'docs' ? [] : tasks,
            docs: exportScope === 'tasks' ? [] : docs,
            members: members,
          };
          const jsonStr = JSON.stringify(exportData, null, 2);
          downloadFile(`apexa_workspace_export_${timestamp}.json`, jsonStr, 'application/json');
        } else if (exportFormat === 'csv') {
          // Convert tasks to CSV
          const headers = ['ID', 'Title', 'Status', 'Priority', 'Description', 'DueDate', 'AssigneeId', 'WorkspaceId'];
          const rows = tasks.map((t) => [
            `"${t.id}"`,
            `"${(t.title || '').replace(/"/g, '""')}"`,
            `"${t.status}"`,
            `"${t.priority}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            `"${t.dueDate || ''}"`,
            `"${t.assigneeId || ''}"`,
            `"${(t as any).workspaceId || activeWorkspaceId}"`,
          ]);
          const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
          downloadFile(`apexa_tasks_${timestamp}.csv`, csvContent, 'text/csv;charset=utf-8;');
        } else if (exportFormat === 'report') {
          // Formatted HTML Executive Report
          const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Apexa OS Executive Report - ${timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
    h1 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { margin-top: 24px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; font-weight: bold; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .completed { background: #dcfce7; color: #166534; }
    .inprogress { background: #e0e7ff; color: #3730a3; }
    .urgent { background: #ffe4e6; color: #9f1239; }
  </style>
</head>
<body>
  <h1>Apexa OS Workspace Executive Report</h1>
  <p><strong>Generated Date:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Workspace ID:</strong> ${activeWorkspaceId}</p>
  <p><strong>Total Tasks:</strong> ${tasks.length} | <strong>Total Documents:</strong> ${docs.length} | <strong>Members:</strong> ${members.length}</p>

  <h2>Tasks Overview (${tasks.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Status</th>
        <th>Priority</th>
        <th>Due Date</th>
      </tr>
    </thead>
    <tbody>
      ${tasks
        .map(
          (t) => `
        <tr>
          <td>${t.title}</td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
          <td><span class="badge ${t.priority}">${t.priority}</span></td>
          <td>${t.dueDate || 'N/A'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h2>Documents Overview (${docs.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Category</th>
        <th>Author</th>
        <th>Last Updated</th>
      </tr>
    </thead>
    <tbody>
      ${docs
        .map(
          (d) => `
        <tr>
          <td>${d.title}</td>
          <td>${d.category}</td>
          <td>${d.updatedBy}</td>
          <td>${d.updatedAt}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>
          `;
          downloadFile(`apexa_executive_report_${timestamp}.html`, reportHtml, 'text/html');
        }

        if (addSyncLog) addSyncLog(`Exported workspace data in ${exportFormat.toUpperCase()} format`);
        if (triggerToast) triggerToast('success', 'Export Complete', `Workspace data saved as ${exportFormat.toUpperCase()} file.`);
      } catch (err) {
        console.error(err);
        if (triggerToast) triggerToast('info', 'Export Failed', 'An error occurred while generating export.');
      } finally {
        setIsExporting(false);
        onClose();
      }
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col z-10 font-sans"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md">
                <Download className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Trung tâm xuất và sao lưu dữ liệu
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Xuất công việc, tài liệu và dữ liệu không gian chỉ với một lần nhấp
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Options */}
          <div className="p-6 space-y-5">
            {/* Format Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">
                Chọn định dạng xuất
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    exportFormat === 'json'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                  }`}
                >
                  <FileJson className="w-5 h-5 text-indigo-500 mb-2" />
                  <div>
                    <div className="text-xs font-bold">Bản sao lưu JSON</div>
                    <div className="text-[10px] text-slate-400">Toàn bộ dữ liệu gốc</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    exportFormat === 'csv'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500 mb-2" />
                  <div>
                    <div className="text-xs font-bold">Bảng tính CSV</div>
                    <div className="text-[10px] text-slate-400">Excel / Google Trang tính</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('report')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    exportFormat === 'report'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                  }`}
                >
                  <FileText className="w-5 h-5 text-purple-500 mb-2" />
                  <div>
                    <div className="text-xs font-bold">Bản in HTML</div>
                    <div className="text-[10px] text-slate-400">Báo cáo tổng hợp có thể in</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">
                Phạm vi dữ liệu
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    exportScope === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  Tất cả mục ({tasks.length + docs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('tasks')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    exportScope === 'tasks'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  Chỉ công việc ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('docs')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    exportScope === 'docs'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  Chỉ tài liệu ({docs.length})
                </button>
              </div>
            </div>

            {/* Export Info Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <HardDrive className="w-4 h-4 text-emerald-500" />
                <span>Tóm tắt bản xuất</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Exporting {exportScope === 'all' ? `${tasks.length} tasks and ${docs.length} documents` : exportScope === 'tasks' ? `${tasks.length} tasks` : `${docs.length} documents`}. Tệp sẽ tự động được tải xuống.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Xuất dữ liệu hoàn toàn ngoại tuyến trên thiết bị</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Generating...' : 'Download File'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
