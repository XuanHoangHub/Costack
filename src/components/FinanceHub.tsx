"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Receipt, Landmark, CreditCard, DollarSign, FileText, AlertCircle,
  CheckCircle2, Clock, Plus, Search, Filter, Download, Sparkles,
  Bot, RefreshCw, Send, ShieldCheck, PieChart, BarChart3,
  Calendar, Check, AlertTriangle, FileSpreadsheet, Eye, ChevronRight,
  Layers, ChevronDown, CheckCheck, FileCheck, ArrowRightLeft, Users, Building, X
} from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/contexts/TranslationContext';

interface FinanceHubProps {
  activeWorkspaceId?: string;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

type FinanceTab = 'overview' | 'cashbook' | 'invoices' | 'debts' | 'reports' | 'ai-agent';

interface Transaction {
  id: string;
  code: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  account: string;
  partner: string;
  debitAccount: string;
  creditAccount: string;
  note: string;
  status: 'approved' | 'pending' | 'draft';
}

interface Invoice {
  id: string;
  code: string;
  formNumber: string;
  serialNumber: string;
  type: 'out' | 'in'; // out = Bán ra, in = Mua vào
  partnerName: string;
  taxCode: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  date: string;
  status: 'valid' | 'pending_verification' | 'cancelled';
  signed: boolean;
  tctCode?: string;
}

interface DebtRecord {
  id: string;
  partnerName: string;
  type: 'receivable' | 'payable'; // receivable = Phải thu (AR), payable = Phải trả (AP)
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  agingBucket: 'current' | '1-30' | '31-60' | 'over-60';
  contactPhone: string;
  contactEmail: string;
  status: 'normal' | 'due_soon' | 'overdue';
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    code: 'PT00189',
    type: 'income',
    category: 'Doanh thu dịch vụ SaaS & License',
    amount: 145000000,
    date: '2026-08-18',
    account: 'Vietcombank (0011004567890)',
    partner: 'Tập đoàn Công nghệ Alpha Tech',
    debitAccount: '1121 - Tiền gửi Ngân hàng',
    creditAccount: '5113 - Doanh thu cung cấp dịch vụ',
    note: 'Thanh toán gói hợp đồng Enterprise 12 tháng',
    status: 'approved'
  },
  {
    id: 'tx-2',
    code: 'PC00234',
    type: 'expense',
    category: 'Chi phí Server & Hạ tầng Cloud AWS/GCP',
    amount: 32500000,
    date: '2026-08-17',
    account: 'Techcombank (1903456789123)',
    partner: 'Amazon Web Services Inc.',
    debitAccount: '6422 - Chi phí dịch vụ mua ngoài',
    creditAccount: '1121 - Tiền gửi Ngân hàng',
    note: 'Chi phí hạ tầng Compute Cloud & Database tháng 8/2026',
    status: 'approved'
  },
  {
    id: 'tx-3',
    code: 'PC00235',
    type: 'expense',
    category: 'Chi phí Lương & Thưởng nhân sự đợt 1',
    amount: 185000000,
    date: '2026-08-15',
    account: 'MBBank (888899992222)',
    partner: 'Toàn thể Cán bộ Nhân viên Apexa',
    debitAccount: '3341 - Phải trả người lao động',
    creditAccount: '1121 - Tiền gửi Ngân hàng',
    note: 'Thanh toán lương kỳ 1 tháng 8/2026',
    status: 'approved'
  },
  {
    id: 'tx-4',
    code: 'PT00190',
    type: 'income',
    category: 'Thu tiền bảo trì & đào tạo người dùng',
    amount: 28000000,
    date: '2026-08-14',
    account: 'Vietcombank (0011004567890)',
    partner: 'Công ty Cổ phần May Sông Hồng',
    debitAccount: '1121 - Tiền gửi Ngân hàng',
    creditAccount: '5113 - Doanh thu cung cấp dịch vụ',
    note: 'Đào tạo và onboarding 50 user',
    status: 'approved'
  },
  {
    id: 'tx-5',
    code: 'PC00236',
    type: 'expense',
    category: 'Chi phí Marketing & Quảng cáo số',
    amount: 45000000,
    date: '2026-08-12',
    account: 'Quỹ tiền mặt (Văn phòng HN)',
    partner: 'Meta Platforms & Google Ads',
    debitAccount: '6418 - Chi phí bán hàng khác',
    creditAccount: '1111 - Tiền mặt VNĐ',
    note: 'Chi phí chiến dịch Lead Gen Q3/2026',
    status: 'pending'
  }
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    code: 'HD-2026-0089',
    formNumber: '1/001',
    serialNumber: '1C26TAPX',
    type: 'out',
    partnerName: 'Công ty TNHH Giải pháp Số VinaCore',
    taxCode: '0108992341',
    subtotal: 80000000,
    vatRate: 10,
    vatAmount: 8000000,
    total: 88000000,
    date: '2026-08-18',
    status: 'valid',
    signed: true,
    tctCode: 'TCT-0108992341-2026-882910'
  },
  {
    id: 'inv-2',
    code: 'HD-2026-0090',
    formNumber: '1/001',
    serialNumber: '1C26TAPX',
    type: 'out',
    partnerName: 'Tập đoàn Bán lẻ MegaMart VN',
    taxCode: '0312456789',
    subtotal: 120000000,
    vatRate: 8,
    vatAmount: 9600000,
    total: 129600000,
    date: '2026-08-16',
    status: 'valid',
    signed: true,
    tctCode: 'TCT-0312456789-2026-993812'
  },
  {
    id: 'inv-3',
    code: 'HD-2026-0045',
    formNumber: '1/001',
    serialNumber: '2C26TNCC',
    type: 'in',
    partnerName: 'Công ty Cổ phần Thiết bị Văn phòng Hiện đại',
    taxCode: '0106778899',
    subtotal: 24000000,
    vatRate: 10,
    vatAmount: 2400000,
    total: 26400000,
    date: '2026-08-10',
    status: 'valid',
    signed: true,
    tctCode: 'TCT-0106778899-2026-110293'
  },
  {
    id: 'inv-4',
    code: 'HD-2026-0046',
    formNumber: '1/001',
    serialNumber: '2C26TNCC',
    type: 'in',
    partnerName: 'Dịch vụ Thuê ngoài Cloud VNG Cloud',
    taxCode: '0304992211',
    subtotal: 18500000,
    vatRate: 10,
    vatAmount: 1850000,
    total: 20350000,
    date: '2026-08-05',
    status: 'valid',
    signed: true,
    tctCode: 'TCT-0304992211-2026-554422'
  }
];

