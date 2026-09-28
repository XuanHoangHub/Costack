"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight,
  BarChart2, BarChart3, Building2, Calendar, Camera, Check, CheckCircle2,
  CircleDollarSign, Clock3, Copy, CreditCard, Download, ExternalLink,
  Flame, Landmark, Layers, LayoutDashboard, Plus, ReceiptText,
  RotateCcw, Sparkles, Tag, Target, TrendingDown, TrendingUp,
  Wallet, WalletCards, X, Zap, ArrowRight
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { AccountBankIcon } from "@/components/finance/AccountBankIcon";
import { FinanceHealthCard } from "@/components/finance/FinanceHealthCard";
import { AnimatedCounter } from "@/components/finance/AnimatedCounter";
import { MiniSparkline } from "@/components/finance/MiniSparkline";
import type { BankAccount, BudgetCategory, DebtRecord, FinanceTab, Invoice, Transaction } from "@/types/finance";
import { exportFinanceToExcel } from "@/utils/financeExport";
import { fireMilestoneConfetti } from "@/lib/confetti";

interface FinanceOverviewDashboardProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  debts: DebtRecord[];
  budgets: BudgetCategory[];
  invoices?: Invoice[];
  metrics: {
    income: number;
    expense: number;
    net: number;
    cash: number;
    receivable: number;
    payable: number;
    budget: number;
    spent: number;
    overdue: number;
  };
  monthlyData: Array<{
    month: string;
    label: string;
    income: number;
    expense: number;
    net: number;
    profitMargin: string;
  }>;
  accountDistribution: Array<{
    name: string;
    number: string;
    balance: number;
    value: number;
    percent: string;
    color: string;
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
  forecast: {
    inflow: number;
    outflow: number;
    projectedCash: number;
    liquidityCoverage: number | null;
    budgetUsage: number | null;
  };
  formatMoney: (amount: number) => string;
  compactMoney: (amount: number) => string;
  currency: string;
  workspaceName?: string;
  enabledModules: Set<FinanceTab>;
  onOpenTransaction: (type?: "income" | "expense") => void;
  onOpenReceiptScan: () => void;
  onOpenAddAccount: () => void;
  onNavigateToTab: (tab: FinanceTab) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export function FinanceOverviewDashboard({
  accounts,
  transactions,
  debts,
  budgets,
  invoices,
  metrics,
  monthlyData,
  accountDistribution,
  expenseBreakdown,
  incomeBreakdown,
  forecast,
  formatMoney,
  compactMoney,
  currency,
  workspaceName,
  enabledModules,
  onOpenTransaction,
  onOpenReceiptScan,
  onOpenAddAccount,
  onNavigateToTab,
  triggerToast,
}: FinanceOverviewDashboardProps) {
  // Chart control states
  const [chartMode, setChartMode] = useState<"flow" | "net" | "cumulative" | "margin">("flow");
  const [chartVisualType, setChartVisualType] = useState<"area" | "bar" | "line">("area");
  const [timePeriod, setTimePeriod] = useState<"3m" | "6m" | "12m" | "all">("6m");
  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);
  const [forecastScenario, setForecastScenario] = useState<"base" | "optimistic" | "conservative">("base");
  const [exporting, setExporting] = useState(false);

  // Lọc dữ liệu chuỗi thời gian theo kỳ đã chọn
  const filteredMonthlyData = useMemo(() => {
    const sliceCount = timePeriod === "3m" ? 3 : timePeriod === "6m" ? 6 : timePeriod === "12m" ? 12 : monthlyData.length;
    const sliced = monthlyData.slice(-sliceCount);

    let runningCumulative = 0;
    return sliced.map((item, idx, arr) => {
      runningCumulative += item.net;
      const window = arr.slice(Math.max(0, idx - 2), idx + 1);
      const avgNet = window.reduce((s, w) => s + w.net, 0) / window.length;

      return {
        ...item,
        cumulative: runningCumulative,
        movingAvgNet: Math.round(avgNet),
      };
    });
  }, [monthlyData, timePeriod]);

  // Sparkline data series
  const sparklineData = useMemo(() => {
    const incomeSeries = monthlyData.slice(-6).map(m => m.income);
    const expenseSeries = monthlyData.slice(-6).map(m => m.expense);
    const netSeries = monthlyData.slice(-6).map(m => m.net);
    const cashSeries = monthlyData.slice(-6).map(m => m.income - m.expense * 0.8);
    return { incomeSeries, expenseSeries, netSeries, cashSeries };
  }, [monthlyData]);

  // Thống kê tóm tắt biểu đồ
  const chartSummary = useMemo(() => {
    if (!filteredMonthlyData.length) return null;
    const maxIncome = Math.max(...filteredMonthlyData.map(d => d.income));
    const maxExpense = Math.max(...filteredMonthlyData.map(d => d.expense));
    const avgNet = filteredMonthlyData.reduce((s, d) => s + d.net, 0) / filteredMonthlyData.length;
    return { maxIncome, maxExpense, avgNet };
  }, [filteredMonthlyData]);

  // Burn rate & Runway calculation
  const burnRateStats = useMemo(() => {
    const count = filteredMonthlyData.length || 1;
    const totalExp = filteredMonthlyData.reduce((s, m) => s + m.expense, 0);
    const avgMonthlyExpense = totalExp > 0 ? totalExp / count : (metrics.expense > 0 ? metrics.expense : 1);
    const runwayMonths = avgMonthlyExpense > 0 ? metrics.cash / avgMonthlyExpense : 12;

    let expenseMoM = 0;
    if (monthlyData.length >= 2) {
      const last = monthlyData[monthlyData.length - 1].expense;
      const prev = monthlyData[monthlyData.length - 2].expense;
      if (prev > 0) expenseMoM = ((last - prev) / prev) * 100;
    }

    let incomeMoM = 0;
    if (monthlyData.length >= 2) {
      const last = monthlyData[monthlyData.length - 1].income;
      const prev = monthlyData[monthlyData.length - 2].income;
      if (prev > 0) incomeMoM = ((last - prev) / prev) * 100;
    }

    return {
      avgMonthlyExpense,
      runwayMonths: Number.isFinite(runwayMonths) ? runwayMonths : 12,
      expenseMoM,
      incomeMoM,
    };
  }, [filteredMonthlyData, metrics.cash, metrics.expense, monthlyData]);

  // Dynamic simulation forecast
  const simulatedForecast = useMemo(() => {
    const horizonDate = new Date();
    horizonDate.setDate(horizonDate.getDate() + forecastHorizon);
    horizonDate.setHours(23, 59, 59, 999);

    const dueDebts = debts.filter(d => d.remainingAmount > 0 && new Date(`${d.dueDate}T23:59:59`).getTime() <= horizonDate.getTime());
    let inflow = dueDebts.filter(d => d.type === "receivable").reduce((s, d) => s + d.remainingAmount, 0);
    let outflow = dueDebts.filter(d => d.type === "payable").reduce((s, d) => s + d.remainingAmount, 0);

    if (forecastScenario === "optimistic") {
      inflow *= 1.15;
      outflow *= 0.95;
    } else if (forecastScenario === "conservative") {
      inflow *= 0.85;
      outflow *= 1.1;
    }

    const projectedCash = metrics.cash + inflow - outflow;
    const liquidityRatio = outflow > 0 ? (metrics.cash + inflow) / outflow : 2.5;

    return {
      inflow,
      outflow,
      projectedCash,
      liquidityRatio,
      safe: projectedCash >= 0,
    };
  }, [forecastHorizon, forecastScenario, debts, metrics.cash]);

  // Phát hiện giao dịch bất thường (Anomaly/Spike detection)
  const anomalies = useMemo(() => {
    if (transactions.length < 5) return [];
    const expenses = transactions.filter(t => t.type === "expense" && t.status === "approved");
    if (!expenses.length) return [];
    const avg = expenses.reduce((s, t) => s + t.amount, 0) / expenses.length;
    return expenses.filter(t => t.amount > avg * 2.5).slice(0, 2);
  }, [transactions]);

  // Xuất báo cáo tài chính sang Excel kèm hiệu ứng pháo hoa Confetti
  const handleExportExcel = async () => {
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
      triggerToast?.("success", "Xuất báo cáo thành công!", "Tệp Excel chuyên nghiệp đã được tải về máy.");
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
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-[1760px] space-y-5"
    >
      {/* ═══════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & QUICK ACTION BAR                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-3.5 shadow-xs backdrop-blur-md">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20"
            >
              <LayoutDashboard className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-[var(--cu-text-primary)]">
                  Bảng điều khiển Tài chính
                </h1>
                <Badge variant="glass" size="xs">
                  <span className="relative flex h-1.5 w-1.5 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Realtime Sync
                </Badge>
              </div>
              <p className="text-xs text-[var(--cu-text-tertiary)]">
                Dòng tiền thực tế, chỉ số thanh khoản và dự báo mô phỏng thông minh
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportExcel}
                disabled={exporting}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                {exporting ? "Đang tạo..." : "Xuất Excel"}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenReceiptScan}
                leftIcon={<Camera className="h-3.5 w-3.5 text-rose-500" />}
              >
                Quét HĐ AI
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenTransaction("expense")}
                leftIcon={<ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />}
              >
                Ghi Chi
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                onClick={() => onOpenTransaction("income")}
                leftIcon={<ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />}
                className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                Ghi Thu
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 2. EXECUTIVE 6-KPI BENTO GRID WITH SPARKLINES           */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Tổng số dư quỹ */}
        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card padding="md" className="relative overflow-hidden border-[var(--cu-border)] flex flex-col justify-between h-full group hover:border-[var(--cu-border-strong)] transition-all">
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  Tổng số dư tiền
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition-transform group-hover:scale-110">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-black tracking-tight text-[var(--cu-text-primary)]">
                <AnimatedCounter value={metrics.cash} formatter={formatMoney} />
              </p>
            </div>
            <div className="mt-2">
              <MiniSparkline data={sparklineData.cashSeries} color="#6366f1" height={26} />
              <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--cu-text-tertiary)]">
                <span>{accounts.length} tài khoản & ví</span>
                <button
                  type="button"
                  onClick={onOpenAddAccount}
                  className="font-bold text-indigo-500 hover:underline"
                >
                  + Thêm
                </button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI 2: Dòng tiền thu */}
        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card padding="md" className="relative overflow-hidden border-[var(--cu-border)] flex flex-col justify-between h-full group hover:border-[var(--cu-border-strong)] transition-all">
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  Tổng dòng thu
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-black tracking-tight text-emerald-500">
                <AnimatedCounter value={metrics.income} formatter={formatMoney} />
              </p>
            </div>
            <div className="mt-2">
              <MiniSparkline data={sparklineData.incomeSeries} color="#10b981" height={26} positive={true} />
              <div className="mt-1 flex items-center justify-between text-[10px]">
                {burnRateStats.incomeMoM !== 0 ? (
                  <span className={`flex items-center font-bold ${burnRateStats.incomeMoM > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {burnRateStats.incomeMoM > 0 ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
                    {burnRateStats.incomeMoM > 0 ? "+" : ""}{burnRateStats.incomeMoM.toFixed(1)}% MoM
                  </span>
                ) : (
                  <span className="text-[var(--cu-text-tertiary)]">Giao dịch đã duyệt</span>
                )}
                <span className="text-[var(--cu-text-tertiary)] font-medium">6 kỳ gần nhất</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI 3: Chi phí hoạt động */}
        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card padding="md" className="relative overflow-hidden border-[var(--cu-border)] flex flex-col justify-between h-full group hover:border-[var(--cu-border-strong)] transition-all">
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  Chi phí thực chi
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 transition-transform group-hover:scale-110">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-black tracking-tight text-rose-500">
                <AnimatedCounter value={metrics.expense} formatter={formatMoney} />
              </p>
            </div>
            <div className="mt-2">
              <MiniSparkline data={sparklineData.expenseSeries} color="#f43f5e" height={26} positive={false} />
              <div className="mt-1 flex items-center justify-between text-[10px]">
                {burnRateStats.expenseMoM !== 0 ? (
                  <span className={`flex items-center font-bold ${burnRateStats.expenseMoM > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                    {burnRateStats.expenseMoM > 0 ? "+" : ""}{burnRateStats.expenseMoM.toFixed(1)}% vs kỳ trước
                  </span>
                ) : (
                  <span className="text-[var(--cu-text-tertiary)]">Đã duyệt chi</span>
                )}
                <span className="text-[var(--cu-text-tertiary)] font-medium">6 kỳ gần nhất</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI 4: Dòng tiền ròng & Biên LN */}
        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card padding="md" className="relative overflow-hidden border-[var(--cu-border)] flex flex-col justify-between h-full group hover:border-[var(--cu-border-strong)] transition-all">
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  Dòng tiền ròng (Net)
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${metrics.net >= 0 ? "bg-indigo-500/10 text-indigo-500" : "bg-amber-500/10 text-amber-500"}`}>
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <p className={`mt-2 truncate text-xl font-black tracking-tight ${metrics.net >= 0 ? "text-indigo-500" : "text-rose-500"}`}>
                <AnimatedCounter value={metrics.net} formatter={formatMoney} />
              </p>
            </div>
            <div className="mt-2">
              <MiniSparkline data={sparklineData.netSeries} color={metrics.net >= 0 ? "#6366f1" : "#f59e0b"} height={26} />
              <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
                <span className="text-[var(--cu-text-tertiary)]">Biên lợi nhuận:</span>
                <span className={metrics.net >= 0 ? "text-emerald-500" : "text-rose-500"}>
                  {metrics.income > 0 ? `${((metrics.net / metrics.income) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI 5: Tốc độ tiêu hao quỹ (Monthly Burn Rate) */}
        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card padding="md" className="relative overflow-hidden border-[var(--cu-border)] flex flex-col justify-between h-full group hover:border-[var(--cu-border-strong)] transition-all">
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  Tiêu hao / tháng
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-transform group-hover:scale-110">
                  <Flame className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-black tracking-tight text-[var(--cu-text-primary)]">
                <AnimatedCounter value={burnRateStats.avgMonthlyExpense} formatter={formatMoney} />
              </p>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--cu-text-tertiary)]">
                <Clock3 className="h-3 w-3 text-orange-400" />
                <span>Trung bình {filteredMonthlyData.length} kỳ gần nhất</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--cu-surface-2)] overflow-hidden">
                <motion.div
                  className="h-full bg-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* KPI 6: Thời gian sống của quỹ (Cash Runway) */}
        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card padding="md" className="relative overflow-hidden border-[var(--cu-border)] flex flex-col justify-between h-full group hover:border-[var(--cu-border-strong)] transition-all">
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                  Quỹ an toàn (Runway)
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${burnRateStats.runwayMonths >= 6 ? "bg-emerald-500/10 text-emerald-500" : burnRateStats.runwayMonths >= 3 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-black tracking-tight text-[var(--cu-text-primary)]">
                {burnRateStats.runwayMonths >= 24 ? "> 24 tháng" : `${burnRateStats.runwayMonths.toFixed(1)} tháng`}
              </p>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cu-surface-2)]">
                <motion.div
                  className={`h-full rounded-full ${burnRateStats.runwayMonths >= 6 ? "bg-emerald-500" : burnRateStats.runwayMonths >= 3 ? "bg-amber-500" : "bg-rose-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (burnRateStats.runwayMonths / 12) * 100)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--cu-text-tertiary)]">
                <span>0 tháng</span>
                <span className={burnRateStats.runwayMonths >= 6 ? "text-emerald-500" : "text-amber-500"}>
                  {burnRateStats.runwayMonths >= 6 ? "Tự chủ tốt" : "Cần lưu ý"}
                </span>
                <span>12+ tháng</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 3. FINANCIAL HEALTH SCORECARD                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      <FinanceHealthCard
        cash={metrics.cash}
        income={metrics.income}
        expense={metrics.expense}
        receivable={metrics.receivable}
        payable={metrics.payable}
        overdue={metrics.overdue}
        budget={metrics.budget}
        spent={metrics.spent}
        formatMoney={formatMoney}
        onNavigateToTab={onNavigateToTab}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 4. MAIN INTERACTIVE CASHFLOW CENTER & ASSET DONUT       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.85fr)]">
        {/* Card Biểu đồ trung tâm */}
        <Card padding="none" className="relative overflow-hidden border-[var(--cu-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cu-border)] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[var(--cu-text-primary)]">
                  {chartMode === "flow" ? "Dòng tiền Thu & Chi qua các kỳ" :
                   chartMode === "net" ? "Dòng tiền Ròng & Trung bình trượt (SMA)" :
                   chartMode === "cumulative" ? "Đường cong Tăng trưởng Số dư Lũy kế" :
                   "Biên Lợi nhuận Ròng (%) theo chu kỳ"}
                </h2>
                {chartSummary && (
                  <Badge variant="outline" size="xs">
                    Đỉnh thu: {compactMoney(chartSummary.maxIncome)}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--cu-text-tertiary)]">
                Dữ liệu hợp nhất từ các giao dịch đã duyệt trong hệ thống
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Smooth Animated Sliding Pill Mode Selector */}
              <div className="flex rounded-xl bg-[var(--cu-surface-2)] p-1 text-xs">
                {(["flow", "net", "cumulative", "margin"] as const).map(mode => {
                  const label =
                    mode === "flow" ? "Thu/Chi" :
                    mode === "net" ? "Ròng & SMA" :
                    mode === "cumulative" ? "Lũy kế" : "Biên LN %";
                  const active = chartMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChartMode(mode)}
                      className="relative rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
                    >
                      {active && (
                        <motion.div
                          layoutId="overviewModePill"
                          className="absolute inset-0 rounded-lg bg-indigo-500 shadow-xs"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${active ? "text-white" : ""}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dạng thể hiện (khi xem flow) */}
              {chartMode === "flow" && (
                <div className="flex rounded-xl bg-[var(--cu-surface-2)] p-1 text-xs">
                  {(["area", "bar", "line"] as const).map(type => {
                    const label = type === "area" ? "Vùng" : type === "bar" ? "Cột" : "Đường";
                    const active = chartVisualType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setChartVisualType(type)}
                        className={`relative rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${active ? "bg-indigo-500 text-white" : "text-[var(--cu-text-tertiary)]"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bộ chọn thời gian */}
              <Select
                ariaLabel="Kỳ thời gian"
                value={timePeriod}
                onChange={v => setTimePeriod(v as typeof timePeriod)}
                className="w-28 text-xs"
                options={[
                  { value: "3m", label: "3 kỳ gần nhất" },
                  { value: "6m", label: "6 kỳ gần nhất" },
                  { value: "12m", label: "12 kỳ gần nhất" },
                  { value: "all", label: "Tất cả các kỳ" },
                ]}
              />
            </div>
          </div>

          {filteredMonthlyData.length > 0 ? (
            <div className="h-[280px] sm:h-[340px] px-3 pb-3 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "flow" ? (
                  chartVisualType === "area" ? (
                    <AreaChart data={filteredMonthlyData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="modernIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="modernExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                      <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                      <Tooltip content={<ModernChartTooltip formatMoney={formatMoney} />} />
                      <Area type="monotone" dataKey="income" name="Doanh thu (Thu)" stroke="#10b981" strokeWidth={2.5} fill="url(#modernIncome)" />
                      <Area type="monotone" dataKey="expense" name="Chi phí (Chi)" stroke="#f43f5e" strokeWidth={2.5} fill="url(#modernExpense)" />
                    </AreaChart>
                  ) : chartVisualType === "bar" ? (
                    <BarChart data={filteredMonthlyData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                      <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                      <Tooltip content={<ModernChartTooltip formatMoney={formatMoney} />} />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                      <Bar dataKey="income" name="Doanh thu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="expense" name="Chi phí" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  ) : (
                    <LineChart data={filteredMonthlyData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                      <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                      <Tooltip content={<ModernChartTooltip formatMoney={formatMoney} />} />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                      <Line type="monotone" dataKey="income" name="Doanh thu" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="expense" name="Chi phí" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  )
                ) : chartMode === "net" ? (
                  <ComposedChart data={filteredMonthlyData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                    <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                    <Tooltip content={<ModernChartTooltip formatMoney={formatMoney} />} />
                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                    <Bar dataKey="net" name="Dòng tiền ròng" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {filteredMonthlyData.map((entry, index) => (
                        <Cell key={`net-${index}`} fill={entry.net >= 0 ? "#10b981" : "#f43f5e"} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="movingAvgNet" name="Trung bình trượt 3 kỳ (SMA)" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                  </ComposedChart>
                ) : chartMode === "cumulative" ? (
                  <AreaChart data={filteredMonthlyData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                    <YAxis axisLine={false} tickLine={false} width={62} tickFormatter={compactMoney} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                    <Tooltip content={<ModernChartTooltip formatMoney={formatMoney} />} />
                    <Area type="monotone" dataKey="cumulative" name="Số dư tích lũy" stroke="#6366f1" strokeWidth={3} fill="url(#cumulGrad)" dot={{ r: 4 }} />
                  </AreaChart>
                ) : (
                  <LineChart data={filteredMonthlyData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cu-border)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--cu-text-tertiary)" }} />
                    <YAxis axisLine={false} tickLine={false} width={45} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "var(--cu-text-tertiary)" }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, "Biên lợi nhuận ròng"]}
                      contentStyle={{ borderRadius: 12, backgroundColor: "var(--cu-surface)", borderColor: "var(--cu-border)", fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="profitMargin" name="Biên lợi nhuận (%)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
              <BarChart3 className="h-10 w-10 text-[var(--cu-text-tertiary)]" />
              <p className="mt-3 text-sm font-bold text-[var(--cu-text-primary)]">
                Chưa có dữ liệu biểu đồ dòng tiền
              </p>
              <p className="mt-1 text-xs text-[var(--cu-text-tertiary)]">
                Ghi nhận giao dịch đầu tiên để hệ thống tự động dựng biểu đồ xu hướng.
              </p>
            </div>
          )}
        </Card>

        {/* Card Cơ cấu Tài sản & Quỹ */}
        <Card padding="none" className="flex flex-col justify-between overflow-hidden border-[var(--cu-border)]">
          <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-5 py-4">
            <div>
              <h3 className="text-sm font-black text-[var(--cu-text-primary)]">
                Cơ cấu Tài sản & Quỹ
              </h3>
              <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                Phân bổ số dư trên các tài khoản
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAddAccount}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--cu-surface-2)] px-2.5 py-1 text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm quỹ</span>
            </motion.button>
          </div>

          {accountDistribution.length > 0 ? (
            <div className="flex flex-col p-4">
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {accountDistribution.map((entry, index) => (
                        <Cell key={`acc-${index}`} fill={entry.color} stroke="var(--cu-surface)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ModernPieTooltip formatMoney={formatMoney} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
                    Tổng tiền
                  </span>
                  <span className="max-w-[130px] truncate text-xs font-black text-[var(--cu-text-primary)]">
                    {formatMoney(metrics.cash)}
                  </span>
                </div>
              </div>

              {/* Danh sách các tài khoản */}
              <div className="mt-3 divide-y divide-[var(--cu-border)] max-h-52 overflow-y-auto">
                {accounts.map(acc => {
                  const dist = accountDistribution.find(d => d.number === acc.number) || { percent: "0" };
                  return (
                    <div key={acc.id} className="flex items-center justify-between py-2 text-xs hover:bg-[var(--cu-surface-2)]/30 rounded-lg px-1.5 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <AccountBankIcon bank={acc.bank} color={acc.color} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[var(--cu-text-primary)]">{acc.bank}</p>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--cu-text-tertiary)] font-mono">
                            <span>{acc.number}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(acc.number);
                                  triggerToast?.("info", "Đã chép số TK", acc.number);
                                } catch {}
                              }}
                              className="hover:text-indigo-500 p-0.5"
                              title="Sao chép"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-[var(--cu-text-primary)]">{formatMoney(acc.balance)}</p>
                        <p className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">{dist.percent}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <Landmark className="h-8 w-8 text-[var(--cu-text-tertiary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--cu-text-primary)]">Chưa có tài khoản</p>
              <Button size="xs" className="mt-3" onClick={onOpenAddAccount} leftIcon={<Plus className="h-3 w-3" />}>
                Thêm tài khoản đầu tiên
              </Button>
            </div>
          )}
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 5. FORECAST SIMULATOR & SCENARIOS (30/60/90 Days)        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cu-border)] bg-[var(--cu-surface-2)]/30 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--cu-text-primary)]">
                Dự báo dòng tiền & Mô phỏng thanh khoản
              </h3>
              <p className="text-[11px] text-[var(--cu-text-tertiary)]">
                Dựa trên nghĩa vụ công nợ đến hạn và các khoản định kỳ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chế độ kịch bản */}
            <div className="flex rounded-xl bg-[var(--cu-surface)] p-1 text-xs border border-[var(--cu-border)]">
              {(["base", "optimistic", "conservative"] as const).map(sc => {
                const label = sc === "base" ? "Cơ sở" : sc === "optimistic" ? "Lạc quan (+15%)" : "Thận trọng (-15%)";
                const active = forecastScenario === sc;
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setForecastScenario(sc)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${active ? "bg-indigo-500 text-white shadow-xs" : "text-[var(--cu-text-tertiary)]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Chọn số ngày */}
            <div className="flex rounded-xl bg-[var(--cu-surface)] p-1 text-xs border border-[var(--cu-border)]">
              {[30, 60, 90].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setForecastHorizon(days as any)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${forecastHorizon === days ? "bg-indigo-500 text-white" : "text-[var(--cu-text-tertiary)]"}`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-[var(--cu-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          <div className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
              Dự kiến thu (+{forecastHorizon}d)
            </span>
            <p className="mt-1 truncate text-lg font-black text-emerald-500">
              <AnimatedCounter value={simulatedForecast.inflow} formatter={formatMoney} />
            </p>
            <p className="text-[10px] text-[var(--cu-text-tertiary)]">Từ công nợ phải thu đến hạn</p>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
              Dự kiến chi (-{forecastHorizon}d)
            </span>
            <p className="mt-1 truncate text-lg font-black text-rose-500">
              <AnimatedCounter value={simulatedForecast.outflow} formatter={formatMoney} />
            </p>
            <p className="text-[10px] text-[var(--cu-text-tertiary)]">Nợ nhà cung cấp đến hạn</p>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
              Số dư ước tính
            </span>
            <p className={`mt-1 truncate text-lg font-black ${simulatedForecast.safe ? "text-indigo-500" : "text-amber-500"}`}>
              <AnimatedCounter value={simulatedForecast.projectedCash} formatter={formatMoney} />
            </p>
            <p className="text-[10px] text-[var(--cu-text-tertiary)]">Sau khi cân đối thu/chi</p>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
              Khả năng bao phủ nợ
            </span>
            <p className={`mt-1 truncate text-lg font-black ${simulatedForecast.liquidityRatio >= 1.2 ? "text-emerald-500" : "text-amber-500"}`}>
              {simulatedForecast.liquidityRatio.toFixed(2)}×
            </p>
            <p className="text-[10px] text-[var(--cu-text-tertiary)]">
              {simulatedForecast.liquidityRatio >= 1 ? "Đảm bảo nghĩa vụ" : "Thiếu hụt thanh khoản"}
            </p>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cu-text-tertiary)]">
              Tình trạng dòng tiền
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant={simulatedForecast.safe ? "success" : "warning"} dot pulse={!simulatedForecast.safe}>
                {simulatedForecast.safe ? "Dòng tiền An toàn" : "Cần hỗ trợ vốn"}
              </Badge>
            </div>
            <p className="mt-1 text-[10px] text-[var(--cu-text-tertiary)]">
              {forecastScenario === "base" ? "Kịch bản Chuẩn" : forecastScenario === "optimistic" ? "Kịch bản Tích cực" : "Kịch bản Thận trọng"}
            </p>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 6. CATEGORY INTELLIGENCE & SPIKE ALERTS                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Top Danh mục chi tiêu */}
        <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
          <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--cu-text-primary)]">
                Cơ cấu Chi phí Top 5 Hạng mục
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab("reports")}
              className="text-[11px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {expenseBreakdown.length > 0 ? (
            <div className="p-4 space-y-3">
              {expenseBreakdown.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--cu-text-primary)]">
                      {idx + 1}. {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-rose-500">{formatMoney(item.value)}</span>
                      <span className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">({item.percent}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cu-surface-2)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Number(item.percent))}%` }}
                      transition={{ duration: 0.7, delay: idx * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[var(--cu-text-tertiary)]">
              Chưa có khoản chi nào được ghi nhận
            </div>
          )}
        </Card>

        {/* Top Nguồn thu & Bất thường */}
        <Card padding="none" className="overflow-hidden border-[var(--cu-border)]">
          <div className="flex items-center justify-between border-b border-[var(--cu-border)] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--cu-text-primary)]">
                Cơ cấu Nguồn thu Hàng đầu
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab("reports")}
              className="text-[11px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {incomeBreakdown.length > 0 ? (
            <div className="p-4 space-y-3">
              {incomeBreakdown.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--cu-text-primary)]">
                      {idx + 1}. {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-500">{formatMoney(item.value)}</span>
                      <span className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">({item.percent}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cu-surface-2)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Number(item.percent))}%` }}
                      transition={{ duration: 0.7, delay: idx * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[var(--cu-text-tertiary)]">
              Chưa có khoản thu nào được ghi nhận
            </div>
          )}
        </Card>
      </section>

      {/* Cảnh báo chi phí bất thường nếu có */}
      {anomalies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 text-xs shadow-xs"
        >
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Phát hiện khoản chi bất thường (Vượt 2.5× mức trung bình)</span>
          </div>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            {anomalies.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-[var(--cu-surface)] p-3 border border-[var(--cu-border)] shadow-2xs">
                <div>
                  <p className="font-bold text-[var(--cu-text-primary)]">{a.category} · {a.partner || a.code}</p>
                  <p className="text-[10px] text-[var(--cu-text-tertiary)]">{a.date} · {a.note || "Không có diễn giải"}</p>
                </div>
                <span className="font-black text-rose-500">{formatMoney(a.amount)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// -------------------------------------------------------------
// CUSTOM TOOLTIP HELPERS
// -------------------------------------------------------------
function ModernChartTooltip({ active, payload, label, formatMoney }: any) {
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
  const item = payload[0];
  return (
    <div className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)]/95 p-3 shadow-xl backdrop-blur-md text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.payload.color || item.fill }} />
        <span className="font-black text-[var(--cu-text-primary)]">{item.name}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 text-[11px]">
        <span className="text-[var(--cu-text-tertiary)]">Số dư:</span>
        <span className="font-black text-[var(--cu-text-primary)]">{formatMoney(Number(item.value))}</span>
      </div>
      {item.payload.percent && (
        <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
          <span className="text-[var(--cu-text-tertiary)]">Tỷ trọng:</span>
          <span className="font-bold text-indigo-500">{item.payload.percent}%</span>
        </div>
      )}
    </div>
  );
}
