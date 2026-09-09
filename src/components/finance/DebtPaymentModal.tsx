"use client";

import React, { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  History,
  Info,
  Landmark,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { AccountBankIcon } from "./AccountBankIcon";
import { BankAccountItem, DebtRecord, PaymentRecord } from "./DebtDetailModal";

export interface PaymentSubmitPayload {
  amount: number;
  date: string;
  method: "bank_transfer" | "cash" | "card" | "other";
  reference: string;
  note: string;
  syncCashbook: boolean;
  accountId?: string;
}

interface DebtPaymentModalProps {
  target: { kind: "debt"; record: DebtRecord } | { kind: "invoice"; record: any };
  accounts: BankAccountItem[];
  payments: PaymentRecord[];
  formatMoney: (amount: number) => string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: PaymentSubmitPayload) => Promise<void>;
}

export function DebtPaymentModal({
  target,
  accounts,
  payments,
  formatMoney,
  saving,
  onClose,
  onSubmit,
}: DebtPaymentModalProps) {
  const isDebt = target.kind === "debt";
  const debt = isDebt ? (target.record as DebtRecord) : null;
  const invoice = !isDebt ? target.record : null;

  const total = isDebt ? debt!.totalAmount : invoice.total;
  const paid = isDebt ? debt!.paidAmount : invoice.paidAmount;
  const remaining = isDebt ? debt!.remainingAmount : invoice.remainingAmount;
  const title = isDebt ? debt!.partnerName : `${invoice.code} · ${invoice.partnerName}`;

  const defaultMethod = "bank_transfer";
  const [amount, setAmount] = useState<string>(remaining > 0 ? String(remaining) : "");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"bank_transfer" | "cash" | "card" | "other">(defaultMethod);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  // Tùy chọn tự động ghi vào Sổ thu chi
  const [syncCashbook, setSyncCashbook] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");

  const quickSetPercent = (ratio: number) => {
    const calculated = Math.round(remaining * ratio * 100) / 100;
    setAmount(String(calculated));
  };

  const relevantPayments = payments.filter(p =>
    isDebt ? p.debtId === debt!.id : p.invoiceId === invoice.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > remaining) return;
    if (syncCashbook && !selectedAccountId && accounts.length > 0) return;

    await onSubmit({
      amount: numAmount,
      date,
      method,
      reference: reference.trim(),
      note: note.trim(),
      syncCashbook: syncCashbook && Boolean(selectedAccountId),
      accountId: selectedAccountId || undefined,
    });
  };

  const methodOptions = [
    { value: "bank_transfer", label: "Chuyển khoản ngân hàng" },
    { value: "cash", label: "Tiền mặt" },
    { value: "card", label: "Thẻ tín dụng / Ghi nợ" },
    { value: "other", label: "Hình thức khác" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--cu-text-primary)]">Ghi nhận thanh toán</h3>
              <p className="text-xs text-[var(--cu-text-tertiary)]">
                {isDebt ? `Thanh toán công nợ: ${title}` : `Thanh toán hóa đơn: ${title}`}
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
          {/* Card thông tin dư nợ & tiến độ */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-black text-[var(--cu-text-primary)]">{title}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  {isDebt
                    ? debt?.type === "receivable" ? "Công nợ phải thu (Khách trả)" : "Công nợ phải trả (Mình thanh toán)"
                    : "Hóa đơn"}
                </p>
              </div>
              <span className="text-sm font-black text-amber-500">
                {formatMoney(remaining)} còn lại
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cu-surface-2)]">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-[10px] font-semibold text-[var(--cu-text-tertiary)]">
              <span>Đã thanh toán {formatMoney(paid)}</span>
              <span>Tổng {formatMoney(total)}</span>
            </div>
          </div>

          {/* Số tiền thanh toán + nút nhanh */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[var(--cu-text-secondary)]">
                Số tiền thanh toán *
              </label>
              <span className="text-[10px] text-[var(--cu-text-tertiary)]">
                Tối đa: <strong>{formatMoney(remaining)}</strong>
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min="0.01"
                max={remaining}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-black text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => quickSetPercent(0.25)}
                  className="rounded-xl border border-[var(--cu-border)] px-2.5 text-[10px] font-black text-[var(--cu-text-secondary)] hover:border-indigo-500 hover:text-indigo-500 transition"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => quickSetPercent(0.5)}
                  className="rounded-xl border border-[var(--cu-border)] px-2.5 text-[10px] font-black text-[var(--cu-text-secondary)] hover:border-indigo-500 hover:text-indigo-500 transition"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => quickSetPercent(1)}
                  className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-2.5 text-[10px] font-black text-indigo-500 transition hover:bg-indigo-500 hover:text-white"
                >
                  Tất toán
                </button>
              </div>
            </div>
          </div>

          {/* Ngày thanh toán & Phương thức */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                Ngày thanh toán *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                Phương thức *
              </label>
              <Select
                className="w-full"
                ariaLabel="Phương thức thanh toán"
                value={method}
                onChange={v => setMethod(v as typeof method)}
                options={methodOptions}
              />
            </div>
          </div>

          {/* Tùy chọn TỰ ĐỘNG ĐỒNG BỘ SỔ THU CHI & CẬP NHẬT SỐ DƯ TÀI KHOẢN */}
          {accounts.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncCashbook}
                  onChange={e => setSyncCashbook(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--cu-border)] text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-xs font-black text-[var(--cu-text-primary)] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Đồng thời ghi vào Sổ thu chi & cập nhật số dư tài khoản
                </span>
              </label>

              {syncCashbook && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-[var(--cu-text-secondary)] block mb-1">
                    {isDebt && debt?.type === "receivable"
                      ? "Tiền vào tài khoản (Khoản thu):"
                      : "Trừ tiền từ tài khoản (Khoản chi):"}
                  </span>
                  <Select
                    className="w-full"
                    ariaLabel="Tài khoản thanh toán"
                    value={selectedAccountId}
                    onChange={v => setSelectedAccountId(v)}
                    options={accounts.map(a => ({
                      value: a.id,
                      label: `${a.bank} · ${a.number}`,
                    }))}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    Bút toán {isDebt && debt?.type === "receivable" ? "Thu" : "Chi"} sẽ được tạo tự động và số dư tài khoản sẽ được tính toán chính xác ngay lập tức.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mã tham chiếu & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                Mã tham chiếu / Số giao dịch
              </label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="VD: FT240901..., UNC001"
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                Ghi chú đối soát
              </label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Nội dung thanh toán..."
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Lịch sử thanh toán trước đó */}
          {relevantPayments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[var(--cu-text-tertiary)] flex items-center gap-1">
                <History className="h-3 w-3" />
                Các đợt thanh toán trước ({relevantPayments.length})
              </span>
              <div className="max-h-28 overflow-y-auto divide-y divide-[var(--cu-border)] rounded-xl border border-[var(--cu-border)]">
                {relevantPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-[11px] bg-[var(--cu-surface-2)]/20">
                    <span className="text-[var(--cu-text-secondary)]">
                      {new Date(`${p.date}T00:00:00`).toLocaleDateString("vi-VN")} · {p.reference || "Không có mã"}
                    </span>
                    <span className="font-bold text-emerald-500">+{formatMoney(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--cu-border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Đang xử lý..." : "Xác nhận thanh toán"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
