"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { FinanceOverviewDashboard } from "@/components/finance/FinanceOverviewDashboard";
import { FinanceReportsDashboard } from "@/components/finance/FinanceReportsDashboard";
import type { BankAccount, BudgetCategory, DebtRecord, FinanceTab, Invoice, Transaction } from "@/types/finance";

// Mock Bank Accounts
const mockAccounts: BankAccount[] = [
  { id: "acc-1", bank: "Techcombank", branch: "Hội sở chính", number: "19036888999", balance: 645000000, type: "Tài khoản thanh toán", color: "#E01A22" },
  { id: "acc-2", bank: "Vietcombank", branch: "Sở Giao Dịch", number: "0011004567890", balance: 1250000000, type: "Tài khoản kinh doanh", color: "#005432" },
  { id: "acc-3", bank: "MB Bank", branch: "Trung Hoà", number: "0888999666", balance: 380000000, type: "Tài khoản dự phòng", color: "#002D72" },
  { id: "acc-4", bank: "Quỹ Tiền Mặt", branch: "Văn phòng Costack", number: "CASH-VN01", balance: 45000000, type: "Tiền mặt tại quỹ", color: "#10b981" },
];

// Mock Monthly History (Last 12 months)
const mockMonthlyData = [
  { month: "2025-10", label: "T10/25", income: 420000000, expense: 280000000, net: 140000000, profitMargin: "33.3" },
  { month: "2025-11", label: "T11/25", income: 480000000, expense: 310000000, net: 170000000, profitMargin: "35.4" },
  { month: "2025-12", label: "T12/25", income: 650000000, expense: 420000000, net: 230000000, profitMargin: "35.4" },
  { month: "2026-01", label: "T1/26", income: 510000000, expense: 390000000, net: 120000000, profitMargin: "23.5" },
  { month: "2026-02", label: "T2/26", income: 380000000, expense: 290000000, net: 90000000, profitMargin: "23.7" },
  { month: "2026-03", label: "T3/26", income: 580000000, expense: 340000000, net: 240000000, profitMargin: "41.4" },
  { month: "2026-04", label: "T4/26", income: 620000000, expense: 370000000, net: 250000000, profitMargin: "40.3" },
  { month: "2026-05", label: "T5/26", income: 710000000, expense: 410000000, net: 300000000, profitMargin: "42.3" },
  { month: "2026-06", label: "T6/26", income: 690000000, expense: 430000000, net: 260000000, profitMargin: "37.7" },
  { month: "2026-07", label: "T7/26", income: 840000000, expense: 460000000, net: 380000000, profitMargin: "45.2" },
  { month: "2026-08", label: "T8/26", income: 920000000, expense: 490000000, net: 430000000, profitMargin: "46.7" },
  { month: "2026-09", label: "T9/26", income: 980000000, expense: 520000000, net: 460000000, profitMargin: "46.9" },
];

// Mock Category Breakdowns
const mockExpenseBreakdown = [
  { name: "Lương & Phúc lợi", value: 240000000, count: 28, percent: "46.2", color: "#6366f1" },
  { name: "Hạ tầng Cloud & AI Server", value: 115000000, count: 12, percent: "22.1", color: "#ec4899" },
  { name: "Marketing & Tăng trưởng", value: 75000000, count: 18, percent: "14.4", color: "#f59e0b" },
  { name: "Thuê văn phòng & Tiện ích", value: 50000000, count: 4, percent: "9.6", color: "#10b981" },
  { name: "Phần mềm & Bản quyền công cụ", value: 25000000, count: 9, percent: "4.8", color: "#8b5cf6" },
  { name: "Tiếp khách & Vận hành khác", value: 15000000, count: 7, percent: "2.9", color: "#06b6d4" },
];

const mockIncomeBreakdown = [
  { name: "Doanh thu Gói Doanh Nghiệp (Enterprise)", value: 540000000, count: 14, percent: "55.1", color: "#10b981" },
  { name: "Doanh thu Đăng ký Định kỳ (SaaS Subscriptions)", value: 290000000, count: 185, percent: "29.6", color: "#3b82f6" },
  { name: "Tư vấn & Triển khai giải pháp AI", value: 110000000, count: 6, percent: "11.2", color: "#8b5cf6" },
  { name: "Tích hợp API & Tiện ích mở rộng", value: 40000000, count: 12, percent: "4.1", color: "#f59e0b" },
];

const mockAccountDistribution = [
  { name: "Vietcombank", number: "0011004567890", balance: 1250000000, value: 1250000000, percent: "53.9", color: "#005432" },
  { name: "Techcombank", number: "19036888999", balance: 645000000, value: 645000000, percent: "27.8", color: "#E01A22" },
  { name: "MB Bank", number: "0888999666", balance: 380000000, value: 380000000, percent: "16.4", color: "#002D72" },
  { name: "Quỹ Tiền Mặt", number: "CASH-VN01", balance: 45000000, value: 45000000, percent: "1.9", color: "#10b981" },
];

