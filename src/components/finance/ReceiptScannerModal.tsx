"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Landmark,
  LoaderCircle,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  Tag,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { callAiApi } from "@/lib/aiClient";
import { supabase } from "@/lib/supabaseClient";
import { useTranslation } from "@/contexts/TranslationContext";
import type { FinanceCategory } from "./CategoryManagerModal";

interface BankAccount {
  id: string;
  bank: string;
  branch: string;
  number: string;
  balance: number;
  type: string;
}

interface ReceiptScannerModalProps {
  workspaceId: string;
  userId: string | null;
  accounts: BankAccount[];
  categories: FinanceCategory[];
  formatMoney: (amount: number) => string;
  onRefresh: () => Promise<void>;
  onClose: () => void;
  triggerToast?: (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
  onOpenCategoryManager?: () => void;
}

interface ScannedData {
  amount: number;
  date: string;
  merchant: string;
  category: string;
  taxCode: string;
  invoiceNumber: string;
  note: string;
  paymentMethod: "bank_transfer" | "cash" | "card" | "other";
  items: Array<{ name: string; quantity?: number; unitPrice?: number; total?: number }>;
  confidence: number;
}

// Compress and convert image file to Base64 data URL
async function compressImageFile(file: File, maxWidth = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ReceiptScannerModal({
  workspaceId,
  userId,
  accounts,
  categories,
  formatMoney,
  onRefresh,
  onClose,
  triggerToast,
  onOpenCategoryManager,
}: ReceiptScannerModalProps) {
  const { localize: l } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedData | null>(null);

  // Form State
  const [form, setForm] = useState({
    accountId: accounts[0]?.id || "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    merchant: "",
    category: "",
    note: "",
    taxCode: "",
    invoiceNumber: "",
    createInvoiceToo: false,
  });

  // Expense Categories for dropdown
  const expenseCategories = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense" || c.type === "both")
      .map((c) => ({ value: c.name, label: c.name, color: c.color }));
  }, [categories]);

