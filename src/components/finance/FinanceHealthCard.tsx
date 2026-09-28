"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle, ChevronRight, ShieldCheck, Sparkles, Zap, Award
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { fireTaskCompleteConfetti } from "@/lib/confetti";

export interface HealthCardProps {
  cash: number;
  income: number;
  expense: number;
  receivable: number;
  payable: number;
  overdue: number;
  budget: number;
  spent: number;
  formatMoney: (val: number) => string;
  onNavigateToTab?: (tab: "cashbook" | "debts" | "budgets" | "reports" | "ai-agent") => void;
}

export function FinanceHealthCard({
  cash,
  income,
  expense,
  receivable,
  payable,
  overdue,
  budget,
  spent,
  formatMoney,
  onNavigateToTab,
}: HealthCardProps) {
  // 1. Phân tích chỉ số thanh toán nhanh (Quick Ratio)
  const quickRatio = payable > 0 ? (cash + receivable) / payable : cash > 0 ? 3.0 : 1.0;
  // 2. Phân tích thời gian sống quỹ tiền (Runway)
  const monthlyBurn = expense > 0 ? expense : (spent > 0 ? spent : 1);
  const runwayMonths = monthlyBurn > 0 ? cash / (monthlyBurn / 3 || monthlyBurn) : 12;
  // 3. Phân tích tỷ lệ nợ quá hạn
  const totalDebts = receivable + payable;
  const overdueRatio = totalDebts > 0 ? (overdue / totalDebts) * 100 : 0;
  // 4. Phân tích biên lợi nhuận hoạt động
  const netMargin = income > 0 ? ((income - expense) / income) * 100 : 0;

  // Tính điểm từng thành phần (0 - 100)
  const pillars = useMemo(() => {
    let liquidityScore = 100;
    if (quickRatio < 0.8) liquidityScore = 30;
    else if (quickRatio < 1.0) liquidityScore = 55;
    else if (quickRatio < 1.5) liquidityScore = 80;
    else liquidityScore = 100;

    let runwayScore = 100;
    if (runwayMonths < 1) runwayScore = 20;
    else if (runwayMonths < 2.5) runwayScore = 50;
    else if (runwayMonths < 5) runwayScore = 80;
    else runwayScore = 100;

    let debtScore = 100;
    if (overdueRatio > 40) debtScore = 25;
    else if (overdueRatio > 20) debtScore = 55;
    else if (overdueRatio > 5) debtScore = 75;
    else debtScore = 100;

    let marginScore = 75;
    if (netMargin < -10) marginScore = 30;
    else if (netMargin < 0) marginScore = 50;
    else if (netMargin > 20) marginScore = 100;
    else if (netMargin > 0) marginScore = 85;

    return {
      liquidity: { score: liquidityScore, label: "Thanh khoản tức thời", value: `${quickRatio.toFixed(2)}×`, target: "> 1.2×", color: "#10b981" },
      runway: { score: runwayScore, label: "Quỹ dự phòng an toàn", value: `${runwayMonths.toFixed(1)} tháng`, target: "> 3 tháng", color: "#6366f1" },
      debt: { score: debtScore, label: "Kiểm soát công nợ", value: overdue > 0 ? `${formatMoney(overdue)} quá hạn` : "0 nợ quá hạn", target: "0 nợ quá hạn", color: "#f59e0b" },
      profit: { score: marginScore, label: "Biên lợi nhuận ròng", value: `${netMargin.toFixed(1)}%`, target: "> 15%", color: "#ec4899" },
    };
  }, [quickRatio, runwayMonths, overdueRatio, overdue, netMargin, formatMoney]);

  // Điểm tổng hợp trọng số
  const totalScore = useMemo(() => {
    const raw = (
      pillars.liquidity.score * 0.3 +
      pillars.runway.score * 0.3 +
      pillars.debt.score * 0.2 +
      pillars.profit.score * 0.2
    );
    return Math.round(Math.min(100, Math.max(10, raw)));
  }, [pillars]);

  // Đánh giá xếp hạng & màu sắc
  const rating = useMemo(() => {
    if (totalScore >= 85) return { grade: "AAA", title: "Rất vững mạnh", tone: "text-emerald-500", strokeTone: "#10b981", bgTone: "bg-emerald-500/10", borderTone: "border-emerald-500/30", variant: "success" as const, desc: "Dòng tiền dồi dào, khả năng thanh toán tối ưu và biên an toàn cao." };
    if (totalScore >= 70) return { grade: "AA", title: "Lành mạnh & Ổn định", strokeTone: "#6366f1", tone: "text-indigo-500", bgTone: "bg-indigo-500/10", borderTone: "border-indigo-500/30", variant: "primary" as const, desc: "Cân đối tài chính tốt, kiểm soát chi phí hiệu quả." };
    if (totalScore >= 55) return { grade: "A", title: "Cân đối, Cần duy trì", strokeTone: "#0284c7", tone: "text-sky-500", bgTone: "bg-sky-500/10", borderTone: "border-sky-500/30", variant: "info" as const, desc: "Chỉ số tài chính ở mức ổn định, tiếp tục theo dõi sát thu hồi nợ." };
    if (totalScore >= 40) return { grade: "BBB", title: "Cảnh báo thanh khoản", strokeTone: "#f59e0b", tone: "text-amber-500", bgTone: "bg-amber-500/10", borderTone: "border-amber-500/30", variant: "warning" as const, desc: "Dòng tiền có nguy cơ căng thẳng, cần thúc đẩy thu hồi công nợ." };
    return { grade: "C", title: "Báo động rủi ro", strokeTone: "#f43f5e", tone: "text-rose-500", bgTone: "bg-rose-500/10", borderTone: "border-rose-500/30", variant: "danger" as const, desc: "Cần bổ sung nguồn tiền hoặc cắt giảm chi phí ngay lập tức." };
  }, [totalScore]);

  // AI Smart Insights
  const recommendations = useMemo(() => {
    const list: Array<{ title: string; desc: string; type: "alert" | "tip" | "success"; actionTab?: "debts" | "cashbook" | "budgets" | "reports" }> = [];

    if (overdue > 0) {
      list.push({
        title: "Thu hồi công nợ quá hạn",
        desc: `Đang có ${formatMoney(overdue)} nợ quá hạn. Nhắc nợ ngay để giải phóng thanh khoản tồn đọng.`,
        type: "alert",
        actionTab: "debts",
      });
    }

    if (runwayMonths < 3 && cash > 0) {
      list.push({
        title: "Quỹ dự phòng đang dưới 3 tháng",
        desc: `Với tốc độ chi tiêu hiện tại, quỹ chỉ đủ duy trì ${runwayMonths.toFixed(1)} tháng. Cân nhắc giãn các khoản chi lớn.`,
        type: "alert",
        actionTab: "cashbook",
      });
    } else if (runwayMonths >= 6) {
      list.push({
        title: "Quỹ tiền mặt rất an toàn",
        desc: `Quỹ đủ chi trả hơn ${runwayMonths.toFixed(1)} tháng hoạt động liên tục mà không cần thu thêm.`,
        type: "success",
      });
    }

    if (netMargin < 0 && income > 0) {
      list.push({
        title: "Chi phí đang vượt doanh thu",
        desc: `Kỳ này thâm hụt ${formatMoney(expense - income)}. Kiểm tra lại các danh mục chi lớn trong sổ thu chi.`,
        type: "alert",
        actionTab: "reports",
      });
    }

    if (list.length === 0) {
      list.push({
        title: "Chỉ số tài chính đang tối ưu",
        desc: "Các nghĩa vụ thanh toán trong hạn và dòng tiền ròng duy trì tăng trưởng đều đặn.",
        type: "success",
      });
    }

    return list;
  }, [overdue, formatMoney, runwayMonths, cash, netMargin, income, expense]);

  const circumference = 2 * Math.PI * 40;

  return (
    <Card padding="none" className="relative overflow-hidden border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-xs">
      {/* Decorative blurred glow backdrop */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header Bar */}
      <div className="relative flex flex-wrap items-center justify-between border-b border-[var(--cu-border)] bg-[var(--cu-surface-2)]/40 px-5 py-3.5 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--cu-text-primary)]">
              Chỉ số sức khỏe tài chính & Quản trị rủi ro
            </h3>
            <p className="text-[11px] text-[var(--cu-text-tertiary)]">
              Đánh giá tự động theo chuẩn Basel III & quản trị dòng tiền doanh nghiệp
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (totalScore >= 70) fireTaskCompleteConfetti();
            }}
            className="cursor-pointer"
          >
            <Badge variant={rating.variant} dot pulse={totalScore < 55} size="sm">
              <Award className="mr-1 h-3 w-3 inline" />
              Hạng {rating.grade} · {rating.title}
            </Badge>
          </motion.div>
        </div>
      </div>

      <div className="relative grid gap-6 p-5 lg:grid-cols-[230px_1fr]">
        {/* Animated Score Gauge */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--cu-border)] bg-gradient-to-b from-[var(--cu-surface-2)]/40 to-transparent p-4 text-center shadow-xs">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-[var(--cu-border)]"
                strokeWidth="7"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                stroke={rating.strokeTone}
                strokeWidth="7"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - totalScore / 100) }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <motion.span
                className="text-2xl font-black tracking-tight text-[var(--cu-text-primary)]"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {totalScore}
              </motion.span>
              <span className="text-[10px] font-bold text-[var(--cu-text-tertiary)]">trên 100</span>
            </div>
          </div>

          <div className="mt-2.5">
            <p className={`text-xs font-black ${rating.tone}`}>{rating.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--cu-text-tertiary)]">
              {rating.desc}
            </p>
          </div>
        </div>

        {/* 4 Pillars with smooth animated progress bars */}
        <div className="flex flex-col justify-between gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(pillars).map(([key, item], idx) => {
              const isGood = item.score >= 75;
              const isWarning = item.score < 55;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  whileHover={{ y: -2 }}
                  className="rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-3 shadow-2xs transition-all hover:border-[var(--cu-border-strong)] hover:shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--cu-text-secondary)]">{item.label}</span>
                    <span
                      className={`font-black ${
                        isGood ? "text-emerald-500" : isWarning ? "text-rose-500" : "text-amber-500"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cu-surface-2)]">
                    <motion.div
                      className={`h-full rounded-full ${
                        isGood ? "bg-emerald-500" : isWarning ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--cu-text-tertiary)]">
                    <span>Chuẩn: {item.target}</span>
                    <span className="font-bold">{item.score}/100</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* AI Action Recommendations */}
          <div className="space-y-2">
            {recommendations.slice(0, 2).map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className={`flex items-start justify-between gap-3 rounded-xl border p-2.5 text-xs transition ${
                  rec.type === "alert"
                    ? "border-amber-500/25 bg-amber-500/[0.05] text-amber-700 dark:text-amber-300"
                    : "border-indigo-500/25 bg-indigo-500/[0.05] text-indigo-700 dark:text-indigo-300"
                }`}
              >
                <div className="flex items-start gap-2">
                  {rec.type === "alert" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  )}
                  <div>
                    <span className="font-bold">{rec.title}: </span>
                    <span className="text-[var(--cu-text-secondary)]">{rec.desc}</span>
                  </div>
                </div>
                {rec.actionTab && onNavigateToTab && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigateToTab(rec.actionTab!)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--cu-surface)] px-2.5 py-1 text-[11px] font-bold text-indigo-500 shadow-xs hover:bg-[var(--cu-surface-2)]"
                  >
                    <span>Xem</span>
                    <ChevronRight className="h-3 w-3" />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
