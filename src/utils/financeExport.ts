/**
 * Financial Excel and CSV Export Utility
 * Uses exceljs to generate multi-sheet professional workbooks with styled headers,
 * number formatting, and comprehensive financial summaries.
 */

import ExcelJS from "exceljs";
import type { BankAccount, BudgetCategory, DebtRecord, Invoice, Transaction } from "@/types/finance";

export interface FinanceExportData {
  workspaceName?: string;
  currency: string;
  generatedDate: string;
  monthlyData: Array<{
    month: string;
    label: string;
    income: number;
    expense: number;
    net: number;
    profitMargin: string;
  }>;
  transactions: Transaction[];
  debts: DebtRecord[];
  budgets: BudgetCategory[];
  accounts: BankAccount[];
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
  };
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4F46E5" }, // Indigo 600
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Segoe UI",
  color: { argb: "FFFFFFFF" },
  bold: true,
  size: 11,
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" }, // Slate 100
};

const TOTAL_ROW_FONT: Partial<ExcelJS.Font> = {
  name: "Segoe UI",
  bold: true,
  size: 11,
  color: { argb: "FF1E293B" },
};

export async function exportFinanceToExcel(data: FinanceExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Costack Financial System";
  workbook.created = new Date();

  const currencyFormat = data.currency === "VND" ? "#,##0 \"₫\"" : "$#,##0.00";

  // ══════════════════════════════════════════════════════════
  // SHEET 1: TỔNG QUAN & BÁO CÁO P&L (Monthly P&L Summary)
  // ══════════════════════════════════════════════════════════
  const summarySheet = workbook.addWorksheet("Báo cáo P&L", {
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { header: "Kỳ / Tháng", key: "month", width: 18 },
    { header: "Doanh thu (Thu)", key: "income", width: 22 },
    { header: "Chi phí (Chi)", key: "expense", width: 22 },
    { header: "Lợi nhuận ròng", key: "net", width: 22 },
    { header: "Biên lợi nhuận", key: "margin", width: 18 },
  ];

  // Title row
  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `BÁO CÁO TÀI CHÍNH QUẢN TRỊ - ${data.workspaceName || "COSTACK"}`;
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF312E81" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  summarySheet.getRow(1).height = 30;

  summarySheet.mergeCells("A2:E2");
  const subCell = summarySheet.getCell("A2");
  subCell.value = `Ngày xuất: ${data.generatedDate} | Đơn vị tiền tệ: ${data.currency}`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  summarySheet.getRow(2).height = 20;

  // Header row at line 4
  const headerRow = summarySheet.getRow(4);
  headerRow.values = ["Kỳ / Tháng", "Doanh thu (Thu)", "Chi phí (Chi)", "Lợi nhuận ròng", "Biên lợi nhuận %"];
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  let rowIndex = 5;
  data.monthlyData.forEach((row) => {
    const r = summarySheet.getRow(rowIndex++);
    r.values = [
      row.label,
      row.income,
      row.expense,
      row.net,
      `${row.profitMargin}%`,
    ];
    r.height = 22;
    r.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    r.getCell(2).numFmt = currencyFormat;
    r.getCell(3).numFmt = currencyFormat;
    r.getCell(4).numFmt = currencyFormat;
    r.getCell(5).alignment = { vertical: "middle", horizontal: "right" };

    if (row.net < 0) {
      r.getCell(4).font = { color: { argb: "FFE11D48" }, bold: true };
    } else {
      r.getCell(4).font = { color: { argb: "FF059669" }, bold: true };
    }
  });

  // Total summary row
  const totalRow = summarySheet.getRow(rowIndex);
  totalRow.values = [
    "TỔNG CỘNG",
    data.metrics.income,
    data.metrics.expense,
    data.metrics.net,
    data.metrics.income > 0 ? `${((data.metrics.net / data.metrics.income) * 100).toFixed(1)}%` : "0%",
  ];
  totalRow.height = 26;
  totalRow.eachCell((cell) => {
    cell.fill = SUBHEADER_FILL;
    cell.font = TOTAL_ROW_FONT;
    cell.border = { top: { style: "thin" }, bottom: { style: "double" } };
  });
  totalRow.getCell(2).numFmt = currencyFormat;
  totalRow.getCell(3).numFmt = currencyFormat;
  totalRow.getCell(4).numFmt = currencyFormat;

  // ══════════════════════════════════════════════════════════
  // SHEET 2: SỔ THU CHI CHI TIẾT (Transactions)
  // ══════════════════════════════════════════════════════════
  const txSheet = workbook.addWorksheet("Sổ thu chi", {
    views: [{ showGridLines: true }],
  });

  txSheet.columns = [
    { header: "Mã chứng từ", key: "code", width: 16 },
    { header: "Ngày giao dịch", key: "date", width: 16 },
    { header: "Loại giao dịch", key: "type", width: 16 },
    { header: "Hạng mục", key: "category", width: 22 },
    { header: "Số tiền", key: "amount", width: 22 },
    { header: "Tài khoản", key: "account", width: 24 },
    { header: "Đối tác", key: "partner", width: 24 },
    { header: "Diễn giải / Ghi chú", key: "note", width: 34 },
    { header: "Trạng thái", key: "status", width: 16 },
  ];

  const txHeaderRow = txSheet.getRow(1);
  txHeaderRow.height = 26;
  txHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  data.transactions.forEach((tx) => {
    const r = txSheet.addRow({
      code: tx.code,
      date: tx.date,
      type: tx.type === "income" ? "Khoản thu (+)" : "Khoản chi (-)",
      category: tx.category,
      amount: tx.type === "expense" ? -tx.amount : tx.amount,
      account: tx.account,
      partner: tx.partner || "-",
      note: tx.note || "-",
      status: tx.status === "approved" ? "Đã duyệt" : tx.status === "pending" ? "Chờ duyệt" : "Bản nháp",
    });
    r.height = 20;
    r.getCell("amount").numFmt = currencyFormat;
    if (tx.type === "expense") {
      r.getCell("amount").font = { color: { argb: "FFE11D48" } };
    } else {
      r.getCell("amount").font = { color: { argb: "FF059669" } };
    }
  });

  // ══════════════════════════════════════════════════════════
  // SHEET 3: THEO DÕI CÔNG NỢ (Debts)
  // ══════════════════════════════════════════════════════════
  const debtSheet = workbook.addWorksheet("Theo dõi Công nợ", {
    views: [{ showGridLines: true }],
  });

  debtSheet.columns = [
    { header: "Đối tác", key: "partner", width: 26 },
    { header: "Loại công nợ", key: "type", width: 18 },
    { header: "Tổng giá trị", key: "total", width: 22 },
    { header: "Đã thanh toán", key: "paid", width: 22 },
    { header: "Còn lại", key: "remaining", width: 22 },
    { header: "Hạn thanh toán", key: "due", width: 18 },
    { header: "Tình trạng", key: "status", width: 18 },
    { header: "Số điện thoại", key: "phone", width: 18 },
  ];

  const debtHeaderRow = debtSheet.getRow(1);
  debtHeaderRow.height = 26;
  debtHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  data.debts.forEach((debt) => {
    const statusLabel =
      debt.status === "overdue"
        ? "Quá hạn"
        : debt.status === "due_soon"
        ? "Đến hạn sớm"
        : "Bình thường";

    const r = debtSheet.addRow({
      partner: debt.partnerName,
      type: debt.type === "receivable" ? "Phải thu (KH)" : "Phải trả (NCC)",
      total: debt.totalAmount,
      paid: debt.paidAmount,
      remaining: debt.remainingAmount,
      due: debt.dueDate,
      status: statusLabel,
      phone: debt.phone || "-",
    });
    r.height = 20;
    r.getCell("total").numFmt = currencyFormat;
    r.getCell("paid").numFmt = currencyFormat;
    r.getCell("remaining").numFmt = currencyFormat;

    if (debt.status === "overdue") {
      r.getCell("status").font = { color: { argb: "FFE11D48" }, bold: true };
    }
  });

  // ══════════════════════════════════════════════════════════
  // SHEET 4: NGÂN SÁCH & HẠN MỨC (Budgets)
  // ══════════════════════════════════════════════════════════
  if (data.budgets.length > 0) {
    const budgetSheet = workbook.addWorksheet("Ngân sách", {
      views: [{ showGridLines: true }],
    });

    budgetSheet.columns = [
      { header: "Phòng ban", key: "dept", width: 22 },
      { header: "Hạng mục", key: "cat", width: 22 },
      { header: "Hạn mức cấp", key: "allocated", width: 22 },
      { header: "Đã chi tiêu", key: "spent", width: 22 },
      { header: "Còn lại", key: "remaining", width: 22 },
      { header: "Tỷ lệ sử dụng", key: "ratio", width: 18 },
      { header: "Trạng thái", key: "status", width: 18 },
    ];

    const budgetHeaderRow = budgetSheet.getRow(1);
    budgetHeaderRow.height = 26;
    budgetHeaderRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    data.budgets.forEach((b) => {
      const remaining = Math.max(0, b.allocatedAmount - b.spentAmount);
      const ratio = b.allocatedAmount > 0 ? (b.spentAmount / b.allocatedAmount) * 100 : 0;
      const r = budgetSheet.addRow({
        dept: b.department,
        cat: b.category,
        allocated: b.allocatedAmount,
        spent: b.spentAmount,
        remaining,
        ratio: `${ratio.toFixed(1)}%`,
        status: b.status === "exceeded" ? "Vượt hạn mức" : b.status === "warning" ? "Cảnh báo" : "An toàn",
      });
      r.height = 20;
      r.getCell("allocated").numFmt = currencyFormat;
      r.getCell("spent").numFmt = currencyFormat;
      r.getCell("remaining").numFmt = currencyFormat;

      if (b.status === "exceeded") {
        r.getCell("status").font = { color: { argb: "FFE11D48" }, bold: true };
      }
    });
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileNameSafe = (data.workspaceName || "Tai-Chinh").replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `Bao-cao-tai-chinh-${fileNameSafe}-${data.generatedDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
