"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Edit2,
  ExternalLink,
  History,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/contexts/TranslationContext";

export interface DebtRecord {
  id: string;
  partnerName: string;
  type: "receivable" | "payable";
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  phone?: string;
  email?: string;
  status: "normal" | "due_soon" | "overdue";
}

export interface PaymentRecord {
  id: string;
  debtId: string | null;
  invoiceId: string | null;
  amount: number;
  date: string;
  method: "bank_transfer" | "cash" | "card" | "other";
  reference: string;
  note: string;
  createdAt: string;
}

export interface BankAccountItem {
  id: string;
  bank: string;
  number: string;
  branch?: string;
}

interface DebtDetailModalProps {
  debt: DebtRecord;
  payments: PaymentRecord[];
  accounts?: BankAccountItem[];
  formatMoney: (amount: number) => string;
  onClose: () => void;
  onOpenPayment: (debt: DebtRecord) => void;
  onEditDebt: (debt: DebtRecord) => void;
  onDeleteDebt: (debt: DebtRecord) => void;
}

export function DebtDetailModal({
  debt,
  payments,
  accounts = [],
  formatMoney,
  onClose,
  onOpenPayment,
  onEditDebt,
  onDeleteDebt,
}: DebtDetailModalProps) {
  const { localize: l, isVietnamese } = useTranslation();
  const [reminderTone, setReminderTone] = useState<"friendly" | "standard" | "urgent">("standard");
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Lọc lịch sử thanh toán của riêng khoản nợ này
  const debtPayments = payments.filter(p => p.debtId === debt.id);

  // Tính số ngày còn lại hoặc quá hạn
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const dueDateObj = new Date(`${debt.dueDate}T00:00:00`);
  const diffDays = Math.ceil((dueDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  const progressPercent = debt.totalAmount > 0
    ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100))
    : 100;

  const defaultAccount = accounts[0];

  // Tạo nội dung tin nhắn nhắc nợ
  const generateReminderMessage = () => {
    const formattedDue = dueDateObj.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US");
    const remainingStr = formatMoney(debt.remainingAmount);
    const bankInfoStr = defaultAccount
      ? isVietnamese
        ? `\n- Ngân hàng: ${defaultAccount.bank}\n- Số tài khoản: ${defaultAccount.number}`
        : `\n- Bank: ${defaultAccount.bank}\n- Account No: ${defaultAccount.number}`
      : "";

    if (!isVietnamese) {
      if (reminderTone === "friendly") {
        return `Hello ${debt.partnerName}, Costack sends warm greetings. Your outstanding balance of ${remainingStr} is due on ${formattedDue}. We would appreciate it if you could arrange payment on time.${bankInfoStr}\nThank you!`;
      }
      if (reminderTone === "urgent") {
        return `Dear ${debt.partnerName}, your balance of ${remainingStr} became overdue on ${formattedDue}. Please settle the remaining amount urgently.${bankInfoStr}\nBest regards.`;
      }
      return `Dear ${debt.partnerName}, this is a notice regarding your current debt balance of ${remainingStr}, due date: ${formattedDue}. Please check and arrange payment.${bankInfoStr}\nSincerely thank you!`;
    }

    if (reminderTone === "friendly") {
      return `Xin chào ${debt.partnerName}, Costack xin gửi lời chào trân trọng. Khoản công nợ trị giá ${remainingStr} của bạn sẽ đến hạn vào ngày ${formattedDue}. Rất mong bạn sắp xếp thanh toán đúng hạn.${bankInfoStr}\nCảm ơn bạn!`;
    }
    if (reminderTone === "urgent") {
      return `Kính gửi ${debt.partnerName}, khoản công nợ trị giá ${remainingStr} đã quá hạn vào ngày ${formattedDue}. Kính đề nghị bạn khẩn trương thanh toán toàn bộ số tiền còn thiếu để không ảnh hưởng đến đối soát.${bankInfoStr}\nTrân trọng.`;
    }
    return `Kính gửi ${debt.partnerName}, chúng tôi xin thông báo số dư công nợ hiện tại là ${remainingStr}, thời hạn thanh toán là ${formattedDue}. Bạn vui lòng kiểm tra và hỗ trợ thanh toán.${bankInfoStr}\nXin chân thành cảm ơn!`;
  };

  const handleCopyReminder = async () => {
    try {
      await navigator.clipboard.writeText(generateReminderMessage());
      setCopiedReminder(true);
      setTimeout(() => setCopiedReminder(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyPhone = async () => {
    if (!debt.phone) return;
    try {
      await navigator.clipboard.writeText(debt.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // Fallback
    }
  };

  const methodLabel = (method: PaymentRecord["method"]) => {
    switch (method) {
      case "bank_transfer": return l("Chuyển khoản", "Bank transfer");
      case "cash": return l("Tiền mặt", "Cash");
      case "card": return l("Thẻ tín dụng", "Credit card");
      default: return l("Khác", "Other");
    }
  };

  return (
    <motion.div
      key="debt-detail-modal-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 modal-backdrop-blur"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="debt-detail-modal-card"
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              debt.type === "receivable"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            }`}>
              {debt.type === "receivable" ? <ArrowDownRight className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[var(--cu-text-primary)]">{debt.partnerName}</h3>
                <Badge variant={debt.type === "receivable" ? "success" : "danger"}>
                  {debt.type === "receivable" ? l("Phải thu", "Receivable") : l("Phải trả", "Payable")}
                </Badge>
              </div>
              <p className="text-xs text-[var(--cu-text-tertiary)]">
                {debt.type === "receivable"
                  ? l("Khách hàng nợ bạn", "Customer owes you")
                  : l("Bạn nợ nhà cung cấp / đối tác", "You owe supplier / partner")}
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

        <div className="max-h-[82vh] overflow-y-auto p-6 space-y-5">
          {/* Thông tin liên hệ đối tác */}
          {(debt.phone || debt.email) && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/40 p-3.5">
              {debt.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3.5 w-3.5 text-indigo-500" />
                  <a
                    href={`tel:${debt.phone}`}
                    className="font-bold text-[var(--cu-text-primary)] hover:underline hover:text-indigo-500"
                  >
                    {debt.phone}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="text-[var(--cu-text-tertiary)] hover:text-indigo-500 p-0.5"
                    title={l("Sao chép số điện thoại", "Copy phone number")}
                  >
                    {copiedPhone ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
              {debt.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  <a
                    href={`mailto:${debt.email}`}
                    className="font-bold text-[var(--cu-text-primary)] hover:underline hover:text-indigo-500"
                  >
                    {debt.email}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Bảng tổng kết số tiền & tiến độ */}
          <div className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/30 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-[var(--cu-border)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  {l("Tổng công nợ", "Total Debt")}
                </span>
                <p className="mt-1 text-base font-black text-[var(--cu-text-primary)]">
                  {formatMoney(debt.totalAmount)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  {l("Đã thanh toán", "Paid")}
                </span>
                <p className="mt-1 text-base font-black text-emerald-500">
                  {formatMoney(debt.paidAmount)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  {l("Còn lại", "Remaining")}
                </span>
                <p className="mt-1 text-base font-black text-amber-500">
                  {formatMoney(debt.remainingAmount)}
                </p>
              </div>
            </div>

            {/* Thanh tiến độ */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                <span className="text-[var(--cu-text-tertiary)]">
                  {l("Tiến độ thanh toán", "Payment progress")}: {progressPercent}%
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  debt.remainingAmount <= 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : debt.paidAmount > 0
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-indigo-500/10 text-indigo-500"
                }`}>
                  {debt.remainingAmount <= 0
                    ? l("Đã tất toán", "Settled")
                    : debt.paidAmount > 0
                    ? l("Thanh toán một phần", "Partially paid")
                    : l("Chưa thanh toán", "Unpaid")}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--cu-surface-2)] border border-[var(--cu-border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Trạng thái hạn thanh toán */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--cu-text-secondary)]">
                <Calendar className="h-3.5 w-3.5 text-[var(--cu-text-tertiary)]" />
                <span>
                  {l("Hạn thanh toán", "Due date")}: <strong>{dueDateObj.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}</strong>
                </span>
              </div>
              <div>
                {debt.remainingAmount <= 0 ? (
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {l("Tất toán hoàn tất", "Settlement complete")}
                  </span>
                ) : diffDays < 0 ? (
                  <span className="text-rose-500 font-black flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {l(`Quá hạn ${Math.abs(diffDays)} ngày`, `Overdue by ${Math.abs(diffDays)} days`)}
                  </span>
                ) : diffDays === 0 ? (
                  <span className="text-amber-500 font-black flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> {l("Đến hạn hôm nay", "Due today")}
                  </span>
                ) : diffDays <= 7 ? (
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> {l(`Còn ${diffDays} ngày nữa`, `${diffDays} days left`)}
                  </span>
                ) : (
                  <span className="text-emerald-500 font-bold">
                    {l(`Còn ${diffDays} ngày nữa`, `${diffDays} days left`)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lịch sử thanh toán từng đợt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--cu-text-secondary)] flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-indigo-500" />
                {l("Lịch sử các đợt thanh toán", "Payment history")} ({debtPayments.length})
              </span>
              {debt.remainingAmount > 0 && (
                <Button size="sm" variant="ghost" className="text-indigo-500 hover:text-indigo-600" onClick={() => onOpenPayment(debt)}>
                  {l("+ Ghi thanh toán", "+ Record payment")}
                </Button>
              )}
            </div>

            {debtPayments.length > 0 ? (
              <div className="divide-y divide-[var(--cu-border)] rounded-2xl border border-[var(--cu-border)] overflow-hidden">
                {debtPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 text-xs bg-[var(--cu-surface)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-black text-[var(--cu-text-primary)]">
                          {new Date(`${p.date}T00:00:00`).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} · {methodLabel(p.method)}
                        </p>
                        <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                          {p.reference || p.note || l("Ghi nhận thanh toán đối soát", "Recorded settlement payment")}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-emerald-500 text-sm">
                      +{formatMoney(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--cu-border)] p-4 text-center text-xs text-[var(--cu-text-tertiary)]">
                {l("Chưa có đợt thanh toán nào được ghi nhận cho khoản nợ này.", "No payment records found for this debt.")}
              </div>
            )}
          </div>

          {/* Công cụ sinh mẫu tin nhắn nhắc nợ (cho nợ phải thu) */}
          {debt.type === "receivable" && debt.remainingAmount > 0 && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.04] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-500 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {l("Mẫu tin nhắn nhắc nợ (Gửi qua Zalo / SMS / Email)", "Payment reminder template (Zalo / SMS / Email)")}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setReminderTone("friendly")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      reminderTone === "friendly"
                        ? "bg-indigo-500 text-white"
                        : "bg-[var(--cu-surface)] text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                    }`}
                  >
                    {l("Nhẹ nhàng", "Friendly")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderTone("standard")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      reminderTone === "standard"
                        ? "bg-indigo-500 text-white"
                        : "bg-[var(--cu-surface)] text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                    }`}
                  >
                    {l("Tiêu chuẩn", "Standard")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderTone("urgent")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      reminderTone === "urgent"
                        ? "bg-rose-500 text-white"
                        : "bg-[var(--cu-surface)] text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                    }`}
                  >
                    {l("Khẩn cấp", "Urgent")}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-3 text-xs text-[var(--cu-text-secondary)] whitespace-pre-wrap leading-relaxed">
                {generateReminderMessage()}
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyReminder}
                  leftIcon={copiedReminder ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-indigo-500" />}
                >
                  {copiedReminder ? l("Đã sao chép vào bộ nhớ tạm!", "Copied to clipboard!") : l("Sao chép tin nhắn", "Copy message")}
                </Button>
              </div>
            </div>
          )}

          {/* Actions Bottom Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--cu-border)]">
            <Button
              variant="ghost"
              className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => onDeleteDebt(debt)}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              {l("Xóa khoản nợ", "Delete debt")}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => onEditDebt(debt)}
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                {l("Chỉnh sửa", "Edit")}
              </Button>
              {debt.remainingAmount > 0 && (
                <Button
                  onClick={() => onOpenPayment(debt)}
                  leftIcon={<CreditCard className="h-4 w-4" />}
                >
                  {l("Ghi nhận thanh toán", "Record payment")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
