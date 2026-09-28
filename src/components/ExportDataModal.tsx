"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
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
import { useTranslation } from '@/contexts/TranslationContext';

export interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  docs?: Document[];
  members: User[];
  activeWorkspaceId: string;
  customFields?: any[];
  addSyncLog?: (log: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  tasks,
  docs = [],
  members,
  activeWorkspaceId,
  customFields = [],
  addSyncLog,
  triggerToast,
}) => {
  const { localize: l, locale } = useTranslation();
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'report'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'tasks'>('all');
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

        // Collect all unique custom field names
        const customFieldKeys = Array.from(
          new Set([
            ...(customFields || []).map((f: any) => f.name),
            ...tasks.flatMap((t) => Object.keys(t.custom_fields || {}))
          ])
        ).filter(k => k && !['assigneeIds', 'teamIds', '__proto__', 'constructor', 'prototype'].includes(k));

        if (exportFormat === 'json') {
          const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            workspaceId: activeWorkspaceId,
            customFields: customFields,
            tasks: tasks,
            members: members,
          };
          const jsonStr = JSON.stringify(exportData, null, 2);
          downloadFile(`costack_workspace_export_${timestamp}.json`, jsonStr, 'application/json');
        } else if (exportFormat === 'csv') {
          // Convert tasks to CSV with custom fields and UTF-8 BOM for Excel support
          const headers = [
            'ID', 'Title', 'Status', 'Priority', 'Description', 'DueDate', 'Assignee', 'WorkspaceId',
            ...customFieldKeys.map(k => `"${k.replace(/"/g, '""')}"`)
          ];
          const rows = tasks.map((t) => {
            const assigneeName = members.find(m => m.id === (t.assigneeIds?.[0] || t.assigneeId))?.name || t.assigneeId || '';
            const baseCols = [
              `"${t.id}"`,
              `"${(t.title || '').replace(/"/g, '""')}"`,
              `"${t.status}"`,
              `"${t.priority}"`,
              `"${(t.description || '').replace(/"/g, '""')}"`,
              `"${t.dueDate || ''}"`,
              `"${assigneeName.replace(/"/g, '""')}"`,
              `"${(t as any).workspaceId || activeWorkspaceId}"`,
            ];
            const customCols = customFieldKeys.map(k => {
              const val = t.custom_fields?.[k];
              if (val == null) return '""';
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
              return `"${str.replace(/"/g, '""')}"`;
            });
            return [...baseCols, ...customCols];
          });
          const csvContent = "\uFEFF" + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
          downloadFile(`costack_tasks_${timestamp}.csv`, csvContent, 'text/csv;charset=utf-8;');
        } else if (exportFormat === 'report') {
          // Formatted HTML Executive Report with custom fields
          const reportHtml = `
<!DOCTYPE html>
<html lang="${locale === 'vi' ? 'vi-VN' : 'en-US'}">
<head>
  <meta charset="utf-8">
  <title>${l('Báo cáo tổng quan Costack', 'Costack Executive Report')} - ${timestamp}</title>
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
  <h1>${l('Báo cáo tổng quan không gian Costack', 'Costack Workspace Executive Report')}</h1>
  <p><strong>${l('Ngày tạo', 'Generated')}:</strong> ${new Date().toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</p>
  <p><strong>${l('Mã không gian', 'Workspace ID')}:</strong> ${activeWorkspaceId}</p>
  <p><strong>${l('Công việc', 'Tasks')}:</strong> ${tasks.length} | <strong>${l('Thành viên', 'Members')}:</strong> ${members.length}</p>

  <h2>${l('Tổng quan công việc', 'Tasks overview')} (${tasks.length})</h2>
  <table>
    <thead>
      <tr>
        <th>${l('Tiêu đề', 'Title')}</th>
        <th>${l('Trạng thái', 'Status')}</th>
        <th>${l('Ưu tiên', 'Priority')}</th>
        <th>${l('Người phụ trách', 'Assignee')}</th>
        <th>${l('Hạn hoàn thành', 'Due date')}</th>
        ${customFieldKeys.slice(0, 5).map(k => `<th>${k}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${tasks
        .map(
          (t) => {
            const assigneeName = members.find(m => m.id === (t.assigneeIds?.[0] || t.assigneeId))?.name || '—';
            return `
        <tr>
          <td><strong>${t.title}</strong></td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
          <td><span class="badge ${t.priority}">${t.priority}</span></td>
          <td>${assigneeName}</td>
          <td>${t.dueDate || 'N/A'}</td>
          ${customFieldKeys.slice(0, 5).map(k => {
            const val = t.custom_fields?.[k];
            if (val == null || val === '') return '<td>—</td>';
            const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `<td>${display}</td>`;
          }).join('')}
        </tr>
      `;
          }
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>
          `;
          downloadFile(`costack_executive_report_${timestamp}.html`, reportHtml, 'text/html');
        }

        addSyncLog?.(l(`Đã xuất dữ liệu không gian ở định dạng ${exportFormat.toUpperCase()}`, `Exported workspace data as ${exportFormat.toUpperCase()}`));
        triggerToast?.('success', l('Xuất dữ liệu hoàn tất', 'Export complete'), l(`Đã lưu dữ liệu dưới dạng tệp ${exportFormat.toUpperCase()}.`, `Workspace data was saved as a ${exportFormat.toUpperCase()} file.`));
      } catch (err) {
        console.error(err);
        triggerToast?.('info', l('Xuất dữ liệu thất bại', 'Export failed'), l('Đã xảy ra lỗi khi tạo tệp xuất.', 'An error occurred while generating the export.'));
      } finally {
        setIsExporting(false);
        onClose();
      }
    }, 600);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="export-data-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          >
            {/* Backdrop */}
            <motion.div
              key="export-data-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 dark:bg-black/75 cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              key="export-data-card"
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col z-10 font-sans"
            >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md">
                <Download className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {l('Xuất và sao lưu dữ liệu', 'Export & backup')}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {l('Tải xuống công việc, tài liệu và dữ liệu không gian', 'Download tasks, documents, and workspace data')}
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
                {l('Định dạng tệp', 'File format')}
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
                    <div className="text-xs font-bold">{l('Bản sao lưu JSON', 'JSON backup')}</div>
                    <div className="text-[10px] text-slate-400">{l('Toàn bộ dữ liệu gốc', 'Complete raw data')}</div>
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
                    <div className="text-xs font-bold">{l('Bảng tính CSV', 'CSV spreadsheet')}</div>
                    <div className="text-[10px] text-slate-400">{l('Excel hoặc Google Trang tính', 'Excel or Google Sheets')}</div>
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
                    <div className="text-xs font-bold">{l('Báo cáo HTML', 'HTML report')}</div>
                    <div className="text-[10px] text-slate-400">{l('Báo cáo tổng hợp có thể in', 'Printable summary report')}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">
                {l('Phạm vi dữ liệu', 'Data scope')}
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
                  {l('Tất cả', 'Everything')}
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
                  {l('Công việc', 'Tasks')} ({tasks.length})
                </button>
              </div>
            </div>

            {/* Export Info Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <HardDrive className="w-4 h-4 text-emerald-500" />
                <span>{l('Tóm tắt bản xuất', 'Export summary')}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {l('Đang chuẩn bị xuất ', 'Preparing to export ')}
                {l(`${tasks.length} công việc và dữ liệu không gian làm việc.`, `${tasks.length} tasks and workspace data.`)}
                {l(' Tệp sẽ tự động được tải xuống.', ' The file will download automatically.')}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{l('Tệp được tạo cục bộ trên thiết bị', 'Files are generated locally on this device')}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {l('Hủy', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? l('Đang tạo tệp…', 'Generating…') : l('Tải tệp xuống', 'Download file')}</span>
              </button>
            </div>
          </div>
        </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
