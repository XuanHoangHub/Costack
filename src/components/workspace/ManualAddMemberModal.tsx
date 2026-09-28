"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X, UserPlus, Users, Shield, ShieldCheck, User,
  Mail, Phone, Building2, Search, Check, AlertCircle, Loader2, Sparkles
} from "lucide-react";
import { User as MemberUser, WorkspaceRole } from "@/types";
import { useTranslation } from "@/contexts/TranslationContext";
import { supabase } from "@/lib/supabaseClient";

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

interface ManualAddMemberModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName: string;
  allMembers?: MemberUser[];
  currentWorkspaceMemberUserIds?: Set<string>;
  prefill?: { name?: string; email?: string; phone?: string; role?: string } | null;
  onClose: () => void;
  onMemberAdded: () => void | Promise<void>;
  triggerToast?: (type: any, title: string, message: string) => void;
  onAddSyncLog?: (action: string) => void;
}

const DEPARTMENTS = [
  { id: "d-hq", labelVi: "Ban Giám đốc & Điều hành", labelEn: "Executive Headquarters" },
  { id: "d-eng", labelVi: "Kỹ thuật & Công nghệ", labelEn: "Engineering & Technology" },
  { id: "d-design", labelVi: "Thiết kế & Trải nghiệm", labelEn: "Design & Product Experience" },
  { id: "d-growth", labelVi: "Tiếp thị & Tăng trưởng", labelEn: "Marketing & Growth" },
];

