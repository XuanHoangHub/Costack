"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes, Package, ShoppingCart, Truck, Users, DollarSign, ArrowUpRight,
  ArrowDownLeft, Plus, Search, Filter, Download, CheckCircle2, Clock,
  AlertTriangle, Eye, Edit3, Trash2, ChevronRight, FileText, Building,
  TrendingUp, Award, Layers, ShieldCheck, ArrowRight, BarChart3, RefreshCw,
  Printer, Send, Check, X, Calendar, UserCheck, CreditCard, PieChart, Sparkles
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { User } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { Select } from '@/components/ui/Select';

interface ERPHubProps {
  activeWorkspaceId: string;
  members?: User[];
  isOffline?: boolean;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message', title: string, message: string, options?: { taskId?: string; workspaceId?: string; persistInInbox?: boolean; }) => void;
}

export type ERPModule = 'dashboard' | 'inventory' | 'sales' | 'procurement' | 'hr';

// Data Interfaces
export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  location: string;
  updatedAt: string;
}

export interface StockVoucher {
  id: string;
  code: string;
  type: 'in' | 'out'; // 'in': Nhập kho, 'out': Xuất kho
  reason: string;
  items: { productId: string; sku: string; name: string; quantity: number; unitPrice: number }[];
  totalValue: number;
  operator: string;
  date: string;
  referenceDoc?: string;
}

