"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, User, Mail, Phone, Building2, Briefcase, 
  MapPin, FileText, Tag, Loader2, Check, Sparkles 
} from "lucide-react";
import { WorkspaceContact, ContactCategory } from "@/types";
import { useTranslation } from "@/contexts/TranslationContext";

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

interface ContactFormModalProps {
  isOpen: boolean;
  contact?: WorkspaceContact | null;
  workspaceId: string;
  onClose: () => void;
  onSave: (data: Omit<WorkspaceContact, "id" | "createdAt" | "updatedAt">, id?: string) => Promise<void>;
  saving?: boolean;
}

const CATEGORIES: Array<{
  id: ContactCategory;
  labelVi: string;
  labelEn: string;
  badge: string;
}> = [
  { id: "client", labelVi: "Khách hàng", labelEn: "Client", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "partner", labelVi: "Đối tác", labelEn: "Partner", badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { id: "vendor", labelVi: "Nhà cung cấp", labelEn: "Vendor", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "contractor", labelVi: "Cộng tác viên / Freelancer", labelEn: "Contractor", badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "other", labelVi: "Khác", labelEn: "Other", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
];

export default function ContactFormModal({
  isOpen,
  contact,
  workspaceId,
  onClose,
  onSave,
  saving = false,
}: ContactFormModalProps) {
  const { isVietnamese } = useTranslation();
  const isEdit = Boolean(contact?.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [category, setCategory] = useState<ContactCategory>("client");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setCompany(contact.company || "");
      setJobTitle(contact.jobTitle || "");
      setCategory(contact.category || "client");
      setAddress(contact.address || "");
      setNotes(contact.notes || "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setJobTitle("");
      setCategory("client");
      setAddress("");
      setNotes("");
    }
    setValidationError("");
  }, [contact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!name.trim()) {
      setValidationError(isVietnamese ? "Vui lòng nhập họ tên liên hệ." : "Please enter contact name.");
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setValidationError(isVietnamese ? "Định dạng email không hợp lệ." : "Invalid email format.");
        return;
      }
    }

    try {
      await onSave(
        {
          workspaceId,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          category,
          status: contact?.status || "active",
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        contact?.id
      );
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : (isVietnamese ? "Không thể lưu liên hệ." : "Failed to save contact."));
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="contact-form-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4"
          >
            <div
              onClick={onClose}
              className="absolute inset-0 modal-backdrop bg-black/50 dark:bg-black/70 cursor-pointer"
            />

            <motion.div
              key="contact-form-modal"
              initial={{ scale: 0.94, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-[min(95vw,540px)] max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 z-10 select-none custom-scrollbar"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 min-w-[36px] min-h-[36px] rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

          {/* Header */}
          <div className="mb-5 text-left pr-8">
            <h3 className="text-lg font-black text-slate-850 dark:text-slate-50 tracking-tight">
              {isEdit 
                ? (isVietnamese ? "Chỉnh sửa liên hệ" : "Edit Contact") 
                : (isVietnamese ? "Thêm liên hệ mới" : "Add New Contact")}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              {isVietnamese 
                ? "Lưu trữ thông tin đối tác, khách hàng và cộng tác viên của workspace." 
                : "Manage workspace contacts, partners, clients and external collaborators."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isVietnamese ? "Họ và tên" : "Full Name"} *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isVietnamese ? "Ví dụ: Nguyễn Văn A, TechCorp Co..." : "e.g. John Doe, Acme Corp..."}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isVietnamese ? "Phân loại liên hệ" : "Category"}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                      category === cat.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <span>{isVietnamese ? cat.labelVi : cat.labelEn}</span>
                    {category === cat.id && <Check className="w-3 h-3 text-indigo-500 shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isVietnamese ? "Số điện thoại" : "Phone Number"}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Company & Job Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isVietnamese ? "Công ty / Tổ chức" : "Company"}</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder={isVietnamese ? "Tên công ty hoặc tổ chức..." : "Company or organization name..."}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isVietnamese ? "Chức danh / Vị trí" : "Job Title"}</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder={isVietnamese ? "Ví dụ: Giám đốc, Kế toán trưởng, PM..." : "e.g. Director, Accountant, PM..."}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{isVietnamese ? "Địa chỉ" : "Address"}</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={isVietnamese ? "Số nhà, tên đường, quận/huyện, tỉnh/thành..." : "Address, city, region..."}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{isVietnamese ? "Ghi chú liên hệ" : "Notes"}</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isVietnamese ? "Ghi chú đặc thù, dự án hợp tác, lưu ý làm việc..." : "Collaboration notes, preferences, details..."}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
              />
            </div>

            {/* Validation error */}
            {validationError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {validationError}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2.5 items-center border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isVietnamese ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isEdit ? (isVietnamese ? "Cập nhật" : "Save Changes") : (isVietnamese ? "Thêm liên hệ" : "Add Contact")}</span>
              </button>
            </div>
          </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
