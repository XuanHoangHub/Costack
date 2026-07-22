"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Building,
  User,
  Users,
  Award,
  ArrowRight,
  Lock,
  Globe,
  Star,
  QrCode,
} from 'lucide-react';

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onUpdatePremiumStatus?: (isPremium: boolean, plan?: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  addSyncLog?: (log: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdatePremiumStatus,
  triggerToast,
  addSyncLog,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo' | 'bank'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowCheckout(false);
      onClose();

      if (onUpdatePremiumStatus) {
        onUpdatePremiumStatus(true, selectedPlan.toUpperCase());
      }
      if (triggerToast) {
        triggerToast(
          'success',
          'Subscription Activated!',
          `Welcome to Apexa OS ${selectedPlan.toUpperCase()}! Your workspace has been upgraded.`
        );
      }
      if (addSyncLog) {
        addSyncLog(`Upgraded workspace subscription to ${selectedPlan.toUpperCase()} (${billingCycle})`);
      }
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl w-full max-w-4xl p-6 sm:p-8 overflow-hidden shadow-2xl z-10 font-sans my-8"
        >
          {/* Decorative Glow elements */}
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {!showCheckout ? (
            <>
              {/* Top Banner Header */}
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Commercial SaaS Edition</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight font-display">
                  Supercharge Your Team Workspace
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  Flexible plans built for startups, growing companies, and enterprise teams.
                </p>

                {/* Monthly / Yearly Billing Switcher */}
                <div className="pt-3 flex items-center justify-center gap-3">
                  <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                    Monthly Billing
                  </span>
                  <button
                    onClick={() => setBillingCycle((prev) => (prev === 'monthly' ? 'yearly' : 'monthly'))}
                    className="relative w-12 h-6 rounded-full bg-indigo-600 p-1 transition-colors cursor-pointer"
                  >
                    <motion.div
                      animate={{ x: billingCycle === 'yearly' ? 24 : 0 }}
                      className="w-4 h-4 rounded-full bg-white shadow-md"
                    />
                  </button>
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                    Annual Billing
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                      Save 20%
                    </span>
                  </span>
                </div>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {/* 1. Starter Free Plan */}
                <div
                  onClick={() => setSelectedPlan('free')}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlan === 'free'
                      ? 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 ring-2 ring-slate-400/20'
                      : 'bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-mono tracking-wider text-slate-500">Starter</span>
                      <User className="w-5 h-5 text-slate-400" />
                    </div>

                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-slate-50">$0</div>
                      <div className="text-[11px] text-slate-400 font-medium">Free Forever • 3 Members</div>
                    </div>

                    <div className="space-y-2.5 pt-2 text-xs">
                      {[
                        'Up to 3 Workspace Members',
                        'Standard Task & Doc Management',
                        'Basic Global Search & Filters',
                        '50 AI Assistant Credits / mo',
                        'Community Support',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onUpdatePremiumStatus) onUpdatePremiumStatus(false, 'FREE');
                      onClose();
                    }}
                    className="w-full mt-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Current Plan
                  </button>
                </div>

                {/* 2. Pro Plan (Best Value) */}
                <div
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-6 rounded-3xl border-2 relative transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlan === 'pro'
                      ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl'
                      : 'bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-mono tracking-wider text-indigo-600 dark:text-indigo-400">Pro Member</span>
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>

                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-slate-50">
                        ${billingCycle === 'yearly' ? '12' : '15'}
                        <span className="text-xs font-bold text-slate-400"> /user/mo</span>
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        {billingCycle === 'yearly' ? 'Billed $144 annually' : 'Billed monthly'}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 text-xs">
                      {[
                        'Unlimited Workspace Members',
                        'Full Global Search & Slash Commands (/)',
                        'No-Code Automation Rules Engine',
                        'Export Data to JSON, CSV & HTML Reports',
                        'Unlimited Gemini AI Assistant Credits',
                        'Visual Gantt Charts & Time Tracking',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 font-bold" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-lg hover:shadow-indigo-500/20 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Upgrade to Pro</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 3. Enterprise Plan */}
                <div
                  onClick={() => setSelectedPlan('enterprise')}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlan === 'enterprise'
                      ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-mono tracking-wider text-amber-600 dark:text-amber-400">Enterprise</span>
                      <Building className="w-5 h-5 text-amber-500" />
                    </div>

                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-slate-50">
                        ${billingCycle === 'yearly' ? '29' : '35'}
                        <span className="text-xs font-bold text-slate-400"> /user/mo</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">Custom billing & SLA</div>
                    </div>

                    <div className="space-y-2.5 pt-2 text-xs">
                      {[
                        'Everything in Pro Plan',
                        'Dedicated Supabase DB & Custom Domain',
                        'SOC2 Type II & GDPR Audit Reports',
                        'Custom Fine-Tuned AI Models',
                        '24/7 Dedicated Account Manager',
                        'SSO & SAML Authentication',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 font-bold" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full mt-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-black cursor-pointer transition-all shadow-md"
                  >
                    Contact Sales
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> SOC2 Type II Certified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-500" /> 256-bit AES Encryption
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-purple-500" /> GDPR Compliant
                  </span>
                </div>
                <span className="text-[11px]">Cancel anytime • Instant activation</span>
              </div>
            </>
          ) : (
            // Checkout Screen Simulation
            <div className="space-y-6 max-w-md mx-auto py-4 font-sans">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">Complete Checkout</h3>
                <p className="text-xs text-slate-400">
                  Upgrading to <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{selectedPlan} Plan</span> ({billingCycle})
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border text-center text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Credit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-2xl border text-center text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'momo'
                        ? 'bg-pink-50 dark:bg-pink-950/60 border-pink-500 text-pink-600 dark:text-pink-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>MoMo QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-3 rounded-2xl border text-center text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'bank'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Payment Details Input */}
              {paymentMethod === 'card' ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 •••• •••• 4242"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">MM/YY</label>
                      <input
                        type="text"
                        placeholder="12/28"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto shadow-sm flex items-center justify-center border">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Scan QR Code with Banking / MoMo App</p>
                  <p className="text-[10px] text-slate-400">Order ID: APEXA-{Math.floor(Math.random() * 899999 + 100000)}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCheckout}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span>Processing Payment...</span>
                  ) : (
                    <>
                      <span>Pay & Activate</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