export interface SalesOrder {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: { productId: string; sku: string; name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  vatRate: number;
  totalAmount: number;
  orderDate: string;
  deliveryDate: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  fulfillmentStatus: 'unfulfilled' | 'shipping' | 'delivered';
  notes?: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;
  taxCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTerms: string;
  bankAccount: string;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  vendorId: string;
  vendorName: string;
  items: { productId: string; sku: string; name: string; quantity: number; unitCost: number; total: number }[];
  totalCost: number;
  orderDate: string;
  status: 'draft' | 'pending' | 'ordered' | 'received';
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  avatar?: string;
  department: string;
  position: string;
  baseSalary: number;
  allowance: number;
  kpiBonus: number;
  joinDate: string;
  status: 'active' | 'leave';
}

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export default function ERPHub({
  activeWorkspaceId, members = [], isOffline = false, onAddSyncLog, triggerToast
}: ERPHubProps) {
  const { isVietnamese } = useTranslation();
  const [activeModule, setActiveModule] = useState<ERPModule>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const wsKey = activeWorkspaceId || 'default';

  // State: Products
  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(`apexa_erp_products_${wsKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'p-1', sku: 'APX-SRV-01', name: 'Máy chủ Dell PowerEdge R750 Enterprise', category: 'Thiết bị IT', unit: 'Bộ', costPrice: 65000000, sellingPrice: 88000000, stockQty: 12, minStock: 5, location: 'Kho A - Kệ 01', updatedAt: '2026-08-18' },
      { id: 'p-2', sku: 'APX-NET-02', name: 'Switch Cisco Catalyst 9200L 48-Port PoE+', category: 'Thiết bị Mạng', unit: 'Bộ', costPrice: 28000000, sellingPrice: 39500000, stockQty: 4, minStock: 6, location: 'Kho A - Kệ 02', updatedAt: '2026-08-19' },
      { id: 'p-3', sku: 'APX-LIC-03', name: 'Bản quyền Apexa Cloud Suite (12 Tháng)', category: 'Phần mềm', unit: 'License', costPrice: 15000000, sellingPrice: 24000000, stockQty: 99, minStock: 10, location: 'Kho Kỹ thuật số', updatedAt: '2026-08-20' },
      { id: 'p-4', sku: 'APX-ACC-04', name: 'Bộ lưu điện APC Smart-UPS SRT 3000VA', category: 'Thiết bị IT', unit: 'Cái', costPrice: 22000000, sellingPrice: 29000000, stockQty: 3, minStock: 5, location: 'Kho B - Kệ 01', updatedAt: '2026-08-15' },
      { id: 'p-5', sku: 'APX-SRV-05', name: 'RAM Server Samsung 64GB DDR4 ECC 3200MHz', category: 'Linh kiện', unit: 'Thanh', costPrice: 4200000, sellingPrice: 5800000, stockQty: 35, minStock: 15, location: 'Kho Linh kiện', updatedAt: '2026-08-19' },
    ];
  });

  // State: Stock Vouchers
  const [vouchers, setVouchers] = useState<StockVoucher[]>(() => {
    try {
      const saved = localStorage.getItem(`apexa_erp_vouchers_${wsKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'v-1', code: 'NK-2608-001', type: 'in', reason: 'Nhập hàng từ nhà cung cấp Dell VN', items: [{ productId: 'p-1', sku: 'APX-SRV-01', name: 'Máy chủ Dell PowerEdge R750 Enterprise', quantity: 5, unitPrice: 65000000 }], totalValue: 325000000, operator: 'Nguyễn Văn Quản', date: '2026-08-18', referenceDoc: 'PO-2608-01' },
      { id: 'v-2', code: 'XK-2608-002', type: 'out', reason: 'Xuất giao dự án Tập đoàn VNG', items: [{ productId: 'p-1', sku: 'APX-SRV-01', name: 'Máy chủ Dell PowerEdge R750 Enterprise', quantity: 2, unitPrice: 88000000 }], totalValue: 176000000, operator: 'Trần Bán Hàng', date: '2026-08-19', referenceDoc: 'DH-2608-01' },
    ];
  });

  // State: Sales Orders
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    try {
      const saved = localStorage.getItem(`apexa_erp_sales_orders_${wsKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'so-1',
        code: 'DH-2608-001',
        customerName: 'Công ty Cổ phần VNG',
        customerPhone: '0912345678',
        customerEmail: 'procurement@vng.com.vn',
        items: [
          { productId: 'p-1', sku: 'APX-SRV-01', name: 'Máy chủ Dell PowerEdge R750 Enterprise', quantity: 2, unitPrice: 88000000, total: 176000000 },
          { productId: 'p-3', sku: 'APX-LIC-03', name: 'Bản quyền Apexa Cloud Suite (12 Tháng)', quantity: 5, unitPrice: 24000000, total: 120000000 }
        ],
        subtotal: 296000000,
        vatRate: 10,
        totalAmount: 325600000,
        orderDate: '2026-08-17',
        deliveryDate: '2026-08-25',
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipping',
        notes: 'Giao hàng và nghiệm thu tại Campus VNG Quận 7'
      },
      {
        id: 'so-2',
        code: 'DH-2608-002',
        customerName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
        customerPhone: '0988776655',
        customerEmail: 'it-support@mbbank.com.vn',
        items: [
          { productId: 'p-2', sku: 'APX-NET-02', name: 'Switch Cisco Catalyst 9200L 48-Port PoE+', quantity: 4, unitPrice: 39500000, total: 158000000 }
        ],
        subtotal: 158000000,
        vatRate: 10,
        totalAmount: 173800000,
        orderDate: '2026-08-19',
        deliveryDate: '2026-08-28',
        paymentStatus: 'partial',
        fulfillmentStatus: 'unfulfilled',
        notes: 'Tạm ứng 50%, thanh toán nốt sau bàn giao 15 ngày.'
      }
    ];
  });

  // State: Vendors
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    try {
      const saved = localStorage.getItem(`apexa_erp_vendors_${wsKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'v-1', code: 'NCC-001', name: 'Công ty TNHH Phân phối Synnex FPT', category: 'Thiết bị IT & Phần cứng', taxCode: '0101778899', contactPerson: 'Nguyễn Thu Trang', phone: '024 7300 6666', email: 'sales@synnexfpt.com.vn', paymentTerms: 'Công nợ 30 ngày', bankAccount: '112000045678 - VietinBank' },
      { id: 'v-2', code: 'NCC-002', name: 'Công ty Cổ phần Công nghệ CMC', category: 'Hạ tầng mạng & Bảo mật', taxCode: '0100244112', contactPerson: 'Lê Minh Tuấn', phone: '024 3795 8668', email: 'enterprise@cmc.com.vn', paymentTerms: 'Thanh toán ngay', bankAccount: '0011000998877 - Vietcombank' },
    ];
  });

  // State: Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem(`apexa_erp_pos_${wsKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'po-1',
        code: 'PO-2608-01',
        vendorId: 'v-1',
        vendorName: 'Công ty TNHH Phân phối Synnex FPT',
        items: [{ productId: 'p-1', sku: 'APX-SRV-01', name: 'Máy chủ Dell PowerEdge R750 Enterprise', quantity: 5, unitCost: 65000000, total: 325000000 }],
        totalCost: 325000000,
        orderDate: '2026-08-15',
        status: 'received'
      },
      {
        id: 'po-2',
        code: 'PO-2608-02',
        vendorId: 'v-2',
        vendorName: 'Công ty Cổ phần Công nghệ CMC',
        items: [{ productId: 'p-2', sku: 'APX-NET-02', name: 'Switch Cisco Catalyst 9200L 48-Port PoE+', quantity: 10, unitCost: 28000000, total: 280000000 }],
        totalCost: 280000000,
        orderDate: '2026-08-20',
        status: 'ordered'
      }
    ];
  });

  // State: Employees & Payroll
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(`apexa_erp_employees_${wsKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'emp-1', code: 'NV-001', name: 'Nguyễn Xuân Hoàng', department: 'Ban Điều Hành & Kỹ Thuật', position: 'Giám Đốc Công Nghệ (CTO)', baseSalary: 45000000, allowance: 5000000, kpiBonus: 10000000, joinDate: '2023-01-15', status: 'active' },
      { id: 'emp-2', code: 'NV-002', name: 'Trần Thị Mai', department: 'Kinh Doanh & Bán Hàng', position: 'Trưởng Phòng Kinh Doanh', baseSalary: 28000000, allowance: 3500000, kpiBonus: 12000000, joinDate: '2023-06-01', status: 'active' },
      { id: 'emp-3', code: 'NV-003', name: 'Lê Hoàng Nam', department: 'Kỹ Thuật Phát Triển', position: 'Kỹ Sư Phần Mềm Cao Cấp', baseSalary: 32000000, allowance: 2500000, kpiBonus: 6000000, joinDate: '2024-02-10', status: 'active' },
      { id: 'emp-4', code: 'NV-004', name: 'Phạm Quỳnh Anh', department: 'Tài Chính & Kế Toán', position: 'Kế Toán Trưởng', baseSalary: 25000000, allowance: 2000000, kpiBonus: 4000000, joinDate: '2023-09-01', status: 'active' },
      { id: 'emp-5', code: 'NV-005', name: 'Vũ Đức Thịnh', department: 'Kho & Vận Hành', position: 'Quản Lý Kho Vận', baseSalary: 18000000, allowance: 2000000, kpiBonus: 3000000, joinDate: '2024-04-15', status: 'active' },
    ];
  });

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockVoucherModal, setShowStockVoucherModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`apexa_erp_products_${wsKey}`, JSON.stringify(products));
    } catch (e) { console.error(e); }
  }, [products, wsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`apexa_erp_vouchers_${wsKey}`, JSON.stringify(vouchers));
    } catch (e) { console.error(e); }
  }, [vouchers, wsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`apexa_erp_sales_orders_${wsKey}`, JSON.stringify(salesOrders));
    } catch (e) { console.error(e); }
  }, [salesOrders, wsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`apexa_erp_vendors_${wsKey}`, JSON.stringify(vendors));
    } catch (e) { console.error(e); }
  }, [vendors, wsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`apexa_erp_pos_${wsKey}`, JSON.stringify(purchaseOrders));
    } catch (e) { console.error(e); }
  }, [purchaseOrders, wsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`apexa_erp_employees_${wsKey}`, JSON.stringify(employees));
    } catch (e) { console.error(e); }
  }, [employees, wsKey]);

  // Calculations & Analytics
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stockQty * p.costPrice), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stockQty <= p.minStock);
  }, [products]);

  const totalSalesRevenue = useMemo(() => {
    return salesOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [salesOrders]);

  const totalPayrollOpEx = useMemo(() => {
    return employees.reduce((sum, emp) => {
      const gross = emp.baseSalary + emp.allowance + emp.kpiBonus;
      return sum + gross;
    }, 0);
  }, [employees]);

  // Handlers for Inventory
  const handleAddProduct = (newProd: Omit<ProductItem, 'id' | 'updatedAt'>) => {
    const item: ProductItem = {
      ...newProd,
      id: `p-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setProducts(prev => [item, ...prev]);
    onAddSyncLog(`ERP: Thêm sản phẩm ${item.sku} - ${item.name}`);
    triggerToast?.('success', 'Đã thêm sản phẩm mới', `${item.name} đã được cập nhật vào kho hàng.`);
    setShowAddProductModal(false);
  };

  const handleCreateVoucher = (type: 'in' | 'out', reason: string, items: { productId: string; quantity: number; unitPrice: number }[], refDoc?: string) => {
    const voucherItems = items.map(it => {
      const p = products.find(prod => prod.id === it.productId);
      return {
        productId: it.productId,
        sku: p?.sku || 'SKU-00',
        name: p?.name || 'Sản phẩm',
        quantity: it.quantity,
        unitPrice: it.unitPrice
      };
    });

    const totalVal = voucherItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const code = `${type === 'in' ? 'NK' : 'XK'}-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;

    const newVoucher: StockVoucher = {
      id: `v-${Date.now()}`,
      code,
      type,
      reason,
      items: voucherItems,
      totalValue: totalVal,
      operator: 'Quản trị viên',
      date: new Date().toISOString().split('T')[0],
      referenceDoc: refDoc
    };

    // Update product stock
    setProducts(prev => prev.map(p => {
      const vItem = items.find(it => it.productId === p.id);
      if (vItem) {
        const nextQty = type === 'in' ? p.stockQty + vItem.quantity : Math.max(0, p.stockQty - vItem.quantity);
        return { ...p, stockQty: nextQty, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return p;
    }));

    setVouchers(prev => [newVoucher, ...prev]);
    onAddSyncLog(`ERP: Tạo phiếu ${type === 'in' ? 'Nhập kho' : 'Xuất kho'} ${code}`);
    triggerToast?.('success', `Đã tạo phiếu ${type === 'in' ? 'Nhập kho' : 'Xuất kho'}`, `${code}: Giá trị ${money.format(totalVal)}`);
    setShowStockVoucherModal(false);
  };

  // Handlers for Sales Orders
  const handleCreateSalesOrder = (newOrder: Omit<SalesOrder, 'id' | 'code'>) => {
    const code = `DH-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const order: SalesOrder = {
      ...newOrder,
      id: `so-${Date.now()}`,
      code
    };

    setSalesOrders(prev => [order, ...prev]);
    onAddSyncLog(`ERP: Tạo đơn hàng bán ${code}`);
    triggerToast?.('success', 'Đã tạo đơn hàng mới', `Đơn hàng ${code} - ${newOrder.customerName}`);
    setShowAddOrderModal(false);
  };

  const handlePushOrderToFinance = async (order: SalesOrder) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('Phiên đăng nhập đã hết hạn');
      const newInvoice = {
        workspace_id: activeWorkspaceId,
        code: `HD-${order.code.replace('DH-', '')}`,
        invoice_type: 'out',
        partner_name: order.customerName,
        tax_code: '',
        subtotal: order.subtotal,
        vat_rate: order.vatRate,
        vat_amount: order.totalAmount - order.subtotal,
        total: order.totalAmount,
        issue_date: order.orderDate,
        due_date: order.deliveryDate,
        status: order.paymentStatus === 'paid' ? 'paid' : 'pending_verification',
        signed: false,
        items: order.items.map(i => ({ description: i.name, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.total })),
        created_by: authData.user.id,
      };
      const { error: insertError } = await supabase.from('finance_invoices').insert(newInvoice);
      if (insertError) throw insertError;
      triggerToast?.('success', 'Đã đồng bộ sang Tài chính', `Hóa đơn ${newInvoice.code} đã được tự động tạo trong FinanceHub.`);
    } catch (err) {
      console.error(err);
      triggerToast?.('info', 'Chưa thể đồng bộ Tài chính', err instanceof Error ? err.message : 'Vui lòng thử lại.');
    }
  };

  const handleFulfillOrder = (order: SalesOrder) => {
    if (order.fulfillmentStatus === 'delivered') return;

    // Deduct inventory
    handleCreateVoucher('out', `Xuất hàng cho đơn ${order.code} (${order.customerName})`, order.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    })), order.code);

    setSalesOrders(prev => prev.map(o => o.id === order.id ? { ...o, fulfillmentStatus: 'delivered' } : o));
    triggerToast?.('success', 'Đã hoàn tất xuất kho & giao hàng', `Đơn hàng ${order.code} đã cập nhật trạng thái "Đã giao".`);
  };

  // Handlers for PO
  const handleReceivePO = (po: PurchaseOrder) => {
    if (po.status === 'received') return;

    // Stock in
    handleCreateVoucher('in', `Nhập kho từ đơn mua hàng ${po.code} (${po.vendorName})`, po.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitCost
    })), po.code);

    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'received' } : p));
    triggerToast?.('success', 'Đã nhập kho đơn mua hàng', `Đã cập nhật tồn kho từ ${po.code}`);
  };

  // Export Payroll to CSV
  const handleExportPayroll = () => {
    const headers = ['Mã NV', 'Họ và tên', 'Phòng ban', 'Chức vụ', 'Lương cơ bản (VNĐ)', 'Phụ cấp (VNĐ)', 'Thưởng KPI (VNĐ)', 'Thu nhập Gross (VNĐ)', 'Trừ BHXH-BHYT-BHTN 10.5% (VNĐ)', 'Thực lĩnh Net (VNĐ)'];
    const rows = employees.map(emp => {
      const gross = emp.baseSalary + emp.allowance + emp.kpiBonus;
      const insurance = Math.round(emp.baseSalary * 0.105);
      const net = gross - insurance;
      return [
        `"${emp.code}"`,
        `"${emp.name}"`,
        `"${emp.department}"`,
        `"${emp.position}"`,
        emp.baseSalary,
        emp.allowance,
        emp.kpiBonus,
        gross,
        insurance,
        net
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa-erp-bang-luong-${new Date().toISOString().slice(0, 7)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', 'Đã xuất bảng lương', 'Tệp CSV bảng lương chi tiết đã tải về máy.');
  };

  const navModules = [
    { id: 'dashboard', label: isVietnamese ? 'Tổng quan Điều hành' : 'Executive Dashboard', icon: BarChart3 },
    { id: 'inventory', label: isVietnamese ? 'Kho & Hàng hóa' : 'Inventory & Stock', icon: Boxes },
    { id: 'sales', label: isVietnamese ? 'Đơn hàng & Bán hàng' : 'Sales Orders', icon: ShoppingCart },
    { id: 'procurement', label: isVietnamese ? 'Mua hàng & NCC' : 'Procurement', icon: Truck },
    { id: 'hr', label: isVietnamese ? 'Nhân sự & Bảng lương' : 'HR & Payroll', icon: Users },
  ] as const;

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      {/* Top Banner Header */}
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/20">
            <Boxes className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {isVietnamese ? 'Apexa ERP Enterprise' : 'Apexa ERP Enterprise'}
              </h1>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-3 py-0.5 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                {isVietnamese ? 'Hệ thống Quản trị Tổng thể' : 'Integrated ERP'}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {isVietnamese ? 'Quản lý Kho vận · Bán hàng · Mua hàng & NCC · Tính lương Nhân sự Tự động' : 'Inventory & Warehouse · Sales Orders · Procurement · Automated HR & Payroll'}
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isVietnamese ? "Tìm kiếm mã SKU, đơn hàng, NCC..." : "Search SKU, orders, vendors..."}
              className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
            />
          </div>

          {activeModule === 'inventory' && (
            <>
              <button
                type="button"
                onClick={() => setShowStockVoucherModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Nhập / Xuất kho
              </button>
              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Thêm sản phẩm
              </button>
            </>
          )}

          {activeModule === 'sales' && (
            <button
              type="button"
              onClick={() => setShowAddOrderModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Tạo đơn bán hàng
            </button>
          )}

          {activeModule === 'procurement' && (
            <>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm NCC
              </button>
              <button
                type="button"
                onClick={() => setShowAddPOModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Tạo đơn mua (PO)
              </button>
            </>
          )}

          {activeModule === 'hr' && (
            <>
              <button
                type="button"
                onClick={handleExportPayroll}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400" /> Xuất Bảng lương CSV
              </button>
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Thêm nhân sự
              </button>
            </>
          )}
        </div>
      </section>

      {/* Navigation Modules Bar */}
      <nav className="flex overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {navModules.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveModule(item.id)}
            className={`flex min-w-36 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
              activeModule === item.id
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ========================================================================= */}
      {/* MODULE 1: EXECUTIVE DASHBOARD */}
      {/* ========================================================================= */}
      {activeModule === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng Giá Trị Tồn Kho</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">{money.format(totalInventoryValue)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                {products.length} mã hàng đang lưu kho
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doanh Thu Đơn Hàng Bán</p>
                  <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{money.format(totalSalesRevenue)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                {salesOrders.length} đơn hàng đã phát hành
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chi Phí Lương & Nhân Sự (OpEx)</p>
                  <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{money.format(totalPayrollOpEx)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                {employees.length} nhân sự toàn công ty
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cảnh Báo Tồn Kho Thấp</p>
                  <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{lowStockProducts.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                {lowStockProducts.length > 0 ? 'Cần lên đơn mua bổ sung' : 'Tồn kho ở mức an toàn'}
              </p>
            </div>
          </section>

          {/* Detailed sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products In Stock */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Cơ Cấu Tồn Kho Theo Danh Mục</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Giá trị hàng hóa phân bổ theo chủng loại</p>
                </div>
                <button type="button" onClick={() => setActiveModule('inventory')} className="text-xs font-black text-indigo-600 hover:underline cursor-pointer">
                  Xem tất cả kho
                </button>
              </div>

              <div className="space-y-3.5 pt-2">
                {products.map(p => {
                  const val = p.stockQty * p.costPrice;
                  const pct = totalInventoryValue > 0 ? Math.round((val / totalInventoryValue) * 100) : 0;
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 dark:text-slate-200">{p.name} ({p.sku})</span>
                        <span className="font-black text-slate-900 dark:text-white tabular-nums">{money.format(val)} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${Math.max(5, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Orders & Quick Dispatch */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Đơn Hàng Gần Đây Cần Xử Lý</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tiến độ giao hàng và thanh toán</p>
                </div>
                <button type="button" onClick={() => setActiveModule('sales')} className="text-xs font-black text-indigo-600 hover:underline cursor-pointer">
                  Quản lý đơn hàng
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {salesOrders.slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{o.code}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          o.fulfillmentStatus === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {o.fulfillmentStatus === 'delivered' ? 'Đã giao' : 'Chờ xuất kho'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-1">{o.customerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{money.format(o.totalAmount)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Hạn: {o.deliveryDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: INVENTORY & STOCK */}
      {/* ========================================================================= */}
      {activeModule === 'inventory' && (
        <div className="space-y-6">
          {/* Low Stock Warning Banner */}
          {lowStockProducts.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-black">Cảnh báo: Có {lowStockProducts.length} sản phẩm đang dưới định mức tồn an toàn!</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {lowStockProducts.map(p => `${p.name} (còn ${p.stockQty} ${p.unit})`).join(', ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('procurement')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
              >
                Lên đơn mua hàng
              </button>
            </div>
          )}

          {/* Products Table */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Danh Mục Sản Phẩm & Tồn Kho Thực Tế</h3>
                <p className="mt-0.5 text-xs text-slate-400">{products.length} mã hàng trong kho</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Mã SKU & Tên sản phẩm</th>
                    <th className="px-4 py-3.5">Danh mục</th>
                    <th className="px-4 py-3.5">ĐVT</th>
                    <th className="px-4 py-3.5 text-right">Giá vốn</th>
                    <th className="px-4 py-3.5 text-right">Giá bán niêm yết</th>
                    <th className="px-4 py-3.5 text-center">Tồn kho</th>
                    <th className="px-4 py-3.5">Vị trí kho</th>
                    <th className="px-4 py-3.5 text-right">Thành tiền tồn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {products
                    .filter(p => p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(p => {
                      const isLow = p.stockQty <= p.minStock;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-6 py-3.5">
                            <div>
                              <p className="font-black text-slate-800 dark:text-slate-100">{p.name}</p>
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{p.sku}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-500">{p.category}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-500">{p.unit}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{money.format(p.costPrice)}</td>
                          <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white tabular-nums">{money.format(p.sellingPrice)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                              isLow 
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 border border-rose-200/60' 
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                            }`}>
                              {p.stockQty} {p.unit} {isLow && '⚠️'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-500">{p.location}</td>
                          <td className="px-4 py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {money.format(p.stockQty * p.costPrice)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Stock Vouchers History */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Lịch Sử Phiếu Nhập / Xuất Kho</h3>
                <p className="mt-0.5 text-xs text-slate-400">Chứng từ kiểm soát biến động tồn kho</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Mã phiếu</th>
                    <th className="px-4 py-3.5">Loại phiếu</th>
                    <th className="px-4 py-3.5">Lý do & Diễn giải</th>
                    <th className="px-4 py-3.5">Chứng từ tham chiếu</th>
                    <th className="px-4 py-3.5 text-right">Tổng giá trị</th>
                    <th className="px-4 py-3.5">Người lập</th>
                    <th className="px-4 py-3.5">Ngày lập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {vouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400">{v.code}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          v.type === 'in' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        }`}>
                          {v.type === 'in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {v.type === 'in' ? 'Nhập kho' : 'Xuất kho'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{v.reason}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">{v.referenceDoc || '—'}</td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white tabular-nums">{money.format(v.totalValue)}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-500">{v.operator}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-500">{v.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: SALES ORDERS */}
      {/* ========================================================================= */}
      {activeModule === 'sales' && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Quản Lý Đơn Hàng Bán & Xuất Kho Giao Hàng</h3>
              <p className="mt-0.5 text-xs text-slate-400">{salesOrders.length} đơn hàng trong hệ thống</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddOrderModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo đơn bán hàng
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Mã đơn</th>
                  <th className="px-4 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5">Ngày đặt / Giao</th>
                  <th className="px-4 py-3.5 text-right">Tổng tiền (gồm VAT)</th>
                  <th className="px-4 py-3.5">Thanh toán</th>
                  <th className="px-4 py-3.5">Xuất kho</th>
                  <th className="px-4 py-3.5 text-right">Thao tác ERP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {salesOrders
                  .filter(o => o.code.toLowerCase().includes(searchQuery.toLowerCase()) || o.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-3.5">
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{o.code}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-black text-slate-800 dark:text-slate-100">{o.customerName}</p>
                        <p className="text-[10px] text-slate-400">{o.customerPhone || o.customerEmail || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{o.orderDate}</p>
                        <p className="text-[10px] text-slate-400">Hạn: {o.deliveryDate}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white tabular-nums">
                        {money.format(o.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          o.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                        }`}>
                          {o.paymentStatus === 'paid' ? 'Đã thanh toán' : o.paymentStatus === 'partial' ? 'Tạm ứng 50%' : 'Chờ TT'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          o.fulfillmentStatus === 'delivered' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                        }`}>
                          {o.fulfillmentStatus === 'delivered' ? 'Đã xuất kho' : 'Chờ xuất'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {o.fulfillmentStatus !== 'delivered' && (
                            <button
                              type="button"
                              onClick={() => handleFulfillOrder(o)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-colors cursor-pointer"
                              title="Tự động xuất kho và trừ tồn kho"
                            >
                              Xuất kho
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePushOrderToFinance(o)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[10px] font-black transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                            title="Tạo hóa đơn tài chính"
                          >
                            Đẩy sang HĐ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODULE 4: PROCUREMENT & VENDORS */}
      {/* ========================================================================= */}
      {activeModule === 'procurement' && (
        <div className="space-y-6">
          {/* Purchase Orders */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Đơn Đặt Hàng Mua (Purchase Orders - PO)</h3>
                <p className="mt-0.5 text-xs text-slate-400">Quản lý nhập hàng và bổ sung tồn kho</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPOModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo đơn mua PO
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Mã PO</th>
                    <th className="px-4 py-3.5">Nhà cung cấp</th>
                    <th className="px-4 py-3.5">Ngày đặt</th>
                    <th className="px-4 py-3.5 text-right">Tổng giá trị mua</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400">{po.code}</td>
                      <td className="px-4 py-3.5 font-black text-slate-800 dark:text-slate-100">{po.vendorName}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-500">{po.orderDate}</td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white tabular-nums">{money.format(po.totalCost)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          po.status === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {po.status === 'received' ? 'Đã nhập kho' : 'Đang giao hàng'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {po.status !== 'received' && (
                          <button
                            type="button"
                            onClick={() => handleReceivePO(po)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                          >
                            Nhập kho ngay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Vendors Directory */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Danh Bạ Nhà Cung Cấp & Đối Tác Cung Ứng</h3>
                <p className="mt-0.5 text-xs text-slate-400">{vendors.length} nhà cung cấp đã xác minh</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm nhà cung cấp
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Mã NCC & Tên</th>
                    <th className="px-4 py-3.5">Ngành hàng</th>
                    <th className="px-4 py-3.5">Mã số thuế</th>
                    <th className="px-4 py-3.5">Người liên hệ</th>
                    <th className="px-4 py-3.5">Điều khoản TT</th>
                    <th className="px-4 py-3.5">Tài khoản Ngân hàng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {vendors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-3.5">
                        <p className="font-black text-slate-800 dark:text-slate-100">{v.name}</p>
                        <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{v.code}</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{v.category}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">{v.taxCode}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{v.contactPerson}</p>
                        <p className="text-[10px] text-slate-400">{v.phone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {v.paymentTerms}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">{v.bankAccount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 5: HR & AUTOMATED PAYROLL ENGINE */}
      {/* ========================================================================= */}
      {activeModule === 'hr' && (
        <div className="space-y-6">
          {/* Summary payroll metrics */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng Quỹ Lương Gross Tháng</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">{money.format(totalPayrollOpEx)}</p>
              <p className="mt-2 text-[10px] text-slate-400 font-semibold">Lương cơ bản + Phụ cấp + Thưởng KPI</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Trích Nộp BHXH-BHYT-BHTN (10.5%)</p>
              <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {money.format(employees.reduce((sum, emp) => sum + Math.round(emp.baseSalary * 0.105), 0))}
              </p>
              <p className="mt-2 text-[10px] text-slate-400 font-semibold">Khấu trừ lương người lao động theo luật</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Thực Chi Lương Net Cho Nhân Sự</p>
              <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {money.format(employees.reduce((sum, emp) => sum + (emp.baseSalary + emp.allowance + emp.kpiBonus - Math.round(emp.baseSalary * 0.105)), 0))}
              </p>
              <p className="mt-2 text-[10px] text-slate-400 font-semibold">Chuyển khoản trực tiếp qua ngân hàng</p>
            </div>
          </section>

          {/* Payroll Sheet Table */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Bảng Tính Lương Tự Động Tháng {new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</h3>
                <p className="mt-0.5 text-xs text-slate-400">Công thức chuẩn: Lương cơ bản + Phụ cấp + Thưởng KPI - BHXH 10.5% = Lương Net</p>
              </div>
              <button
                type="button"
                onClick={handleExportPayroll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Bảng Lương CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Mã & Nhân sự</th>
                    <th className="px-4 py-3.5">Phòng ban & Chức danh</th>
                    <th className="px-4 py-3.5 text-right">Lương cơ bản</th>
                    <th className="px-4 py-3.5 text-right">Phụ cấp</th>
                    <th className="px-4 py-3.5 text-right">Thưởng KPI</th>
                    <th className="px-4 py-3.5 text-right">Trừ BHXH (10.5%)</th>
                    <th className="px-4 py-3.5 text-right">Lương NET Thực Lĩnh</th>
                    <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {employees.map(emp => {
                    const gross = emp.baseSalary + emp.allowance + emp.kpiBonus;
                    const insurance = Math.round(emp.baseSalary * 0.105);
                    const net = gross - insurance;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 dark:text-slate-100">{emp.name}</p>
                              <span className="font-mono text-[10px] font-bold text-slate-400">{emp.code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-700 dark:text-slate-300">{emp.position}</p>
                          <p className="text-[10px] text-slate-400">{emp.department}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{money.format(emp.baseSalary)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{money.format(emp.allowance)}</td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums">+{money.format(emp.kpiBonus)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-rose-500 tabular-nums">-{money.format(insurance)}</td>
                        <td className="px-4 py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums text-sm">
                          {money.format(net)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase">
                            Đã phê duyệt
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PRODUCT */}
      {/* ========================================================================= */}
      {showAddProductModal && (
        <AddProductModal onClose={() => setShowAddProductModal(false)} onSave={handleAddProduct} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STOCK IN / OUT VOUCHER */}
      {/* ========================================================================= */}
      {showStockVoucherModal && (
        <StockVoucherModal products={products} onClose={() => setShowStockVoucherModal(false)} onSave={handleCreateVoucher} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE SALES ORDER */}
      {/* ========================================================================= */}
      {showAddOrderModal && (
        <AddSalesOrderModal products={products} onClose={() => setShowAddOrderModal(false)} onSave={handleCreateSalesOrder} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD VENDOR */}
      {/* ========================================================================= */}
      {showAddVendorModal && (
        <AddVendorModal onClose={() => setShowAddVendorModal(false)} onSave={(vendor) => {
          setVendors(prev => [vendor, ...prev]);
          setShowAddVendorModal(false);
          triggerToast?.('success', 'Đã thêm nhà cung cấp', vendor.name);
        }} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD PO */}
      {/* ========================================================================= */}
      {showAddPOModal && (
        <AddPOModal vendors={vendors} products={products} onClose={() => setShowAddPOModal(false)} onSave={(po) => {
          setPurchaseOrders(prev => [po, ...prev]);
          setShowAddPOModal(false);
          triggerToast?.('success', 'Đã tạo đơn mua hàng', po.code);
        }} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: ADD EMPLOYEE */}
      {/* ========================================================================= */}
      {showAddEmployeeModal && (
        <AddEmployeeModal onClose={() => setShowAddEmployeeModal(false)} onSave={(emp) => {
          setEmployees(prev => [emp, ...prev]);
          setShowAddEmployeeModal(false);
          triggerToast?.('success', 'Đã thêm nhân sự mới', emp.name);
        }} />
      )}

    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS / MODALS
// =========================================================================

function AddProductModal({ onClose, onSave }: { onClose: () => void; onSave: (prod: Omit<ProductItem, 'id' | 'updatedAt'>) => void }) {
  const [sku, setSku] = useState(`APX-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Thiết bị IT');
  const [unit, setUnit] = useState('Bộ');
  const [costPrice, setCostPrice] = useState(10000000);
  const [sellingPrice, setSellingPrice] = useState(14000000);
  const [stockQty, setStockQty] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [location, setLocation] = useState('Kho A - Kệ 01');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ sku, name: name.trim(), category, unit, costPrice, sellingPrice, stockQty, minStock, location });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,576px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm Sản Phẩm Mới Vào Kho</h3>
            <p className="text-xs text-slate-400">Đăng ký mã SKU, giá vốn và định mức tồn kho</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Mã SKU *</span>
            <input required type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Danh mục</span>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block col-span-2">
            <span className="text-[9px] font-black uppercase text-slate-400">Tên sản phẩm / Thiết bị *</span>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Máy chủ Dell R750..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Giá vốn (VNĐ)</span>
            <input type="number" value={costPrice} onChange={e => setCostPrice(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Giá bán (VNĐ)</span>
            <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Số lượng ban đầu</span>
            <input type="number" value={stockQty} onChange={e => setStockQty(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Tồn tối thiểu (Cảnh báo)</span>
            <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md">Lưu sản phẩm</button>
        </div>
      </form>
    </div>
  );
}

function StockVoucherModal({ products, onClose, onSave }: { products: ProductItem[]; onClose: () => void; onSave: (type: 'in' | 'out', reason: string, items: { productId: string; quantity: number; unitPrice: number }[], refDoc?: string) => void }) {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [reason, setReason] = useState('Nhập hàng bổ sung tồn kho');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(5);
  const [unitPrice, setUnitPrice] = useState(products[0]?.costPrice || 10000000);
  const [refDoc, setRefDoc] = useState('');

  const selectedProd = products.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;
    onSave(type, reason, [{ productId: selectedProductId, quantity, unitPrice }], refDoc);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,512px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Lập Phiếu Nhập / Xuất Kho</h3>
            <p className="text-xs text-slate-400">Tạo chứng từ điều chuyển và cập nhật tồn kho tự động</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setType('in'); setReason('Nhập hàng bổ sung tồn kho'); }}
              className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                type === 'in' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-500/80 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 dark:bg-slate-900/50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" /> Phiếu Nhập Kho (NK)
            </button>
            <button
              type="button"
              onClick={() => { setType('out'); setReason('Xuất kho bán hàng dự án'); }}
              className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                type === 'out' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:border-blue-500/80 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 dark:bg-slate-900/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Phiếu Xuất Kho (XK)
            </button>
          </div>

          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Chọn sản phẩm</span>
            <Select
              value={selectedProductId}
              onChange={pid => {
                setSelectedProductId(pid);
                const p = products.find(prod => prod.id === pid);
                if (p) setUnitPrice(type === 'in' ? p.costPrice : p.sellingPrice);
              }}
              className="w-full"
              ariaLabel="Chọn sản phẩm"
              menuWidth={320}
              options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku}) — Tồn: ${p.stockQty} ${p.unit}` }))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Số lượng điều chuyển</span>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Đơn giá (VNĐ)</span>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Lý do / Diễn giải *</span>
            <input required type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
          </label>

          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Chứng từ tham chiếu (Hóa đơn / Đơn hàng)</span>
            <input type="text" value={refDoc} onChange={e => setRefDoc(e.target.value)} placeholder="Ví dụ: PO-001 hoặc DH-002" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono outline-none dark:bg-slate-950 dark:text-white" />
          </label>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center font-bold">
            <span>Tổng giá trị phiếu:</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{money.format(quantity * unitPrice)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md">Xác nhận phiếu</button>
        </div>
      </form>
    </div>
  );
}

function AddSalesOrderModal({ products, onClose, onSave }: { products: ProductItem[]; onClose: () => void; onSave: (order: Omit<SalesOrder, 'id' | 'code'>) => void }) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);

  const selectedProd = products.find(p => p.id === selectedProductId);
  const unitPrice = selectedProd?.sellingPrice || 10000000;
  const subtotal = quantity * unitPrice;
  const vatRate = 10;
  const totalAmount = subtotal * 1.1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedProd) return;

    onSave({
      customerName: customerName.trim(),
      customerPhone,
      items: [{ productId: selectedProd.id, sku: selectedProd.sku, name: selectedProd.name, quantity, unitPrice, total: subtotal }],
      subtotal,
      vatRate,
      totalAmount,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate,
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,512px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Tạo Đơn Hàng Bán (Sales Order)</h3>
            <p className="text-xs text-slate-400">Chọn sản phẩm từ kho và tự động tính tổng tiền VAT</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Tên khách hàng / Doanh nghiệp *</span>
            <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ví dụ: Tập đoàn Viettel, FPT..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Số điện thoại liên hệ</span>
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="090..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
          </label>

          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Sản phẩm xuất bán</span>
            <Select value={selectedProductId} onChange={v => setSelectedProductId(v)} className="w-full" ariaLabel="Sản phẩm xuất bán" menuWidth={320} options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku}) — ${money.format(p.sellingPrice)}` }))} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Số lượng</span>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Ngày giao hàng dự kiến</span>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 space-y-1.5 font-bold">
            <div className="flex justify-between text-slate-500">
              <span>Tạm tính:</span>
              <span>{money.format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Thuế VAT ({vatRate}%):</span>
              <span>{money.format(subtotal * 0.1)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Tổng cộng đơn hàng:</span>
              <span>{money.format(totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md">Tạo đơn hàng</button>
        </div>
      </form>
    </div>
  );
}

function AddVendorModal({ onClose, onSave }: { onClose: () => void; onSave: (v: Vendor) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Thiết bị IT & Phần cứng');
  const [taxCode, setTaxCode] = useState('010' + Math.floor(1000000 + Math.random() * 9000000));
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Công nợ 30 ngày');
  const [bankAccount, setBankAccount] = useState('Vietcombank - 001100' + Math.floor(100000 + Math.random() * 900000));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: `v-${Date.now()}`,
      code: `NCC-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      category,
      taxCode,
      contactPerson,
      phone,
      email,
      paymentTerms,
      bankAccount
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,512px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm Nhà Cung Cấp Mới</h3>
            <p className="text-xs text-slate-400">Lưu thông tin đối tác cung ứng và tài khoản thanh toán</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Tên Nhà Cung Cấp *</span>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Công ty TNHH..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Ngành hàng</span>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Mã số thuế</span>
              <input type="text" value={taxCode} onChange={e => setTaxCode(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono outline-none dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Người liên hệ</span>
              <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Số điện thoại</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md">Lưu NCC</button>
        </div>
      </form>
    </div>
  );
}

function AddPOModal({ vendors, products, onClose, onSave }: { vendors: Vendor[]; products: ProductItem[]; onClose: () => void; onSave: (po: PurchaseOrder) => void }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(5);

  const selectedVendor = vendors.find(v => v.id === vendorId);
  const selectedProd = products.find(p => p.id === selectedProductId);
  const unitCost = selectedProd?.costPrice || 5000000;
  const totalCost = quantity * unitCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !selectedProd) return;
    onSave({
      id: `po-${Date.now()}`,
      code: `PO-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      items: [{ productId: selectedProd.id, sku: selectedProd.sku, name: selectedProd.name, quantity, unitCost, total: totalCost }],
      totalCost,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'ordered'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,512px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Tạo Đơn Đặt Hàng Mua (Purchase Order)</h3>
            <p className="text-xs text-slate-400">Gửi đơn đặt hàng cho nhà cung cấp</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Nhà cung cấp</span>
            <Select value={vendorId} onChange={v => setVendorId(v)} className="w-full" ariaLabel="Nhà cung cấp" menuWidth={320} options={vendors.map(v => ({ value: v.id, label: `${v.name} (${v.code})` }))} />
          </label>

          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Sản phẩm cần mua</span>
            <Select value={selectedProductId} onChange={v => setSelectedProductId(v)} className="w-full" ariaLabel="Sản phẩm cần mua" menuWidth={320} options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku}) — Giá vốn: ${money.format(p.costPrice)}` }))} />
          </label>

          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Số lượng đặt mua</span>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center font-bold">
            <span>Tổng chi phí PO:</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{money.format(totalCost)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md">Phát hành PO</button>
        </div>
      </form>
    </div>
  );
}

function AddEmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (emp: Employee) => void }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Kỹ Thuật Phát Triển');
  const [position, setPosition] = useState('Kỹ Sư Phần Mềm');
  const [baseSalary, setBaseSalary] = useState(25000000);
  const [allowance, setAllowance] = useState(2000000);
  const [kpiBonus, setKpiBonus] = useState(3000000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: `emp-${Date.now()}`,
      code: `NV-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      department,
      position,
      baseSalary,
      allowance,
      kpiBonus,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,512px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm Nhân Sự & Cấu Hình Lương</h3>
            <p className="text-xs text-slate-400">Tự động kết nối vào bảng tính lương doanh nghiệp</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="space-y-1 block">
            <span className="text-[9px] font-black uppercase text-slate-400">Họ và tên nhân sự *</span>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Hoàng Minh Đức..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Phòng ban</span>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Chức danh / Vị trí</span>
              <input type="text" value={position} onChange={e => setPosition(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Lương cứng</span>
              <input type="number" value={baseSalary} onChange={e => setBaseSalary(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">Phụ cấp</span>
              <input type="number" value={allowance} onChange={e => setAllowance(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="space-y-1 block">
              <span className="text-[9px] font-black uppercase text-slate-400">KPI Bonus</span>
              <input type="number" value={kpiBonus} onChange={e => setKpiBonus(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold outline-none dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md">Lưu nhân sự</button>
        </div>
      </form>
    </div>
  );
}
