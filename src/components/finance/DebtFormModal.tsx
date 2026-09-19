"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Calendar, Clock3, DollarSign, Mail, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useTranslation } from "@/contexts/TranslationContext";

export interface DebtFormData {
  id?: string;
  type: "receivable" | "payable";
  partnerName: string;
  totalAmount: string;
  paidAmount: string;
  dueDate: string;
  phone: string;
  email: string;
}

interface DebtFormModalProps {
  initialData?: DebtFormData | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: DebtFormData) => Promise<void>;
}

export function DebtFormModal({
  initialData,
  saving,
  onClose,
  onSubmit,
}: DebtFormModalProps) {
  const { localize: l, isVietnamese } = useTranslation();
  const isEditing = Boolean(initialData?.id);

  const [form, setForm] = useState<DebtFormData>({
    id: initialData?.id,
    type: initialData?.type || "receivable",
    partnerName: initialData?.partnerName || "",
    totalAmount: initialData?.totalAmount || "",
    paidAmount: initialData?.paidAmount || "0",
    dueDate: initialData?.dueDate || new Date().toISOString().slice(0, 10),
    phone: initialData?.phone || "",
    email: initialData?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partnerName.trim()) return;
    const total = Number(form.totalAmount);
    const paid = Number(form.paidAmount || 0);
    if (!Number.isFinite(total) || total < 0 || paid < 0 || paid > total) return;
    await onSubmit(form);
  };

  return (
    <motion.div
      key="debt-form-modal-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 modal-backdrop-blur"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="debt-form-modal-card"
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
              form.type === "receivable"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            }`}>
              {form.type === "receivable" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--cu-text-primary)]">
                {isEditing ? l("Chỉnh sửa khoản công nợ", "Edit debt record") : l("Ghi nhận công nợ mới", "New debt record")}
              </h3>
              <p className="text-xs text-[var(--cu-text-tertiary)]">
                {form.type === "receivable"
                  ? l("Khoản phải thu từ khách hàng / đối tác", "Receivable from customer / partner")
                  : l("Khoản phải trả cho nhà cung cấp", "Payable to supplier / partner")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)] hover:text-[var(--cu-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-4">
          {/* Chọn Loại công nợ */}
          <div>
            <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
              {l("Phân loại công nợ *", "Debt classification *")}
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--cu-surface-2)]/60 p-1.5">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: "receivable" }))}
                className={`flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black transition ${
                  form.type === "receivable"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                }`}
              >
                <ArrowDownRight className="h-4 w-4" />
                <span>{l("Nợ Phải Thu (Khách nợ)", "Receivable (Customer owes)")}</span>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: "payable" }))}
                className={`flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black transition ${
                  form.type === "payable"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>{l("Nợ Phải Trả (Mình nợ)", "Payable (You owe)")}</span>
              </button>
            </div>
          </div>

          {/* Tên đối tác & Hạn nợ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Tên khách hàng / Nhà cung cấp *", "Customer / Supplier name *")}
              </label>
              <input
                value={form.partnerName}
                onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))}
                placeholder={l("Ví dụ: Công ty TNHH ABC, Anh Nam...", "e.g. ABC Co., Ltd, Mr. John...")}
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Hạn thanh toán *", "Due date *")}
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Số tiền nợ & Đã trả trước */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Tổng giá trị công nợ *", "Total debt amount *")}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.totalAmount}
                onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Đã thanh toán trước (nếu có)", "Prepaid amount (if any)")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.paidAmount}
                onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Số điện thoại & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Số điện thoại liên hệ", "Contact phone")}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={l("Ví dụ: 0912345678", "e.g. 0912345678")}
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Email đối tác", "Partner email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="partner@company.com"
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--cu-border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {l("Hủy", "Cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? l("Đang lưu...", "Saving...") : isEditing ? l("Lưu thay đổi", "Save changes") : l("Lưu khoản nợ", "Save debt")}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
