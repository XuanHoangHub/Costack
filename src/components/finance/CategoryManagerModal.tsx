"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Layers,
  ListPlus,
  LoaderCircle,
  Palette,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { supabase } from "@/lib/supabaseClient";

export interface FinanceCategory {
  id: string;
  workspaceId: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string;
  icon: string;
  description: string;
  sortOrder: number;
}

interface CategoryManagerModalProps {
  workspaceId: string;
  categories: FinanceCategory[];
  onRefresh: () => Promise<void>;
  onClose: () => void;
  triggerToast?: (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
}

const PRESET_BUNDLES = [
  {
    id: "business",
    name: "Doanh nghiệp & Công ty",
    description: "Bộ danh mục chuẩn cho vận hành doanh nghiệp, startup và công ty dịch vụ.",
    items: [
      { name: "Lương & Thưởng nhân sự", type: "expense" as const, color: "#f43f5e" },
      { name: "Thuê văn phòng & Mặt bằng", type: "expense" as const, color: "#e11d48" },
      { name: "Điện nước & Viễn thông", type: "expense" as const, color: "#f97316" },
      { name: "Tiếp thị & Quảng cáo", type: "expense" as const, color: "#ec4899" },
      { name: "Phần mềm & SaaS", type: "expense" as const, color: "#8b5cf6" },
      { name: "Thiết bị & Công nghệ", type: "expense" as const, color: "#6366f1" },
      { name: "Tiếp khách & Ngoại giao", type: "expense" as const, color: "#06b6d4" },
      { name: "Công tác phí & Đi lại", type: "expense" as const, color: "#0ea5e9" },
      { name: "Văn phòng phẩm & Vật tư", type: "expense" as const, color: "#14b8a6" },
      { name: "Thuế & Phí ngân hàng", type: "expense" as const, color: "#64748b" },
      { name: "Doanh thu Hợp đồng & Dự án", type: "income" as const, color: "#10b981" },
      { name: "Doanh thu Dịch vụ tư vấn", type: "income" as const, color: "#059669" },
      { name: "Doanh thu Bán hàng", type: "income" as const, color: "#34d399" },
      { name: "Doanh thu Tài chính & Lãi", type: "income" as const, color: "#10b981" },
    ],
  },
  {
    id: "personal",
    name: "Cá nhân & Freelancer",
    description: "Theo dõi thu nhập tự do và quản lý chi tiêu sinh hoạt hàng ngày.",
    items: [
      { name: "Ăn uống & Cà phê", type: "expense" as const, color: "#f59e0b" },
      { name: "Tiền thuê nhà & Chỗ ở", type: "expense" as const, color: "#ef4444" },
      { name: "Đi lại & Xăng xe", type: "expense" as const, color: "#3b82f6" },
      { name: "Mua sắm & Tiêu dùng", type: "expense" as const, color: "#ec4899" },
      { name: "Điện thoại & Internet", type: "expense" as const, color: "#8b5cf6" },
      { name: "Học tập & Phát triển", type: "expense" as const, color: "#10b981" },
      { name: "Y tế & Bảo hiểm", type: "expense" as const, color: "#06b6d4" },
      { name: "Giải trí & Du lịch", type: "expense" as const, color: "#f97316" },
      { name: "Lương công việc chính", type: "income" as const, color: "#10b981" },
      { name: "Thu nhập Freelance / Dự án", type: "income" as const, color: "#059669" },
      { name: "Lợi nhuận đầu tư", type: "income" as const, color: "#34d399" },
      { name: "Thưởng & Quà tặng", type: "income" as const, color: "#10b981" },
    ],
  },
  {
    id: "retail",
    name: "Bán lẻ & Thương mại",
    description: "Tối ưu cho cửa hàng, shop online và nhà bán hàng thương mại điện tử.",
    items: [
      { name: "Giá vốn & Nhập hàng hóa", type: "expense" as const, color: "#ef4444" },
      { name: "Vận chuyển & Giao nhận", type: "expense" as const, color: "#f97316" },
      { name: "Đóng gói & Bao bì", type: "expense" as const, color: "#eab308" },
      { name: "Phí sàn & Quảng cáo Online", type: "expense" as const, color: "#ec4899" },
      { name: "Mặt bằng & Kho bãi", type: "expense" as const, color: "#8b5cf6" },
      { name: "Doanh thu Bán lẻ Trực tiếp", type: "income" as const, color: "#10b981" },
      { name: "Doanh thu Bán Online (Shopee/TikTok)", type: "income" as const, color: "#059669" },
      { name: "Doanh thu Bán sỉ & Đại lý", type: "income" as const, color: "#34d399" },
    ],
  },
];

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#64748b", // Slate
  "#84cc16", // Lime
];