const INITIAL_DEBTS: DebtRecord[] = [
  {
    id: 'debt-1',
    partnerName: 'Tập đoàn Công nghệ Alpha Tech',
    type: 'receivable',
    totalAmount: 145000000,
    paidAmount: 100000000,
    remainingAmount: 45000000,
    dueDate: '2026-08-25',
    agingBucket: 'current',
    contactPhone: '0904 112 334',
    contactEmail: 'accounting@alphatech.vn',
    status: 'normal'
  },
  {
    id: 'debt-2',
    partnerName: 'Công ty TNHH Bất động sản Tân Thời Đại',
    type: 'receivable',
    totalAmount: 95000000,
    paidAmount: 20000000,
    remainingAmount: 75000000,
    dueDate: '2026-08-10',
    agingBucket: '1-30',
    contactPhone: '0912 889 900',
    contactEmail: 'ketoan@tanthoidai.com.vn',
    status: 'overdue'
  },
  {
    id: 'debt-3',
    partnerName: 'Công ty Cổ phần May Sông Hồng',
    type: 'receivable',
    totalAmount: 28000000,
    paidAmount: 28000000,
    remainingAmount: 0,
    dueDate: '2026-08-14',
    agingBucket: 'current',
    contactPhone: '0936 445 566',
    contactEmail: 'finance@songhong.vn',
    status: 'normal'
  },
  {
    id: 'debt-4',
    partnerName: 'Công ty Thiết bị Văn phòng Hiện đại',
    type: 'payable',
    totalAmount: 26400000,
    paidAmount: 10000000,
    remainingAmount: 16400000,
    dueDate: '2026-08-30',
    agingBucket: 'current',
    contactPhone: '024 3889 9999',
    contactEmail: 'sales@tbvanphong.vn',
    status: 'normal'
  }
];

const BANK_ACCOUNTS = [
  {
    id: 'bank-1',
    bank: 'Vietcombank',
    branch: 'Sở Giao Dịch Hà Nội',
    number: '0011004567890',
    balance: 842500000,
    type: 'Tài khoản thanh toán chính',
    color: 'emerald'
  },
  {
    id: 'bank-2',
    bank: 'Techcombank',
    branch: 'Chi nhánh Hoàn Kiếm',
    number: '1903456789123',
    balance: 318200000,
    type: 'Tài khoản nhận thanh toán Online',
    color: 'rose'
  },
  {
    id: 'bank-3',
    bank: 'MBBank',
    branch: 'Chi nhánh Ba Đình',
    number: '888899992222',
    balance: 195400000,
    type: 'Tài khoản Quỹ Lương & Phúc lợi',
    color: 'blue'
  },
  {
    id: 'bank-4',
    bank: 'Quỹ tiền mặt',
    branch: 'Văn phòng Tổng công ty',
    number: 'TM-VPHN-01',
    balance: 42600000,
    type: 'Quỹ chi tiêu vãng lai (Cash on Hand)',
    color: 'amber'
  }
];

