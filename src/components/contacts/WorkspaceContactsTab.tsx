"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, UserPlus, Phone, Mail, Building2, Briefcase,
  MapPin, Plus, Search, Filter, SlidersHorizontal, Trash2,
  Edit2, ExternalLink, Copy, Check, UserCheck, Sparkles,
  LayoutGrid, List, AlertCircle, Loader2
} from "lucide-react";
import { WorkspaceContact, ContactCategory } from "@/types";
import { useTranslation } from "@/contexts/TranslationContext";
import { getCleanChannel, supabase } from "@/lib/supabaseClient";
import ContactFormModal from "./ContactFormModal";
import ConfirmModal from "@/components/ConfirmModal";

interface WorkspaceContactsTabProps {
  workspaceId: string;
  currentWorkspaceName: string;
  canAdminister: boolean;
  onPromoteToMember?: (contact: WorkspaceContact) => void;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

const CATEGORY_META: Record<ContactCategory, { labelVi: string; labelEn: string; color: string; border: string }> = {
  client: { labelVi: "Khách hàng", labelEn: "Client", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  partner: { labelVi: "Đối tác", labelEn: "Partner", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  vendor: { labelVi: "Nhà cung cấp", labelEn: "Vendor", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  contractor: { labelVi: "Cộng tác viên", labelEn: "Contractor", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  other: { labelVi: "Khác", labelEn: "Other", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400", border: "border-slate-500/20" },
};

export default function WorkspaceContactsTab({
  workspaceId,
  currentWorkspaceName,
  canAdminister,
  onPromoteToMember,
  onAddSyncLog,
  triggerToast,
}: WorkspaceContactsTabProps) {
  const { isVietnamese } = useTranslation();
  const [contacts, setContacts] = useState<WorkspaceContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ContactCategory>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<WorkspaceContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<WorkspaceContact | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toast = useCallback((type: "success" | "error" | "info" | "warning", title: string, message: string) => {
    triggerToast?.(type, title, message);
  }, [triggerToast]);

  const fetchContacts = useCallback(async (showLoader = false) => {
    if (!workspaceId) return;
    if (showLoader) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspace_contacts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts((data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        jobTitle: row.job_title,
        category: row.category as ContactCategory,
        status: row.status,
        avatarUrl: row.avatar_url,
        notes: row.notes,
        address: row.address,
        tags: row.tags,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })));
    } catch (err) {
      console.error("Error fetching contacts:", err);
      toast("error", "Lỗi tải danh bạ", err instanceof Error ? err.message : "Không thể tải danh bạ liên hệ.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    fetchContacts(true);
  }, [fetchContacts]);

  // Realtime subscription for workspace_contacts
  useEffect(() => {
    if (!workspaceId) return;
    const channel = getCleanChannel(`contacts:${workspaceId}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "workspace_contacts", filter: `workspace_id=eq.${workspaceId}` },
      () => {
        fetchContacts(false);
      }
    );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchContacts, workspaceId]);

  // Save Contact
  const handleSaveContact = async (
    data: Omit<WorkspaceContact, "id" | "createdAt" | "updatedAt">,
    id?: string
  ) => {
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      if (id) {
        const { error } = await supabase
          .from("workspace_contacts")
          .update({
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            company: data.company || null,
            job_title: data.jobTitle || null,
            category: data.category,
            address: data.address || null,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("workspace_id", workspaceId);

        if (error) throw error;
        toast("success", "Đã cập nhật", `Thông tin liên hệ ${data.name} đã được cập nhật.`);
        onAddSyncLog?.(`Updated contact: ${data.name}`);
      } else {
        const { error } = await supabase
          .from("workspace_contacts")
          .insert({
            workspace_id: workspaceId,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            company: data.company || null,
            job_title: data.jobTitle || null,
            category: data.category,
            address: data.address || null,
            notes: data.notes || null,
            created_by: currentUserId || null,
          });

        if (error) throw error;
        toast("success", "Đã thêm liên hệ", `Liên hệ ${data.name} đã được lưu vào workspace.`);
        onAddSyncLog?.(`Added contact: ${data.name}`);
      }
      await fetchContacts(false);
    } finally {
      setSaving(false);
    }
  };

  // Delete Contact
  const handleDeleteContact = async () => {
    const contact = contactToDelete;
    if (!contact) return;
    setContactToDelete(null);
    try {
      const { error } = await supabase
        .from("workspace_contacts")
        .delete()
        .eq("id", contact.id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      toast("success", "Đã xóa liên hệ", `${contact.name} đã được xóa khỏi danh bạ.`);
      onAddSyncLog?.(`Deleted contact: ${contact.name}`);
      await fetchContacts(false);
    } catch (err) {
      toast("error", "Không thể xóa", err instanceof Error ? err.message : "Vui lòng thử lại.");
    }
  };

  // Copy quick info
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast("info", "Đã sao chép", text);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = contacts.length;
    const clients = contacts.filter(c => c.category === "client").length;
    const partners = contacts.filter(c => c.category === "partner").length;
    const vendors = contacts.filter(c => c.category === "vendor" || c.category === "contractor").length;
    return { total, clients, partners, vendors };
  }, [contacts]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.jobTitle && c.jobTitle.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [contacts, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header & KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isVietnamese ? "Tổng liên hệ" : "Total Contacts"}
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {metrics.total}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            {isVietnamese ? "Đối tác & Khách hàng" : "Partners & Clients"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isVietnamese ? "Khách hàng" : "Clients"}
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {metrics.clients}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            {isVietnamese ? "Tệp khách hàng tiềm năng" : "Active Client Accounts"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {isVietnamese ? "Đối tác" : "Partners"}
          </p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {metrics.partners}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            {isVietnamese ? "Hợp tác kinh doanh" : "Strategic Partners"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {isVietnamese ? "Nhà cung cấp & CTV" : "Vendors & Contractors"}
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {metrics.vendors}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            {isVietnamese ? "Nguồn lực dịch vụ ngoài" : "Outsourced Resources"}
          </p>
        </div>
      </div>

      {/* 2. Control Bar: Search, Category Filters, View Mode & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[280px] w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isVietnamese ? "Tìm theo tên, email, công ty, SĐT..." : "Search name, email, company, phone..."}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-400 hover:text-slate-600"
              }`}
              title={isVietnamese ? "Dạng lưới thẻ" : "Grid view"}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-400 hover:text-slate-600"
              }`}
              title={isVietnamese ? "Dạng bảng danh sách" : "Table view"}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add Contact Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isVietnamese ? "Thêm liên hệ mới" : "Add Contact"}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            categoryFilter === "all"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          {isVietnamese ? "Tất cả" : "All"} ({contacts.length})
        </button>
        {(["client", "partner", "vendor", "contractor", "other"] as ContactCategory[]).map(cat => {
          const count = contacts.filter(c => c.category === cat).length;
          const meta = CATEGORY_META[cat];
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? `${meta.color} ${meta.border} font-black shadow-xs`
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              <span>{isVietnamese ? meta.labelVi : meta.labelEn}</span>
              <span className="ml-1.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Contacts List / Table */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <p className="text-xs font-bold">{isVietnamese ? "Đang tải danh bạ liên hệ…" : "Loading contacts…"}</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100">
              {contacts.length === 0
                ? (isVietnamese ? "Chưa có liên hệ nào trong danh bạ" : "No contacts in this workspace")
                : (isVietnamese ? "Không tìm thấy liên hệ phù hợp" : "No matching contacts found")}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {contacts.length === 0
                ? (isVietnamese ? "Bắt đầu lưu trữ khách hàng, đối tác hoặc nhà cung cấp để dễ dàng cộng tác và mời vào workspace." : "Store external partners, clients or suppliers for quick contact and workspace collaboration.")
                : (isVietnamese ? "Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc phân loại." : "Try adjusting your search keyword or clearing the category filter.")}
            </p>
          </div>
          {contacts.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isVietnamese ? "Thêm liên hệ đầu tiên" : "Add First Contact"}</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => {
            const meta = CATEGORY_META[contact.category] || CATEGORY_META.other;
            const initials = contact.name
              .split(" ")
              .filter(Boolean)
              .map(p => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={contact.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group text-left"
              >
                {/* Top: Avatar & Meta */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs uppercase">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                          {contact.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium mt-0.5">
                          {contact.jobTitle ? `${contact.jobTitle}` : ""}
                          {contact.jobTitle && contact.company ? " · " : ""}
                          {contact.company || (isVietnamese ? "Liên hệ ngoài" : "External Contact")}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 ${meta.color} ${meta.border}`}>
                      {isVietnamese ? meta.labelVi : meta.labelEn}
                    </span>
                  </div>

                  {/* Contact Info List */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    {contact.email && (
                      <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1.5 truncate hover:text-indigo-600 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-[11px] font-medium">{contact.email}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(contact.email!, `email-${contact.id}`)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={isVietnamese ? "Sao chép email" : "Copy email"}
                        >
                          {copiedId === `email-${contact.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {contact.phone && (
                      <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1.5 truncate hover:text-indigo-600 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-[11px] font-medium">{contact.phone}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(contact.phone!, `phone-${contact.id}`)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={isVietnamese ? "Sao chép số điện thoại" : "Copy phone"}
                        >
                          {copiedId === `phone-${contact.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {contact.address && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] truncate pt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{contact.address}</span>
                      </div>
                    )}

                    {contact.notes && (
                      <p className="text-[10.5px] text-slate-400 dark:text-slate-500 line-clamp-2 italic pt-1 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-xl">
                        "{contact.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {onPromoteToMember && (
                    <button
                      type="button"
                      onClick={() => onPromoteToMember(contact)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10.5px] font-bold transition-colors cursor-pointer"
                      title={isVietnamese ? "Mời hoặc thêm vào thành viên workspace" : "Promote to Workspace Member"}
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>{isVietnamese ? "Vào Workspace" : "To Member"}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(contact);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={isVietnamese ? "Chỉnh sửa" : "Edit"}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {canAdminister && (
                      <button
                        type="button"
                        onClick={() => setContactToDelete(contact)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        title={isVietnamese ? "Xóa liên hệ" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-4">{isVietnamese ? "Họ tên & Chức vụ" : "Contact"}</th>
                <th className="py-3 px-4">{isVietnamese ? "Phân loại" : "Category"}</th>
                <th className="py-3 px-4">{isVietnamese ? "Công ty / Tổ chức" : "Company"}</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">{isVietnamese ? "Điện thoại" : "Phone"}</th>
                <th className="py-3 px-4 text-right">{isVietnamese ? "Thao tác" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContacts.map(contact => {
                const meta = CATEGORY_META[contact.category] || CATEGORY_META.other;
                return (
                  <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-850 dark:text-slate-100">{contact.name}</div>
                      {contact.jobTitle && <div className="text-[10px] text-slate-400 font-medium">{contact.jobTitle}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${meta.color} ${meta.border}`}>
                        {isVietnamese ? meta.labelVi : meta.labelEn}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {contact.company || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                          {contact.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="text-slate-700 dark:text-slate-300 hover:underline font-mono text-[11px]">
                          {contact.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onPromoteToMember && (
                          <button
                            type="button"
                            onClick={() => onPromoteToMember(contact)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title={isVietnamese ? "Mời vào workspace" : "Add to workspace"}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContact(contact);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {canAdminister && (
                          <button
                            type="button"
                            onClick={() => setContactToDelete(contact)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal for Creating & Editing Contacts */}
      <ContactFormModal
        isOpen={isFormModalOpen}
        contact={editingContact}
        workspaceId={workspaceId}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
        saving={saving}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!contactToDelete}
        title={isVietnamese ? "Xóa liên hệ khỏi danh bạ?" : "Delete Contact?"}
        description={isVietnamese ? "Liên hệ này sẽ bị xóa khỏi danh bạ của workspace. Thao tác này không thể hoàn tác." : "This contact will be permanently deleted from the workspace directory."}
        itemName={contactToDelete?.name}
        itemType="generic"
        confirmText={isVietnamese ? "Xóa liên hệ" : "Delete Contact"}
        onConfirm={() => void handleDeleteContact()}
        onCancel={() => setContactToDelete(null)}
      />
    </div>
  );
}