// Mock Transactions
const mockTransactions: Transaction[] = [
  { id: "tx-1", code: "THU-2026-001", type: "income", category: "Doanh thu Gói Doanh Nghiệp (Enterprise)", amount: 150000000, date: "2026-09-27", accountId: "acc-2", account: "Vietcombank", partner: "Tập đoàn VinCommerce", note: "Thanh toán hợp đồng bản quyền quý 3/2026", status: "approved" },
  { id: "tx-2", code: "CHI-2026-042", type: "expense", category: "Hạ tầng Cloud & AI Server", amount: 48000000, date: "2026-09-25", accountId: "acc-1", account: "Techcombank", partner: "Amazon Web Services (AWS)", note: "Chi phí server GPU cluster & Database", status: "approved" },
  { id: "tx-3", code: "CHI-2026-041", type: "expense", category: "Lương & Phúc lợi", amount: 185000000, date: "2026-09-20", accountId: "acc-2", account: "Vietcombank", partner: "Toàn bộ nhân sự Costack", note: "Chi trả lương kỳ 1 tháng 9/2026", status: "approved" },
  { id: "tx-4", code: "THU-2026-002", type: "income", category: "Doanh thu Đăng ký Định kỳ (SaaS Subscriptions)", amount: 85000000, date: "2026-09-18", accountId: "acc-1", account: "Techcombank", partner: "Stripe Online Payments", note: "Thu tự động qua cổng thanh toán", status: "approved" },
  { id: "tx-5", code: "CHI-2026-040", type: "expense", category: "Marketing & Tăng trưởng", amount: 35000000, date: "2026-09-15", accountId: "acc-1", account: "Techcombank", partner: "Google Ads & Meta", note: "Chi phí chiến dịch Lead Generation Q3", status: "approved" },
];

// Mock Debts
const mockDebts: DebtRecord[] = [
  { id: "debt-1", partnerName: "Công ty Cổ phần Bất Động Sản SunGroup", type: "receivable", totalAmount: 220000000, paidAmount: 100000000, remainingAmount: 120000000, dueDate: "2026-10-05", status: "due_soon", phone: "0901234567" },
  { id: "debt-2", partnerName: "Ngân hàng TMCP Quân Đội (MB)", type: "receivable", totalAmount: 350000000, paidAmount: 0, remainingAmount: 350000000, dueDate: "2026-10-20", status: "normal", phone: "0988776655" },
  { id: "debt-3", partnerName: "Công ty Giải pháp Công nghệ FPT", type: "payable", totalAmount: 180000000, paidAmount: 90000000, remainingAmount: 90000000, dueDate: "2026-10-10", status: "due_soon", phone: "02473007300" },
  { id: "debt-4", partnerName: "Trung tâm Đào tạo Kỹ thuật số Aptech", type: "receivable", totalAmount: 45000000, paidAmount: 0, remainingAmount: 45000000, dueDate: "2026-09-15", status: "overdue", phone: "0912345678" },
];

// Mock Budgets
const mockBudgets: BudgetCategory[] = [
  { id: "b-1", department: "Khối Kỹ thuật & Sản phẩm", category: "Hạ tầng Cloud & Server", allocatedAmount: 150000000, spentAmount: 115000000, period: "Tháng 09/2026", manager: "Trần Đức Nam", status: "under" },
  { id: "b-2", department: "Khối Marketing & Tăng trưởng", category: "Quảng cáo Trực tuyến (Ads)", allocatedAmount: 80000000, spentAmount: 75000000, period: "Tháng 09/2026", manager: "Nguyễn Thu Hà", status: "warning" },
  { id: "b-3", department: "Khối Vận hành & Nhân sự", category: "Văn phòng & Tiện ích", allocatedAmount: 55000000, spentAmount: 50000000, period: "Tháng 09/2026", manager: "Lê Hoàng Mai", status: "under" },
  { id: "b-4", department: "Khối Kinh doanh (Sales)", category: "Tiếp khách & Hội nghị", allocatedAmount: 20000000, spentAmount: 22000000, period: "Tháng 09/2026", manager: "Vũ Tuấn Kiệt", status: "exceeded" },
];

const mockDebtAgingData = [
  { label: "Trong hạn", receivable: 470000000, payable: 90000000 },
  { label: "1-30 ngày", receivable: 45000000, payable: 0 },
  { label: "31-60 ngày", receivable: 0, payable: 0 },
  { label: "> 60 ngày", receivable: 0, payable: 0 },
];

