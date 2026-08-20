import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TranslationProvider } from "@/contexts/TranslationContext";
import SecurityGuard from "@/components/SecurityGuard";
import InlineHeadScript from "@/components/InlineHeadScript";

const INITIAL_THEME_SCRIPT = `(function(){try{var mode=localStorage.getItem('apexa_theme_mode');if(mode!=='light'&&mode!=='dark'&&mode!=='system'){var legacy=localStorage.getItem('apexa_dark_mode');mode=legacy===null?'system':legacy==='true'?'dark':'light'}var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var root=document.documentElement;root.classList.toggle('dark',dark);root.dataset.theme=dark?'dark':'light';root.dataset.themeMode=mode;root.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

const IGNORE_EXTENSION_ERRORS_SCRIPT = `(function(){const ignoreError=(event)=>{try{const filename=event.filename;const error=event.error;const message=event.message;const isExtensionError=(typeof filename==='string'&&filename.includes('chrome-extension://'))||(error&&error.stack&&typeof error.stack==='string'&&error.stack.includes('chrome-extension://'))||(typeof message==='string'&&(message.includes('chrome-extension://')||message.includes('Cannot redefine property: ethereum')));if(isExtensionError){event.stopImmediatePropagation();event.preventDefault();}}catch(e){}};const ignoreRejection=(event)=>{try{const reason=event.reason;const isExtensionError=(reason&&reason.stack&&typeof reason.stack==='string'&&reason.stack.includes('chrome-extension://'))||(reason&&reason.message&&typeof reason.message==='string'&&(reason.message.includes('chrome-extension://')||reason.message.includes('Cannot redefine property: ethereum')));if(isExtensionError){event.stopImmediatePropagation();event.preventDefault();}}catch(e){}};window.addEventListener('error',ignoreError,true);window.addEventListener('unhandledrejection',ignoreRejection,true);})();`;

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "Apexa OS — Không gian làm việc AI cho đội ngũ hiện đại",
    template: "%s · Apexa OS",
  },
  description: "Quản lý công việc, tài liệu, chat thời gian thực, CRM, ERP, tài chính và trợ lý AI trong một workspace Việt–Anh.",
  applicationName: "Apexa OS",
  authors: [{ name: "Apexa OS" }],
  creator: "Apexa OS",
  publisher: "Apexa OS",
  category: "productivity",
  keywords: ["quản lý công việc", "workspace", "kanban", "CRM", "ERP", "tài liệu", "trợ lý AI", "Apexa OS"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: "en_US",
    url: "/",
    siteName: "Apexa OS",
    title: "Apexa OS — Vận hành công việc trên một workspace",
    description: "Tasks, Docs, Chat, CRM, ERP, Finance và AI — kết nối trong một không gian làm việc.",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Apexa OS" }],
  },
  twitter: {
    card: "summary",
    title: "Apexa OS — Không gian làm việc AI",
    description: "Một workspace cho công việc, tài liệu, cộng tác và vận hành.",
    images: ["/icon.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <InlineHeadScript id="initial-theme" html={INITIAL_THEME_SCRIPT} />
        <InlineHeadScript id="ignore-extension-errors" html={IGNORE_EXTENSION_ERRORS_SCRIPT} />
      </head>
      <body className={`${plusJakarta.className} min-h-full flex flex-col font-sans bg-white dark:bg-[#080A10] text-[var(--cu-text-primary)] antialiased`}>
        <SecurityGuard />
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