export function CategoryManagerModal({
  workspaceId,
  categories,
  onRefresh,
  onClose,
  triggerToast,
}: CategoryManagerModalProps) {
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"list" | "single" | "bulk" | "presets">("list");
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single Category State
  const [singleForm, setSingleForm] = useState<{
    id?: string;
    name: string;
    type: "income" | "expense" | "both";
    color: string;
    description: string;
  }>({
    name: "",
    type: "expense",
    color: "#6366f1",
    description: "",
  });

  // Bulk Category State
  const [bulkInput, setBulkInput] = useState("");
  const [bulkType, setBulkType] = useState<"expense" | "income" | "both">("expense");

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (filterType !== "all") {
        if (c.type !== "both" && c.type !== filterType) return false;
      }
      if (q && !c.name.toLowerCase().includes(q) && !c.description?.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [categories, filterType, search]);

  const expenseCount = useMemo(() => categories.filter((c) => c.type === "expense" || c.type === "both").length, [categories]);
  const incomeCount = useMemo(() => categories.filter((c) => c.type === "income" || c.type === "both").length, [categories]);

  // Open Edit Mode
  const handleEdit = (category: FinanceCategory) => {
    setSingleForm({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color || "#6366f1",
      description: category.description || "",
    });
    setMode("single");
  };

  // Save Single Category
  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = singleForm.name.trim();
    if (!name) {
      triggerToast?.("error", "Thiếu tên danh mục", "Vui lòng nhập tên danh mục.");
      return;
    }

    setSaving(true);
    try {
      if (singleForm.id) {
        // Update
        const { error } = await supabase
          .from("finance_categories")
          .update({
            name,
            type: singleForm.type,
            color: singleForm.color,
            description: singleForm.description.trim(),
          })
          .eq("id", singleForm.id)
          .eq("workspace_id", workspaceId);

        if (error) throw error;
        triggerToast?.("success", "Đã cập nhật", `Danh mục "${name}" đã được cập nhật.`);
      } else {
        // Insert
        const { error } = await supabase.from("finance_categories").insert({
          workspace_id: workspaceId,
          name,
          type: singleForm.type,
          color: singleForm.color,
          description: singleForm.description.trim(),
        });

        if (error) throw error;
        triggerToast?.("success", "Đã thêm danh mục", `Danh mục "${name}" đã được thêm.`);
      }

      await onRefresh();
      setSingleForm({ name: "", type: "expense", color: "#6366f1", description: "" });
      setMode("list");
    } catch (err: any) {
      triggerToast?.("error", "Lỗi lưu danh mục", err?.message || "Không thể lưu danh mục.");
    } finally {
      setSaving(false);
    }
  };

  // Save Bulk Categories
  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkInput
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      triggerToast?.("error", "Danh sách trống", "Vui lòng nhập ít nhất một tên danh mục.");
      return;
    }

    setSaving(true);
    try {
      const existingNames = new Set(categories.map((c) => `${c.name.toLowerCase()}_${c.type}`));
      const toInsert: Array<{
        workspace_id: string;
        name: string;
        type: string;
        color: string;
        description: string;
      }> = [];

      lines.forEach((name, idx) => {
        const key = `${name.toLowerCase()}_${bulkType}`;
        if (!existingNames.has(key)) {
          existingNames.add(key);
          toInsert.push({
            workspace_id: workspaceId,
            name,
            type: bulkType,
            color: PRESET_COLORS[idx % PRESET_COLORS.length],
            description: "",
          });
        }
      });

      if (!toInsert.length) {
        triggerToast?.("info", "Không có mục mới", "Tất cả danh mục bạn nhập đã tồn tại.");
        setMode("list");
        return;
      }

      const { error } = await supabase.from("finance_categories").insert(toInsert);
      if (error) throw error;

      triggerToast?.("success", "Đã thêm hàng loạt", `Đã thêm thành công ${toInsert.length} danh mục.`);
      await onRefresh();
      setBulkInput("");
      setMode("list");
    } catch (err: any) {
      triggerToast?.("error", "Lỗi tạo hàng loạt", err?.message || "Không thể thêm danh mục.");
    } finally {
      setSaving(false);
    }
  };

  // Apply Preset Bundle
  const handleApplyPreset = async (presetId: string) => {
    const preset = PRESET_BUNDLES.find((b) => b.id === presetId);
    if (!preset) return;

    setSaving(true);
    try {
      const existingNames = new Set(categories.map((c) => `${c.name.toLowerCase()}_${c.type}`));
      const toInsert = preset.items
        .filter((item) => !existingNames.has(`${item.name.toLowerCase()}_${item.type}`))
        .map((item) => ({
          workspace_id: workspaceId,
          name: item.name,
          type: item.type,
          color: item.color,
          description: "",
        }));

      if (!toInsert.length) {
        triggerToast?.("info", "Đã có đủ danh mục", `Gói "${preset.name}" đã tồn tại đầy đủ trong workspace.`);
        setMode("list");
        return;
      }

      const { error } = await supabase.from("finance_categories").insert(toInsert);
      if (error) throw error;

      triggerToast?.("success", "Đã nạp gói danh mục", `Đã thêm ${toInsert.length} danh mục từ gói "${preset.name}".`);
      await onRefresh();
      setMode("list");
    } catch (err: any) {
      triggerToast?.("error", "Lỗi nạp mẫu", err?.message || "Không thể nạp gói danh mục.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Single Category
  const handleDelete = async (category: FinanceCategory) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("finance_categories")
        .delete()
        .eq("id", category.id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      triggerToast?.("success", "Đã xóa", `Đã xóa danh mục "${category.name}".`);
      await onRefresh();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(category.id);
        return next;
      });
    } catch (err: any) {
      triggerToast?.("error", "Không thể xóa", err?.message || "Lỗi khi xóa danh mục.");
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.size} danh mục đã chọn?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("finance_categories")
        .delete()
        .in("id", Array.from(selectedIds))
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      triggerToast?.("success", "Đã xóa hàng loạt", `Đã xóa ${selectedIds.size} danh mục.`);
      setSelectedIds(new Set());
      await onRefresh();
    } catch (err: any) {
      triggerToast?.("error", "Không thể xóa hàng loạt", err?.message || "Lỗi khi xóa.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCategories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCategories.map((c) => c.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation tabs for modes */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cu-border)] pb-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--cu-surface-2)] p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setSingleForm({ name: "", type: "expense", color: "#6366f1", description: "" });
            }}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              mode === "list"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
            }`}
          >
            Danh sách ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSingleForm({ name: "", type: "expense", color: "#6366f1", description: "" });
              setMode("single");
            }}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold transition ${
              mode === "single"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {singleForm.id ? "Sửa danh mục" : "Tạo đơn lẻ"}
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold transition ${
              mode === "bulk"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
            }`}
          >
            <ListPlus className="h-3.5 w-3.5" />
            Tạo hàng loạt
          </button>
          <button
            type="button"
            onClick={() => setMode("presets")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold transition ${
              mode === "presets"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gói mẫu sẵn
          </button>
        </div>

        {mode === "list" && selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="danger"
            onClick={handleBulkDelete}
            disabled={saving}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Xóa ({selectedIds.size}) mục
          </Button>
        )}
      </div>

      {/* 1. VIEW: LIST OF CATEGORIES */}
      {mode === "list" && (
        <div className="space-y-3">
          {/* Sub-filter: All / Expense / Income */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  filterType === "all"
                    ? "bg-[var(--cu-surface-3)] text-[var(--cu-text-primary)] ring-1 ring-[var(--cu-border-strong)]"
                    : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                }`}
              >
                Tất cả ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("expense")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                  filterType === "expense"
                    ? "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/30 font-black"
                    : "text-[var(--cu-text-tertiary)] hover:text-rose-500"
                }`}
              >
                <ArrowUpRight className="h-3 w-3" />
                Khoản chi ({expenseCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("income")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                  filterType === "income"
                    ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30 font-black"
                    : "text-[var(--cu-text-tertiary)] hover:text-emerald-500"
                }`}
              >
                <ArrowDownRight className="h-3 w-3" />
                Khoản thu ({incomeCount})
              </button>
            </div>

            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cu-text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm danh mục..."
                className="h-8.5 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] pl-9 pr-3 text-xs text-[var(--cu-text-primary)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* Table / List */}
          <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)]">
            {filteredCategories.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-[var(--cu-border)] bg-[var(--cu-surface-2)]/90 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                    <th className="w-8 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={filteredCategories.length > 0 && selectedIds.size === filteredCategories.length}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 rounded border-[var(--cu-border)] text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-2.5">Tên danh mục</th>
                    <th className="px-3 py-2.5">Loại</th>
                    <th className="px-3 py-2.5">Màu sắc</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cu-border)]">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedIds.has(cat.id);
                    return (
                      <tr key={cat.id} className={`transition hover:bg-[var(--cu-surface-2)]/40 ${isSelected ? "bg-indigo-500/[0.04]" : ""}`}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(cat.id)}
                            className="h-3.5 w-3.5 rounded border-[var(--cu-border)] text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-bold text-[var(--cu-text-primary)]">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color || "#6366f1" }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          {cat.description && (
                            <p className="text-[10px] text-[var(--cu-text-tertiary)]">{cat.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={
                              cat.type === "expense"
                                ? "danger"
                                : cat.type === "income"
                                ? "success"
                                : "info"
                            }
                          >
                            {cat.type === "expense"
                              ? "Chi phí"
                              : cat.type === "income"
                              ? "Khoản thu"
                              : "Thu & Chi"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--cu-text-tertiary)]">
                            <span
                              className="h-3.5 w-3.5 rounded border border-[var(--cu-border)]"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-mono text-[10px]">{cat.color}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(cat)}
                              className="rounded-lg p-1.5 text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)] hover:text-indigo-500"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat)}
                              className="rounded-lg p-1.5 text-[var(--cu-text-tertiary)] hover:bg-rose-500/10 hover:text-rose-500"
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Tag className="h-8 w-8 text-[var(--cu-text-tertiary)] opacity-60" />
                <p className="mt-2 text-xs font-bold text-[var(--cu-text-primary)]">
                  {search ? "Không tìm thấy danh mục phù hợp" : "Chưa có danh mục nào"}
                </p>
                <p className="mt-1 max-w-xs text-[11px] text-[var(--cu-text-tertiary)]">
                  Bắt đầu tạo danh mục mới, thêm hàng loạt hoặc nạp gói mẫu có sẵn.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => setMode("bulk")} leftIcon={<ListPlus className="h-3.5 w-3.5" />}>
                    Tạo hàng loạt
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setMode("presets")} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                    Nạp gói mẫu
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. VIEW: CREATE / EDIT SINGLE CATEGORY */}
      {mode === "single" && (
        <form onSubmit={handleSaveSingle} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={singleForm.name}
              onChange={(e) => setSingleForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ví dụ: Ăn uống, Thuê văn phòng, Lương nhân viên..."
              className="h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-sm font-medium text-[var(--cu-text-primary)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                Loại giao dịch
              </label>
              <Select
                className="w-full"
                ariaLabel="Loại danh mục"
                value={singleForm.type}
                onChange={(v) => setSingleForm((f) => ({ ...f, type: v as typeof singleForm.type }))}
                options={[
                  { value: "expense", label: "Khoản chi (Chi phí)" },
                  { value: "income", label: "Khoản thu (Doanh thu)" },
                  { value: "both", label: "Dùng cho cả Thu & Chi" },
                ]}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
                Màu sắc nhận diện
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={singleForm.color}
                  onChange={(e) => setSingleForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-12 cursor-pointer rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-1"
                />
                <div className="flex flex-1 flex-wrap gap-1">
                  {PRESET_COLORS.slice(0, 7).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSingleForm((f) => ({ ...f, color }))}
                      className={`h-6 w-6 rounded-lg transition ${
                        singleForm.color === color ? "scale-110 ring-2 ring-indigo-500 ring-offset-2" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
              Mô tả chi tiết (Tùy chọn)
            </label>
            <input
              type="text"
              value={singleForm.description}
              onChange={(e) => setSingleForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ghi chú về nhóm chi tiêu hoặc quy định sử dụng..."
              className="h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-xs text-[var(--cu-text-primary)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--cu-border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMode("list");
                setSingleForm({ name: "", type: "expense", color: "#6366f1", description: "" });
              }}
            >
              Hủy
            </Button>
            <Button type="submit" loading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              {singleForm.id ? "Lưu thay đổi" : "Thêm danh mục"}
            </Button>
          </div>
        </form>
      )}

      {/* 3. VIEW: BULK CREATE (TẠO HÀNG LOẠT) */}
      {mode === "bulk" && (
        <form onSubmit={handleSaveBulk} className="space-y-4">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-3.5 text-xs text-[var(--cu-text-secondary)]">
            <p className="font-bold text-indigo-500">💡 Hướng dẫn tạo hàng loạt:</p>
            <p className="mt-1 text-[11px] leading-5">
              Nhập danh sách các danh mục bạn muốn tạo, mỗi dòng một tên hoặc phân cách bằng dấu phẩy (<code>,</code>). Hệ thống sẽ tự động gán màu sắc và bỏ qua những tên đã trùng lặp.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
              Áp dụng cho loại
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBulkType("expense")}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition ${
                  bulkType === "expense"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "border border-[var(--cu-border)] text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)]"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Khoản chi
              </button>
              <button
                type="button"
                onClick={() => setBulkType("income")}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition ${
                  bulkType === "income"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "border border-[var(--cu-border)] text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)]"
                }`}
              >
                <ArrowDownRight className="h-3.5 w-3.5" />
                Khoản thu
              </button>
              <button
                type="button"
                onClick={() => setBulkType("both")}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition ${
                  bulkType === "both"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "border border-[var(--cu-border)] text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)]"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Cả hai
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">
              Danh sách danh mục (Mỗi dòng một mục) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              autoFocus
              rows={6}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`Ví dụ:\nLương nhân viên\nTiền thuê văn phòng\nĐiện nước internet\nQuảng cáo Facebook & Google\nThiết bị IT máy tính\nTiếp khách & Cơm trưa`}
              className="w-full rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-3 text-xs leading-6 text-[var(--cu-text-primary)] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="flex items-center justify-between border-t border-[var(--cu-border)] pt-4">
            <span className="text-[11px] text-[var(--cu-text-tertiary)]">
              Ước tính: <strong>{bulkInput.split(/[\n,;]+/).filter((s) => s.trim()).length}</strong> danh mục
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setMode("list")}>
                Quay lại
              </Button>
              <Button type="submit" loading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                Thêm toàn bộ
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 4. VIEW: PRESET INDUSTRY TEMPLATES (MẪU CÓ SẴN) */}
      {mode === "presets" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--cu-text-tertiary)]">
            Chọn gói danh mục phù hợp với mô hình của bạn để tự động nhập đầy đủ danh mục Thu & Chi chỉ với 1 click:
          </p>

          <div className="grid gap-3 sm:grid-cols-1">
            {PRESET_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-4 transition hover:border-indigo-500/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[var(--cu-text-primary)]">{bundle.name}</h3>
                    <Badge variant="info">{bundle.items.length} danh mục</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--cu-text-tertiary)]">{bundle.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {bundle.items.map((item) => (
                      <span
                        key={item.name}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          item.type === "expense"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end border-t border-[var(--cu-border)] pt-3">
                  <Button
                    size="sm"
                    loading={saving}
                    onClick={() => handleApplyPreset(bundle.id)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Nạp gói này
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setMode("list")}>
              Quay lại danh sách
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryManagerModal;