export default function FinancePreviewQAPage() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");
  const [reportsChartTab, setReportsChartTab] = useState<"pl" | "expense" | "income" | "budget" | "debt" | "simulator">("pl");

  const totalCash = mockAccounts.reduce((s, a) => s + a.balance, 0);
  const totalIncome = mockMonthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpense = mockMonthlyData.reduce((s, m) => s + m.expense, 0);

  const metrics = {
    income: 980000000,
    expense: 520000000,
    net: 460000000,
    cash: totalCash,
    receivable: 515000000,
    payable: 90000000,
    budget: 305000000,
    spent: 262000000,
    overdue: 45000000,
  };

  const forecast = {
    inflow: 470000000,
    outflow: 90000000,
    projectedCash: totalCash + 470000000 - 90000000,
    liquidityCoverage: 5.8,
    budgetUsage: 85.9,
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  const compactMoney = (val: number) =>
    new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(val);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const budgetComparisonData = mockBudgets.map(b => ({
    name: `${b.department.split(" ")[1]} · ${b.category.split(" ")[0]}`,
    department: b.department,
    category: b.category,
    allocated: b.allocatedAmount,
    spent: b.spentAmount,
    remaining: Math.max(0, b.allocatedAmount - b.spentAmount),
    ratio: ((b.spentAmount / b.allocatedAmount) * 100).toFixed(0),
    status: b.status,
  }));

  return (
    <div className={`min-h-screen bg-[var(--cu-background)] text-[var(--cu-text-primary)] transition-colors duration-200 ${isDark ? "dark" : ""}`}>
      {/* Top Banner Control */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--cu-border)] bg-[var(--cu-surface)]/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-sm">
            C$
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-[var(--cu-text-primary)]">
              Costack Financial Dashboard v2
            </h1>
            <p className="text-[11px] text-[var(--cu-text-tertiary)]">
              Môi trường kiểm thử & xem trước giao diện tài chính hiện đại
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chuyển tab Tổng quan vs Báo cáo */}
          <div className="flex rounded-xl bg-[var(--cu-surface-2)] p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("overview")}
              className="relative rounded-lg px-3 py-1.5 transition text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
            >
              {activeTab === "overview" && (
                <motion.div
                  layoutId="activePreviewTabPill"
                  className="absolute inset-0 rounded-lg bg-indigo-500 shadow-xs"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${activeTab === "overview" ? "text-white" : ""}`}>
                Tổng quan Dashboard
              </span>
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className="relative rounded-lg px-3 py-1.5 transition text-[var(--cu-text-tertiary)] hover:text-[var(--cu-text-primary)]"
            >
              {activeTab === "reports" && (
                <motion.div
                  layoutId="activePreviewTabPill"
                  className="absolute inset-0 rounded-lg bg-indigo-500 shadow-xs"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${activeTab === "reports" ? "text-white" : ""}`}>
                Báo cáo & Phân tích (6 Chuyên đề)
              </span>
            </button>
          </div>

          {/* Nút Dark/Light mode */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface-2)]"
            title="Đổi giao diện Sáng / Tối"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 md:p-6 lg:p-8">
        {activeTab === "overview" ? (
          <FinanceOverviewDashboard
            accounts={mockAccounts}
            transactions={mockTransactions}
            debts={mockDebts}
            budgets={mockBudgets}
            metrics={metrics}
            monthlyData={mockMonthlyData}
            accountDistribution={mockAccountDistribution}
            expenseBreakdown={mockExpenseBreakdown}
            incomeBreakdown={mockIncomeBreakdown}
            forecast={forecast}
            formatMoney={formatMoney}
            compactMoney={compactMoney}
            currency="VND"
            workspaceName="Costack Global Tech"
            enabledModules={new Set(["overview", "cashbook", "invoices", "debts", "budgets", "reports", "ai-agent"])}
            onOpenTransaction={() => alert("Hành động: Mở form ghi thu chi")}
            onOpenReceiptScan={() => alert("Hành động: Mở máy quét hóa đơn AI")}
            onOpenAddAccount={() => alert("Hành động: Thêm tài khoản ngân hàng")}
            onNavigateToTab={(tab) => {
              if (tab === "reports") setActiveTab("reports");
              else alert(`Điều hướng sang phân hệ: ${tab}`);
            }}
          />
        ) : (
          <FinanceReportsDashboard
            metrics={metrics}
            transactions={mockTransactions}
            monthlyData={mockMonthlyData}
            expenseBreakdown={mockExpenseBreakdown}
            incomeBreakdown={mockIncomeBreakdown}
            budgetComparison={budgetComparisonData}
            debtAgingData={mockDebtAgingData}
            debts={mockDebts}
            budgets={mockBudgets}
            accounts={mockAccounts}
            formatMoney={formatMoney}
            compactMoney={compactMoney}
            currency="VND"
            workspaceName="Costack Global Tech"
            activeSubTab={reportsChartTab}
            setActiveSubTab={setReportsChartTab}
          />
        )}
      </main>
    </div>
  );
}
