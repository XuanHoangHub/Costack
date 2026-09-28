"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight,
  BarChart2, BarChart3, Check, CheckCircle2, CircleDollarSign, Clock3,
  Download, FileSpreadsheet, Layers, PieChart as PieChartIcon,
  RotateCcw, Sliders, Sparkles, Target, TrendingDown, TrendingUp, Users, Zap
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AnimatedCounter } from "@/components/finance/AnimatedCounter";
import type { BankAccount, BudgetCategory, DebtRecord, FinanceTab, Invoice, Transaction } from "@/types/finance";
import { exportFinanceToExcel } from "@/utils/financeExport";
import { fireMilestoneConfetti } from "@/lib/confetti";

interface FinanceReportsDashboardProps {
  metrics: {
    income: number;
    expense: number;
    net: number;
    cash: number;
    receivable: number;
    payable: number;
    budget: number;
    spent: number;
    overdue?: number;
  };
  transactions: Transaction[];
  monthlyData: Array<{
    month: string;
    label: string;
    income: number;
    expense: number;
    net: number;
    profitMargin: string;
  }>;
  expenseBreakdown: Array<{
    name: string;
    value: number;
    count: number;
    percent: string;
    color: string;
  }>;
  incomeBreakdown: Array<{
    name: string;
    value: number;
    count: number;
    percent: string;
    color: string;
  }>;
  budgetComparison: Array<{
    name: string;
    department: string;
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
    ratio: string;
    status: string;
  }>;
  debtAgingData: Array<{
    label: string;
    receivable: number;
    payable: number;
  }>;
  debts?: DebtRecord[];
  budgets?: BudgetCategory[];
  accounts?: BankAccount[];
  invoices?: Invoice[];
  formatMoney: (amount: number) => string;
  compactMoney: (amount: number) => string;
  currency?: string;
  workspaceName?: string;
  activeSubTab: "pl" | "expense" | "income" | "budget" | "debt" | "simulator";
  setActiveSubTab: (tab: "pl" | "expense" | "income" | "budget" | "debt" | "simulator") => void;
  enabledTabs?: FinanceTab[];
  triggerToast?: (type: any, title: string, message: string) => void;
}