  const processImageFile = useCallback(async (file: File) => {
    try {
      setIsScanning(true);
      setScanStep(l("Đang chuẩn bị và tối ưu hóa hình ảnh…", "Preparing and optimizing the image…"));
      const base64Data = await compressImageFile(file);
      setImagePreview(base64Data);

      setScanStep(l("Costack AI (Gemini Vision) đang phân tích hóa đơn…", "Costack AI (Gemini Vision) is analyzing the receipt…"));
      const categoryNames = categories.map((c) => c.name);

      const response = await callAiApi("/api/ai/receipt-scan", {
        image: base64Data,
        categories: categoryNames,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || l("Không thể quét hóa đơn.", "The receipt could not be scanned."));
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || l("Không nhận diện được nội dung.", "No readable content was detected."));
      }

      const data: ScannedData = result.data;
      setScannedResult(data);

      // Auto-fill form
      setForm((prev) => ({
        ...prev,
        amount: data.amount > 0 ? String(data.amount) : prev.amount,
        date: data.date || prev.date,
        merchant: data.merchant || prev.merchant,
        category: data.category || (expenseCategories[0]?.value ?? l("Chi phí khác", "Other expense")),
        note: data.note || (data.items?.length ? data.items.map((i) => `${i.name} (${i.quantity || 1})`).join(", ") : ""),
        taxCode: data.taxCode || "",
        invoiceNumber: data.invoiceNumber || "",
      }));

      triggerToast?.(
        "success",
        l("Đã quét hóa đơn", "Receipt scanned"),
        l(`Đã nhận diện số tiền: ${formatMoney(data.amount)}`, `Detected amount: ${formatMoney(data.amount)}`)
      );
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      triggerToast?.(
        "error",
        l("Không thể quét hóa đơn", "Receipt scan failed"),
        err?.message || l("Không thể phân tích ảnh.", "The image could not be analyzed.")
      );
    } finally {
      setIsScanning(false);
      setScanStep("");
    }
  }, [categories, expenseCategories, formatMoney, l, triggerToast]);

  // Handle paste image from clipboard anywhere in modal
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            void processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      void processImageFile(file);
    }
  };

  // Submit Expense Transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);

    if (!form.accountId) {
      triggerToast?.(
        "error",
        l("Chưa chọn tài khoản", "No account selected"),
        l("Vui lòng chọn tài khoản ngân hàng hoặc quỹ tiền mặt.", "Select a bank or cash account.")
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      triggerToast?.(
        "error",
        l("Số tiền không hợp lệ", "Invalid amount"),
        l("Vui lòng nhập số tiền chi lớn hơn 0.", "Enter an expense amount greater than zero.")
      );
      return;
    }
    if (!form.category.trim()) {
      triggerToast?.(
        "error",
        l("Thiếu hạng mục", "Category required"),
        l("Vui lòng chọn hoặc nhập hạng mục chi.", "Select or enter an expense category.")
      );
      return;
    }

    setSaving(true);
    try {
      const code = `PC-${Date.now().toString().slice(-9)}`;

      // 1. Record transaction in cashbook
      const { error: txError } = await supabase.rpc("record_finance_transaction", {
        p_workspace_id: workspaceId,
        p_account_id: form.accountId,
        p_code: code,
        p_transaction_type: "expense",
        p_category: form.category.trim(),
        p_amount: amount,
        p_transaction_date: form.date,
        p_partner: form.merchant.trim(),
        p_receiver_or_payer: form.merchant.trim(),
        p_address: "",
        p_debit_account: "642 - Chi phí quản lý",
        p_credit_account: "1121 - Tiền gửi ngân hàng",
        p_note: form.note.trim() + (form.invoiceNumber ? ` [Số HĐ: ${form.invoiceNumber}]` : ""),
      });

      if (txError) throw txError;

      // 2. Optionally create input invoice (Hóa đơn mua vào)
      if (form.createInvoiceToo && userId) {
        const invCode = form.invoiceNumber || `HDM-${Date.now().toString().slice(-9)}`;
        await supabase.from("finance_invoices").insert({
          workspace_id: workspaceId,
          code: invCode,
          invoice_type: "in",
          partner_name: form.merchant.trim() || l("Nhà cung cấp", "Supplier"),
          tax_code: form.taxCode.trim(),
          subtotal: amount,
          vat_rate: 0,
          vat_amount: 0,
          total: amount,
          paid_amount: amount,
          issue_date: form.date,
          status: "paid",
          signed: true,
          created_by: userId,
        });
      }

      triggerToast?.(
        "success",
        l("Đã lưu khoản chi", "Expense saved"),
        l(
          `Mã ${code}: Đã chi ${formatMoney(amount)} cho “${form.merchant || form.category}”.`,
          `${code}: Recorded ${formatMoney(amount)} paid to “${form.merchant || form.category}”.`
        )
      );

      await onRefresh();
      onClose();
    } catch (err: any) {
      console.error("Save expense error:", err);
      triggerToast?.(
        "error",
        l("Không thể lưu khoản chi", "Could not save expense"),
        err?.message || l("Không thể lưu giao dịch.", "The transaction could not be saved.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload & Dropzone Area if no image or to change image */}
      {!imagePreview && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--cu-border-strong)] bg-[var(--cu-surface-2)]/30 p-8 text-center transition hover:border-indigo-500 hover:bg-indigo-500/[0.03]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 transition group-hover:scale-110">
            <Receipt className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-sm font-black text-[var(--cu-text-primary)]">
            {l("Tải lên hoặc kéo thả ảnh hóa đơn, biên lai", "Upload or drop a receipt image")}
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--cu-text-tertiary)]">
            {l(
              "Hỗ trợ hóa đơn VAT, hóa đơn quán cà phê hoặc nhà hàng, biên lai chuyển khoản, MoMo, VietQR và Grab. Bạn cũng có thể nhấn ",
              "Supports VAT invoices, café and restaurant receipts, bank transfers, MoMo, VietQR, and Grab. You can also press "
            )}
            <strong>Ctrl+V</strong>
            {l(" để dán ảnh trực tiếp.", " to paste an image.")}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" type="button" leftIcon={<Upload className="h-4 w-4" />}>
              {l("Chọn ảnh từ máy", "Choose an image")}
            </Button>
            <span className="text-xs text-[var(--cu-text-tertiary)]">
              {l("hoặc chụp bằng camera", "or take a photo")}
            </span>
          </div>
        </div>
      )}

      {/* Live Scanning Progress */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.05] p-8 text-center">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-xl shadow-indigo-500/30">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
            <LoaderCircle className="absolute -bottom-1 -right-1 h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
          <h4 className="mt-4 text-sm font-black text-[var(--cu-text-primary)]">
            {l("Costack Brain AI đang trích xuất dữ liệu hóa đơn…", "Costack Brain AI is extracting receipt data…")}
          </h4>
          <p className="mt-1 text-xs text-[var(--cu-text-tertiary)]">{scanStep}</p>
        </div>
      )}

      {/* Side-by-side Result & Verification Form */}
      {imagePreview && !isScanning && (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          {/* Left: Image Preview */}
          <div className="flex flex-col gap-2">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]">
              <img
                src={imagePreview}
                alt={l("Bản xem trước hóa đơn", "Receipt preview")}
                className="max-h-[320px] w-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setScannedResult(null);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-sm hover:bg-slate-900"
                title={l("Chọn ảnh khác", "Choose another image")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> {l("Chọn ảnh khác", "Choose another image")}
              </button>
              {scannedResult && (
                <Badge variant="success" dot>
                  {l("Độ tin cậy AI", "AI confidence")}: {(scannedResult.confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            {/* Scanned item tags */}
            {scannedResult?.items && scannedResult.items.length > 0 && (
              <div className="rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-2.5 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  {l("Mặt hàng đã nhận diện", "Detected items")}
                </p>
                <div className="mt-1.5 max-h-28 space-y-1 overflow-y-auto">
                  {scannedResult.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate text-[var(--cu-text-secondary)]">{item.name}</span>
                      <span className="font-bold text-[var(--cu-text-primary)]">
                        {item.total ? formatMoney(item.total) : `x${item.quantity || 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Editable Transaction Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Amount Field (Prominent) */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-rose-600 dark:text-rose-400">
                  {l("Số tiền chi", "Expense amount")} <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-black text-rose-500">
                  {form.amount ? formatMoney(Number(form.amount)) : "0 đ"}
                </span>
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={l("Nhập hoặc điều chỉnh số tiền", "Enter or adjust the amount")}
                  className="h-11 w-full rounded-xl border border-rose-500/30 bg-[var(--cu-surface)] px-3 text-lg font-black text-[var(--cu-text-primary)] outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                />
              </div>
            </div>

            {/* Account & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                  {l("Tài khoản thanh toán", "Payment account")} <span className="text-rose-500">*</span>
                </label>
                {accounts.length ? (
                  <Select
                    className="w-full"
                    ariaLabel={l("Tài khoản thanh toán", "Payment account")}
                    value={form.accountId}
                    onChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
                    options={accounts.map((a) => ({
                      value: a.id,
                      label: `${a.bank} (${a.number.slice(-4)}) · ${formatMoney(a.balance)}`,
                    }))}
                  />
                ) : (
                  <p className="text-xs font-bold text-amber-500">
                    {l("Chưa có tài khoản tiền mặt hoặc ngân hàng", "No cash or bank accounts yet")}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                  {l("Ngày giao dịch", "Transaction date")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-xs font-medium text-[var(--cu-text-primary)] outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Merchant & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                  {l("Nhà cung cấp hoặc đối tác", "Supplier or partner")}
                </label>
                <input
                  type="text"
                  value={form.merchant}
                  onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                  placeholder={l("Tên cửa hàng, nhà hàng hoặc đơn vị bán…", "Store, restaurant, or supplier name…")}
                  className="h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-xs text-[var(--cu-text-primary)] outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                    {l("Hạng mục chi", "Expense category")} <span className="text-rose-500">*</span>
                  </label>
                  {onOpenCategoryManager && (
                    <button
                      type="button"
                      onClick={onOpenCategoryManager}
                      className="text-[10px] font-bold text-indigo-500 hover:underline"
                    >
                      {l("+ Quản lý danh mục", "+ Manage categories")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="expense-category-suggestions"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder={l("Chọn hoặc nhập hạng mục…", "Choose or enter a category…")}
                    className="h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-xs font-semibold text-[var(--cu-text-primary)] outline-none focus:border-indigo-500"
                  />
                  <datalist id="expense-category-suggestions">
                    {expenseCategories.map((c) => (
                      <option key={c.value} value={c.value} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Note & Description */}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                {l("Nội dung chi hoặc diễn giải", "Expense details")}
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={l("Thêm ghi chú cho giao dịch…", "Add transaction details…")}
                className="h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-xs text-[var(--cu-text-primary)] outline-none focus:border-indigo-500"
              />
            </div>

            {/* Extra invoice info (optional) */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/30 p-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--cu-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.createInvoiceToo}
                  onChange={(e) => setForm((f) => ({ ...f, createInvoiceToo: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--cu-border)] text-indigo-600 focus:ring-indigo-500"
                />
                <span>{l("Đồng thời lưu vào Hóa đơn đầu vào", "Also save as an incoming invoice")}</span>
              </label>
              {form.invoiceNumber && (
                <span className="text-[11px] text-[var(--cu-text-tertiary)]">
                  {l("Số hóa đơn", "Invoice no.")}: <strong>{form.invoiceNumber}</strong>
                </span>
              )}
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--cu-border)] pt-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                {l("Hủy", "Cancel")}
              </Button>
              <Button
                type="submit"
                loading={saving}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {l("Ghi khoản chi", "Record expense")} ({form.amount ? formatMoney(Number(form.amount)) : "0"})
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ReceiptScannerModal;
