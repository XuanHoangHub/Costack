/**
 * Centralized Finance Hub type definitions.
 * All finance-related interfaces and types are defined here to avoid duplication
 * across FinanceHub.tsx, DebtDetailModal, DebtPaymentModal, ReceiptScannerModal, etc.
 */

export type FinanceTab = "overview" | "cashbook" | "invoices" | "debts" | "budgets" | "reports" | "ai-agent";
export type Currency = "VND" | "USD" | "EUR";
export type EntityType = "individual" | "organization" | "business";

export interface FinanceProfile {
  entityType: EntityType;
  displayName: string;
  currency: Currency;
  enabledTabs: FinanceTab[];
}

export interface BankAccount {
  id: string;
  bank: string;
  branch: string;
  number: string;
  balance: number;
  type: string;
  color?: string;
}

export interface Transaction {
  id: string;
  code: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  accountId: string;
  account: string;
  partner: string;
  note: string;
  status: "approved" | "pending" | "draft";
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  code: string;
  type: "out" | "in";
  partnerName: string;
  taxCode: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  date: string;
  dueDate: string | null;
  status: "valid" | "pending_verification" | "partially_paid" | "cancelled" | "paid" | "overdue";
  signed: boolean;
  items?: InvoiceItem[];
}

export interface DebtRecord {
  id: string;
  partnerName: string;
  type: "receivable" | "payable";
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  phone?: string;
  email?: string;
  status: "normal" | "due_soon" | "overdue";
}

export interface PaymentRecord {
  id: string;
  debtId: string | null;
  invoiceId: string | null;
  amount: number;
  date: string;
  method: "bank_transfer" | "cash" | "card" | "other";
  reference: string;
  note: string;
  createdAt: string;
}

export type PaymentTarget =
  | { kind: "debt"; record: DebtRecord }
  | { kind: "invoice"; record: Invoice };

export interface BudgetCategory {
  id: string;
  department: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  period: string;
  manager: string;
  status: "under" | "warning" | "exceeded";
}
