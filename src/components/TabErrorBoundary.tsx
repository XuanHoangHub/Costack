"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface TabErrorBoundaryProps {
  children: ReactNode;
  tabId?: string;
  tabTitle?: string;
  onNavigateHome?: () => void;
  isVietnamese?: boolean;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TabErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Costack TabErrorBoundary] Error in tab "${this.props.tabId || 'unknown'}":`, error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: TabErrorBoundaryProps) {
    // If the active tab changes, reset error state
    if (prevProps.tabId !== this.props.tabId && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        copied: false,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const text = `[Costack Error Report]\nTab: ${this.props.tabTitle || this.props.tabId || 'Unknown'}\nTimestamp: ${new Date().toISOString()}\nMessage: ${error?.message || 'No message'}\nStack: ${error?.stack || 'No stack'}\nComponent Stack: ${errorInfo?.componentStack || 'No component stack'}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isVi = this.props.isVietnamese ?? true;
    const tabName = this.props.tabTitle || (isVi ? 'nội dung này' : 'this tab');

    return (
      <div className="w-full h-full min-h-[360px] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Ambient header glow */}
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 rounded-full opacity-80" />

          {/* Icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {isVi ? `Đã xảy ra sự cố khi tải ${tabName}` : `Something went wrong loading ${tabName}`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {isVi
                ? 'Các khu vực khác trong ứng dụng vẫn hoạt động bình thường. Bạn có thể thử tải lại hoặc quay về Trang chủ.'
                : 'Other areas of the application are working normally. You can retry loading or return to the Dashboard.'}
            </p>
          </div>

          {/* Error Message preview */}
          {this.state.error?.message && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-left text-xs font-mono text-slate-700 dark:text-slate-300 break-words max-h-24 overflow-y-auto">
              {this.state.error.message}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isVi ? 'Thử lại' : 'Retry'}</span>
            </button>

            {this.props.onNavigateHome && (
              <button
                onClick={this.props.onNavigateHome}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{isVi ? 'Bảng điều khiển' : 'Dashboard'}</span>
              </button>
            )}

            <button
              onClick={this.handleCopyError}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              title={isVi ? 'Sao chép mã lỗi để gửi hỗ trợ' : 'Copy error details for support'}
            >
              {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{this.state.copied ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Chép lỗi' : 'Copy error')}</span>
            </button>
          </div>

          {/* Collapsible Technical Details */}
          {this.state.error?.stack && (
            <div className="pt-2 text-left">
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mx-auto cursor-pointer"
              >
                <span>{isVi ? 'Chi tiết kỹ thuật (dành cho lập trình viên)' : 'Technical details (for developers)'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 custom-scrollbar border border-slate-800 leading-relaxed text-left">
                  <div className="font-bold text-rose-400 mb-1">{this.state.error.toString()}</div>
                  <pre className="whitespace-pre-wrap text-slate-400">{this.state.error.stack}</pre>
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <div className="font-bold text-amber-400 mb-1">Component Stack:</div>
                      <pre className="whitespace-pre-wrap text-slate-400">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }
}

export default TabErrorBoundary;