export function FinanceHub({ activeWorkspaceId = 'w1', onAddSyncLog, triggerToast }: FinanceHubProps) {
  const { isVietnamese, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [debts, setDebts] = useState<DebtRecord[]>(INITIAL_DEBTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'this_month' | 'q3_2026' | 'year_2026'>('this_month');

  // Modal states
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('income');
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showDunningModal, setShowDunningModal] = useState<DebtRecord | null>(null);

  // AI Assistant Chat State
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string; actionSuggestion?: string }>>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Tài chính & Kế toán Apexa (Chuẩn mực TT 200/TT 133 & Quản trị tài chính AMIS). Tôi có thể giúp bạn kiểm tra hóa đơn, đối chiếu công nợ, dự báo dòng tiền 30 ngày tới hoặc tự động hạch toán chứng từ.',
      time: 'Vừa xong'
    }
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // New Transaction Form state
  const [txForm, setTxForm] = useState({
    code: '',
    category: 'Doanh thu dịch vụ SaaS',
    amount: '',
    account: BANK_ACCOUNTS[0].bank + ' (' + BANK_ACCOUNTS[0].number + ')',
    partner: '',
    debitAccount: '1121 - Tiền gửi Ngân hàng',
    creditAccount: '5113 - Doanh thu cung cấp dịch vụ',
    note: ''
  });

  const wsKey = activeWorkspaceId || 'default';

  // Load saved state from LocalStorage per workspace
  useEffect(() => {
    try {
      const savedTx = localStorage.getItem(`apexa_finance_transactions_${wsKey}`) || localStorage.getItem('apexa_finance_transactions');
      if (savedTx) setTransactions(JSON.parse(savedTx));
      const savedInv = localStorage.getItem(`apexa_finance_invoices_${wsKey}`) || localStorage.getItem('apexa_finance_invoices');
      if (savedInv) setInvoices(JSON.parse(savedInv));
      const savedDebts = localStorage.getItem(`apexa_finance_debts_${wsKey}`) || localStorage.getItem('apexa_finance_debts');
      if (savedDebts) setDebts(JSON.parse(savedDebts));
    } catch (e) {}
  }, [wsKey]);

  // Save changes to LocalStorage per workspace
  useEffect(() => {
    try {
      localStorage.setItem(`apexa_finance_transactions_${wsKey}`, JSON.stringify(transactions));
      localStorage.setItem(`apexa_finance_invoices_${wsKey}`, JSON.stringify(invoices));
      localStorage.setItem(`apexa_finance_debts_${wsKey}`, JSON.stringify(debts));
    } catch (e) {}
  }, [transactions, invoices, debts, wsKey]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const totalCashBank = BANK_ACCOUNTS.reduce((sum, b) => sum + b.balance, 0);
    const totalReceivable = debts.filter(d => d.type === 'receivable').reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalPayable = debts.filter(d => d.type === 'payable').reduce((sum, d) => sum + d.remainingAmount, 0);

    return {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      totalCashBank,
      totalReceivable,
      totalPayable
    };
  }, [transactions, debts]);

  // Dynamic Weekly Cash Flow Calculation
  const cashFlowWeeklyBars = useMemo(() => {
    const weeks = [
      { label: isVietnamese ? 'Tuần 1' : 'Week 1', in: 0, out: 0, forecast: false },
      { label: isVietnamese ? 'Tuần 2' : 'Week 2', in: 0, out: 0, forecast: false },
      { label: isVietnamese ? 'Tuần 3' : 'Week 3', in: 0, out: 0, forecast: false },
      { label: isVietnamese ? 'Tuần 4 (Dự báo)' : 'Week 4 (Forecast)', in: 0, out: 0, forecast: true },
    ];

    transactions.forEach(t => {
      const day = parseInt(t.date?.split('-')?.[2] || '1', 10);
      const amountM = t.amount / 1000000;
      if (day <= 7) {
        if (t.type === 'income') weeks[0].in += amountM;
        else weeks[0].out += amountM;
      } else if (day <= 14) {
        if (t.type === 'income') weeks[1].in += amountM;
        else weeks[1].out += amountM;
      } else if (day <= 21) {
        if (t.type === 'income') weeks[2].in += amountM;
        else weeks[2].out += amountM;
      } else {
        if (t.type === 'income') weeks[3].in += amountM;
        else weeks[3].out += amountM;
      }
    });

    if (weeks[3].in === 0 && weeks[3].out === 0) {
      const avgIn = (weeks[0].in + weeks[1].in + weeks[2].in) / 3;
      const avgOut = (weeks[0].out + weeks[1].out + weeks[2].out) / 3;
      weeks[3].in = Math.round(avgIn > 0 ? avgIn * 1.05 : 130);
      weeks[3].out = Math.round(avgOut > 0 ? avgOut * 0.95 : 55);
    }

    const maxVal = Math.max(20, ...weeks.flatMap(w => [w.in, w.out]));

    return weeks.map(w => ({
      ...w,
      in: Math.round(w.in),
      out: Math.round(w.out),
      net: Math.round(w.in - w.out),
      inPercent: Math.min(100, Math.max(10, Math.round((w.in / maxVal) * 85))),
      outPercent: Math.min(100, Math.max(10, Math.round((w.out / maxVal) * 85))),
    }));
  }, [transactions, isVietnamese]);

  // Real Export Financial Report (CSV / Excel Format)
  const handleExportFinancialReport = () => {
    const headers = ['Mã chứng từ', 'Loại', 'Hạng mục', 'Số tiền (VNĐ)', 'Ngày giao dịch', 'Tài khoản', 'Đối tượng', 'Trạng thái'];
    const rows = transactions.map(t => [
      `"${t.code}"`,
      `"${t.type === 'income' ? 'Thu' : 'Chi'}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${t.date}"`,
      `"${t.account}"`,
      `"${(t.partner || '').replace(/"/g, '""')}"`,
      `"${t.status}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa-bao-cao-tai-chinh-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    triggerToast?.('success', isVietnamese ? 'Đã xuất báo cáo tài chính' : 'Financial Report Exported', isVietnamese ? 'Tệp dữ liệu CSV đã được tải xuống máy tính.' : 'CSV financial report downloaded successfully.');
    onAddSyncLog?.('Exported financial statement report');
  };

  // Format VND Currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  };

  // Handle Add Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.partner) {
      triggerToast?.('error', 'Thiếu thông tin', 'Vui lòng nhập số tiền và đối tượng giao dịch.');
      return;
    }
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      code: txModalType === 'income' ? `PT${Math.floor(10000 + Math.random() * 90000)}` : `PC${Math.floor(10000 + Math.random() * 90000)}`,
      type: txModalType,
      category: txForm.category,
      amount: Number(txForm.amount),
      date: new Date().toISOString().split('T')[0],
      account: txForm.account,
      partner: txForm.partner,
      debitAccount: txForm.debitAccount,
      creditAccount: txForm.creditAccount,
      note: txForm.note,
      status: 'approved'
    };

    setTransactions([newTx, ...transactions]);
    setShowNewTxModal(false);
    onAddSyncLog?.(`Created ${txModalType === 'income' ? 'Phiếu Thu' : 'Phiếu Chi'}: ${newTx.code}`);
    triggerToast?.('success', 'Đã lưu chứng từ', `Đã tạo thành công chứng từ ${newTx.code} trị giá ${formatMoney(newTx.amount)}`);
    setTxForm({
      code: '',
      category: 'Doanh thu dịch vụ SaaS',
      amount: '',
      account: BANK_ACCOUNTS[0].bank + ' (' + BANK_ACCOUNTS[0].number + ')',
      partner: '',
      debitAccount: '1121 - Tiền gửi Ngân hàng',
      creditAccount: '5113 - Doanh thu cung cấp dịch vụ',
      note: ''
    });
  };

  // AI Chat Handler
  const handleSendAiMessage = (overrideText?: string) => {
    const textToSend = overrideText || aiInputText;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setAiChatMessages(prev => [...prev, userMsg]);
    if (!overrideText) setAiInputText('');
    setIsAiAnalyzing(true);

    setTimeout(() => {
      let aiReply = '';
      let suggestion = '';

      const normalized = textToSend.toLowerCase();
      if (normalized.includes('dòng tiền') || normalized.includes('dự báo') || normalized.includes('cash flow')) {
        aiReply = `📊 **Phân tích Dự báo Dòng tiền 30 ngày tới:**\n- Số dư khả dụng hiện tại: **${formatMoney(metrics.totalCashBank)}**\n- Dự kiến thu hồi công nợ đến hạn: **+${formatMoney(45000000)}**\n- Dự kiến chi lương & vận hành định kỳ: **-${formatMoney(65000000)}**\n👉 **Dự kiến số dư cuối kỳ: ${formatMoney(metrics.totalCashBank + 45000000 - 65000000)}** (Dòng tiền an toàn, thanh khoản đạt 1.8x).`;
        suggestion = 'Gửi email nhắc nợ đối tác Tân Thời Đại để tăng dự trữ tiền mặt';
      } else if (normalized.includes('hóa đơn') || normalized.includes('thuế') || normalized.includes('hạch toán')) {
        aiReply = `🧾 **Hướng dẫn Hạch toán theo Thông tư 200/2014/TT-BTC:**\n- Nghiệp vụ mua phần mềm/dịch vụ Cloud trả trước:\n  • Nợ TK 242 (Chi phí trả trước dài hạn)\n  • Nợ TK 1331 (Thuế GTGT được khấu trừ - 10%)\n  • Có TK 1121 (Tiền gửi ngân hàng)\n- Hàng tháng trích khấu hao phân bổ: Nợ TK 6422 / Có TK 242.`;
        suggestion = 'Tạo phiếu chi tự động từ hóa đơn Cloud VNG';
      } else if (normalized.includes('công nợ') || normalized.includes('nợ xấu') || normalized.includes('quá hạn')) {
        aiReply = `⚠️ **Cảnh báo Công nợ Phải thu:**\nPhát hiện 1 khoản nợ quá hạn 8 ngày của **Công ty TNHH Bất động sản Tân Thời Đại** (${formatMoney(75000000)}). Đề xuất gửi thư nhắc nợ kèm chiết khấu 1.5% nếu thanh toán trong vòng 48h.`;
        suggestion = 'Mở mẫu nhắc nợ tự động gửi qua Zalo/Email';
      } else {
        aiReply = `Tôi đã ghi nhận câu hỏi: "${textToSend}". Hệ thống Apexa Finance đã tự động rà soát dữ liệu sổ sách tháng 8/2026. Tỷ suất lợi nhuận ròng hiện đạt **${metrics.profitMargin.toFixed(1)}%**, toàn bộ 4 tài khoản ngân hàng đã được đối chiếu tự động khớp 100% với sao kê.`;
        suggestion = 'Xuất Báo cáo Kết quả Kinh doanh P&L tháng 8';
      }

      setAiChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          actionSuggestion: suggestion
        }
      ]);
      setIsAiAnalyzing(false);
    }, 900);
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[var(--cu-bg-subtle)]">
      {/* Finance Header */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <Landmark className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {isVietnamese ? 'Apexa Finance & Kế toán' : 'Apexa Finance & Accounting'}
              </h1>
              <Badge variant="shots-new">AMIS-Grade AI</Badge>
              <Badge variant="shots">TT 200 & TT 133</Badge>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isVietnamese 
                ? 'Quản trị Tài chính, Dòng tiền, Quỹ tiền mặt, Ngân hàng điện tử & Hóa đơn tự động hóa AI' 
                : 'Financial management, cash flow, e-banking & AI-automated invoicing'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            pill
            size="sm"
            onClick={() => {
              onAddSyncLog?.('Reconciled bank accounts with core ledger');
              triggerToast?.('success', isVietnamese ? 'Đối soát Ngân hàng hoàn tất' : 'Bank Reconciliation Completed', isVietnamese ? 'Đã khớp 100% giao dịch với 4 ngân hàng liên kết.' : '100% transactions matched across 4 linked bank accounts.');
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-sky-400" />
            {isVietnamese ? 'Đối soát Ngân hàng' : 'Bank Reconciliation'}
          </Button>

          <Button
            variant="outline"
            pill
            size="sm"
            onClick={() => {
              setTxModalType('expense');
              setShowNewTxModal(true);
            }}
          >
            <ArrowDownRight className="w-3.5 h-3.5 mr-1 text-rose-500" />
            {isVietnamese ? 'Lập Phiếu Chi' : 'New Expense'}
          </Button>

          <Button
            variant="shots"
            pill
            size="sm"
            onClick={() => {
              setTxModalType('income');
              setShowNewTxModal(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {isVietnamese ? 'Lập Phiếu Thu' : 'New Income'}
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="shrink-0 px-6 py-2.5 bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-4">
        <SegmentedControl
          size="sm"
          value={activeTab}
          onChange={(val) => setActiveTab(val as FinanceTab)}
          options={[
            { id: 'overview', label: isVietnamese ? 'Tổng quan & KPI' : 'Overview & KPIs', icon: PieChart },
            { id: 'cashbook', label: isVietnamese ? 'Sổ Quỹ & Ngân hàng' : 'Cash & Bank', icon: Wallet, badge: transactions.length },
            { id: 'invoices', label: isVietnamese ? 'Hóa đơn Điện tử' : 'E-Invoices', icon: Receipt, badge: invoices.length },
            { id: 'debts', label: isVietnamese ? 'Công nợ & Tuổi nợ' : 'AR / AP Aging', icon: Users, badge: debts.filter(d => d.status === 'overdue').length ? (isVietnamese ? 'Cảnh báo' : 'Warning') : undefined },
            { id: 'reports', label: isVietnamese ? 'Báo cáo Tài chính P&L' : 'P&L Reports', icon: FileSpreadsheet },
            { id: 'ai-agent', label: isVietnamese ? 'Trợ lý AI Kế toán' : 'AI Accountant', icon: Bot, badge: 'AI Agent' },
          ]}
        />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isVietnamese ? "Tìm chứng từ, đối tác, mã HĐ..." : "Search vouchers, partners, invoices..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-56"
            />
          </div>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: OVERVIEW & DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Key Metrics Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="bento" className="p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Tổng Doanh thu</span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatMoney(metrics.totalIncome)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+18.4% so với tháng trước</span>
                </div>
              </Card>

              <Card variant="bento" className="p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Tổng Chi phí</span>
                  <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatMoney(metrics.totalExpense)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Kiểm soát định mức 82% ngân sách</span>
                </div>
              </Card>

              <Card variant="bento" className="p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Lợi nhuận ròng</span>
                  <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-sky-400">
                  {formatMoney(metrics.netProfit)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-sky-400">
                  <span>Biên lợi nhuận ròng: {metrics.profitMargin.toFixed(1)}%</span>
                </div>
              </Card>

              <Card variant="bento" className="p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Số dư Tiền & Ngân hàng</span>
                  <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Landmark className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatMoney(metrics.totalCashBank)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>4/4 Tài khoản sẵn sàng thanh toán</span>
                </div>
              </Card>
            </div>

            {/* Bank Accounts & Cash Balance Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  Tài khoản Ngân hàng & Sổ Quỹ Tiền mặt
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  Liên kết tự động BankHub API
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {BANK_ACCOUNTS.map(acc => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-3xl shots-glass-card border border-slate-200/80 dark:border-slate-800/80 hover:scale-[1.01] transition-transform space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        {acc.bank}
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        VND
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        {acc.number}
                      </div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {formatMoney(acc.balance)}
                      </div>
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate pt-2 border-t border-slate-100 dark:border-slate-800">
                      {acc.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cash Flow Forecast & AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cash Flow Forecast Chart Box */}
              <div className="lg:col-span-2 p-5 rounded-3xl shots-glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      Dòng tiền & Dự báo Thu Chi 30 ngày (Cash Flow Forecast)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Mô hình AI dự báo tự động dựa trên chu kỳ công nợ và hợp đồng định kỳ
                    </p>
                  </div>
                  <Badge variant="shots">Độ chính xác AI 94.8%</Badge>
                </div>

                {/* Dynamic Calculated Chart Bars */}
                <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
                  {cashFlowWeeklyBars.map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        {/* Income Bar */}
                        <div
                          style={{ height: `${bar.inPercent}%` }}
                          className={`w-6 rounded-t-xl transition-all ${
                            bar.forecast 
                              ? 'bg-emerald-400/60 border border-dashed border-emerald-500' 
                              : 'bg-emerald-500 dark:bg-emerald-400 shadow-sm shadow-emerald-500/20'
                          }`}
                          title={`Thu: ${bar.in} triệu VNĐ`}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${bar.outPercent}%` }}
                          className={`w-6 rounded-t-xl transition-all ${
                            bar.forecast 
                              ? 'bg-rose-400/60 border border-dashed border-rose-500' 
                              : 'bg-rose-500 dark:bg-rose-400 shadow-sm shadow-rose-500/20'
                          }`}
                          title={`Chi: ${bar.out} triệu VNĐ`}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${bar.forecast ? 'text-blue-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-6 text-xs font-bold">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded-md bg-emerald-500" />
                    <span>Dòng tiền vào (Doanh thu & Thu nợ)</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <span className="w-3 h-3 rounded-md bg-rose-500" />
                    <span>Dòng tiền ra (Lương, Server, Vận hành)</span>
                  </div>
                </div>
              </div>

              {/* AI Financial Health & Risk Radar */}
              <div className="p-5 rounded-3xl shots-glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Bot className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      AI Khuyến nghị Tài chính
                    </h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-sky-300">
                      Chỉ số Tốt 88/100
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Cảnh báo Nợ quá hạn
                      </div>
                      <p className="text-[11.5px] text-amber-700/90 dark:text-amber-300/90">
                        Đối tác Tân Thời Đại có khoản nợ 75 triệu VNĐ quá hạn 8 ngày.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-sky-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Tối ưu Chi phí Thuế GTGT
                      </div>
                      <p className="text-[11.5px] text-blue-700/90 dark:text-sky-300/90">
                        Còn 2 hóa đơn đầu vào tháng 8 chưa kê khai khấu trừ thuế GTGT (trị giá 4.2 triệu).
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="shots"
                  pill
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    setActiveTab('ai-agent');
                    handleSendAiMessage('Phân tích tổng thể sức khỏe tài chính và đề xuất kế hoạch dòng tiền tháng 9');
                  }}
                >
                  <Bot className="w-3.5 h-3.5 mr-1" />
                  Kích hoạt Trợ lý AI Phân tích
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CASHBOOK & BANK TRANSACTIONS */}
        {activeTab === 'cashbook' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Sổ Nhật ký Thu Chi & Giao dịch Ngân hàng
                </h2>
                <Badge variant="shots">{transactions.length} chứng từ</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="shots"
                  pill
                  size="sm"
                  onClick={() => {
                    setTxModalType('income');
                    setShowNewTxModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Lập Phiếu Thu (PT)
                </Button>
                <Button
                  variant="outline"
                  pill
                  size="sm"
                  onClick={() => {
                    setTxModalType('expense');
                    setShowNewTxModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Lập Phiếu Chi (PC)
                </Button>
              </div>
            </div>

            {/* Transactions Table Card */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-800/50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Số CT</th>
                      <th className="py-3 px-4">Ngày</th>
                      <th className="py-3 px-4">Đối tượng / Đối tác</th>
                      <th className="py-3 px-4">Nội dung diễn giải</th>
                      <th className="py-3 px-4">TK Nợ / Có</th>
                      <th className="py-3 px-4">Tài khoản thanh toán</th>
                      <th className="py-3 px-4 text-right">Số tiền (VNĐ)</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {transactions
                      .filter(t => 
                        !searchQuery || 
                        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.partner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.note.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-sky-400">
                            {tx.code}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {tx.date}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-56 truncate">
                            {tx.partner}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-64 truncate">
                            {tx.note}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            <span className="text-emerald-600 font-bold">{tx.debitAccount.split(' - ')[0]}</span>
                            {' / '}
                            <span className="text-rose-600 font-bold">{tx.creditAccount.split(' - ')[0]}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11.5px]">
                            {tx.account.split(' (')[0]}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold tabular-nums text-[13px] ${
                            tx.type === 'income' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {tx.status === 'approved' ? 'Đã ghi sổ' : 'Chờ duyệt'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: E-INVOICES (HÓA ĐƠN ĐIỆN TỬ) */}
        {activeTab === 'invoices' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  Hóa đơn Điện tử & Kết nối Tổng cục Thuế (TCT)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Tự động đồng bộ hóa đơn GTGT, kiểm tra mã số thuế và chữ ký số hợp lệ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  pill
                  size="sm"
                  onClick={() => {
                    triggerToast?.('success', 'Đã xác thực TCT', 'Toàn bộ 4 hóa đơn đã được kiểm tra tính hợp lệ trên hệ thống Tổng cục Thuế.');
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Kiểm tra hợp lệ TCT
                </Button>
                <Button
                  variant="shots"
                  pill
                  size="sm"
                  onClick={() => {
                    triggerToast?.('info', 'Tạo Hóa đơn mới', 'Đang mở giao diện lập hóa đơn điện tử chuẩn Nghị định 123/2020/NĐ-CP.');
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Lập Hóa đơn Mới
                </Button>
              </div>
            </div>

            {/* Invoices List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 rounded-3xl shots-glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-3.5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inv.type === 'out' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-sky-300' 
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {inv.type === 'out' ? 'HĐ Bán ra' : 'HĐ Mua vào'}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {inv.serialNumber} / {inv.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã ký điện tử</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {inv.partnerName}
                    </div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      MST: {inv.taxCode}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Tiền hàng trước thuế:</span>
                      <span className="font-bold">{formatMoney(inv.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Thuế GTGT ({inv.vatRate}%):</span>
                      <span className="font-bold">{formatMoney(inv.vatAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-900 dark:text-white font-black text-sm pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Tổng cộng thanh toán:</span>
                      <span className="text-blue-600 dark:text-sky-400">{formatMoney(inv.total)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <span>Mã CQT: {inv.tctCode || 'Chưa cấp mã'}</span>
                    <span>{inv.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DEBT & AGING (CÔNG NỢ & TUỔI NỢ) */}
        {activeTab === 'debts' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  Quản lý Công nợ & Ma trận Tuổi nợ (Aging Matrix)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Theo dõi công nợ phải thu (AR) & phải trả (AP) kèm tính năng tự động nhắc nợ AI
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="shots"
                  pill
                  size="sm"
                  onClick={() => {
                    const overdueItem = debts.find(d => d.status === 'overdue');
                    if (overdueItem) setShowDunningModal(overdueItem);
                  }}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Nhắc nợ Tự động AI (Dunning)
                </Button>
              </div>
            </div>

            {/* Debt Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  className={`p-5 rounded-3xl shots-glass-card border space-y-3.5 transition-all ${
                    debt.status === 'overdue'
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                      : 'border-slate-200/80 dark:border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      debt.type === 'receivable'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-sky-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {debt.type === 'receivable' ? 'Phải thu (Khách hàng)' : 'Phải trả (Nhà cung cấp)'}
                    </span>

                    {debt.status === 'overdue' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Quá hạn thanh toán
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        Trong hạn
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {debt.partnerName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Hạn thanh toán: <span className="font-bold">{debt.dueDate}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Đã thanh toán: {formatMoney(debt.paidAmount)}</span>
                      <span className="text-rose-600 dark:text-rose-400">Còn nợ: {formatMoney(debt.remainingAmount)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${(debt.paidAmount / debt.totalAmount) * 100}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Liên hệ: {debt.contactPhone}
                    </div>
                    <Button
                      variant="glass"
                      pill
                      size="sm"
                      onClick={() => setShowDunningModal(debt)}
                    >
                      <Bot className="w-3 h-3 mr-1 text-blue-600" />
                      Soạn nhắc nợ AI
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FINANCIAL STATEMENTS & P&L (BÁO CÁO TÀI CHÍNH) */}
        {activeTab === 'reports' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  Báo cáo Kết quả Hoạt động Kinh doanh (P&L Statement)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Chuẩn mực Kế toán Doanh nghiệp Việt Nam (VAS & TT 200/2014/TT-BTC)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  pill
                  size="sm"
                  onClick={handleExportFinancialReport}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Xuất Excel / CSV
                </Button>
              </div>
            </div>

            {/* P&L Statement Sheet */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
              <div className="text-center space-y-1 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="text-xs font-black tracking-widest text-slate-400 uppercase">CÔNG TY CỔ PHẦN CÔNG NGHỆ APEXA</div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">BÁO CÁO KẾT QUẢ KINH DOANH</h3>
                <div className="text-xs text-slate-500">Kỳ báo cáo: Tháng 08/2026 (Đơn vị tính: VNĐ)</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400">
                      <th className="py-2.5 px-3">Chỉ tiêu tài chính</th>
                      <th className="py-2.5 px-3">Mã số</th>
                      <th className="py-2.5 px-3 text-right">Kỳ này (Tháng 8/2026)</th>
                      <th className="py-2.5 px-3 text-right">Kỳ trước</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">1. Doanh thu bán hàng và cung cấp dịch vụ</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">01</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatMoney(metrics.totalIncome)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatMoney(142000000)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">2. Các khoản giảm trừ doanh thu</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">02</td>
                      <td className="py-2.5 px-3 text-right">0 ₫</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">0 ₫</td>
                    </tr>
                    <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-sky-400">3. Doanh thu thuần (01 - 02)</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">10</td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-600 dark:text-sky-400">{formatMoney(metrics.totalIncome)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatMoney(142000000)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">4. Giá vốn hàng bán (COGS / Server Infra)</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">11</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatMoney(32500000)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatMoney(28000000)}</td>
                    </tr>
                    <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">5. Lợi nhuận gộp về bán hàng (10 - 11)</td>
                      <td className="py-2.5 px-3 font-mono font-bold">20</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">{formatMoney(metrics.totalIncome - 32500000)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatMoney(114000000)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">6. Chi phí bán hàng & Marketing</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">25</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatMoney(45000000)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatMoney(38000000)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">7. Chi phí Quản lý Doanh nghiệp & Lương</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">26</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatMoney(185000000)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatMoney(180000000)}</td>
                    </tr>
                    <tr className="bg-blue-50/80 dark:bg-blue-950/40 text-sm">
                      <td className="py-3 px-3 font-black text-blue-900 dark:text-sky-200">8. Lợi nhuận thuần từ hoạt động kinh doanh (EBIT)</td>
                      <td className="py-3 px-3 font-mono font-black text-blue-900 dark:text-sky-200">30</td>
                      <td className="py-3 px-3 text-right font-black text-blue-700 dark:text-sky-300">{formatMoney(metrics.netProfit)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-400">{formatMoney(65000000)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AI ACCOUNTING COPILOT (TRỢ LÝ AI) */}
        {activeTab === 'ai-agent' && (
          <div className="max-w-4xl mx-auto h-[650px] flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-lg overflow-hidden">
            {/* AI Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-sky-400/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">Apexa AI Accounting Agent</span>
                    <Badge variant="shots-new">AMIS OneAI Engine</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Hỗ trợ tự động hạch toán, bóc tách hóa đơn, phân tích P&L & cảnh báo rủi ro thuế
                  </p>
                </div>
              </div>

              <Button
                variant="glass"
                pill
                size="sm"
                onClick={() => setAiChatMessages([aiChatMessages[0]])}
              >
                Làm mới đoạn chat
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-xl space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 p-4 rounded-2xl rounded-tl-none text-xs leading-relaxed border border-slate-200/60 dark:border-slate-700/60'
                  }`}>
                    <div className="whitespace-pre-line">{msg.text}</div>
                    
                    {msg.actionSuggestion && (
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-blue-600 dark:text-sky-300">
                          ⚡ Gợi ý: {msg.actionSuggestion}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast?.('success', 'Đã thực hiện gợi ý AI', `Đã áp dụng: ${msg.actionSuggestion}`);
                          }}
                          className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
                        >
                          Thực hiện
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAiAnalyzing && (
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-sky-400 p-2 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>Trợ lý AI đang rà soát dữ liệu sổ sách kế toán...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                'Dự báo dòng tiền 30 ngày',
                'Kiểm tra công nợ quá hạn',
                'Hạch toán chi phí Cloud AWS',
                'Tối ưu hóa thuế GTGT Q3'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendAiMessage(chip)}
                  className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 bg-white dark:bg-slate-900">
              <input
                type="text"
                placeholder="Nhập câu hỏi hoặc yêu cầu trợ lý AI kế toán..."
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                className="flex-1 px-4 py-2.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <Button
                variant="shots"
                pill
                size="sm"
                onClick={() => handleSendAiMessage()}
                disabled={!aiInputText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW TRANSACTION */}
      <AnimatePresence>
        {showNewTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setShowNewTxModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl text-white ${txModalType === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {txModalType === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {txModalType === 'income' ? 'Lập Phiếu Thu Tiền' : 'Lập Phiếu Chi Tiền'}
                    </h3>
                    <p className="text-xs text-slate-500">Chứng từ kế toán chuẩn Thông tư 200/2014/TT-BTC</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewTxModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đối tác / Người nộp hoặc nhận tiền:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tập đoàn Công nghệ Alpha Tech"
                    value={txForm.partner}
                    onChange={(e) => setTxForm({ ...txForm, partner: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Số tiền (VNĐ):
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="VD: 50000000"
                      value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tài khoản quỹ / Ngân hàng:
                    </label>
                    <select
                      value={txForm.account}
                      onChange={(e) => setTxForm({ ...txForm, account: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {BANK_ACCOUNTS.map(acc => (
                        <option key={acc.id} value={`${acc.bank} (${acc.number})`}>
                          {acc.bank} - {acc.number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tài khoản Nợ (Debit):
                    </label>
                    <input
                      type="text"
                      value={txForm.debitAccount}
                      onChange={(e) => setTxForm({ ...txForm, debitAccount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tài khoản Có (Credit):
                    </label>
                    <input
                      type="text"
                      value={txForm.creditAccount}
                      onChange={(e) => setTxForm({ ...txForm, creditAccount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Diễn giải nội dung:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Thanh toán gói hợp đồng dịch vụ quý 3..."
                    value={txForm.note}
                    onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    pill
                    onClick={() => setShowNewTxModal(false)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    variant="shots"
                    pill
                  >
                    Lưu & Ghi Sổ Kế Toán
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SMART DUNNING AI (NHẮC NỢ TỰ ĐỘNG) */}
      <AnimatePresence>
        {showDunningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setShowDunningModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600 text-white">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      AI Smart Dunning - Soạn Thư Nhắc Nợ
                    </h3>
                    <p className="text-xs text-slate-500">Đối tác: {showDunningModal.partnerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDunningModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    Khoản nợ: <span className="text-rose-600 font-black">{formatMoney(showDunningModal.remainingAmount)}</span>
                  </div>
                  <div className="text-slate-500">
                    Hạn thanh toán: {showDunningModal.dueDate} (Quá hạn 8 ngày)
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nội dung thư nhắc nợ do AI tự động tạo:
                  </label>
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 text-slate-800 dark:text-slate-200 leading-relaxed text-[11.5px] font-medium space-y-2">
                    <p>Kính gửi Ban Lãnh đạo & Phòng Kế toán <strong>{showDunningModal.partnerName}</strong>,</p>
                    <p>Hệ thống kế toán tự động Apexa xin trân trọng thông báo quý công ty hiện có khoản thanh toán đến hạn số tiền <strong>{formatMoney(showDunningModal.remainingAmount)}</strong> theo hợp đồng dịch vụ đã ký kết.</p>
                    <p>Kính đề nghị quý đơn vị hỗ trợ hoàn tất đối soát và chuyển khoản trước ngày 25/08/2026 vào STK Vietcombank 0011004567890.</p>
                    <p>Trân trọng cảm ơn sự hợp tác của Quý đối tác!</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    pill
                    onClick={() => setShowDunningModal(null)}
                  >
                    Đóng
                  </Button>
                  <Button
                    type="button"
                    variant="shots"
                    pill
                    onClick={() => {
                      triggerToast?.('success', 'Đã gửi thư nhắc nợ', `Đã gửi tự động qua Email (${showDunningModal.contactEmail}) và Zalo.`);
                      setShowDunningModal(null);
                    }}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Gửi Thư Nhắc Nợ (Email & Zalo)
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FinanceHub;