export function FinanceReportsDashboard({
  metrics,
  transactions,
  monthlyData,
  expenseBreakdown,
  incomeBreakdown,
  budgetComparison,
  debtAgingData,
  debts = [],
  budgets = [],
  accounts = [],
  invoices = [],
  formatMoney,
  compactMoney,
  currency = "VND",
  workspaceName,
  activeSubTab,
  setActiveSubTab,
  enabledTabs = ["overview", "cashbook", "invoices", "debts", "budgets", "reports", "ai-agent"],
  triggerToast,
}: FinanceReportsDashboardProps) {
  const enabledSet = useMemo(() => new Set(enabledTabs), [enabledTabs]);
  const [exporting, setExporting] = useState(false);

  // Runway simulator interactive sliders state
  const [revenueMultiplier, setRevenueMultiplier] = useState(0); // -30% to +50%
  const [expenseMultiplier, setExpenseMultiplier] = useState(0); // -30% to +50%

  // Danh sách các tab phụ
  const subTabs = useMemo(() => {
    const all = [
      { id: "pl" as const, label: "Kết quả Kinh doanh (P&L)", icon: Activity },
      { id: "expense" as const, label: "Cơ cấu Chi phí & Pareto", icon: PieChartIcon },
      { id: "income" as const, label: "Cơ cấu Nguồn thu", icon: TrendingUp },
      { id: "budget" as const, label: "Phương sai Ngân sách", icon: Target, moduleReq: "budgets" as FinanceTab },
      { id: "debt" as const, label: "Tuổi nợ & Thu hồi", icon: Clock3, moduleReq: "debts" as FinanceTab },
      { id: "simulator" as const, label: "Mô phỏng Quỹ (Runway)", icon: Sliders },
    ];
    return all.filter(t => !t.moduleReq || enabledSet.has(t.moduleReq));
  }, [enabledSet]);

  // Phân tích Pareto 80/20 của chi phí
  const paretoAnalysis = useMemo(() => {
    if (!expenseBreakdown.length) return null;
    const total = metrics.expense || 1;
    let accumulated = 0;
    const items = expenseBreakdown.map((item, idx) => {
      accumulated += item.value;
      const cumPercent = (accumulated / total) * 100;
      return {
        ...item,
        cumPercent: cumPercent.toFixed(1),
        isTop20PercentCount: idx < Math.ceil(expenseBreakdown.length * 0.2),
      };
    });

    const top80Items = items.filter(i => Number(i.cumPercent) <= 85);
    return {
      items,
      topCount: top80Items.length || 1,
      totalCount: items.length,
      topShare: top80Items.length > 0 ? top80Items[top80Items.length - 1].cumPercent : "0",
    };
  }, [expenseBreakdown, metrics.expense]);

  // Top đối tác doanh thu
  const topRevenuePartners = useMemo(() => {
    const map = new Map<string, { partner: string; amount: number; count: number }>();
    transactions.filter(t => t.type === "income" && t.status === "approved").forEach(t => {
      const p = t.partner?.trim() || "Khách lẻ / Khác";
      const cur = map.get(p) || { partner: p, amount: 0, count: 0 };
      cur.amount += t.amount;
      cur.count += 1;
      map.set(p, cur);
    });
    return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [transactions]);

  // Dynamic Runway Simulation Calculations
  const simulationResults = useMemo(() => {
    const baseMonthlyExpense = metrics.expense > 0 ? (metrics.expense / (monthlyData.length || 1)) : 1;
    const baseMonthlyIncome = metrics.income > 0 ? (metrics.income / (monthlyData.length || 1)) : 0;

    const adjustedMonthlyExpense = baseMonthlyExpense * (1 + expenseMultiplier / 100);
    const adjustedMonthlyIncome = baseMonthlyIncome * (1 + revenueMultiplier / 100);
    const netBurnRate = adjustedMonthlyExpense - adjustedMonthlyIncome;

    let simulatedRunway = 0;
    if (netBurnRate <= 0) {
      simulatedRunway = 999;
    } else {
      simulatedRunway = metrics.cash / netBurnRate;
    }

    return {
      adjustedMonthlyExpense,
      adjustedMonthlyIncome,
      netBurnRate,
      simulatedRunway: Math.max(0, simulatedRunway),
      isCashFlowPositive: netBurnRate <= 0,
    };
  }, [metrics.expense, metrics.income, metrics.cash, monthlyData.length, expenseMultiplier, revenueMultiplier]);

  // Xuất file Excel kèm Confetti
  const handleExport = async () => {
    try {
      setExporting(true);
      await exportFinanceToExcel({
        workspaceName: workspaceName || "Costack",
        currency,
        generatedDate: new Date().toISOString().slice(0, 10),
        monthlyData,
        transactions,
        debts,
        budgets,
        accounts,
        invoices,
        metrics,
      });
      fireMilestoneConfetti();
      triggerToast?.("success", "Xuất file thành công!", "Báo cáo tài chính chuẩn Excel đã được lưu.");
    } catch (err) {
      triggerToast?.("error", "Lỗi xuất báo cáo", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto max-w-[1760px] space-y-4"
    >
      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER & SUB-TAB NAVIGATION WITH SLIDING PILL           */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-2.5 shadow-xs backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className="relative flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
              >
                {active && (
                  <motion.div
                    layoutId="reportsSubTabPill"
                    className="absolute inset-0 rounded-xl bg-indigo-500 shadow-xs"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${active ? "text-white" : ""}`}>
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs font-bold text-[var(--cu-text-tertiary)]">
            Lợi nhuận ròng:{" "}
            <span className={`font-black ${metrics.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {formatMoney(metrics.net)}
            </span>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
            >
              {exporting ? "Đang xuất..." : "Xuất Excel Báo cáo"}
            </Button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {/* ═══════════════════════════════════════════════════════ */}
          {/* 1. KẾT QUẢ KINH DOANH (P&L Trend & Statement)           */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeSubTab === "pl" && (
            <div className="space-y-4">
              <section className="grid gap-3 sm:grid-cols-4">
                <Card padding="md" className="border-[var(--cu-border)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                    Tổng doanh thu thuần
                  </span>
                  <p className="mt-1.5 text-xl font-black text-emerald-500">
                    <AnimatedCounter value={metrics.income} formatter={formatMoney} />
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--cu-text-tertiary)]">Các khoản thu đã duyệt</p>
                </Card>

                <Card padding="md" className="border-[var(--cu-border)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                    Tổng chi phí hoạt động
                  </span>
                  <p className="mt-1.5 text-xl font-black text-rose-500">
                    <AnimatedCounter value={metrics.expense} formatter={formatMoney} />
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--cu-text-tertiary)]">Chi phí thực tế phát sinh</p>
                </Card>

                <Card padding="md" className="border-[var(--cu-border)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                    Lợi nhuận ròng (Net Profit)
                  </span>
                  <p className={`mt-1.5 text-xl font-black ${metrics.net >= 0 ? "text-indigo-500" : "text-rose-500"}`}>
                    <AnimatedCounter value={metrics.net} formatter={formatMoney} />
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--cu-text-tertiary)]">
                    {metrics.net >= 0 ? "Thặng dư tài chính" : "Thâm hụt cần cân đối"}
                  </p>
                </Card>

                <Card padding="md" className="border-[var(--cu-border)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                    Tỷ suất sinh lời ròng
                  </span>
                  <p className={`mt-1.5 text-xl font-black ${metrics.net >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                    {metrics.income > 0 ? `${((metrics.net / metrics.income) * 100).toFixed(1)}%` : "0%"}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--cu-text-tertiary)]">Trên tổng doanh thu</p>
                </Card>
              </section>

              {/* Biểu đồ P&L đa trục */}
              <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                <div className="border-b border-[var(--cu-border)] px-5 py-4">
                  <h2 className="text-sm font-black text-[var(--cu-text-primary)]">
                    Biểu đồ Kết quả Hoạt động (Doanh thu - Chi phí - Lợi nhuận)
                  </h2>
                  <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                    Cột đôi so sánh Doanh thu vs Chi phí và đường biểu diễn Lợi nhuận ròng từng kỳ
                  </p>
                </div>

                {monthlyData.length > 0 ? (
                  <div className="h-[340px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                        <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                        <Tooltip content={<ModernTooltip formatMoney={formatMoney} />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                        <Bar dataKey="income" name="Doanh thu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="expense" name="Chi phí" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Line type="monotone" dataKey="net" name="Lợi nhuận ròng" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-xs text-[var(--cu-text-tertiary)]">
                    Chưa có dữ liệu P&L
                  </div>
                )}
              </Card>

              {/* Bảng kê chi tiết P&L theo tháng */}
              <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                <div className="border-b border-[var(--cu-border)] px-5 py-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[var(--cu-text-primary)]">
                    Bảng Báo cáo Kết quả Kinh doanh theo Kỳ
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--cu-surface-2)]/60 text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                      <tr>
                        <th className="px-5 py-3">Kỳ giao dịch</th>
                        <th className="px-5 py-3 text-right">Doanh thu</th>
                        <th className="px-5 py-3 text-right">Chi phí</th>
                        <th className="px-5 py-3 text-right">Lợi nhuận ròng</th>
                        <th className="px-5 py-3 text-right">Biên LN %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--cu-border)]">
                      {monthlyData.map(row => (
                        <tr key={row.month} className="hover:bg-[var(--cu-surface-2)]/30 transition">
                          <td className="px-5 py-3 font-bold text-[var(--cu-text-primary)]">{row.label}</td>
                          <td className="px-5 py-3 text-right font-black text-emerald-500">{formatMoney(row.income)}</td>
                          <td className="px-5 py-3 text-right font-black text-rose-500">{formatMoney(row.expense)}</td>
                          <td className={`px-5 py-3 text-right font-black ${row.net >= 0 ? "text-indigo-500" : "text-rose-500"}`}>
                            {formatMoney(row.net)}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-[var(--cu-text-secondary)]">
                            {row.profitMargin}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* 2. CƠ CẤU CHI PHÍ & NGUYÊN LÝ PARETO 80/20              */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeSubTab === "expense" && (
            <div className="space-y-4">
              {paretoAnalysis && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4 text-xs">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        Phân tích Pareto 80/20:{" "}
                      </span>
                      <span className="text-[var(--cu-text-secondary)]">
                        Chỉ <strong>{paretoAnalysis.topCount} / {paretoAnalysis.totalCount}</strong> nhóm danh mục hàng đầu đã chiếm tới <strong>{paretoAnalysis.topShare}%</strong> tổng chi tiêu. Hãy tập trung tối ưu các nhóm này trước để đạt hiệu quả cao nhất.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
                <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                  <div className="border-b border-[var(--cu-border)] px-5 py-4">
                    <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                      Biểu đồ Phân bổ Cơ cấu Chi phí
                    </h3>
                    <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                      Tổng chi phí: {formatMoney(metrics.expense)}
                    </p>
                  </div>

                  {expenseBreakdown.length > 0 ? (
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
                              <Cell key={`exp-${index}`} fill={entry.color} stroke="var(--cu-surface)" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip content={<ModernPieTooltip formatMoney={formatMoney} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-xs text-[var(--cu-text-tertiary)]">
                      Chưa có chi phí nào
                    </div>
                  )}
                </Card>

                <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                  <div className="border-b border-[var(--cu-border)] px-5 py-4">
                    <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                      Chi tiết Từng Hạng mục Chi
                    </h3>
                    <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                      Sắp xếp theo số tiền lớn nhất
                    </p>
                  </div>

                  <div className="divide-y divide-[var(--cu-border)] max-h-[360px] overflow-y-auto">
                    {expenseBreakdown.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-[var(--cu-surface-2)]/30 transition">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-[var(--cu-text-primary)]">{item.name}</p>
                          <p className="text-[10px] text-[var(--cu-text-tertiary)]">{item.count} chứng từ</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-rose-500">{formatMoney(item.value)}</p>
                          <p className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">{item.percent}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* 3. CƠ CẤU DOANH THU & TOP KHÁCH HÀNG / ĐỐI TÁC          */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeSubTab === "income" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
                <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                  <div className="border-b border-[var(--cu-border)] px-5 py-4">
                    <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                      Biểu đồ Cơ cấu Nguồn thu
                    </h3>
                    <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                      Tổng thu nhập: {formatMoney(metrics.income)}
                    </p>
                  </div>

                  {incomeBreakdown.length > 0 ? (
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
                              <Cell key={`inc-${index}`} fill={entry.color} stroke="var(--cu-surface)" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip content={<ModernPieTooltip formatMoney={formatMoney} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-xs text-[var(--cu-text-tertiary)]">
                      Chưa có nguồn thu nào
                    </div>
                  )}
                </Card>

                <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                  <div className="border-b border-[var(--cu-border)] px-5 py-4">
                    <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                      Top Đối tác / Khách hàng Hàng đầu
                    </h3>
                    <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                      Đóng góp doanh thu lớn nhất
                    </p>
                  </div>

                  <div className="divide-y divide-[var(--cu-border)] max-h-[360px] overflow-y-auto">
                    {topRevenuePartners.length > 0 ? (
                      topRevenuePartners.map((item, idx) => (
                        <div key={item.partner} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-[var(--cu-surface-2)]/30 transition">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[10px] font-black text-emerald-600">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-[var(--cu-text-primary)]">{item.partner}</p>
                            <p className="text-[10px] text-[var(--cu-text-tertiary)]">{item.count} giao dịch</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-emerald-500">{formatMoney(item.amount)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-[var(--cu-text-tertiary)]">
                        Chưa có dữ liệu đối tác
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* 4. PHƯƠNG SAI NGÂN SÁCH (Budget Variance Analysis)       */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeSubTab === "budget" && (
            <div className="space-y-4">
              <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                <div className="border-b border-[var(--cu-border)] px-5 py-4">
                  <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                    So sánh Hạn mức Cấp vs Thực tế Đã chi
                  </h3>
                  <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                    Kiểm soát tỷ lệ sử dụng ngân sách các phòng ban
                  </p>
                </div>

                {budgetComparison.length > 0 ? (
                  <div className="h-[360px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetComparison} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                        <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                        <Tooltip content={<ModernTooltip formatMoney={formatMoney} />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                        <Bar dataKey="allocated" name="Hạn mức cấp" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="spent" name="Thực tế đã chi" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-xs text-[var(--cu-text-tertiary)]">
                    Chưa có dữ liệu ngân sách
                  </div>
                )}
              </Card>

              {/* Bảng Phương sai chi tiết */}
              <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                <div className="border-b border-[var(--cu-border)] px-5 py-3.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--cu-text-primary)]">
                    Bảng Phương sai & Trạng thái Hạn mức
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--cu-surface-2)]/60 text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                      <tr>
                        <th className="px-5 py-3">Phòng ban · Hạng mục</th>
                        <th className="px-5 py-3 text-right">Hạn mức</th>
                        <th className="px-5 py-3 text-right">Đã chi</th>
                        <th className="px-5 py-3 text-right">Còn lại</th>
                        <th className="px-5 py-3 text-right">Tỷ lệ dùng</th>
                        <th className="px-5 py-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--cu-border)]">
                      {budgetComparison.map(row => {
                        const isExceeded = Number(row.ratio) > 100;
                        const isWarning = Number(row.ratio) >= 80 && !isExceeded;
                        return (
                          <tr key={row.name} className="hover:bg-[var(--cu-surface-2)]/30 transition">
                            <td className="px-5 py-3 font-bold text-[var(--cu-text-primary)]">{row.name}</td>
                            <td className="px-5 py-3 text-right font-black">{formatMoney(row.allocated)}</td>
                            <td className="px-5 py-3 text-right font-black text-rose-500">{formatMoney(row.spent)}</td>
                            <td className="px-5 py-3 text-right font-black text-emerald-500">{formatMoney(row.remaining)}</td>
                            <td className="px-5 py-3 text-right font-bold">{row.ratio}%</td>
                            <td className="px-5 py-3 text-center">
                              <Badge variant={isExceeded ? "danger" : isWarning ? "warning" : "success"} size="xs">
                                {isExceeded ? "Vượt hạn mức" : isWarning ? "Cảnh báo" : "An toàn"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* 5. CƠ CẤU TUỔI NỢ & THU HỒI CÔNG NỢ (Debt Aging)         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeSubTab === "debt" && (
            <div className="space-y-4">
              <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
                <div className="border-b border-[var(--cu-border)] px-5 py-4">
                  <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                    Biểu đồ Phân tích Cơ cấu Tuổi nợ (Debt Aging Matrix)
                  </h3>
                  <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                    So sánh công nợ phải thu và phải trả theo từng mốc thời gian quá hạn
                  </p>
                </div>

                {debtAgingData.some(d => d.receivable > 0 || d.payable > 0) ? (
                  <div className="h-[360px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={debtAgingData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                        <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                        <Tooltip content={<ModernTooltip formatMoney={formatMoney} />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                        <Bar dataKey="receivable" name="Nợ phải thu (KH)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="payable" name="Nợ phải trả (NCC)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-xs text-[var(--cu-text-tertiary)]">
                    Không có dữ liệu công nợ
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* 6. MÔ PHỎNG QUỸ TIỀN & RUNWAY SIMULATOR                 */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeSubTab === "simulator" && (
            <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
              <div className="border-b border-[var(--cu-border)] px-5 py-4">
                <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                  Mô phỏng Quỹ tiền & Dự báo Thời gian Sống (Runway Planner)
                </h3>
                <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                  Kéo thanh trượt để điều chỉnh doanh thu và chi phí dự kiến, hệ thống sẽ tính toán ngay độ an toàn của quỹ
                </p>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-2">
                {/* Thanh trượt điều khiển */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[var(--cu-text-primary)]">Biến động Doanh thu Dự kiến</span>
                      <span className={revenueMultiplier >= 0 ? "text-emerald-500 font-black" : "text-rose-500 font-black"}>
                        {revenueMultiplier > 0 ? `+${revenueMultiplier}%` : `${revenueMultiplier}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="50"
                      step="5"
                      value={revenueMultiplier}
                      onChange={e => setRevenueMultiplier(Number(e.target.value))}
                      className="mt-2 w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--cu-text-tertiary)]">
                      <span>-30%</span>
                      <span>0% (Hiện tại)</span>
                      <span>+50%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[var(--cu-text-primary)]">Biến động Chi phí Hoạt động</span>
                      <span className={expenseMultiplier > 0 ? "text-rose-500 font-black" : "text-emerald-500 font-black"}>
                        {expenseMultiplier > 0 ? `+${expenseMultiplier}%` : `${expenseMultiplier}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="50"
                      step="5"
                      value={expenseMultiplier}
                      onChange={e => setExpenseMultiplier(Number(e.target.value))}
                      className="mt-2 w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--cu-text-tertiary)]">
                      <span>-30% (Tiết kiệm)</span>
                      <span>0% (Hiện tại)</span>
                      <span>+50%</span>
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRevenueMultiplier(0); setExpenseMultiplier(0); }}
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      Đặt lại mặc định
                    </Button>
                  </motion.div>
                </div>

                {/* Kết quả tính toán mô phỏng */}
                <div className="flex flex-col justify-between rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface-2)]/30 p-5 shadow-2xs">
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                      Kết quả Mô phỏng Tự động
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tight text-[var(--cu-text-primary)]">
                        {simulationResults.isCashFlowPositive
                          ? "Dương dòng tiền"
                          : `${simulationResults.simulatedRunway.toFixed(1)} tháng`}
                      </span>
                      {!simulationResults.isCashFlowPositive && (
                        <span className="text-xs font-bold text-[var(--cu-text-tertiary)]">quỹ an toàn</span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-[var(--cu-text-secondary)]">
                      {simulationResults.isCashFlowPositive
                        ? "Doanh thu dự kiến vượt chi phí hoạt động! Doanh nghiệp hoàn toàn tự chủ tài chính mà không lo cạn quỹ."
                        : `Với mức chi tiêu ${formatMoney(simulationResults.adjustedMonthlyExpense)}/tháng và doanh thu ${formatMoney(simulationResults.adjustedMonthlyIncome)}/tháng, quỹ dự phòng ${formatMoney(metrics.cash)} sẽ duy trì an toàn trong khoảng ${simulationResults.simulatedRunway.toFixed(1)} tháng.`}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--cu-border)] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--cu-text-tertiary)]">Mức chi mô phỏng/tháng</span>
                      <p className="font-bold text-rose-500">{formatMoney(simulationResults.adjustedMonthlyExpense)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--cu-text-tertiary)]">Thu mô phỏng/tháng</span>
                      <p className="font-bold text-emerald-500">{formatMoney(simulationResults.adjustedMonthlyIncome)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// -------------------------------------------------------------
// TOOLTIPS
// -------------------------------------------------------------
function ModernTooltip({ active, payload, label, formatMoney }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)]/95 p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[180px]">
      <p className="border-b border-[var(--cu-border)] pb-1.5 mb-2 font-black text-[var(--cu-text-primary)]">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
              <span className="font-semibold text-[var(--cu-text-secondary)]">{entry.name}:</span>
            </div>
            <span className="font-black text-[var(--cu-text-primary)]">
              {formatMoney(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModernPieTooltip({ active, payload, formatMoney }: any) {
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
