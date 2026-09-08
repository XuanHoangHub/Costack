"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BarChart2, BarChart3, Bot,
  Building2, Camera, Check, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Download,
  FileText, Landmark, Layers, LayoutDashboard, LoaderCircle, Pencil, PieChart as PieChartIcon, Plus,
  Receipt, ReceiptText, RefreshCw, RotateCcw, ScanLine, Search, Send, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, Tag, Target, Trash2, TrendingDown, TrendingUp, User, Users,
  Wallet, WalletCards, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { CategoryManagerModal, type FinanceCategory } from "@/components/finance/CategoryManagerModal";
import { ReceiptScannerModal } from "@/components/finance/ReceiptScannerModal";
import ConfirmModal from "@/components/ConfirmModal";
import { useTranslation } from "@/contexts/TranslationContext";
import { callAiApi } from "@/lib/aiClient";
import { getCleanChannel, supabase } from "@/lib/supabaseClient";

interface FinanceHubProps {
  activeWorkspaceId?: string;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export type FinanceTab = "overview" | "cashbook" | "invoices" | "debts" | "budgets" | "reports" | "ai-agent";
type ModalType = "profile" | "account" | "transaction" | "invoice" | "debt" | "budget" | "payment" | "categories" | "receipt-scan" | null;
type Currency = "VND" | "USD" | "EUR";
export type EntityType = "individual" | "organization" | "business";

export interface FinanceProfile {
  entityType: EntityType;
  displayName: string;
  currency: Currency;
  enabledTabs: FinanceTab[];
}

export const DEFAULT_TABS_BY_ENTITY: Record<EntityType, FinanceTab[]> = {
  individual: ["overview", "cashbook", "reports", "ai-agent"],
  organization: ["overview", "cashbook", "budgets", "debts", "reports", "ai-agent"],
  business: ["overview", "cashbook", "invoices", "debts", "budgets", "reports", "ai-agent"],
};

export const MODULE_METADATA: Array<{
  id: FinanceTab;
  label: string;
  shortDesc: string;
  icon: React.ElementType;
  tag?: string;
  badgeColor?: string;
  recommendedFor: EntityType[];
}> = [
  {
    id: "overview",
    label: "Tổng quan dòng tiền",
    shortDesc: "Chỉ số tài chính tức thời, dự báo dòng tiền và phân bổ số dư tài khoản",
    icon: LayoutDashboard,
    recommendedFor: ["individual", "organization", "business"],
  },
  {
    id: "cashbook",
    label: "Sổ thu chi & Quét AI",
    shortDesc: "Ghi chép thu chi hàng ngày, quét hóa đơn AI và quản lý danh mục",
    icon: CircleDollarSign,
    tag: "Cốt lõi",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    recommendedFor: ["individual", "organization", "business"],
  },
  {
    id: "invoices",
    label: "Hóa đơn & Thuế VAT",
    shortDesc: "Hóa đơn mua vào/bán ra, thuế VAT, đối soát và trạng thái thanh toán",
    icon: ReceiptText,
    tag: "Doanh nghiệp",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    recommendedFor: ["business"],
  },
  {
    id: "debts",
    label: "Theo dõi Công nợ",
    shortDesc: "Quản lý nợ phải thu, phải trả đối tác, nhắc hạn và phân tích tuổi nợ",
    icon: Clock3,
    tag: "Nhóm & DN",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    recommendedFor: ["organization", "business"],
  },
  {
    id: "budgets",
    label: "Ngân sách & Hạn mức",
    shortDesc: "Kiểm soát hạn mức chi tiêu định kỳ theo bộ phận hoặc danh mục",
    icon: Target,
    tag: "Kế hoạch",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    recommendedFor: ["organization", "business"],
  },
  {
    id: "reports",
    label: "Báo cáo & Phân tích",
    shortDesc: "Báo cáo cơ cấu thu chi, biểu đồ trực quan và kết quả kinh doanh",
    icon: BarChart3,
    recommendedFor: ["individual", "organization", "business"],
  },
  {
    id: "ai-agent",
    label: "AI Trợ lý tài chính",
    shortDesc: "Trợ lý phân tích thông minh, cảnh báo rủi ro thanh khoản theo số liệu thật",
    icon: Sparkles,
    tag: "AI Smart",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    recommendedFor: ["individual", "organization", "business"],
  },
];

interface BankAccount { id: string; bank: string; branch: string; number: string; balance: number; type: string }
interface Transaction {
  id: string; code: string; type: "income" | "expense"; category: string;
  amount: number; date: string; accountId: string; account: string;
  partner: string; note: string; status: "approved" | "pending" | "draft";
}
interface Invoice {
  id: string; code: string; type: "out" | "in"; partnerName: string;
  taxCode: string; subtotal: number; vatRate: number; vatAmount: number;
  total: number; paidAmount: number; remainingAmount: number; date: string; dueDate: string | null;
  status: "valid" | "pending_verification" | "partially_paid" | "cancelled" | "paid" | "overdue";
  signed: boolean;
}
interface DebtRecord {
  id: string; partnerName: string; type: "receivable" | "payable";
  totalAmount: number; paidAmount: number; remainingAmount: number; dueDate: string;
  status: "normal" | "due_soon" | "overdue";
}
interface PaymentRecord {
  id: string; debtId: string | null; invoiceId: string | null; amount: number;
  date: string; method: "bank_transfer" | "cash" | "card" | "other";
  reference: string; note: string; createdAt: string;
}
type PaymentTarget = { kind: "debt"; record: DebtRecord } | { kind: "invoice"; record: Invoice };
export interface BudgetCategory {
  id: string; department: string; category: string; allocatedAmount: number;
  spentAmount: number; period: string; manager: string;
  status: "under" | "warning" | "exceeded";
}

const DEFAULT_PROFILE: FinanceProfile = {
  entityType: "business",
  displayName: "Hồ sơ tài chính",
  currency: "VND",
  enabledTabs: DEFAULT_TABS_BY_ENTITY.business,
};
const INPUT = "h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 text-sm font-medium text-[var(--cu-text-primary)] outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]";
const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = () => localDateString();
const numberValue = (value: unknown) => Number(value || 0);

const CHART_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#3b82f6", // Blue
  "#64748b", // Slate
];

