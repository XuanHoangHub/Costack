"use client";

import React, { useState } from 'react';
import {
  Calculator, ArrowRightLeft, DollarSign, Percent, Copy,
  Check, RefreshCw, Sparkles, TrendingUp, ReceiptText, Layers
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface CurrencyRate {
  code: string;
  nameVi: string;
  nameEn: string;
  symbol: string;
  rateToVnd: number; // Tỷ giá so với VND
}

const BASE_RATES: CurrencyRate[] = [
  { code: 'VND', nameVi: 'Việt Nam Đồng', nameEn: 'Vietnamese Dong', symbol: '₫', rateToVnd: 1 },
  { code: 'USD', nameVi: 'Đô la Mỹ', nameEn: 'US Dollar', symbol: '$', rateToVnd: 25450 },
  { code: 'EUR', nameVi: 'Euro Châu Âu', nameEn: 'Euro', symbol: '€', rateToVnd: 27500 },
  { code: 'JPY', nameVi: 'Yên Nhật', nameEn: 'Japanese Yen', symbol: '¥', rateToVnd: 168 },
  { code: 'GBP', nameVi: 'Bảng Anh', nameEn: 'British Pound', symbol: '£', rateToVnd: 32600 },
  { code: 'CNY', nameVi: 'Nhân dân tệ', nameEn: 'Chinese Yuan', symbol: '¥', rateToVnd: 3520 },
  { code: 'SGD', nameVi: 'Đô la Singapore', nameEn: 'Singapore Dollar', symbol: 'S$', rateToVnd: 19100 },
  { code: 'KRW', nameVi: 'Won Hàn Quốc', nameEn: 'South Korean Won', symbol: '₩', rateToVnd: 18.5 },
];

export default function ConverterMiniApp() {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const [activeTab, setActiveTab] = useState<'currency' | 'vat' | 'margin' | 'discount'>('currency');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Currency states
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('VND');

  // VAT states
  const [vatAmount, setVatAmount] = useState<number>(1000000);
  const [vatRate, setVatRate] = useState<number>(10);
  const [vatType, setVatType] = useState<'exclusive' | 'inclusive'>('exclusive'); // Chưa thuế vs Đã gồm thuế

  // Margin states
  const [costPrice, setCostPrice] = useState<number>(500000);
  const [sellingPrice, setSellingPrice] = useState<number>(750000);

  // Discount states
  const [originalPrice, setOriginalPrice] = useState<number>(1200000);
  const [discountPercent, setDiscountPercent] = useState<number>(20);

  const formatMoney = (val: number, currency = 'VND') => {
    return new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  const copyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Currency calc
  const fromRate = BASE_RATES.find((r) => r.code === fromCurrency)?.rateToVnd || 1;
  const toRate = BASE_RATES.find((r) => r.code === toCurrency)?.rateToVnd || 1;
  const convertedAmount = (amount * fromRate) / toRate;

  // Swap currencies
  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // VAT calc
  let preTax = 0;
  let tax = 0;
  let totalWithTax = 0;
  if (vatType === 'exclusive') {
    preTax = vatAmount;
    tax = (vatAmount * vatRate) / 100;
    totalWithTax = preTax + tax;
  } else {
    totalWithTax = vatAmount;
    preTax = vatAmount / (1 + vatRate / 100);
    tax = totalWithTax - preTax;
  }

  // Margin calc
  const grossProfit = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  const markupPercent = costPrice > 0 ? (grossProfit / costPrice) * 100 : 0;

  // Discount calc
  const discountVal = (originalPrice * discountPercent) / 100;
  const finalPrice = originalPrice - discountVal;

  return (
    <div className="w-full h-full p-4 sm:p-6 md:p-8 max-w-4xl mx-auto overflow-y-auto custom-scrollbar">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white font-black text-xl shadow-md shadow-emerald-500/25">
          🧮
        </span>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isVi ? 'Quy đổi & Tiện ích tính toán' : 'Finance & Currency Calculator'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            {isVi
              ? 'Quy đổi ngoại tệ thời gian thực, tính thuế VAT, biên lợi nhuận và tỷ lệ chiết khấu'
              : 'Realtime currency conversion, VAT computation, profit margins, and discounts'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('currency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'currency'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          {isVi ? 'Quy đổi ngoại tệ' : 'Currency Converter'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'vat'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          {isVi ? 'Tính thuế VAT' : 'VAT Calculator'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('margin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'margin'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {isVi ? 'Biên lợi nhuận' : 'Margin & Markup'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discount')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'discount'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Percent className="w-4 h-4" />
          {isVi ? 'Chiết khấu %' : 'Discounts'}
        </button>
      </div>

      {/* Tab 1: Currency Converter */}
      {activeTab === 'currency' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
              {/* From */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  {isVi ? 'Số tiền & Đồng tiền gốc' : 'Amount & From Currency'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-lg font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="px-3 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 font-bold text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {BASE_RATES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} ({r.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center pt-6">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                  title={isVi ? 'Đảo chiều quy đổi' : 'Swap currencies'}
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </button>
              </div>

              {/* To */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  {isVi ? 'Đồng tiền đích' : 'To Currency'}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-2xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                    <span className="truncate">{formatMoney(convertedAmount, toCurrency)}</span>
                    <button
                      type="button"
                      onClick={() => copyVal(String(convertedAmount), 'curr')}
                      className="ml-2 p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                      title={isVi ? 'Sao chép kết quả' : 'Copy result'}
                    >
                      {copiedKey === 'curr' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="px-3 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 font-bold text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {BASE_RATES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} ({r.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Rate footnote */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500 font-medium">
              <span>
                1 {fromCurrency} = {formatMoney(fromRate / toRate, toCurrency)} {toCurrency}
              </span>
              <span>{isVi ? 'Tỷ giá tham chiếu thị trường' : 'Market reference rate'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: VAT Calculator */}
      {activeTab === 'vat' && (
        <div className="p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Số tiền (VND)' : 'Amount (VND)'}
              </label>
              <input
                type="number"
                min={0}
                value={vatAmount}
                onChange={(e) => setVatAmount(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Thuế suất VAT' : 'VAT Rate'}
              </label>
              <div className="flex gap-2">
                {[8, 10, 5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setVatRate(rate)}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      vatRate === rate
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setVatType('exclusive')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                vatType === 'exclusive'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {isVi ? 'Chưa gồm thuế (+ VAT)' : 'Before VAT'}
            </button>
            <button
              type="button"
              onClick={() => setVatType('inclusive')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                vatType === 'inclusive'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {isVi ? 'Đã gồm thuế (Tách VAT)' : 'Already Includes VAT'}
            </button>
          </div>

          {/* Results cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-white/10">
              <span className="text-[11px] font-bold text-slate-500 uppercase">{isVi ? 'Trước thuế' : 'Pre-tax'}</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{formatMoney(preTax)} ₫</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30">
              <span className="text-[11px] font-bold text-rose-500 uppercase">{isVi ? `Tiền thuế (${vatRate}%)` : `Tax (${vatRate}%)`}</span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{formatMoney(tax)} ₫</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">{isVi ? 'Tổng thanh toán' : 'Final Total'}</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(totalWithTax)} ₫</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Margin & Markup */}
      {activeTab === 'margin' && (
        <div className="p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Giá vốn / Chi phí (Cost Price)' : 'Cost Price'}
              </label>
              <input
                type="number"
                min={0}
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Giá bán ra (Selling Price)' : 'Selling Price'}
              </label>
              <input
                type="number"
                min={0}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">{isVi ? 'Lợi nhuận gộp' : 'Gross Profit'}</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(grossProfit)} ₫</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/30">
              <span className="text-[11px] font-bold text-indigo-600 uppercase">{isVi ? 'Biên lợi nhuận (Margin)' : 'Profit Margin'}</span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{marginPercent.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/30">
              <span className="text-[11px] font-bold text-sky-600 uppercase">{isVi ? 'Tỷ lệ cộng giá (Markup)' : 'Markup Rate'}</span>
              <p className="text-lg font-black text-sky-600 dark:text-sky-400 mt-1">{markupPercent.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Discounts */}
      {activeTab === 'discount' && (
        <div className="p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Giá gốc trước giảm' : 'Original Price'}
              </label>
              <input
                type="number"
                min={0}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Tỷ lệ chiết khấu (% giảm)' : 'Discount (%)'}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
              <span className="text-[11px] font-bold text-amber-600 uppercase">{isVi ? 'Số tiền tiết kiệm' : 'You Save'}</span>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{formatMoney(discountVal)} ₫</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">{isVi ? 'Giá sau giảm giá' : 'Discounted Price'}</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(finalPrice)} ₫</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
