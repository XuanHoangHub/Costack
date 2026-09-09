"use client";

import React from "react";
import { Banknote, CreditCard, Landmark, Wallet } from "lucide-react";
import { detectBank } from "./bankData";

interface AccountBankIconProps {
  bank?: string;
  color?: string;
  type?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AccountBankIcon({
  bank = "",
  color,
  type,
  size = "md",
  className = "",
}: AccountBankIconProps) {
  const bankInfo = React.useMemo(() => detectBank(bank), [bank]);
  const activeColor = color && color !== "blue" ? color : bankInfo.brandColor;

  const sizeClasses = {
    sm: "h-7 w-7 text-[10px] rounded-lg",
    md: "h-10 w-10 text-xs rounded-xl",
    lg: "h-13 w-13 text-sm rounded-2xl",
  }[size];

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 26,
  }[size];

  // Render SVG biểu trưng sắc nét cho từng ngân hàng & ví
  const renderBankLogo = () => {
    switch (bankInfo.iconType) {
      case "vcb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#005432" />
            <path d="M18 7L27 15L22 27H14L9 15L18 7Z" stroke="#70b82c" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
            <path d="M14 17L18 22L22 17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case "tcb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#e11b22" />
            {/* Hai hình thoi kép đặc trưng của Techcombank */}
            <rect x="11" y="11" width="10" height="10" transform="rotate(45 11 11)" fill="#ffffff" />
            <rect x="17" y="17" width="10" height="10" transform="rotate(45 17 17)" fill="#111827" />
          </svg>
        );

      case "mb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#0033a0" />
            {/* Sao đỏ và các sọc sao MB */}
            <path d="M18 8L20.5 14H27L21.5 17.5L23.5 24L18 20L12.5 24L14.5 17.5L9 14H15.5L18 8Z" fill="#e11b22" />
            <path d="M10 27H26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case "acb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#005baa" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="11" letterSpacing="0.5">ACB</text>
            <circle cx="28" cy="11" r="3" fill="#00a3e0" />
          </svg>
        );

      case "vpb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#009e52" />
            {/* Cánh hoa sen cách điệu VPBank màu cam đỏ */}
            <path d="M18 10C18 10 24 14 24 20C24 23 21 26 18 26C15 26 12 23 12 20C12 14 18 10 18 10Z" fill="#ff671f" />
            <path d="M18 15C18 15 21 17 21 21C21 22.5 19.5 24 18 24C16.5 24 15 22.5 15 21C15 17 18 15 18 15Z" fill="#ffffff" />
          </svg>
        );

      case "bidv":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#00685e" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="9.5" letterSpacing="0.5">BIDV</text>
            <path d="M8 26C14 28 22 28 28 26" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case "ctg":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#005596" />
            <circle cx="18" cy="18" r="9" stroke="#ffffff" strokeWidth="2" fill="none" />
            <path d="M18 9A9 9 0 0 1 27 18H18V9Z" fill="#d32f2f" />
          </svg>
        );

      case "tpb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#6c2382" />
            {/* Tam giác xoắn TPBank */}
            <path d="M18 9L27 25H9L18 9Z" stroke="#f58220" strokeWidth="3" strokeLinejoin="round" fill="none" />
            <path d="M18 14L22 22H14L18 14Z" fill="#ffffff" />
          </svg>
        );

      case "stb":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#004b8d" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="10" letterSpacing="0.5">STB</text>
          </svg>
        );

      case "vib":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#0057b7" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="11" letterSpacing="0.8">VIB</text>
            <circle cx="27" cy="12" r="2.5" fill="#f26522" />
          </svg>
        );

      case "momo":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#d82d8b" />
            <circle cx="18" cy="18" r="9" fill="#ffffff" />
            <path d="M13 21V15L15.5 18L18 15V21" stroke="#d82d8b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 21V15L20.5 18L23 15V21" stroke="#d82d8b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case "zalopay":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#008fe5" />
            <path d="M12 12H24L14 24H24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="23" cy="13" r="2" fill="#22c55e" />
          </svg>
        );

      case "viettel":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#ea1d25" />
            <path d="M12 13L18 24L24 13" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case "cash":
        return (
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
            <Banknote size={iconSizes} strokeWidth={2.2} />
          </div>
        );

      case "card":
        return (
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-sm">
            <CreditCard size={iconSizes} strokeWidth={2.2} />
          </div>
        );

      case "paypal":
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#003087" />
            <path d="M14 25L16 11H21C23.5 11 24.5 12.5 24 15C23.5 17.5 21.5 19 19 19H16.5L15 25H14Z" fill="#0079c1" />
            <path d="M16 23L17.5 13H22C24 13 25 14.2 24.5 16.2C24 18.2 22.5 19.5 20.5 19.5H18.5L17.2 25H16Z" fill="#ffffff" fillOpacity="0.85" />
          </svg>
        );

      default: {
        // Tự tạo huy hiệu Monogram viết tắt sang trọng nếu là tài khoản tùy chỉnh
        const initials = bank
          .split(" ")
          .filter(Boolean)
          .map(w => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "TK";

        return (
          <div
            className="flex h-full w-full items-center justify-center rounded-xl font-black text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${activeColor}, ${adjustColor(activeColor, -30)})`,
            }}
          >
            <span>{initials}</span>
          </div>
        );
      }
    }
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-black/10 dark:border-white/15 shadow-sm transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      title={bankInfo.fullName || bank}
    >
      {renderBankLogo()}
    </div>
  );
}

// Hàm làm sáng/tối màu hex cho gradient
function adjustColor(hex: string, amount: number): string {
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color.split("").map(c => c + c).join("");
  }
  const num = parseInt(color, 16);
  if (isNaN(num)) return "#4f46e5";
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
