"use client";

import React, { useEffect, useState } from "react";
import { Check, CreditCard, Landmark, Palette, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useTranslation } from "@/contexts/TranslationContext";
import { AccountBankIcon } from "./AccountBankIcon";
import { BANK_DIRECTORY, POPULAR_BANKS, detectBank } from "./bankData";

export interface AccountFormData {
  id?: string;
  bank: string;
  number: string;
  branch: string;
  type: string;
  balance: string;
  color: string;
}

interface AccountManagerModalProps {
  initialData?: AccountFormData | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const ACCOUNT_TYPES = [
  { value: "Tài khoản thanh toán", label: "Tài khoản thanh toán" },
  { value: "Ví điện tử", label: "Ví điện tử" },
  { value: "Tiền mặt", label: "Quỹ tiền mặt" },
  { value: "Thẻ tín dụng", label: "Thẻ tín dụng" },
  { value: "Tài khoản tiết kiệm", label: "Tài khoản tiết kiệm" },
  { value: "Tài khoản đầu tư", label: "Tài khoản đầu tư / Crypto" },
  { value: "Khác", label: "Khác" },
];

const PRESET_COLORS = [
  "#005432", // VCB Green
  "#009e52", // VPB Green
  "#059669", // Emerald
  "#005baa", // ACB Blue
  "#0033a0", // MB Blue
  "#0057b7", // VIB Blue
  "#4f46e5", // Indigo
  "#6c2382", // TPB Purple
  "#d82d8b", // MoMo Pink
  "#e11b22", // TCB Red
  "#d8242b", // HDB Red
  "#f26522", // SHB Orange
  "#0f172a", // Slate Dark
];

export function AccountManagerModal({
  initialData,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: AccountManagerModalProps) {
  const { localize: l, isVietnamese } = useTranslation();
  const isEditing = Boolean(initialData?.id);

  const accountTypes = [
    { value: "Tài khoản thanh toán", label: l("Tài khoản thanh toán", "Checking account") },
    { value: "Ví điện tử", label: l("Ví điện tử", "E-Wallet") },
    { value: "Tiền mặt", label: l("Quỹ tiền mặt", "Cash fund") },
    { value: "Thẻ tín dụng", label: l("Thẻ tín dụng", "Credit card") },
    { value: "Tài khoản tiết kiệm", label: l("Tài khoản tiết kiệm", "Savings account") },
    { value: "Tài khoản đầu tư", label: l("Tài khoản đầu tư / Crypto", "Investment / Crypto") },
    { value: "Khác", label: l("Khác", "Other") },
  ];

  const [form, setForm] = useState<AccountFormData>({
    id: initialData?.id,
    bank: initialData?.bank || "",
    number: initialData?.number || "",
    branch: initialData?.branch || "",
    type: initialData?.type || "Tài khoản thanh toán",
    balance: initialData?.balance || "",
    color: initialData?.color || "#4f46e5",
  });

  // Tự động nhận diện khi người dùng nhập tên ngân hàng
  const detectedBank = detectBank(form.bank);

  // Khi chọn một ngân hàng từ danh sách gợi ý nhanh
  const handleSelectPresetBank = (code: string) => {
    const bank = BANK_DIRECTORY.find(b => b.code === code);
    if (!bank) return;
    setForm(prev => ({
      ...prev,
      bank: bank.shortName,
      color: bank.brandColor,
      type: bank.defaultType,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bank.trim() || !form.number.trim()) return;
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--cu-text-primary)]">
                {isEditing ? l("Chỉnh sửa tài khoản ngân hàng / ví", "Edit bank / wallet account") : l("Thêm tài khoản ngân hàng & ví mới", "Add new bank & wallet account")}
              </h3>
              <p className="text-xs text-[var(--cu-text-tertiary)]">
                {isEditing ? l("Cập nhật thông tin nhận diện và số dư", "Update account identity and balance") : l("Chọn nhanh ngân hàng để tự động áp dụng icon & màu sắc chuẩn", "Quickly pick bank to apply logo & brand color")}
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

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          {/* Quick Select Grid ngân hàng & ví phổ biến */}
          <div>
            <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {l("Chọn nhanh ngân hàng / Ví điện tử phổ biến", "Quick select popular banks / e-wallets")}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {POPULAR_BANKS.map(b => {
                const isSelected = form.bank.toLowerCase().includes(b.shortName.toLowerCase());
                return (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => handleSelectPresetBank(b.code)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition text-center ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                        : "border-[var(--cu-border)] bg-[var(--cu-surface-2)]/30 hover:border-indigo-500/50 hover:bg-[var(--cu-surface-2)]"
                    }`}
                  >
                    <AccountBankIcon bank={b.shortName} color={b.brandColor} size="sm" />
                    <span className="text-[10px] font-bold text-[var(--cu-text-primary)] truncate max-w-full">
                      {b.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Tên ngân hàng / Quỹ / Ví *", "Bank / Fund / Wallet name *")}
              </label>
              <div className="relative">
                <input
                  value={form.bank}
                  onChange={e => {
                    const val = e.target.value;
                    const detected = detectBank(val);
                    setForm(prev => ({
                      ...prev,
                      bank: val,
                      color: detected.brandColor !== "#6366f1" ? detected.brandColor : prev.color,
                      type: detected.code !== "CUSTOM" ? detected.defaultType : prev.type,
                    }));
                  }}
                  placeholder={l("Ví dụ: Vietcombank, Techcombank, MoMo...", "e.g. Vietcombank, Techcombank, MoMo...")}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Số tài khoản / Số ví / Định danh *", "Account / Wallet / ID number *")}
              </label>
              <input
                value={form.number}
                onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
                placeholder={l("Ví dụ: 19036528888, 0987654321...", "e.g. 19036528888, 0987654321...")}
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {l("Chi nhánh / Nơi mở", "Branch / Issuing location")}
              </label>
              <input
                value={form.branch}
                onChange={e => setForm(prev => ({ ...prev, branch: e.target.value }))}
                placeholder={l("Ví dụ: Sở giao dịch, Hội sở, CN Thăng Long...", "e.g. Head office, Thang Long branch...")}
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
                {isEditing ? l("Số dư hiện tại *", "Current balance *") : l("Số dư mở sổ *", "Opening balance *")}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={e => setForm(prev => ({ ...prev, balance: e.target.value }))}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/50 text-xs font-semibold text-[var(--cu-text-primary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-1.5 block">
              {l("Phân loại tài khoản", "Account category")}
            </label>
            <Select
              className="w-full"
              ariaLabel={l("Phân loại tài khoản", "Account category")}
              value={form.type}
              onChange={v => setForm(prev => ({ ...prev, type: v }))}
              options={accountTypes}
            />
          </div>

          {/* Color palette */}
          <div>
            <label className="text-xs font-bold text-[var(--cu-text-secondary)] mb-2 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              {l("Màu sắc chủ đạo thẻ tài khoản", "Card primary theme color")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, color: c }))}
                  className={`h-7 w-7 rounded-xl transition flex items-center justify-center shadow-sm ${
                    form.color === c ? "scale-110 ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--cu-surface)]" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/40 p-3.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)] mb-2">
              <span>{l("Xem trước thẻ tài khoản", "Card live preview")}</span>
              <span className="text-emerald-500">{l("Đang hoạt động", "Active")}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <AccountBankIcon bank={form.bank || l("Ngân hàng", "Bank")} color={form.color} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--cu-text-primary)] truncate">
                  {form.bank || l("Tên ngân hàng / Quỹ", "Bank / Fund name")}
                </p>
                <p className="text-[11px] text-[var(--cu-text-tertiary)] truncate">
                  {form.number || "0000000000"} · {form.branch || form.type}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-[var(--cu-text-primary)]">
                  {new Intl.NumberFormat(isVietnamese ? "vi-VN" : "en-US").format(Number(form.balance || 0))} {isVietnamese ? "₫" : "$"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--cu-border)]">
            {isEditing && onDelete && form.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                onClick={() => onDelete(form.id!)}
                disabled={saving}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                {l("Xóa tài khoản", "Delete account")}
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                {l("Hủy", "Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? l("Đang lưu...", "Saving...") : isEditing ? l("Lưu thay đổi", "Save changes") : l("Tạo tài khoản", "Create account")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