export default function ManualAddMemberModal({
  isOpen,
  workspaceId,
  workspaceName,
  allMembers = [],
  currentWorkspaceMemberUserIds = new Set(),
  prefill,
  onClose,
  onMemberAdded,
  triggerToast,
  onAddSyncLog,
}: ManualAddMemberModalProps) {
  const { isVietnamese } = useTranslation();
  const [activeTab, setActiveTab] = useState<"direct" | "existing">("direct");

  // Direct manual fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "owner">>("member");
  const [department, setDepartment] = useState("d-eng");

  // Existing user selection
  const [searchExisting, setSearchExisting] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [existingRole, setExistingRole] = useState<Exclude<WorkspaceRole, "owner">>("member");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toast = (type: "success" | "error" | "info" | "warning", title: string, message: string) => {
    triggerToast?.(type, title, message);
  };

  // Prefill when provided
  useEffect(() => {
    if (prefill) {
      setName(prefill.name || "");
      setEmail(prefill.email || "");
      setPhone(prefill.phone || "");
      if (prefill.role && ["admin", "member", "guest"].includes(prefill.role)) {
        setRole(prefill.role as any);
      }
      setActiveTab("direct");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("member");
      setDepartment("d-eng");
    }
    setErrorMsg("");
  }, [prefill, isOpen]);

  // Filter existing users who are NOT yet members of this workspace
  const availableExistingUsers = useMemo(() => {
    return allMembers.filter(m => {
      if (!m.userId) return false;
      if (currentWorkspaceMemberUserIds.has(m.userId)) return false;
      const query = searchExisting.toLowerCase().trim();
      if (!query) return true;
      return (
        m.name.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.phone && m.phone.toLowerCase().includes(query))
      );
    });
  }, [allMembers, currentWorkspaceMemberUserIds, searchExisting]);

  // Handle direct manual add via RPC
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg(isVietnamese ? "Vui lòng nhập họ và tên." : "Please enter full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMsg(isVietnamese ? "Vui lòng nhập địa chỉ email hợp lệ." : "Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("add_workspace_member_manual", {
        p_workspace_id: workspaceId,
        p_email: email.trim().toLowerCase(),
        p_name: name.trim(),
        p_role: role,
        p_department: department,
        p_phone: phone.trim() || null,
      });

      if (error) throw error;

      toast("success", isVietnamese ? "Đã thêm thành viên" : "Member Added", `${name.trim()} (${email.trim()}) ${isVietnamese ? "đã được thêm vào workspace." : "is now an active member."}`);
      onAddSyncLog?.(`Added workspace member directly: ${name.trim()} (${email.trim()})`);
      await onMemberAdded();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : (isVietnamese ? "Không thể thêm thành viên." : "Failed to add member."));
    } finally {
      setSaving(false);
    }
  };

  // Handle adding from existing users list
  const handleAddExistingUser = async (user: MemberUser) => {
    if (!user.userId) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.from("workspace_memberships").insert({
        workspace_id: workspaceId,
        user_id: user.userId,
        role: existingRole,
        status: "active",
      });

      if (error) throw error;

      // Update members table workspace_ids array
      await supabase
        .from("members")
        .update({
          workspace_ids: Array.from(new Set([...(user.workspaceIds || []), workspaceId])),
        })
        .eq("user_id", user.userId);

      toast("success", isVietnamese ? "Đã thêm thành viên" : "Member Added", `${user.name} ${isVietnamese ? "đã tham gia không gian này." : "has joined this workspace."}`);
      onAddSyncLog?.(`Added existing user to workspace: ${user.name}`);
      await onMemberAdded();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : (isVietnamese ? "Không thể thêm thành viên." : "Failed to add member."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="manual-add-member-wrapper"
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
              key="manual-add-member-card"
              initial={{ scale: 0.94, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-[min(95vw,520px)] max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 z-10 select-none custom-scrollbar text-left"
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
          <div className="mb-4 pr-8">
            <h3 className="text-lg font-black text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <span>{isVietnamese ? "Thêm thành viên thủ công" : "Add Member Manually"}</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              {isVietnamese
                ? `Thêm trực tiếp thành viên vào ${workspaceName} mà không cần đợi xác nhận email.`
                : `Instantly grant workspace access to a member without waiting for invite confirmation.`}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("direct");
                setErrorMsg("");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === "direct"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              {isVietnamese ? "Nhập thông tin trực tiếp" : "Direct Profile Entry"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("existing");
                setErrorMsg("");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === "existing"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <span>{isVietnamese ? "Từ người dùng có sẵn" : "From Existing Users"}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[10px] font-black">
                {availableExistingUsers.length}
              </span>
            </button>
          </div>

          {/* TAB 1: DIRECT FORM */}
          {activeTab === "direct" && (
            <form onSubmit={handleDirectSubmit} className="space-y-4">
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
                  placeholder={isVietnamese ? "Ví dụ: Nguyễn Văn An" : "e.g. John Doe"}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Email *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="member@company.com"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isVietnamese ? "Vai trò trong workspace" : "Workspace Role"}</span>
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none cursor-pointer"
                  >
                    <option value="member">{isVietnamese ? "Thành viên (Member)" : "Member"}</option>
                    <option value="admin">{isVietnamese ? "Quản trị viên (Admin)" : "Admin"}</option>
                    <option value="guest">{isVietnamese ? "Khách (Guest)" : "Guest"}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isVietnamese ? "Phòng ban" : "Department"}</span>
                  </label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {isVietnamese ? dept.labelVi : dept.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isVietnamese ? "Số điện thoại (tùy chọn)" : "Phone Number (Optional)"}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                />
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Note */}
              <p className="text-[10px] text-slate-400 leading-relaxed bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-2.5 rounded-xl">
                {isVietnamese
                  ? "Thành viên sẽ được cấp quyền truy cập ngay. Nếu tài khoản đã tồn tại, họ có thể đăng nhập bằng email này để thấy ngay workspace."
                  : "The member will immediately receive active membership and access upon logging in with this email."}
              </p>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2.5 items-center border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isVietnamese ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>{isVietnamese ? "Thêm vào workspace" : "Add to Workspace"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SELECT FROM EXISTING REGISTERED USERS */}
          {activeTab === "existing" && (
            <div className="space-y-4">
              {/* Role selector for the added user */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isVietnamese ? "Gán vai trò khi thêm:" : "Assign role on join:"}
                </span>
                <select
                  value={existingRole}
                  onChange={e => setExistingRole(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchExisting}
                  onChange={e => setSearchExisting(e.target.value)}
                  placeholder={isVietnamese ? "Tìm theo tên hoặc email người dùng..." : "Search users by name or email..."}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Users list */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {availableExistingUsers.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 italic">
                    {allMembers.length === 0
                      ? (isVietnamese ? "Chưa có người dùng nào khác trong hệ thống." : "No other users registered in the system.")
                      : (isVietnamese ? "Mọi người dùng đã thuộc không gian làm việc này." : "All users are already in this workspace.")}
                  </p>
                ) : (
                  availableExistingUsers.map(user => {
                    const initials = user.name
                      .split(" ")
                      .filter(Boolean)
                      .map(p => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {user.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleAddExistingUser(user)}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>{isVietnamese ? "Thêm" : "Add"}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Close action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isVietnamese ? "Đóng" : "Close"}
                </button>
              </div>
            </div>
          )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