const dueStatus = (date: string): DebtRecord["status"] => {
  const days = Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86_400_000);
  return days < 0 ? "overdue" : days <= 7 ? "due_soon" : "normal";
};
const isInvoiceOverdue = (invoice: Invoice) => !["paid", "cancelled"].includes(invoice.status) && !!invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59`).getTime() < Date.now();
const paymentProgress = (total: number, paid: number) => total > 0 ? Math.min(100, Math.max(0, paid / total * 100)) : 0;
const paymentStage = (total: number, paid: number) => {
  const progress = paymentProgress(total, paid);
  return progress >= 100 ? "Đã tất toán" : progress > 0 ? "Thanh toán một phần" : "Chưa thanh toán";
};

const tabs: Array<{ id: FinanceTab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "cashbook", label: "Thu chi", icon: CircleDollarSign },
  { id: "invoices", label: "Hóa đơn", icon: ReceiptText },
  { id: "debts", label: "Công nợ", icon: Clock3 },
  { id: "budgets", label: "Ngân sách", icon: Target },
  { id: "reports", label: "Báo cáo & Biểu đồ", icon: BarChart3 },
  { id: "ai-agent", label: "AI tài chính", icon: Sparkles },
];

export function FinanceHub({ activeWorkspaceId = "", onAddSyncLog, triggerToast }: FinanceHubProps) {
  const { isVietnamese } = useTranslation();
  const workspaceId = activeWorkspaceId.trim();
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<"connecting" | "live" | "offline">("connecting");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<"all" | "income" | "expense">("all");
  const [transactionPeriod, setTransactionPeriod] = useState<"all" | "30d" | "90d" | "year">("all");
  const [modal, setModal] = useState<ModalType>(null);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: today(), method: "bank_transfer" as PaymentRecord["method"], reference: "", note: "" });

  // Biểu đồ settings
  const [overviewChartType, setOverviewChartType] = useState<"area" | "bar" | "line">("area");
  const [overviewPeriod, setOverviewPeriod] = useState<"6m" | "12m" | "all">("6m");
  const [reportsChartTab, setReportsChartTab] = useState<"pl" | "expense" | "income" | "budget" | "debt">("pl");

  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE);
  const [accountForm, setAccountForm] = useState({ bank: "", number: "", branch: "", type: "Tài khoản thanh toán", balance: "" });
  const [txForm, setTxForm] = useState({ accountId: "", date: today(), category: "", amount: "", partner: "", note: "" });
  const [invoiceForm, setInvoiceForm] = useState({ type: "out" as "out" | "in", partnerName: "", taxCode: "", subtotal: "", vatRate: "10", date: today(), dueDate: "" });
  const [debtForm, setDebtForm] = useState({ type: "receivable" as "receivable" | "payable", partnerName: "", totalAmount: "", paidAmount: "", dueDate: today(), phone: "", email: "" });
  const [budgetForm, setBudgetForm] = useState({ department: "", category: "", allocatedAmount: "", spentAmount: "", period: "", manager: "" });
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async (withLoader = false) => {
    if (!workspaceId) { setLoading(false); setError("Chưa chọn workspace để tải dữ liệu tài chính."); return; }
    if (withLoader) setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setUserId(authData.user.id);
      const [pr, ar, tr, ir, dr, br, pyr, cr] = await Promise.all([
        supabase.from("finance_profiles").select("entity_type,display_name,currency,enabled_tabs").eq("workspace_id", workspaceId).maybeSingle(),
        supabase.from("finance_accounts").select("id,bank,branch,account_number,balance,account_type").eq("workspace_id", workspaceId).order("created_at"),
        supabase.from("finance_transactions").select("id,code,transaction_type,category,amount,transaction_date,account_id,account_label,partner,note,status").eq("workspace_id", workspaceId).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("finance_invoices").select("id,code,invoice_type,partner_name,tax_code,subtotal,vat_rate,vat_amount,total,paid_amount,issue_date,due_date,status,signed").eq("workspace_id", workspaceId).order("issue_date", { ascending: false }),
        supabase.from("finance_debts").select("id,partner_name,debt_type,total_amount,paid_amount,due_date,status").eq("workspace_id", workspaceId).order("due_date"),
        supabase.from("finance_budgets").select("id,department,category,allocated_amount,spent_amount,period_label,manager,status").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
        supabase.from("finance_payments").select("id,debt_id,invoice_id,amount,payment_date,payment_method,reference_code,note,created_at").eq("workspace_id", workspaceId).order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("finance_categories").select("id,workspace_id,name,type,color,icon,description,sort_order").eq("workspace_id", workspaceId).order("sort_order").order("created_at"),
      ]);
      const firstError = [pr.error, ar.error, tr.error, ir.error, dr.error, br.error, pyr.error, cr.error].find(Boolean);
      if (firstError) throw firstError;
      const p = pr.data;
      const entityType = (p?.entity_type as EntityType) || "business";
      const validTabIds = new Set<FinanceTab>(["overview", "cashbook", "invoices", "debts", "budgets", "reports", "ai-agent"]);
      const rawTabs = p?.enabled_tabs;
      const loadedTabs: FinanceTab[] = Array.isArray(rawTabs) && rawTabs.length > 0
        ? (rawTabs.filter((t: string) => validTabIds.has(t as FinanceTab)) as FinanceTab[])
        : DEFAULT_TABS_BY_ENTITY[entityType];

      const nextProfile: FinanceProfile = p ? {
        entityType,
        displayName: p.display_name,
        currency: p.currency as Currency,
        enabledTabs: loadedTabs.length > 0 ? loadedTabs : DEFAULT_TABS_BY_ENTITY[entityType],
      } : DEFAULT_PROFILE;
      setProfile(nextProfile); setProfileForm(nextProfile);
      setAccounts((ar.data || []).map(r => ({ id: r.id, bank: r.bank, branch: r.branch, number: r.account_number, balance: numberValue(r.balance), type: r.account_type })));
      setTransactions((tr.data || []).map(r => ({ id: r.id, code: r.code, type: r.transaction_type as Transaction["type"], category: r.category, amount: numberValue(r.amount), date: r.transaction_date, accountId: r.account_id, account: r.account_label, partner: r.partner, note: r.note, status: r.status as Transaction["status"] })));
      setInvoices((ir.data || []).map(r => {
        const total = numberValue(r.total);
        const paidAmount = numberValue(r.paid_amount);
        return {
          id: r.id,
          code: r.code,
          type: r.invoice_type as Invoice["type"],
          partnerName: r.partner_name,
          taxCode: r.tax_code,
          subtotal: numberValue(r.subtotal),
          vatRate: numberValue(r.vat_rate),
          vatAmount: numberValue(r.vat_amount),
          total,
          paidAmount,
          remainingAmount: total - paidAmount,
          date: r.issue_date,
          dueDate: r.due_date,
          status: r.status as Invoice["status"],
          signed: r.signed,
        };
      }));
      setDebts((dr.data || []).map(r => ({ id: r.id, partnerName: r.partner_name, type: r.debt_type as DebtRecord["type"], totalAmount: numberValue(r.total_amount), paidAmount: numberValue(r.paid_amount), remainingAmount: numberValue(r.total_amount) - numberValue(r.paid_amount), dueDate: r.due_date, status: dueStatus(r.due_date) })));
      setBudgets((br.data || []).map(r => ({ id: r.id, department: r.department, category: r.category, allocatedAmount: numberValue(r.allocated_amount), spentAmount: numberValue(r.spent_amount), period: r.period_label, manager: r.manager, status: r.status as BudgetCategory["status"] })));
      setPayments((pyr.data || []).map(r => ({ id: r.id, debtId: r.debt_id, invoiceId: r.invoice_id, amount: numberValue(r.amount), date: r.payment_date, method: r.payment_method as PaymentRecord["method"], reference: r.reference_code || "", note: r.note || "", createdAt: r.created_at })));
      setCategories((cr.data || []).map(r => ({ id: r.id, workspaceId: r.workspace_id, name: r.name, type: r.type as FinanceCategory["type"], color: r.color || "#6366f1", icon: r.icon || "Tag", description: r.description || "", sortOrder: r.sort_order || 0 })));
      setLastSync(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu tài chính.");
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { void loadData(true); }, [loadData]);
  useEffect(() => {
    if (!workspaceId || !userId) return;
    setRealtime("connecting");
    const channel = getCleanChannel(`finance:${workspaceId}`);
    const refresh = () => void loadData(false);
    ["finance_profiles", "finance_accounts", "finance_transactions", "finance_invoices", "finance_debts", "finance_budgets", "finance_payments", "finance_categories"].forEach(table => {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `workspace_id=eq.${workspaceId}` }, refresh);
    });
    channel.subscribe(status => {
      if (status === "SUBSCRIBED") setRealtime("live");
      if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setRealtime("offline");
    });
    return () => { void supabase.removeChannel(channel); };
  }, [loadData, userId, workspaceId]);

  const formatMoney = useCallback((amount: number) => new Intl.NumberFormat(isVietnamese ? "vi-VN" : "en-US", {
    style: "currency", currency: profile.currency, maximumFractionDigits: profile.currency === "VND" ? 0 : 2,
  }).format(amount), [isVietnamese, profile.currency]);
  const compactMoney = useCallback((amount: number) => new Intl.NumberFormat(isVietnamese ? "vi-VN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(amount), [isVietnamese]);

  const metrics = useMemo(() => {
    const approved = transactions.filter(t => t.status === "approved");
    const income = approved.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = approved.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const cash = accounts.reduce((s, a) => s + a.balance, 0);
    const receivable = debts.filter(d => d.type === "receivable").reduce((s, d) => s + d.remainingAmount, 0);
    const payable = debts.filter(d => d.type === "payable").reduce((s, d) => s + d.remainingAmount, 0);
    const budget = budgets.reduce((s, b) => s + b.allocatedAmount, 0);
    const spent = budgets.reduce((s, b) => s + b.spentAmount, 0);
    const overdue = debts.filter(d => d.status === "overdue").reduce((s, d) => s + d.remainingAmount, 0);
    return { income, expense, net: income - expense, cash, receivable, payable, budget, spent, overdue };
  }, [accounts, budgets, debts, transactions]);

  // Biểu đồ chuỗi thời gian (Monthly cash flow & P&L)
  const monthlyChartData = useMemo(() => {
    const groups = new Map<string, { month: string; income: number; expense: number }>();
    transactions.filter(t => t.status === "approved").forEach(t => {
      const month = t.date.slice(0, 7);
      const row = groups.get(month) || { month, income: 0, expense: 0 };
      row[t.type] += t.amount;
      groups.set(month, row);
    });
    const sorted = [...groups.values()].sort((a, b) => a.month.localeCompare(b.month));
    const sliceCount = overviewPeriod === "6m" ? 6 : overviewPeriod === "12m" ? 12 : sorted.length;
    return sorted.slice(-sliceCount).map(r => {
      const net = r.income - r.expense;
      return {
        ...r,
        net,
        label: new Date(`${r.month}-01T00:00:00`).toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
        profitMargin: r.income > 0 ? ((net / r.income) * 100).toFixed(1) : "0",
      };
    });
  }, [overviewPeriod, transactions]);

  // Cơ cấu chi phí theo danh mục (Pie/Donut chart)
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    transactions.filter(t => t.type === "expense" && t.status === "approved").forEach(t => {
      const current = map.get(t.category) || { amount: 0, count: 0 };
      map.set(t.category, { amount: current.amount + t.amount, count: current.count + 1 });
    });
    const total = metrics.expense || 1;
    return [...map.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, data], idx) => ({
        name,
        value: data.amount,
        count: data.count,
        percent: ((data.amount / total) * 100).toFixed(1),
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [metrics.expense, transactions]);

  // Cơ cấu nguồn thu theo danh mục (Pie/Donut chart)
  const incomeBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    transactions.filter(t => t.type === "income" && t.status === "approved").forEach(t => {
      const current = map.get(t.category) || { amount: 0, count: 0 };
      map.set(t.category, { amount: current.amount + t.amount, count: current.count + 1 });
    });
    const total = metrics.income || 1;
    return [...map.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, data], idx) => ({
        name,
        value: data.amount,
        count: data.count,
        percent: ((data.amount / total) * 100).toFixed(1),
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [metrics.income, transactions]);

  // Phân bổ số dư tài khoản ngân hàng & tiền mặt
  const accountDistribution = useMemo(() => {
    const total = metrics.cash || 1;
    return accounts.map((acc, idx) => ({
      name: acc.bank,
      number: acc.number,
      value: Math.max(0, acc.balance),
      balance: acc.balance,
      percent: ((Math.max(0, acc.balance) / total) * 100).toFixed(1),
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [accounts, metrics.cash]);

  // Biểu đồ so sánh Ngân sách vs Thực chi
  const budgetComparisonData = useMemo(() => {
    return budgets.map(b => {
      const ratio = b.allocatedAmount > 0 ? (b.spentAmount / b.allocatedAmount) * 100 : 0;
      return {
        name: `${b.department} · ${b.category}`,
        department: b.department,
        category: b.category,
        allocated: b.allocatedAmount,
        spent: b.spentAmount,
        remaining: Math.max(0, b.allocatedAmount - b.spentAmount),
        ratio: ratio.toFixed(0),
        status: b.status,
      };
    });
  }, [budgets]);

  // Biểu đồ tuổi nợ (Debt Aging Analysis)
  const debtAgingData = useMemo(() => {
    const buckets: Record<string, { label: string; receivable: number; payable: number }> = {
      current: { label: "Trong hạn", receivable: 0, payable: 0 },
      "1-30": { label: "1-30 ngày", receivable: 0, payable: 0 },
      "31-60": { label: "31-60 ngày", receivable: 0, payable: 0 },
      "over-60": { label: "> 60 ngày", receivable: 0, payable: 0 },
    };
    debts.forEach(d => {
      const daysLate = Math.max(0, Math.floor((new Date(`${today()}T00:00:00`).getTime() - new Date(`${d.dueDate}T00:00:00`).getTime()) / 86_400_000));
      const key = daysLate === 0 ? "current" : daysLate <= 30 ? "1-30" : daysLate <= 60 ? "31-60" : "over-60";
      if (buckets[key]) {
        if (d.type === "receivable") buckets[key].receivable += d.remainingAmount;
        else buckets[key].payable += d.remainingAmount;
      }
    });
    return Object.values(buckets);
  }, [debts]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("vi");
    const now = new Date();
    const threshold = transactionPeriod === "30d" ? new Date(now.getTime() - 30 * 86_400_000) : transactionPeriod === "90d" ? new Date(now.getTime() - 90 * 86_400_000) : null;
    return transactions.filter(transaction => {
      if (transactionFilter !== "all" && transaction.type !== transactionFilter) return false;
      const transactionDate = new Date(`${transaction.date}T00:00:00`);
      if (threshold && transactionDate < threshold) return false;
      if (transactionPeriod === "year" && transactionDate.getFullYear() !== now.getFullYear()) return false;
      return !q || [transaction.code, transaction.category, transaction.partner, transaction.account, transaction.note].some(value => value.toLocaleLowerCase("vi").includes(q));
    });
  }, [search, transactionFilter, transactionPeriod, transactions]);

  const forecast = useMemo(() => {
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 30); horizon.setHours(23, 59, 59, 999);
    const dueWithinHorizon = debts.filter(debt => debt.remainingAmount > 0 && new Date(`${debt.dueDate}T23:59:59`).getTime() <= horizon.getTime());
    const inflow = dueWithinHorizon.filter(debt => debt.type === "receivable").reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const outflow = dueWithinHorizon.filter(debt => debt.type === "payable").reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const projectedCash = metrics.cash + inflow - outflow;
    const liquidityCoverage = metrics.payable > 0 ? (metrics.cash + metrics.receivable) / metrics.payable : null;
    const budgetUsage = metrics.budget > 0 ? metrics.spent / metrics.budget * 100 : null;
    return { inflow, outflow, projectedCash, liquidityCoverage, budgetUsage };
  }, [debts, metrics]);

  const toast = (type: "success" | "error" | "info" | "warning", title: string, message: string) => triggerToast?.(type, title, message);
  const mutate = async (operation: () => Promise<{ error: { message: string } | null }>, title: string, message: string) => {
    setSaving(true);
    try {
      const result = await operation(); if (result.error) throw new Error(result.error.message);
      setModal(null); toast("success", title, message); onAddSyncLog?.(title); await loadData(false);
      return true;
    } catch (cause) { toast("error", "Không thể lưu dữ liệu", cause instanceof Error ? cause.message : "Vui lòng thử lại."); return false; }
    finally { setSaving(false); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !profileForm.displayName.trim()) return;
    const finalTabs = (profileForm.enabledTabs && profileForm.enabledTabs.length > 0)
      ? profileForm.enabledTabs
      : (DEFAULT_TABS_BY_ENTITY[profileForm.entityType] || ["cashbook" as FinanceTab]);

    await mutate(async () => {
      const { error: queryError } = await supabase.from("finance_profiles").upsert({
        workspace_id: workspaceId,
        entity_type: profileForm.entityType,
        display_name: profileForm.displayName.trim(),
        currency: profileForm.currency,
        enabled_tabs: finalTabs,
        updated_by: userId,
      }, { onConflict: "workspace_id" });
      return { error: queryError };
    }, "Đã cập nhật hồ sơ & module", "Cấu hình tính năng đã được đồng bộ theo workspace.");
  };
  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault(); if (!userId || !accountForm.bank.trim() || !accountForm.number.trim() || !Number.isFinite(Number(accountForm.balance))) return;
    const saved = await mutate(async () => { const { error: queryError } = await supabase.from("finance_accounts").insert({ workspace_id: workspaceId, bank: accountForm.bank.trim(), account_number: accountForm.number.trim(), branch: accountForm.branch.trim(), account_type: accountForm.type.trim(), balance: Number(accountForm.balance), created_by: userId }); return { error: queryError }; }, "Đã thêm tài khoản", "Số dư mở sổ đã được ghi nhận.");
    if (saved) setAccountForm({ bank: "", number: "", branch: "", type: "Tài khoản thanh toán", balance: "" });
  };
  const saveTransaction = async (e: React.FormEvent) => {
    e.preventDefault(); const amount = Number(txForm.amount);
    if (!txForm.accountId || !txForm.category.trim() || !Number.isFinite(amount) || amount <= 0) { toast("error", "Thiếu thông tin", "Chọn tài khoản, hạng mục và nhập số tiền hợp lệ."); return; }
    const code = editingTransaction?.code || `${transactionType === "income" ? "PT" : "PC"}-${Date.now().toString().slice(-9)}`;
    const transactionPayload = {
      account_id: txForm.accountId,
      transaction_type: transactionType,
      category: txForm.category.trim(),
      amount,
      transaction_date: txForm.date,
      partner: txForm.partner.trim(),
      receiver_or_payer: txForm.partner.trim(),
      debit_account: transactionType === "income" ? "1121 - Tiền gửi ngân hàng" : "642 - Chi phí",
      credit_account: transactionType === "income" ? "511 - Doanh thu" : "1121 - Tiền gửi ngân hàng",
      note: txForm.note.trim(),
    };
    const saved = await mutate(async () => {
      if (editingTransaction) {
        const { error: queryError } = await supabase
          .from("finance_transactions")
          .update(transactionPayload)
          .eq("workspace_id", workspaceId)
          .eq("id", editingTransaction.id)
          .select("id")
          .single();
        return { error: queryError };
      }
      const { error: queryError } = await supabase.rpc("record_finance_transaction", {
        p_workspace_id: workspaceId,
        p_account_id: txForm.accountId,
        p_code: code,
        p_transaction_type: transactionType,
        p_category: txForm.category.trim(),
        p_amount: amount,
        p_transaction_date: txForm.date,
        p_partner: txForm.partner.trim(),
        p_receiver_or_payer: txForm.partner.trim(),
        p_address: "",
        p_debit_account: transactionPayload.debit_account,
        p_credit_account: transactionPayload.credit_account,
        p_note: txForm.note.trim(),
      });
      return { error: queryError };
    }, editingTransaction ? "Đã cập nhật giao dịch" : transactionType === "income" ? "Đã ghi nhận khoản thu" : "Đã ghi nhận khoản chi", `${code} đã đồng bộ sổ quỹ và số dư.`);
    if (saved) {
      setEditingTransaction(null);
      setTxForm({ accountId: accounts[0]?.id || "", date: today(), category: "", amount: "", partner: "", note: "" });
    }
  };

  const openTransaction = (transaction?: Transaction) => {
    setEditingTransaction(transaction || null);
    setTransactionType(transaction?.type || "income");
    setTxForm(transaction ? {
      accountId: transaction.accountId,
      date: transaction.date,
      category: transaction.category,
      amount: String(transaction.amount),
      partner: transaction.partner,
      note: transaction.note,
    } : {
      accountId: accounts[0]?.id || "",
      date: today(),
      category: "",
      amount: "",
      partner: "",
      note: "",
    });
    setModal("transaction");
  };

  const deleteTransaction = async () => {
    const transaction = transactionToDelete;
    if (!transaction) return;
    setTransactionToDelete(null);
    await mutate(async () => {
      const { error: queryError } = await supabase
        .from("finance_transactions")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", transaction.id)
        .select("id")
        .single();
      return { error: queryError };
    }, "Đã xóa giao dịch", `${transaction.code} đã được xóa và số dư tài khoản đã được hoàn nguyên.`);
  };
  const saveInvoice = async (e: React.FormEvent) => {
    e.preventDefault(); if (!userId) return; const subtotal = Number(invoiceForm.subtotal); const vatRate = Number(invoiceForm.vatRate);
    if (!invoiceForm.partnerName.trim() || subtotal < 0 || !Number.isFinite(subtotal) || !Number.isFinite(vatRate)) return;
    const vat = Math.round(subtotal * vatRate / 100); const code = `HD-${Date.now().toString().slice(-9)}`;
    const saved = await mutate(async () => { const { error: queryError } = await supabase.from("finance_invoices").insert({ workspace_id: workspaceId, code, invoice_type: invoiceForm.type, partner_name: invoiceForm.partnerName.trim(), tax_code: invoiceForm.taxCode.trim(), subtotal, vat_rate: vatRate, vat_amount: vat, total: subtotal + vat, issue_date: invoiceForm.date, due_date: invoiceForm.dueDate || null, status: "pending_verification", signed: false, created_by: userId }); return { error: queryError }; }, "Đã tạo hóa đơn", `${code} đang chờ kiểm tra và ký số.`);
    if (saved) setInvoiceForm({ type: "out", partnerName: "", taxCode: "", subtotal: "", vatRate: "10", date: today(), dueDate: "" });
  };
  const saveDebt = async (e: React.FormEvent) => {
    e.preventDefault(); if (!userId) return; const total = Number(debtForm.totalAmount); const paid = Number(debtForm.paidAmount || 0);
    if (!debtForm.partnerName.trim() || total < 0 || paid < 0 || paid > total) return;
    const daysLate = Math.max(0, Math.floor((new Date(`${today()}T00:00:00`).getTime() - new Date(`${debtForm.dueDate}T00:00:00`).getTime()) / 86_400_000));
    const aging = daysLate === 0 ? "current" : daysLate <= 30 ? "1-30" : daysLate <= 60 ? "31-60" : "over-60";
    const saved = await mutate(async () => { const { error: queryError } = await supabase.from("finance_debts").insert({ workspace_id: workspaceId, partner_name: debtForm.partnerName.trim(), debt_type: debtForm.type, total_amount: total, paid_amount: paid, due_date: debtForm.dueDate, aging_bucket: aging, contact_phone: debtForm.phone.trim(), contact_email: debtForm.email.trim(), status: dueStatus(debtForm.dueDate), created_by: userId }); return { error: queryError }; }, "Đã ghi nhận công nợ", "Khoản phải thu/phải trả đã được đồng bộ.");
    if (saved) setDebtForm({ type: "receivable", partnerName: "", totalAmount: "", paidAmount: "", dueDate: today(), phone: "", email: "" });
  };
  const saveBudget = async (e: React.FormEvent) => {
    e.preventDefault(); if (!userId) return; const allocated = Number(budgetForm.allocatedAmount); const spent = Number(budgetForm.spentAmount || 0);
    if (!budgetForm.department.trim() || !budgetForm.category.trim() || allocated <= 0 || spent < 0) return;
    const ratio = spent / allocated; const status = ratio > 1 ? "exceeded" : ratio >= .8 ? "warning" : "under";
    const saved = await mutate(async () => { const { error: queryError } = await supabase.from("finance_budgets").insert({ workspace_id: workspaceId, department: budgetForm.department.trim(), category: budgetForm.category.trim(), allocated_amount: allocated, spent_amount: spent, period_label: budgetForm.period.trim() || today().slice(0, 7), manager: budgetForm.manager.trim(), status, created_by: userId }); return { error: queryError }; }, "Đã tạo ngân sách", "Hạn mức mới đã được lưu thành công.");
    if (saved) setBudgetForm({ department: "", category: "", allocatedAmount: "", spentAmount: "", period: "", manager: "" });
  };

  const openPayment = (target: PaymentTarget) => {
    setPaymentTarget(target);
    setPaymentForm({ amount: "", date: today(), method: "bank_transfer", reference: "", note: "" });
    setModal("payment");
  };

  const verifyInvoice = async (invoice: Invoice) => {
    await mutate(async () => {
      const { error: queryError } = await supabase.from("finance_invoices").update({ status: "valid", signed: true }).eq("workspace_id", workspaceId).eq("id", invoice.id);
      return { error: queryError };
    }, "Đã xác thực hóa đơn", `${invoice.code} đã sẵn sàng ghi nhận thanh toán.`);
  };

  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    const amount = Number(paymentForm.amount);
    const remaining = paymentTarget.record.remainingAmount;
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast("error", "Số tiền không hợp lệ", `Nhập số tiền lớn hơn 0 và không vượt quá ${formatMoney(remaining)}.`);
      return;
    }
    const settled = Math.abs(amount - remaining) < 0.01;
    const label = paymentTarget.kind === "invoice" ? paymentTarget.record.code : paymentTarget.record.partnerName;
    const saved = await mutate(async () => {
      const { error: queryError } = await supabase.rpc("record_finance_payment", {
        p_workspace_id: workspaceId,
        p_debt_id: paymentTarget.kind === "debt" ? paymentTarget.record.id : null,
        p_invoice_id: paymentTarget.kind === "invoice" ? paymentTarget.record.id : null,
        p_amount: amount,
        p_payment_date: paymentForm.date,
        p_payment_method: paymentForm.method,
        p_reference_code: paymentForm.reference.trim(),
        p_note: paymentForm.note.trim(),
      });
      return { error: queryError };
    }, settled ? "Đã hoàn tất thanh toán" : "Đã ghi nhận thanh toán một phần", `${label}: ${formatMoney(amount)}.`);
    if (saved) {
      setPaymentTarget(null);
      setPaymentForm({ amount: "", date: today(), method: "bank_transfer", reference: "", note: "" });
    }
  };

  const exportCsv = () => {
    let section = "transactions";
    let rows: Array<Array<string | number>>;
    if (activeTab === "invoices") {
      section = "invoices";
      rows = [["Mã", "Loại", "Ngày", "Hạn thanh toán", "Đối tác", "MST", `Trước thuế (${profile.currency})`, "VAT (%)", `Tổng (${profile.currency})`, `Đã thanh toán (${profile.currency})`, `Còn lại (${profile.currency})`, "Trạng thái"], ...invoices.map(invoice => [invoice.code, invoice.type, invoice.date, invoice.dueDate || "", invoice.partnerName, invoice.taxCode, invoice.subtotal, invoice.vatRate, invoice.total, invoice.paidAmount, invoice.remainingAmount, invoice.status])];
    } else if (activeTab === "debts") {
      section = "debts";
      rows = [["Loại", "Đối tác", "Hạn", `Tổng (${profile.currency})`, `Đã thanh toán (${profile.currency})`, `Còn lại (${profile.currency})`, "Trạng thái"], ...debts.map(debt => [debt.type, debt.partnerName, debt.dueDate, debt.totalAmount, debt.paidAmount, debt.remainingAmount, debt.status])];
    } else if (activeTab === "budgets") {
      section = "budgets";
      rows = [["Bộ phận", "Hạng mục", "Kỳ", `Hạn mức (${profile.currency})`, `Đã dùng (${profile.currency})`, "Quản lý", "Trạng thái"], ...budgets.map(budget => [budget.department, budget.category, budget.period, budget.allocatedAmount, budget.spentAmount, budget.manager, budget.status])];
    } else {
      rows = [["Mã", "Loại", "Ngày", "Hạng mục", `Số tiền (${profile.currency})`, "Tài khoản", "Đối tác", "Trạng thái"], ...filteredTransactions.map(transaction => [transaction.code, transaction.type, transaction.date, transaction.category, transaction.amount, transaction.account, transaction.partner, transaction.status])];
    }
    const csv = `\uFEFF${rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const link = document.createElement("a"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url; link.download = `apexa-finance-${section}-${workspaceId}-${today()}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const sendAi = async () => {
    const question = aiInput.trim(); if (!question || aiLoading) return;
    setAiMessages(m => [...m, { sender: "user", text: question }]); setAiInput(""); setAiLoading(true);
    try {
      const prompt = `Chỉ phân tích số liệu thật dưới đây, không giả định dữ liệu thiếu. Đơn vị ${profile.currency}. Tiền: ${metrics.cash}; Thu: ${metrics.income}; Chi: ${metrics.expense}; Ròng: ${metrics.net}; Phải thu: ${metrics.receivable}; Phải trả: ${metrics.payable}; Quá hạn: ${metrics.overdue}; Ngân sách: ${metrics.budget}; Đã dùng: ${metrics.spent}. Câu hỏi: ${question}`;
      const response = await callAiApi("/api/ai/chat", { message: prompt }); if (!response.ok) throw new Error("Dịch vụ AI chưa sẵn sàng.");
      const payload = await response.json(); const reply = payload.reply || payload.text; if (!reply) throw new Error("Không nhận được nội dung phân tích.");
      setAiMessages(m => [...m, { sender: "ai", text: reply }]);
    } catch (cause) { setAiMessages(m => [...m, { sender: "ai", text: cause instanceof Error ? cause.message : "Không thể phân tích lúc này." }]); }
    finally { setAiLoading(false); }
  };

  const enabledModuleSet = useMemo(() => {
    const tabsList = profile.enabledTabs && profile.enabledTabs.length > 0
      ? profile.enabledTabs
      : (DEFAULT_TABS_BY_ENTITY[profile.entityType] || DEFAULT_TABS_BY_ENTITY.business);
    return new Set(tabsList);
  }, [profile.enabledTabs, profile.entityType]);

  const visibleTabs = useMemo(() => {
    return tabs.filter(t => enabledModuleSet.has(t.id));
  }, [enabledModuleSet]);

  // Safety switch when current activeTab gets disabled
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const openCreate = () => {
    if (activeTab === "cashbook" || (activeTab === "overview" && enabledModuleSet.has("cashbook"))) {
      openTransaction();
    } else if (activeTab === "invoices" && enabledModuleSet.has("invoices")) {
      setModal("invoice");
    } else if (activeTab === "debts" && enabledModuleSet.has("debts")) {
      setModal("debt");
    } else if (activeTab === "budgets" && enabledModuleSet.has("budgets")) {
      setModal("budget");
    } else if (enabledModuleSet.has("cashbook")) {
      openTransaction();
    } else if (enabledModuleSet.has("invoices")) {
      setModal("invoice");
    } else if (enabledModuleSet.has("debts")) {
      setModal("debt");
    } else if (enabledModuleSet.has("budgets")) {
      setModal("budget");
    } else {
      setModal("profile");
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-[var(--cu-bg-subtle)]"><div className="text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-indigo-500" /><p className="mt-3 text-xs font-bold text-[var(--cu-text-tertiary)]">Đang tải sổ tài chính…</p></div></div>;
  if (error) return <div className="flex h-full items-center justify-center bg-[var(--cu-bg-subtle)] p-6"><Card className="max-w-md text-center" padding="xl"><AlertCircle className="mx-auto h-8 w-8 text-rose-500" /><h2 className="mt-4 text-base font-black text-[var(--cu-text-primary)]">Không thể mở Finance Hub</h2><p className="mt-2 text-sm leading-6 text-[var(--cu-text-tertiary)]">{error}</p><Button className="mt-5" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadData(true)}>Thử lại</Button></Card></div>;

  const noData = !accounts.length && !transactions.length && !invoices.length && !debts.length && !budgets.length;
  const metricCards = [
    { label: "Tiền & ngân hàng", value: metrics.cash, helper: `${accounts.length} tài khoản`, icon: Landmark, iconClass: "bg-indigo-500/10 text-indigo-500" },
    { label: "Tổng thu", value: metrics.income, helper: `${transactions.filter(t => t.type === "income").length} giao dịch`, icon: TrendingUp, iconClass: "bg-emerald-500/10 text-emerald-500" },
    { label: "Tổng chi", value: metrics.expense, helper: `${transactions.filter(t => t.type === "expense").length} giao dịch`, icon: TrendingDown, iconClass: "bg-rose-500/10 text-rose-500" },
    { label: "Dòng tiền ròng", value: metrics.net, helper: metrics.income ? `${(metrics.net / metrics.income * 100).toFixed(1)}% trên tổng thu` : "Chưa có tổng thu", icon: BarChart3, iconClass: metrics.net >= 0 ? "bg-sky-500/10 text-sky-500" : "bg-amber-500/10 text-amber-500" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--cu-bg-subtle)]">
      <header className="apexa-finance-header shrink-0 border-b border-[var(--cu-border)] bg-[var(--cu-surface)]/95 px-4 py-3 backdrop-blur-xl lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20"><WalletCards className="h-5 w-5" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-black tracking-tight text-[var(--cu-text-primary)]">
                  {profile.displayName || (isVietnamese ? "Hồ sơ tài chính" : "Financial Profile")}
                </h1>
                {realtime !== "live" && (
                  <Badge variant={realtime === "connecting" ? "warning" : "danger"} dot>
                    {realtime === "connecting" ? (isVietnamese ? "Đang kết nối" : "Connecting") : (isVietnamese ? "Ngoại tuyến" : "Offline")}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--cu-text-tertiary)]">
                {profile.currency} · {lastSync ? (isVietnamese ? `Cập nhật ${lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : `Updated ${lastSync.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`) : (isVietnamese ? "Đã lưu" : "Saved")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void loadData(false)}>
              {isVietnamese ? "Làm mới" : "Refresh"}
            </Button>
            {enabledModuleSet.has("cashbook") && (
              <>
                <Button variant="secondary" size="sm" leftIcon={<Tag className="h-3.5 w-3.5" />} onClick={() => setModal("categories")}>
                  {isVietnamese ? "Danh mục" : "Categories"}
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<Camera className="h-3.5 w-3.5 text-rose-500" />} onClick={() => setModal("receipt-scan")}>
                  {isVietnamese ? "Quét HĐ AI" : "AI Scan"}
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv} disabled={activeTab === "invoices" ? !invoices.length : activeTab === "debts" ? !debts.length : activeTab === "budgets" ? !budgets.length : !filteredTransactions.length}>
              {isVietnamese ? "Xuất CSV" : "Export CSV"}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => { setProfileForm(profile); setModal("profile"); }}>
              {isVietnamese ? "Thiết lập" : "Settings"}
            </Button>
            <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>
              {isVietnamese ? "Tạo mới" : "Create"}
            </Button>
          </div>
        </div>
      </header>

      <nav className="flex shrink-0 items-center justify-between gap-1 overflow-x-auto border-b border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 py-2 [scrollbar-width:none] lg:px-5">
        <div className="flex items-center gap-1">
          {visibleTabs.map(item => {
            const Icon = item.icon;
            const selected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                  selected
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)] hover:text-[var(--cu-text-primary)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => { setProfileForm(profile); setModal("profile"); }}
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-[var(--cu-border)] px-2.5 text-[11px] font-bold text-[var(--cu-text-tertiary)] transition hover:border-indigo-500 hover:text-indigo-500"
          title="Tuỳ chỉnh các module tính năng hiển thị"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>Tuỳ chỉnh module ({visibleTabs.length}/7)</span>
        </button>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        {/* TAB 1: TỔNG QUAN */}
        {activeTab === "overview" && <div className="mx-auto max-w-[1500px] space-y-4">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{metricCards.map(card => { const Icon = card.icon; return <Card key={card.label} padding="md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)]">{card.label}</p><p className="mt-2 truncate text-xl font-black tracking-tight text-[var(--cu-text-primary)]">{formatMoney(card.value)}</p><p className="mt-1 text-[11px] font-medium text-[var(--cu-text-tertiary)]">{card.helper}</p></div><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}><Icon className="h-4 w-4" /></div></div></Card>; })}</section>
          
          <Card padding="none" className="overflow-hidden">
            <SectionHeader title="Dự báo thanh khoản 30 ngày" subtitle="Tính từ số dư hiện tại và các khoản công nợ đến hạn; không dùng dữ liệu giả" aside={<Badge variant={forecast.projectedCash >= 0 ? "success" : "danger"}>{forecast.projectedCash >= 0 ? "Dòng tiền an toàn" : "Cần bổ sung thanh khoản"}</Badge>} />
            <div className="grid divide-y divide-[var(--cu-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
              <ForecastMetric label="Dự kiến thu" value={formatMoney(forecast.inflow)} tone="text-emerald-500" />
              <ForecastMetric label="Dự kiến chi" value={formatMoney(forecast.outflow)} tone="text-rose-500" />
              <ForecastMetric label="Số dư dự kiến" value={formatMoney(forecast.projectedCash)} tone={forecast.projectedCash >= 0 ? "text-indigo-500" : "text-amber-500"} />
              <ForecastMetric label="Khả năng trả nợ" value={forecast.liquidityCoverage === null ? "Không có nợ phải trả" : `${forecast.liquidityCoverage.toFixed(2)}×`} tone={forecast.liquidityCoverage === null || forecast.liquidityCoverage >= 1 ? "text-emerald-500" : "text-amber-500"} />
              <ForecastMetric label="Dùng ngân sách" value={forecast.budgetUsage === null ? "Chưa lập ngân sách" : `${forecast.budgetUsage.toFixed(1)}%`} tone={forecast.budgetUsage !== null && forecast.budgetUsage > 100 ? "text-rose-500" : "text-[var(--cu-text-primary)]"} />
            </div>
          </Card>

          {/* DÒNG TIỀN TỔNG QUAN & PHÂN BỔ TÀI SẢN */}
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.75fr)]">
            <OverviewCashflowCard
              chartData={monthlyChartData}
              chartType={overviewChartType}
              setChartType={setOverviewChartType}
              period={overviewPeriod}
              setPeriod={setOverviewPeriod}
              formatMoney={formatMoney}
              compactMoney={compactMoney}
            />
            <AccountDistributionCard
              accounts={accountDistribution}
              totalCash={metrics.cash}
              formatMoney={formatMoney}
              onAddAccount={() => setModal("account")}
            />
          </section>

          {/* CÂN ĐỐI NGHĨA VỤ & CÔNG NỢ / NGÂN SÁCH (CHỈ HIỆN KHI MODULE ĐƯỢC BẬT) */}
          {(enabledModuleSet.has("debts") || enabledModuleSet.has("budgets")) && (
            <section className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              enabledModuleSet.has("debts") && enabledModuleSet.has("budgets") ? "lg:grid-cols-4" : enabledModuleSet.has("debts") ? "lg:grid-cols-3" : "lg:grid-cols-1"
            }`}>
              {enabledModuleSet.has("debts") && (
                <>
                  <Card padding="md" className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><ArrowDownRight className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[var(--cu-text-tertiary)]">Nợ phải thu</p><p className="mt-0.5 truncate text-base font-black text-emerald-500">{formatMoney(metrics.receivable)}</p></div>
                  </Card>
                  <Card padding="md" className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500"><ArrowUpRight className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[var(--cu-text-tertiary)]">Nợ phải trả</p><p className="mt-0.5 truncate text-base font-black text-rose-500">{formatMoney(metrics.payable)}</p></div>
                  </Card>
                  <Card padding="md" className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><AlertCircle className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[var(--cu-text-tertiary)]">Công nợ quá hạn</p><p className="mt-0.5 truncate text-base font-black text-amber-500">{formatMoney(metrics.overdue)}</p></div>
                  </Card>
                </>
              )}
              {enabledModuleSet.has("budgets") && (
                <Card padding="md" className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Target className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[var(--cu-text-tertiary)]">Ngân sách còn lại</p><p className="mt-0.5 truncate text-base font-black text-indigo-500">{formatMoney(Math.max(0, metrics.budget - metrics.spent))}</p></div>
                </Card>
              )}
            </section>
          )}

          {noData && <Card padding="none"><EmptyState icon={Landmark} title="Workspace chưa có dữ liệu tài chính" description="Bắt đầu bằng một tài khoản tiền hoặc ngân hàng. Apexa không tạo số liệu mẫu; mọi số liệu hiển thị đến trực tiếp từ cơ sở dữ liệu." action={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModal("account")}>Thêm tài khoản đầu tiên</Button>} /></Card>}
        </div>}

        {/* TAB 2: SỔ THU CHI */}
        {activeTab === "cashbook" && <div className="mx-auto max-w-[1500px] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{accounts.map(a => <Card key={a.id} padding="md"><div className="flex items-start justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500"><CreditCard className="h-4 w-4" /></div><Badge variant="success">Đang dùng</Badge></div><p className="mt-4 truncate text-sm font-black text-[var(--cu-text-primary)]">{a.bank}</p><p className="mt-0.5 truncate text-[11px] text-[var(--cu-text-tertiary)]">{a.number} · {a.branch || a.type}</p><p className="mt-3 text-lg font-black tracking-tight text-[var(--cu-text-primary)]">{formatMoney(a.balance)}</p></Card>)}<button onClick={() => setModal("account")} className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cu-border-strong)] bg-[var(--cu-surface)] text-[var(--cu-text-tertiary)] transition hover:border-indigo-500 hover:text-indigo-500"><Plus className="h-5 w-5" /><span className="mt-2 text-xs font-bold">Thêm tài khoản</span></button></div>
          <Card padding="none" className="overflow-hidden"><SectionHeader title="Sổ thu chi" subtitle={`${filteredTransactions.length}/${transactions.length} chứng từ`} aside={<div className="flex flex-wrap items-center justify-end gap-2"><Select ariaLabel="Lọc loại giao dịch" value={transactionFilter} onChange={v => setTransactionFilter(v as typeof transactionFilter)} className="w-32" options={[{ value: "all", label: "Tất cả loại" }, { value: "income", label: "Khoản thu" }, { value: "expense", label: "Khoản chi" }]} /><Select ariaLabel="Lọc thời gian giao dịch" value={transactionPeriod} onChange={v => setTransactionPeriod(v as typeof transactionPeriod)} className="w-32" options={[{ value: "all", label: "Mọi thời gian" }, { value: "30d", label: "30 ngày" }, { value: "90d", label: "90 ngày" }, { value: "year", label: "Năm nay" }]} /><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cu-text-tertiary)]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm chứng từ…" className={`${INPUT} w-52 pl-9`} /></div><Button variant="secondary" size="sm" onClick={() => setModal("categories")} leftIcon={<Tag className="h-3.5 w-3.5" />}>Danh mục</Button><Button variant="secondary" size="sm" onClick={() => setModal("receipt-scan")} leftIcon={<Camera className="h-3.5 w-3.5 text-rose-500" />}>Quét HĐ AI</Button><Button size="sm" onClick={() => openTransaction()} leftIcon={<Plus className="h-4 w-4" />}>Ghi thu/chi</Button></div>} />{filteredTransactions.length ? <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"><TransactionTable rows={filteredTransactions} formatMoney={formatMoney} saving={saving} onEdit={openTransaction} onDelete={setTransactionToDelete} /></div> : <EmptyState icon={CircleDollarSign} title={transactions.length ? "Không có giao dịch phù hợp" : "Chưa có giao dịch"} description={transactions.length ? "Thử thay đổi từ khóa hoặc bộ lọc loại và thời gian." : "Ghi nhận khoản thu hoặc chi đầu tiên. Số dư tài khoản được cập nhật nguyên tử trên hệ thống."} action={!transactions.length ? <Button size="sm" onClick={() => openTransaction()}>Ghi giao dịch</Button> : undefined} />} </Card>
        </div>}

        {/* TAB 3: HÓA ĐƠN */}
        {activeTab === "invoices" && <DataList title="Hóa đơn" subtitle={`${invoices.length} hóa đơn · theo dõi xác thực và thanh toán`} action={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModal("invoice")}>Tạo hóa đơn</Button>} empty={!invoices.length} emptyIcon={ReceiptText} emptyText="Chưa có hóa đơn trong workspace.">{invoices.map(invoice => {
          const overdue = isInvoiceOverdue(invoice);
          const badge = invoice.status === "paid" ? "Đã thanh toán" : invoice.status === "partially_paid" ? "Thanh toán một phần" : overdue ? "Quá hạn" : invoice.status === "valid" ? "Đã xác thực" : invoice.status === "cancelled" ? "Đã hủy" : "Chờ kiểm tra";
          const badgeVariant = invoice.status === "paid" ? "success" : overdue || invoice.status === "cancelled" ? "danger" : invoice.status === "pending_verification" || invoice.status === "partially_paid" ? "warning" : "success";
          const action = invoice.status === "pending_verification" ? <Button variant="ghost" size="sm" disabled={saving} onClick={() => void verifyInvoice(invoice)}>Xác thực</Button> : invoice.remainingAmount > 0 && invoice.status !== "cancelled" ? <Button variant="ghost" size="sm" disabled={saving} onClick={() => openPayment({ kind: "invoice", record: invoice })}>Ghi thanh toán</Button> : undefined;
          return <PaymentProgressRow key={invoice.id} icon={FileText} title={invoice.code} subtitle={`${invoice.partnerName} · MST ${invoice.taxCode || "—"}`} dueLabel={invoice.dueDate ? `Hạn ${new Date(`${invoice.dueDate}T00:00:00`).toLocaleDateString("vi-VN")}` : `Ngày ${new Date(`${invoice.date}T00:00:00`).toLocaleDateString("vi-VN")}`} total={invoice.total} paid={invoice.paidAmount} badge={badge} badgeVariant={badgeVariant} stages={["Kiểm tra", "Xác thực", "Thanh toán"]} currentStage={invoice.status === "paid" ? 2 : invoice.status === "pending_verification" ? 0 : 1} action={action} formatMoney={formatMoney} />;
        })}</DataList>}

        {/* TAB 4: CÔNG NỢ */}
        {activeTab === "debts" && <div className="mx-auto max-w-[1300px] space-y-4">
          {debts.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <SectionHeader title="Phân tích cơ cấu & tuổi nợ" subtitle="Đối chiếu phải thu, phải trả theo các kỳ hạn" />
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_320px]">
                <div className="h-[180px] sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={debtAgingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                      <YAxis axisLine={false} tickLine={false} width={60} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                      <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                      <Bar dataKey="receivable" name="Phải thu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="payable" name="Phải trả" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center gap-3 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/40 p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--cu-text-tertiary)]">Tổng nợ phải thu:</span><span className="text-xs font-black text-emerald-500">{formatMoney(metrics.receivable)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--cu-text-tertiary)]">Tổng nợ phải trả:</span><span className="text-xs font-black text-rose-500">{formatMoney(metrics.payable)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--cu-text-tertiary)]">Công nợ quá hạn:</span><span className="text-xs font-black text-amber-500">{formatMoney(metrics.overdue)}</span></div>
                  <div className="mt-2 border-t border-[var(--cu-border)] pt-2 text-[11px] text-[var(--cu-text-tertiary)]">Tỷ lệ Phải thu / Phải trả: <strong className="text-[var(--cu-text-primary)]">{metrics.payable > 0 ? (metrics.receivable / metrics.payable).toFixed(2) + "×" : "An toàn"}</strong></div>
                </div>
              </div>
            </Card>
          )}
          <DataList title="Danh sách công nợ" subtitle={`${formatMoney(metrics.receivable)} phải thu · ${formatMoney(metrics.payable)} phải trả`} action={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModal("debt")}>Thêm công nợ</Button>} empty={!debts.length} emptyIcon={Clock3} emptyText="Chưa có khoản công nợ nào.">{debts.map(debt => <PaymentProgressRow key={debt.id} icon={debt.type === "receivable" ? ArrowDownRight : ArrowUpRight} title={debt.partnerName} subtitle={debt.type === "receivable" ? "Công nợ phải thu" : "Công nợ phải trả"} dueLabel={`Hạn ${new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString("vi-VN")}`} total={debt.totalAmount} paid={debt.paidAmount} badge={debt.remainingAmount <= 0 ? "Đã tất toán" : debt.status === "overdue" ? "Quá hạn" : debt.status === "due_soon" ? "Sắp đến hạn" : paymentStage(debt.totalAmount, debt.paidAmount)} badgeVariant={debt.remainingAmount <= 0 ? "success" : debt.status === "overdue" ? "danger" : debt.status === "due_soon" || debt.paidAmount > 0 ? "warning" : "success"} stages={["Chưa thanh toán", "Một phần", "Tất toán"]} currentStage={debt.remainingAmount <= 0 ? 2 : debt.paidAmount > 0 ? 1 : 0} action={debt.remainingAmount > 0 ? <Button variant="ghost" size="sm" disabled={saving} onClick={() => openPayment({ kind: "debt", record: debt })}>Ghi thanh toán</Button> : undefined} formatMoney={formatMoney} />)}</DataList>
        </div>}

        {/* TAB 5: NGÂN SÁCH */}
        {activeTab === "budgets" && <div className="mx-auto max-w-[1300px] space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[var(--cu-text-primary)]">Ngân sách phòng ban</h2>
              <p className="mt-1 text-xs text-[var(--cu-text-tertiary)]">{formatMoney(metrics.spent)} / {formatMoney(metrics.budget)} đã sử dụng ({metrics.budget > 0 ? ((metrics.spent / metrics.budget) * 100).toFixed(1) : 0}%)</p>
            </div>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModal("budget")}>Tạo ngân sách</Button>
          </div>

          {budgets.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <SectionHeader title="Biểu đồ phân bổ & tỷ lệ thực chi" subtitle="So sánh hạn mức được cấp và thực tế giải ngân" />
              <div className="h-[200px] sm:h-[260px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                    <YAxis axisLine={false} tickLine={false} width={60} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                    <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                    <Bar dataKey="allocated" name="Hạn mức" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="spent" name="Đã chi" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {budgets.length ? <div className="grid gap-3 lg:grid-cols-2">{budgets.map(b => <BudgetCard key={b.id} budget={b} formatMoney={formatMoney} />)}</div> : <Card padding="none"><EmptyState icon={Target} title="Chưa có ngân sách" description="Tạo hạn mức đầu tiên để theo dõi mức sử dụng thực tế." /></Card>}
        </div>}

        {/* TAB 6: BÁO CÁO & BIỂU ĐỒ CHUYÊN SÂU */}
        {activeTab === "reports" && (
          <ReportsAnalyticsDashboard
            metrics={metrics}
            transactions={transactions}
            monthlyData={monthlyChartData}
            expenseBreakdown={expenseBreakdown}
            incomeBreakdown={incomeBreakdown}
            budgetComparison={budgetComparisonData}
            debtAgingData={debtAgingData}
            formatMoney={formatMoney}
            compactMoney={compactMoney}
            activeSubTab={reportsChartTab}
            setActiveSubTab={setReportsChartTab}
            enabledTabs={profile.enabledTabs || DEFAULT_TABS_BY_ENTITY[profile.entityType]}
          />
        )}

        {/* TAB 7: AI TÀI CHÍNH */}
        {activeTab === "ai-agent" && <AiPanel messages={aiMessages} input={aiInput} setInput={setAiInput} loading={aiLoading} onSend={() => void sendAi()} />}
      </main>

      <AnimatePresence>
        {modal && (
          <FinanceModal
            title={modal === "transaction" && editingTransaction ? `Sửa giao dịch ${editingTransaction.code}` : modalTitle(modal)}
            maxWidth={
              modal === "receipt-scan"
                ? "w-[min(95vw,960px)]"
                : modal === "categories"
                ? "w-[min(95vw,780px)]"
                : modal === "profile"
                ? "w-[min(95vw,720px)]"
                : "w-[min(95vw,576px)]"
            }
            onClose={() => {
              if (!saving) {
                setModal(null);
                setPaymentTarget(null);
                setEditingTransaction(null);
                setPaymentForm({
                  amount: "",
                  date: today(),
                  method: "bank_transfer",
                  reference: "",
                  note: "",
                });
              }
            }}
          >
            {modal === "profile" ? (
              <ProfileForm form={profileForm} setForm={setProfileForm} saving={saving} onSubmit={saveProfile} />
            ) : modal === "account" ? (
              <AccountForm form={accountForm} setForm={setAccountForm} saving={saving} onSubmit={saveAccount} />
            ) : modal === "transaction" ? (
              <TransactionForm
                form={txForm}
                setForm={setTxForm}
                type={transactionType}
                setType={setTransactionType}
                accounts={accounts}
                categories={categories}
                saving={saving}
                onSubmit={saveTransaction}
                onNeedAccount={() => setModal("account")}
                onOpenCategoryManager={() => setModal("categories")}
                editing={!!editingTransaction}
              />
            ) : modal === "invoice" ? (
              <InvoiceForm form={invoiceForm} setForm={setInvoiceForm} saving={saving} onSubmit={saveInvoice} />
            ) : modal === "debt" ? (
              <DebtForm form={debtForm} setForm={setDebtForm} saving={saving} onSubmit={saveDebt} />
            ) : modal === "budget" ? (
              <BudgetForm form={budgetForm} setForm={setBudgetForm} saving={saving} onSubmit={saveBudget} />
            ) : modal === "categories" ? (
              <CategoryManagerModal
                workspaceId={workspaceId}
                categories={categories}
                onRefresh={() => loadData(false)}
                onClose={() => setModal(null)}
                triggerToast={triggerToast}
              />
            ) : modal === "receipt-scan" ? (
              <ReceiptScannerModal
                workspaceId={workspaceId}
                userId={userId}
                accounts={accounts}
                categories={categories}
                formatMoney={formatMoney}
                onRefresh={() => loadData(false)}
                onClose={() => setModal(null)}
                triggerToast={triggerToast}
                onOpenCategoryManager={() => setModal("categories")}
              />
            ) : paymentTarget ? (
              <PaymentForm
                target={paymentTarget}
                form={paymentForm}
                setForm={setPaymentForm}
                payments={payments.filter(payment =>
                  paymentTarget.kind === "debt"
                    ? payment.debtId === paymentTarget.record.id
                    : payment.invoiceId === paymentTarget.record.id
                )}
                formatMoney={formatMoney}
                saving={saving}
                onSubmit={savePayment}
              />
            ) : null}
          </FinanceModal>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={!!transactionToDelete}
        title="Xóa giao dịch tài chính?"
        description="Giao dịch sẽ bị xóa vĩnh viễn và số dư tài khoản liên quan được hoàn nguyên tự động."
        itemName={transactionToDelete ? `${transactionToDelete.code} · ${formatMoney(transactionToDelete.amount)}` : undefined}
        itemType="generic"
        confirmText="Xóa giao dịch"
        onConfirm={() => void deleteTransaction()}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENT BIỂU ĐỒ DÒNG TIỀN TỔNG QUAN (Overview Cashflow Card)
// -------------------------------------------------------------
function OverviewCashflowCard({
  chartData,
  chartType,
  setChartType,
  period,
  setPeriod,
  formatMoney,
  compactMoney,
}: {
  chartData: Array<{ month: string; label: string; income: number; expense: number; net: number; profitMargin: string }>;
  chartType: "area" | "bar" | "line";
  setChartType: (t: "area" | "bar" | "line") => void;
  period: "6m" | "12m" | "all";
  setPeriod: (p: "6m" | "12m" | "all") => void;
  formatMoney: (amount: number) => string;
  compactMoney: (amount: number) => string;
}) {
  return (
    <Card padding="none" className="min-h-[280px] sm:min-h-[360px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cu-border)] px-5 py-4">
        <div>
          <h2 className="text-sm font-black text-[var(--cu-text-primary)]">Dòng tiền & Lợi nhuận</h2>
          <p className="mt-0.5 text-[11px] text-[var(--cu-text-tertiary)]">Tổng hợp theo chu kỳ giao dịch đã duyệt</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Chuyển loại biểu đồ */}
          <div className="flex rounded-xl bg-[var(--cu-surface-2)] p-1 text-xs">
            <button
              onClick={() => setChartType("area")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${chartType === "area" ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"}`}
            >
              Vùng
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${chartType === "bar" ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"}`}
            >
              Cột
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${chartType === "line" ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"}`}
            >
              Đường
            </button>
          </div>

          {/* Chuyển kỳ thời gian */}
          <Select
            ariaLabel="Kỳ thời gian"
            value={period}
            onChange={v => setPeriod(v as typeof period)}
            className="w-32 text-xs"
            options={[
              { value: "6m", label: "6 kỳ gần nhất" },
              { value: "12m", label: "12 kỳ gần nhất" },
              { value: "all", label: "Tất cả các kỳ" },
            ]}
          />
        </div>
      </div>

      {chartData.length ? (
        <div className="h-[220px] sm:h-[280px] px-3 pb-3 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="flowIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="flowExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="flowNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--cu-border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                <Area type="monotone" dataKey="income" name="Thu" stroke="#10b981" strokeWidth={2.5} fill="url(#flowIncome)" />
                <Area type="monotone" dataKey="expense" name="Chi" stroke="#f43f5e" strokeWidth={2.5} fill="url(#flowExpense)" />
                <Area type="monotone" dataKey="net" name="Ròng" stroke="#6366f1" strokeWidth={2} fill="url(#flowNet)" strokeDasharray="3 3" />
              </AreaChart>
            ) : chartType === "bar" ? (
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--cu-border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                <Bar dataKey="income" name="Thu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expense" name="Chi" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="net" name="Ròng" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={20} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--cu-border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                <Line type="monotone" dataKey="income" name="Thu" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Chi" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="net" name="Ròng" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={BarChart3} title="Chưa có biểu đồ dòng tiền" description="Ghi nhận khoản thu hoặc chi đầu tiên để xem xu hướng thực tế." />
      )}
    </Card>
  );
}

// -------------------------------------------------------------
// COMPONENT PHÂN BỔ TÀI KHOẢN NGÂN HÀNG (Account Distribution Donut)
// -------------------------------------------------------------
function AccountDistributionCard({
  accounts,
  totalCash,
  formatMoney,
  onAddAccount,
}: {
  accounts: Array<{ name: string; number: string; balance: number; value: number; percent: string; color: string }>;
  totalCash: number;
  formatMoney: (amount: number) => string;
  onAddAccount: () => void;
}) {
  const hasAccounts = accounts.length > 0;
  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <SectionHeader title="Cơ cấu tài sản & Quỹ" subtitle="Tỷ trọng số dư các tài khoản" />
      {hasAccounts ? (
        <div className="flex min-h-[220px] sm:min-h-[280px] flex-col justify-between p-4">
          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={accounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {accounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--cu-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip formatMoney={formatMoney} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">Tổng tiền</span>
              <span className="max-w-[120px] truncate text-xs font-black text-[var(--cu-text-primary)]">{formatMoney(totalCash)}</span>
            </div>
          </div>

          <div className="max-h-32 space-y-1.5 overflow-y-auto divide-y divide-[var(--cu-border)] border-t border-[var(--cu-border)] pt-2.5">
            {accounts.map(acc => (
              <div key={acc.number} className="flex items-center justify-between pt-1.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: acc.color }} />
                  <span className="truncate font-semibold text-[var(--cu-text-primary)]">{acc.name} ({acc.number.slice(-4)})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-[var(--cu-text-secondary)]">{formatMoney(acc.balance)}</span>
                  <span className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">({acc.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Wallet}
          title="Chưa có tài khoản"
          description="Thêm tài khoản để phân tích tỷ trọng tài sản."
          action={<Button size="sm" onClick={onAddAccount} leftIcon={<Plus className="h-3.5 w-3.5" />}>Thêm tài khoản</Button>}
        />
      )}
    </Card>
  );
}

// -------------------------------------------------------------
// TRUNG TÂM BÁO CÁO & PHÂN TÍCH TÀI CHÍNH (Reports Dashboard)
// -------------------------------------------------------------
function ReportsAnalyticsDashboard({
  metrics,
  transactions,
  monthlyData,
  expenseBreakdown,
  incomeBreakdown,
  budgetComparison,
  debtAgingData,
  formatMoney,
  compactMoney,
  activeSubTab,
  setActiveSubTab,
  enabledTabs = DEFAULT_TABS_BY_ENTITY.business,
}: {
  metrics: { income: number; expense: number; net: number; cash: number; receivable: number; payable: number; budget: number; spent: number };
  transactions: Transaction[];
  monthlyData: Array<{ month: string; label: string; income: number; expense: number; net: number; profitMargin: string }>;
  expenseBreakdown: Array<{ name: string; value: number; count: number; percent: string; color: string }>;
  incomeBreakdown: Array<{ name: string; value: number; count: number; percent: string; color: string }>;
  budgetComparison: Array<{ name: string; department: string; category: string; allocated: number; spent: number; remaining: number; ratio: string; status: string }>;
  debtAgingData: Array<{ label: string; receivable: number; payable: number }>;
  formatMoney: (amount: number) => string;
  compactMoney: (amount: number) => string;
  activeSubTab: "pl" | "expense" | "income" | "budget" | "debt";
  setActiveSubTab: (tab: "pl" | "expense" | "income" | "budget" | "debt") => void;
  enabledTabs?: FinanceTab[];
}) {
  const enabledSet = useMemo(() => new Set(enabledTabs), [enabledTabs]);

  const allSubTabs: Array<{ id: typeof activeSubTab; label: string; icon: React.ElementType; moduleReq?: FinanceTab }> = useMemo(() => [
    { id: "pl", label: "Kết quả Thu chi (P&L)", icon: Activity },
    { id: "expense", label: "Cơ cấu Chi phí", icon: PieChartIcon },
    { id: "income", label: "Cơ cấu Doanh thu", icon: TrendingUp },
    { id: "budget", label: "Ngân sách vs Thực tế", icon: Target, moduleReq: "budgets" },
    { id: "debt", label: "Cơ cấu Công nợ & Tuổi nợ", icon: Clock3, moduleReq: "debts" },
  ], []);

  const subTabs = useMemo(() => {
    return allSubTabs.filter(t => !t.moduleReq || enabledSet.has(t.moduleReq));
  }, [allSubTabs, enabledSet]);

  useEffect(() => {
    if (subTabs.length > 0 && !subTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(subTabs[0].id);
    }
  }, [subTabs, activeSubTab, setActiveSubTab]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      {/* Thanh điều hướng phân hệ báo cáo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-2">
        <div className="flex flex-wrap gap-1">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition ${active ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)] hover:text-[var(--cu-text-primary)]"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="px-3 text-xs font-bold text-[var(--cu-text-tertiary)]">
          Lợi nhuận ròng: <span className={`font-black ${metrics.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatMoney(metrics.net)}</span>
        </div>
      </div>

      {/* 1. KẾT QUẢ THU CHI (P&L Trend) */}
      {activeSubTab === "pl" && (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <Card padding="md">
              <p className="text-[11px] font-bold uppercase text-[var(--cu-text-tertiary)]">Tổng doanh thu kỳ</p>
              <p className="mt-2 text-xl font-black text-emerald-500">{formatMoney(metrics.income)}</p>
            </Card>
            <Card padding="md">
              <p className="text-[11px] font-bold uppercase text-[var(--cu-text-tertiary)]">Tổng chi phí kỳ</p>
              <p className="mt-2 text-xl font-black text-rose-500">{formatMoney(metrics.expense)}</p>
            </Card>
            <Card padding="md">
              <p className="text-[11px] font-bold uppercase text-[var(--cu-text-tertiary)]">Biên lợi nhuận ròng</p>
              <p className={`mt-2 text-xl font-black ${metrics.net >= 0 ? "text-indigo-500" : "text-amber-500"}`}>
                {metrics.income > 0 ? ((metrics.net / metrics.income) * 100).toFixed(1) + "%" : "0%"}
              </p>
            </Card>
          </section>

          <Card padding="none" className="overflow-hidden">
            <SectionHeader title="Biểu đồ Kết quả Hoạt động (Doanh thu - Chi phí - Lợi nhuận ròng)" subtitle="Cột đôi so sánh Thu vs Chi và đường Lợi nhuận ròng qua các kỳ" />
            {monthlyData.length ? (
              <div className="h-[340px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                    <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                    <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                    <Bar dataKey="income" name="Doanh thu (Thu)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="expense" name="Chi phí (Chi)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Line type="monotone" dataKey="net" name="Lợi nhuận ròng" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="Chưa có dữ liệu P&L" description="Cần ghi nhận giao dịch thu chi để dựng biểu đồ kết quả kinh doanh." />
            )}
          </Card>
        </div>
      )}

      {/* 2. CƠ CẤU CHI PHÍ (Expense Breakdown) */}
      {activeSubTab === "expense" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card padding="none" className="overflow-hidden">
            <SectionHeader title="Biểu đồ Cơ cấu Chi phí theo Hạng mục" subtitle={`Tổng chi phí: ${formatMoney(metrics.expense)}`} />
            {expenseBreakdown.length ? (
              <div className="h-[360px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${percent}%)`}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--cu-surface)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip formatMoney={formatMoney} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={PieChartIcon} title="Chưa có chi phí" description="Ghi nhận khoản chi để xem phân tích danh mục chi tiêu." />
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <SectionHeader title="Chi tiết Nhóm Chi phí" subtitle="Sắp xếp theo số tiền lớn nhất" />
            {expenseBreakdown.length ? (
              <div className="divide-y divide-[var(--cu-border)] overflow-y-auto max-h-[380px]">
                {expenseBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3 px-4 py-3 text-xs">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ backgroundColor: item.color }}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[var(--cu-text-primary)]">{item.name}</p>
                      <p className="text-[10px] text-[var(--cu-text-tertiary)]">{item.count} giao dịch</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-rose-500">{formatMoney(item.value)}</p>
                      <p className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">{item.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={PieChartIcon} title="Chưa có dữ liệu" description="Danh mục chi phí sẽ hiển thị tại đây." />
            )}
          </Card>
        </div>
      )}

      {/* 3. CƠ CẤU DOANH THU (Income Breakdown) */}
      {activeSubTab === "income" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card padding="none" className="overflow-hidden">
            <SectionHeader title="Biểu đồ Nguồn Doanh thu theo Hạng mục" subtitle={`Tổng doanh thu: ${formatMoney(metrics.income)}`} />
            {incomeBreakdown.length ? (
              <div className="h-[360px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${percent}%)`}
                    >
                      {incomeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--cu-surface)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip formatMoney={formatMoney} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="Chưa có doanh thu" description="Ghi nhận khoản thu để xem phân tích nguồn thu nhập." />
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <SectionHeader title="Chi tiết Nguồn thu" subtitle="Sắp xếp theo số tiền lớn nhất" />
            {incomeBreakdown.length ? (
              <div className="divide-y divide-[var(--cu-border)] overflow-y-auto max-h-[380px]">
                {incomeBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3 px-4 py-3 text-xs">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ backgroundColor: item.color }}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[var(--cu-text-primary)]">{item.name}</p>
                      <p className="text-[10px] text-[var(--cu-text-tertiary)]">{item.count} giao dịch</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-emerald-500">{formatMoney(item.value)}</p>
                      <p className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">{item.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="Chưa có dữ liệu" description="Danh mục doanh thu sẽ hiển thị tại đây." />
            )}
          </Card>
        </div>
      )}

      {/* 4. NGÂN SÁCH VS THỰC TẾ (Budget vs Actual) */}
      {activeSubTab === "budget" && (
        <Card padding="none" className="overflow-hidden">
          <SectionHeader title="So sánh Hạn mức Ngân sách vs Thực chi" subtitle="Theo dõi mức độ sử dụng ngân sách các phòng ban" />
          {budgetComparison.length ? (
            <div className="h-[360px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetComparison} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                  <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                  <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                  <Bar dataKey="allocated" name="Hạn mức cấp" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="spent" name="Thực tế đã chi" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Target} title="Chưa có ngân sách" description="Tạo ngân sách đầu tiên để xem phân tích so sánh hạn mức." />
          )}
        </Card>
      )}

      {/* 5. CƠ CẤU & TUỔI NỢ (Debt Aging & Structure) */}
      {activeSubTab === "debt" && (
        <Card padding="none" className="overflow-hidden">
          <SectionHeader title="Biểu đồ Phân tích Cơ cấu Tuổi nợ (Debt Aging)" subtitle="So sánh nợ phải thu và nợ phải trả theo từng nhóm ngày quá hạn" />
          {debtAgingData.some(d => d.receivable > 0 || d.payable > 0) ? (
            <div className="h-[360px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={debtAgingData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                  <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                  <Tooltip content={<CustomFinanceTooltip formatMoney={formatMoney} />} />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                  <Bar dataKey="receivable" name="Nợ phải thu (Receivable)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="payable" name="Nợ phải trả (Payable)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Clock3} title="Không có công nợ" description="Tạo công nợ phải thu hoặc phải trả để theo dõi biểu đồ tuổi nợ." />
          )}
        </Card>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// CUSTOM TOOLTIPS (Theme-aware Recharts Tooltips)
// -------------------------------------------------------------
function CustomFinanceTooltip({ active, payload, label, formatMoney }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)]/95 p-3 shadow-xl backdrop-blur-md text-xs">
      <p className="font-black text-[var(--cu-text-primary)] border-b border-[var(--cu-border)] pb-1.5 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="font-semibold text-[var(--cu-text-secondary)]">{entry.name}:</span>
            </div>
            <span className="font-black text-[var(--cu-text-primary)]">{formatMoney(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomPieTooltip({ active, payload, formatMoney }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)]/95 p-3 shadow-xl backdrop-blur-md text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.payload.color || data.fill }} />
        <span className="font-black text-[var(--cu-text-primary)]">{data.name}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 text-[11px]">
        <span className="text-[var(--cu-text-tertiary)]">Số tiền:</span>
        <span className="font-black text-[var(--cu-text-primary)]">{formatMoney(Number(data.value))}</span>
      </div>
      {data.payload.percent && (
        <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
          <span className="text-[var(--cu-text-tertiary)]">Tỷ trọng:</span>
          <span className="font-bold text-indigo-500">{data.payload.percent}%</span>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// HELPER UI COMPONENTS
// -------------------------------------------------------------
function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Icon className="h-5 w-5" /></div><h3 className="text-sm font-extrabold text-[var(--cu-text-primary)]">{title}</h3><p className="mt-1.5 max-w-sm text-xs leading-5 text-[var(--cu-text-tertiary)]">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
function SectionHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cu-border)] px-5 py-4"><div><h2 className="text-sm font-black text-[var(--cu-text-primary)]">{title}</h2>{subtitle && <p className="mt-0.5 text-[11px] text-[var(--cu-text-tertiary)]">{subtitle}</p>}</div>{aside}</div>;
}
function ForecastMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="min-w-0 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--cu-text-tertiary)] whitespace-nowrap">{label}</p><p className={`mt-1.5 truncate text-sm font-black tabular-nums ${tone}`} title={value}>{value}</p></div>;
}
function TransactionTable({ rows, formatMoney, saving, onEdit, onDelete }: { rows: Transaction[]; formatMoney: (amount: number) => string; saving: boolean; onEdit: (transaction: Transaction) => void; onDelete: (transaction: Transaction) => void }) {
  return <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-[var(--cu-border)] bg-[var(--cu-surface-2)]/60 text-[10px] font-black uppercase tracking-wider text-[var(--cu-text-tertiary)] whitespace-nowrap"><th className="px-5 py-3 whitespace-nowrap">Chứng từ</th><th className="px-4 py-3 whitespace-nowrap">Hạng mục</th><th className="px-4 py-3 whitespace-nowrap">Đối tác</th><th className="px-4 py-3 whitespace-nowrap">Tài khoản</th><th className="px-4 py-3 whitespace-nowrap">Ngày</th><th className="px-4 py-3 text-right whitespace-nowrap">Số tiền</th><th className="px-5 py-3 text-right whitespace-nowrap">Thao tác</th></tr></thead><tbody className="divide-y divide-[var(--cu-border)]">{rows.map(t => <tr key={t.id} className="hover:bg-[var(--cu-surface-2)]/50"><td className="px-5 py-3"><div className="flex items-center gap-2"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>{t.type === "income" ? <ArrowDownRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}</div><div className="min-w-0"><p className="text-xs font-black text-[var(--cu-text-primary)] whitespace-nowrap">{t.code}</p><p className="text-[10px] text-[var(--cu-text-tertiary)] whitespace-nowrap">{t.status === "approved" ? "Đã duyệt" : t.status}</p></div></div></td><td className="max-w-60 px-4 py-3 min-w-0"><p className="truncate text-xs font-semibold text-[var(--cu-text-primary)]">{t.category}</p><p className="truncate text-[10px] text-[var(--cu-text-tertiary)]">{t.note || "Không có ghi chú"}</p></td><td className="max-w-44 px-4 py-3 text-xs text-[var(--cu-text-secondary)] min-w-0"><p className="truncate">{t.partner || "—"}</p></td><td className="max-w-48 px-4 py-3 text-xs text-[var(--cu-text-secondary)] min-w-0"><p className="truncate">{t.account}</p></td><td className="px-4 py-3 text-xs text-[var(--cu-text-secondary)] whitespace-nowrap">{new Date(`${t.date}T00:00:00`).toLocaleDateString("vi-VN")}</td><td className={`px-4 py-3 text-right text-sm font-black whitespace-nowrap tabular-nums ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>{t.type === "income" ? "+" : "−"}{formatMoney(t.amount)}</td><td className="px-5 py-3"><div className="flex justify-end gap-1"><button type="button" disabled={saving} onClick={() => onEdit(t)} aria-label={`Sửa giao dịch ${t.code}`} title="Sửa giao dịch" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cu-text-tertiary)] transition hover:bg-indigo-500/10 hover:text-indigo-500 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /></button><button type="button" disabled={saving} onClick={() => onDelete(t)} aria-label={`Xóa giao dịch ${t.code}`} title="Xóa giao dịch" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cu-text-tertiary)] transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>;
}
function DataList({ title, subtitle, action, empty, emptyIcon, emptyText, children }: { title: string; subtitle: string; action: React.ReactNode; empty: boolean; emptyIcon: React.ElementType; emptyText: string; children: React.ReactNode }) {
  return <Card padding="none" className="mx-auto max-w-[1300px] overflow-hidden"><SectionHeader title={title} subtitle={subtitle} aside={action} />{empty ? <EmptyState icon={emptyIcon} title={emptyText} description="Dữ liệu mới sẽ được lưu trực tiếp và đồng bộ theo workspace." /> : <div className="divide-y divide-[var(--cu-border)]">{children}</div>}</Card>;
}
function PaymentProgressRow({ icon: Icon, title, subtitle, dueLabel, total, paid, badge, badgeVariant, stages, currentStage, action, formatMoney }: { icon: React.ElementType; title: string; subtitle: string; dueLabel: string; total: number; paid: number; badge: string; badgeVariant: "success" | "warning" | "danger"; stages: string[]; currentStage: number; action?: React.ReactNode; formatMoney: (amount: number) => string }) {
  const progress = paymentProgress(total, paid);
  const remaining = Math.max(0, total - paid);
  return <div className="px-5 py-4 transition hover:bg-[var(--cu-surface-2)]/45"><div className="flex flex-wrap items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500"><Icon className="h-4 w-4" /></div><div className="min-w-48 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black text-[var(--cu-text-primary)]">{title}</p><Badge variant={badgeVariant}>{badge}</Badge></div><p className="mt-0.5 truncate text-[11px] text-[var(--cu-text-tertiary)]">{subtitle} · {dueLabel}</p></div><div className="min-w-40 text-left sm:text-right"><p className="text-sm font-black text-[var(--cu-text-primary)]">{formatMoney(remaining)}</p><p className="text-[10px] font-semibold text-[var(--cu-text-tertiary)]">còn lại trên {formatMoney(total)}</p></div>{action}</div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(180px,1fr)_minmax(260px,1.2fr)] sm:pl-[52px]"><div><div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-[var(--cu-text-tertiary)]"><span>Đã thanh toán {formatMoney(paid)}</span><span>{progress.toFixed(0)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--cu-surface-2)]"><div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : progress > 0 ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`} style={{ width: `${progress}%` }} /></div></div><PaymentStageRail stages={stages} currentStage={currentStage} /></div></div>;
}
function PaymentStageRail({ stages, currentStage }: { stages: string[]; currentStage: number }) {
  return <div className="flex items-start">{stages.map((stage, index) => <React.Fragment key={stage}><div className="flex min-w-0 flex-1 flex-col items-center text-center"><span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-black ${index <= currentStage ? "border-indigo-500 bg-indigo-500 text-white" : "border-[var(--cu-border-strong)] bg-[var(--cu-surface)] text-[var(--cu-text-tertiary)]"}`}>{index < currentStage ? <CheckCircle2 className="h-3 w-3" /> : index + 1}</span><span className={`mt-1 text-[9px] font-bold ${index <= currentStage ? "text-[var(--cu-text-primary)]" : "text-[var(--cu-text-tertiary)]"}`}>{stage}</span></div>{index < stages.length - 1 && <span className={`mt-2.5 h-px w-5 shrink-0 ${index < currentStage ? "bg-indigo-500" : "bg-[var(--cu-border-strong)]"}`} />}</React.Fragment>)}</div>;
}
function BudgetCard({ budget, formatMoney }: { budget: BudgetCategory; formatMoney: (amount: number) => string }) {
  const ratio = budget.allocatedAmount ? budget.spentAmount / budget.allocatedAmount * 100 : 0;
  return <Card padding="md"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-indigo-500">{budget.department}</p><h3 className="mt-1 text-sm font-black text-[var(--cu-text-primary)]">{budget.category}</h3><p className="mt-1 text-[11px] text-[var(--cu-text-tertiary)]">{budget.period} · {budget.manager || "Chưa có quản lý"}</p></div><Badge variant={ratio > 100 ? "danger" : ratio >= 80 ? "warning" : "success"}>{ratio.toFixed(0)}%</Badge></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--cu-surface-2)]"><div className={`h-full rounded-full ${ratio > 100 ? "bg-rose-500" : ratio >= 80 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></div><div className="mt-2 flex justify-between text-[11px] font-semibold text-[var(--cu-text-tertiary)]"><span>{formatMoney(budget.spentAmount)} đã chi</span><span>{formatMoney(budget.allocatedAmount)}</span></div></Card>;
}
function AiPanel({ messages, input, setInput, loading, onSend }: { messages: Array<{ sender: "user" | "ai"; text: string }>; input: string; setInput: (value: string) => void; loading: boolean; onSend: () => void }) {
  return <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-sm"><div className="flex items-center gap-3 border-b border-[var(--cu-border)] px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white"><Bot className="h-5 w-5" /></div><div><h2 className="text-sm font-black text-[var(--cu-text-primary)]">AI phân tích tài chính</h2><p className="text-[11px] text-[var(--cu-text-tertiary)]">Chỉ nhận ngữ cảnh số liệu hiện có</p></div><Badge className="ml-auto" variant="success"><ShieldCheck className="h-3 w-3" /> Dữ liệu thật</Badge></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">{messages.length ? messages.map((m, i) => <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${m.sender === "user" ? "bg-indigo-500 text-white" : "bg-[var(--cu-surface-2)] text-[var(--cu-text-secondary)]"}`}>{m.text}</div></div>) : <EmptyState icon={Sparkles} title="Hỏi về dữ liệu tài chính hiện tại" description="Ví dụ: Nhóm chi phí nào đang lớn nhất? Thanh khoản có đủ trả công nợ không?" />}{loading && <div className="flex items-center gap-2 text-xs font-bold text-indigo-500"><LoaderCircle className="h-4 w-4 animate-spin" />Đang phân tích…</div>}</div><div className="flex gap-2 border-t border-[var(--cu-border)] p-4"><input className={INPUT} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onSend(); }} placeholder="Đặt câu hỏi về số liệu hiện tại…" /><Button aria-label="Gửi" onClick={onSend} disabled={!input.trim() || loading}><Send className="h-4 w-4" /></Button></div></div>;
}

function FinanceModal({ title, onClose, maxWidth = "w-[min(95vw,576px)]", children }: { title: string; onClose: () => void; maxWidth?: string; children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><motion.div initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} className={`max-h-[90dvh] ${maxWidth} overflow-y-auto rounded-3xl border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-2xl`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--cu-border)] bg-[var(--cu-surface)]/95 px-5 py-4 backdrop-blur-xl"><h2 className="text-base font-black text-[var(--cu-text-primary)]">{title}</h2><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--cu-text-tertiary)] hover:bg-[var(--cu-surface-2)]"><X className="h-4 w-4" /></button></div><div className="p-5">{children}</div></motion.div></motion.div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className={LABEL}>{label}</span>{children}</label>; }
function SaveActions({ saving, label = "Lưu thông tin" }: { saving: boolean; label?: string }) { return <div className="flex justify-end border-t border-[var(--cu-border)] pt-4"><Button type="submit" loading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{label}</Button></div>; }

type ProfileFormState = FinanceProfile;
function ProfileForm({ form, setForm, saving, onSubmit }: { form: ProfileFormState; setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>; saving: boolean; onSubmit: (e: React.FormEvent) => void }) {
  const currentTabs = useMemo(() => {
    return form.enabledTabs && form.enabledTabs.length > 0
      ? form.enabledTabs
      : DEFAULT_TABS_BY_ENTITY[form.entityType];
  }, [form.enabledTabs, form.entityType]);

  const enabledSet = useMemo(() => new Set(currentTabs), [currentTabs]);

  const handleSelectEntityType = (entityType: EntityType) => {
    const defaultTabs = DEFAULT_TABS_BY_ENTITY[entityType];
    setForm(f => ({
      ...f,
      entityType,
      enabledTabs: defaultTabs,
    }));
  };

  const handleToggleTab = (tabId: FinanceTab) => {
    if (tabId === "cashbook") return;
    setForm(f => {
      const active = new Set(f.enabledTabs && f.enabledTabs.length > 0 ? f.enabledTabs : DEFAULT_TABS_BY_ENTITY[f.entityType]);
      if (active.has(tabId)) {
        active.delete(tabId);
      } else {
        active.add(tabId);
      }
      const newTabs = MODULE_METADATA.map(m => m.id).filter(id => active.has(id));
      return {
        ...f,
        enabledTabs: newTabs.length > 0 ? newTabs : ["cashbook"],
      };
    });
  };

  const handleResetToEntityDefaults = () => {
    setForm(f => ({
      ...f,
      enabledTabs: DEFAULT_TABS_BY_ENTITY[f.entityType],
    }));
  };

  const entityPresets: Array<{ type: EntityType; label: string; icon: React.ElementType; desc: string; badge: string }> = [
    {
      type: "individual",
      label: "Cá nhân",
      icon: User,
      desc: "Gọn gàng: Thu chi hàng ngày, quét hóa đơn AI, báo cáo tài chính",
      badge: "4 modules",
    },
    {
      type: "organization",
      label: "Tổ chức / Nhóm",
      icon: Users,
      desc: "Đầy đủ: Quản lý quỹ chung, lập ngân sách nhóm, phân bổ công nợ",
      badge: "6 modules",
    },
    {
      type: "business",
      label: "Doanh nghiệp",
      icon: Building2,
      desc: "Toàn diện: Hóa đơn VAT, đối soát công nợ, định mức ngân sách",
      badge: "7 modules",
    },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tên hồ sơ tài chính">
          <input
            className={INPUT}
            value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="Ví dụ: Tài chính cá nhân, Công ty TNHH Apexa..."
            required
          />
        </Field>
        <Field label="Đơn vị tiền tệ chính">
          <Select
            className="w-full"
            ariaLabel="Tiền tệ"
            value={form.currency}
            onChange={v => setForm(f => ({ ...f, currency: v as Currency }))}
            options={[
              { value: "VND", label: "VND (₫) - Đồng Việt Nam" },
              { value: "USD", label: "USD ($) - Đô la Mỹ" },
              { value: "EUR", label: "EUR (€) - Đồng Euro" },
            ]}
          />
        </Field>
      </div>

      {/* CHỌN LOẠI HÌNH & GỢI Ý MODULE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={LABEL}>1. Loại hình sử dụng (Tự động thiết lập cấu hình)</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {entityPresets.map(preset => {
            const Icon = preset.icon;
            const isSelected = form.entityType === preset.type;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => handleSelectEntityType(preset.type)}
                className={`relative flex flex-col rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500"
                    : "border-[var(--cu-border)] bg-[var(--cu-surface-2)]/40 hover:border-[var(--cu-border-strong)] hover:bg-[var(--cu-surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    isSelected ? "bg-indigo-500 text-white" : "bg-[var(--cu-surface)] text-[var(--cu-text-secondary)]"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    isSelected ? "bg-indigo-500/20 text-indigo-500" : "bg-[var(--cu-surface)] text-[var(--cu-text-tertiary)]"
                  }`}>
                    {preset.badge}
                  </span>
                </div>
                <h4 className="mt-2.5 text-xs font-black text-[var(--cu-text-primary)]">{preset.label}</h4>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--cu-text-tertiary)]">{preset.desc}</p>
                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TUỲ CHỈNH BẬT / TẮT MODULE CHI TIẾT */}
      <div className="space-y-2.5 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className={LABEL}>2. Tuỳ biến bật / tắt module tính năng ({enabledSet.size}/7 đang bật)</span>
            <p className="text-[11px] text-[var(--cu-text-tertiary)]">
              Chỉ hiển thị các phân hệ bạn cần. Bật thêm hoặc ẩn bớt bất kỳ lúc nào để tối ưu giao diện.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetToEntityDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cu-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--cu-text-secondary)] transition hover:border-indigo-500 hover:text-indigo-500"
            title="Khôi phục các module mặc định của loại hình đã chọn"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Gợi ý theo loại hình</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {MODULE_METADATA.map(mod => {
            const Icon = mod.icon;
            const isEnabled = enabledSet.has(mod.id);
            const isCore = mod.id === "cashbook";
            return (
              <div
                key={mod.id}
                onClick={() => !isCore && handleToggleTab(mod.id)}
                className={`relative flex items-start gap-3 rounded-2xl border p-3 transition ${
                  isCore ? "cursor-default" : "cursor-pointer"
                } ${
                  isEnabled
                    ? "border-indigo-500/40 bg-indigo-500/[0.04] hover:border-indigo-500"
                    : "border-[var(--cu-border)] bg-[var(--cu-surface-2)]/20 opacity-60 hover:opacity-100"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isEnabled ? "bg-indigo-500/10 text-indigo-500" : "bg-[var(--cu-surface-2)] text-[var(--cu-text-tertiary)]"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-black text-[var(--cu-text-primary)]">{mod.label}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      mod.tag === "Cốt lõi"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : mod.tag === "Doanh nghiệp"
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                        : mod.tag === "Nhóm & DN"
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                        : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                    }`}>
                      {mod.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--cu-text-tertiary)]">{mod.shortDesc}</p>
                </div>
                <div className="shrink-0 pt-0.5">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-lg border transition ${
                    isEnabled
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-[var(--cu-border-strong)] bg-[var(--cu-surface)] text-transparent"
                  }`}>
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SaveActions saving={saving} label="Lưu thiết lập hồ sơ & module" />
    </form>
  );
}
type AccountFormState = { bank: string; number: string; branch: string; type: string; balance: string };
function AccountForm({ form, setForm, saving, onSubmit }: { form: AccountFormState; setForm: React.Dispatch<React.SetStateAction<AccountFormState>>; saving: boolean; onSubmit: (e: React.FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Tên ngân hàng / quỹ"><input className={INPUT} value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} required /></Field><Field label="Số tài khoản"><input className={INPUT} value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required /></Field><Field label="Chi nhánh"><input className={INPUT} value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} /></Field><Field label="Số dư mở sổ"><input className={INPUT} type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} required /></Field></div><Field label="Loại tài khoản"><input className={INPUT} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></Field><SaveActions saving={saving} /></form>; }
type TxFormState = { accountId: string; date: string; category: string; amount: string; partner: string; note: string };
function TransactionForm({ form, setForm, type, setType, accounts, categories, saving, editing, onSubmit, onNeedAccount, onOpenCategoryManager }: { form: TxFormState; setForm: React.Dispatch<React.SetStateAction<TxFormState>>; type: "income" | "expense"; setType: (type: "income" | "expense") => void; accounts: BankAccount[]; categories: FinanceCategory[]; saving: boolean; editing: boolean; onSubmit: (e: React.FormEvent) => void; onNeedAccount: () => void; onOpenCategoryManager?: () => void }) {
  const relevantCategories = useMemo(() => categories.filter(c => c.type === type || c.type === "both"), [categories, type]);

  return <form onSubmit={onSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--cu-surface-2)] p-1"><button type="button" onClick={() => setType("income")} className={`h-9 rounded-lg text-xs font-black ${type === "income" ? "bg-emerald-500 text-white shadow-sm" : "text-[var(--cu-text-tertiary)]"}`}>Khoản thu</button><button type="button" onClick={() => setType("expense")} className={`h-9 rounded-lg text-xs font-black ${type === "expense" ? "bg-rose-500 text-white shadow-sm" : "text-[var(--cu-text-tertiary)]"}`}>Khoản chi</button></div>{accounts.length ? <><div className="grid grid-cols-2 gap-3"><Field label="Tài khoản"><Select className="w-full" ariaLabel="Tài khoản" value={form.accountId} onChange={v => setForm(f => ({ ...f, accountId: v }))} placeholder="Chọn tài khoản" menuWidth={320} options={accounts.map(a => ({ value: a.id, label: `${a.bank} · ${a.number}` }))} /></Field><Field label="Ngày"><input className={INPUT} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></Field><div><div className="mb-1.5 flex items-center justify-between"><span className={LABEL}>Hạng mục</span>{onOpenCategoryManager && <button type="button" onClick={onOpenCategoryManager} className="text-[10px] font-bold text-indigo-500 hover:underline">+ Quản lý danh mục</button>}</div><div className="relative"><input className={INPUT} list="tx-category-datalist" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Chọn hoặc nhập..." required /><datalist id="tx-category-datalist">{relevantCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</datalist></div></div><Field label="Số tiền"><input className={INPUT} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></Field></div><Field label={type === "income" ? "Khách hàng / Người nộp" : "Đối tác / Người nhận"}><input className={INPUT} value={form.partner} onChange={e => setForm(f => ({ ...f, partner: e.target.value }))} /></Field><Field label="Ghi chú"><textarea className={`${INPUT} h-20 py-2.5`} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></Field>{editing && <p className="rounded-xl bg-indigo-500/10 px-3 py-2 text-[11px] leading-5 text-indigo-600 dark:text-indigo-300">Khi đổi loại, số tiền hoặc tài khoản, hệ thống sẽ tự hoàn nguyên bút toán cũ và cập nhật số dư mới trong cùng một giao dịch.</p>}<SaveActions saving={saving} label={editing ? "Lưu thay đổi" : type === "income" ? "Ghi nhận khoản thu" : "Ghi nhận khoản chi"} /></> : <EmptyState icon={Landmark} title="Cần có tài khoản trước" description="Thêm tài khoản để ghi thu chi và cập nhật số dư chính xác." action={<Button type="button" onClick={onNeedAccount}>Thêm tài khoản</Button>} />}</form>;
}
type InvoiceFormState = { type: "out" | "in"; partnerName: string; taxCode: string; subtotal: string; vatRate: string; date: string; dueDate: string };
function InvoiceForm({ form, setForm, saving, onSubmit }: { form: InvoiceFormState; setForm: React.Dispatch<React.SetStateAction<InvoiceFormState>>; saving: boolean; onSubmit: (e: React.FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Loại hóa đơn"><Select className="w-full" ariaLabel="Loại hóa đơn" value={form.type} onChange={v => setForm(f => ({ ...f, type: v as "out" | "in" }))} options={[{ value: "out", label: "Bán ra" }, { value: "in", label: "Mua vào" }]} /></Field><Field label="Ngày hóa đơn"><input className={INPUT} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field></div><Field label="Khách hàng / Nhà cung cấp"><input className={INPUT} value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Mã số thuế"><input className={INPUT} value={form.taxCode} onChange={e => setForm(f => ({ ...f, taxCode: e.target.value }))} /></Field><Field label="Hạn thanh toán"><input className={INPUT} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field><Field label="Tiền trước thuế"><input className={INPUT} type="number" min="0" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} required /></Field><Field label="VAT (%)"><input className={INPUT} type="number" min="0" max="100" step="0.1" value={form.vatRate} onChange={e => setForm(f => ({ ...f, vatRate: e.target.value }))} /></Field></div><SaveActions saving={saving} /></form>; }
type DebtFormState = { type: "receivable" | "payable"; partnerName: string; totalAmount: string; paidAmount: string; dueDate: string; phone: string; email: string };
function DebtForm({ form, setForm, saving, onSubmit }: { form: DebtFormState; setForm: React.Dispatch<React.SetStateAction<DebtFormState>>; saving: boolean; onSubmit: (e: React.FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Loại công nợ"><Select className="w-full" ariaLabel="Loại công nợ" value={form.type} onChange={v => setForm(f => ({ ...f, type: v as DebtFormState["type"] }))} options={[{ value: "receivable", label: "Phải thu" }, { value: "payable", label: "Phải trả" }]} /></Field><Field label="Hạn thanh toán"><input className={INPUT} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field></div><Field label="Đối tác"><input className={INPUT} value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Tổng công nợ"><input className={INPUT} type="number" min="0" step="0.01" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} required /></Field><Field label="Đã thanh toán"><input className={INPUT} type="number" min="0" step="0.01" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} /></Field><Field label="Điện thoại"><input className={INPUT} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field><Field label="Email"><input className={INPUT} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field></div><SaveActions saving={saving} /></form>; }
type BudgetFormState = { department: string; category: string; allocatedAmount: string; spentAmount: string; period: string; manager: string };
function BudgetForm({ form, setForm, saving, onSubmit }: { form: BudgetFormState; setForm: React.Dispatch<React.SetStateAction<BudgetFormState>>; saving: boolean; onSubmit: (e: React.FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="Bộ phận"><input className={INPUT} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} required /></Field><Field label="Kỳ ngân sách"><input className={INPUT} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2026-08" /></Field></div><Field label="Hạng mục"><input className={INPUT} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Hạn mức"><input className={INPUT} type="number" min="0" step="0.01" value={form.allocatedAmount} onChange={e => setForm(f => ({ ...f, allocatedAmount: e.target.value }))} required /></Field><Field label="Đã sử dụng"><input className={INPUT} type="number" min="0" step="0.01" value={form.spentAmount} onChange={e => setForm(f => ({ ...f, spentAmount: e.target.value }))} /></Field></div><Field label="Người phụ trách"><input className={INPUT} value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} /></Field><SaveActions saving={saving} /></form>; }
type PaymentFormState = { amount: string; date: string; method: PaymentRecord["method"]; reference: string; note: string };
function PaymentForm({ target, form, setForm, payments, formatMoney, saving, onSubmit }: { target: PaymentTarget; form: PaymentFormState; setForm: React.Dispatch<React.SetStateAction<PaymentFormState>>; payments: PaymentRecord[]; formatMoney: (amount: number) => string; saving: boolean; onSubmit: (e: React.FormEvent) => void }) {
  const record = target.record;
  const total = target.kind === "debt" ? target.record.totalAmount : target.record.total;
  const paid = record.paidAmount;
  const remaining = record.remainingAmount;
  const title = target.kind === "debt" ? target.record.partnerName : `${target.record.code} · ${target.record.partnerName}`;
  const methodLabel = (method: PaymentRecord["method"]) => ({ bank_transfer: "Chuyển khoản", cash: "Tiền mặt", card: "Thẻ", other: "Khác" })[method];
  const setQuickAmount = (ratio: number) => setForm(current => ({ ...current, amount: String(Math.round(remaining * ratio * 100) / 100) }));
  return <form onSubmit={onSubmit} className="space-y-5"><div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black text-[var(--cu-text-primary)]">{title}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">{target.kind === "debt" ? "Công nợ" : "Hóa đơn"} · {paymentStage(total, paid)}</p></div><span className="text-sm font-black text-amber-500">{formatMoney(remaining)} còn lại</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--cu-surface)]"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${paymentProgress(total, paid)}%` }} /></div><div className="mt-2 flex justify-between text-[10px] font-semibold text-[var(--cu-text-tertiary)]"><span>Đã trả {formatMoney(paid)}</span><span>Tổng {formatMoney(total)}</span></div></div><div><span className={LABEL}>Số tiền thanh toán</span><div className="grid grid-cols-[1fr_auto] gap-2"><input autoFocus className={INPUT} type="number" min="0.01" max={remaining} step="0.01" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} placeholder="Nhập số tiền" required /><div className="flex gap-1"><button type="button" onClick={() => setQuickAmount(.25)} className="rounded-xl border border-[var(--cu-border)] px-2.5 text-[10px] font-black text-[var(--cu-text-secondary)] hover:border-indigo-500 hover:text-indigo-500">25%</button><button type="button" onClick={() => setQuickAmount(.5)} className="rounded-xl border border-[var(--cu-border)] px-2.5 text-[10px] font-black text-[var(--cu-text-secondary)] hover:border-indigo-500 hover:text-indigo-500">50%</button><button type="button" onClick={() => setQuickAmount(1)} className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 text-[10px] font-black text-indigo-500">Tất toán</button></div></div></div><div className="grid grid-cols-2 gap-3"><Field label="Ngày thanh toán"><input className={INPUT} type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} required /></Field><Field label="Phương thức"><Select className="w-full" ariaLabel="Phương thức" value={form.method} onChange={v => setForm(current => ({ ...current, method: v as PaymentRecord["method"] }))} options={[{ value: "bank_transfer", label: "Chuyển khoản" }, { value: "cash", label: "Tiền mặt" }, { value: "card", label: "Thẻ" }, { value: "other", label: "Khác" }]} /></Field></div><Field label="Mã tham chiếu / giao dịch"><input className={INPUT} value={form.reference} onChange={event => setForm(current => ({ ...current, reference: event.target.value }))} placeholder="Không bắt buộc" /></Field><Field label="Ghi chú"><textarea className={`${INPUT} h-20 py-2.5`} value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} placeholder="Nội dung đối soát…" /></Field>{payments.length > 0 && <div><p className={LABEL}>Lịch sử thanh toán</p><div className="max-h-40 divide-y divide-[var(--cu-border)] overflow-y-auto rounded-2xl border border-[var(--cu-border)]">{payments.map(payment => <div key={payment.id} className="flex items-center gap-3 px-3.5 py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-black text-[var(--cu-text-primary)]">{new Date(`${payment.date}T00:00:00`).toLocaleDateString("vi-VN")} · {methodLabel(payment.method)}</p><p className="truncate text-[10px] text-[var(--cu-text-tertiary)]">{payment.reference || payment.note || "Không có mã tham chiếu"}</p></div><span className="text-xs font-black text-emerald-500">{formatMoney(payment.amount)}</span></div>)}</div></div>}<p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[10px] leading-4 text-amber-600 dark:text-amber-400">Thanh toán sẽ cập nhật tiến độ và lưu lịch sử đối soát. Sổ thu chi chỉ thay đổi khi bạn ghi một giao dịch tương ứng.</p><SaveActions saving={saving} label="Ghi nhận thanh toán" /></form>;
}
function modalTitle(modal: Exclude<ModalType, null>) { return { profile: "Thiết lập hồ sơ", account: "Thêm tài khoản", transaction: "Ghi nhận thu / chi", invoice: "Tạo hóa đơn", debt: "Thêm công nợ", budget: "Tạo ngân sách", payment: "Ghi nhận thanh toán", categories: "Quản lý danh mục Thu & Chi", "receipt-scan": "Quét hóa đơn AI & Thêm khoản chi" }[modal]; }

export default FinanceHub;
