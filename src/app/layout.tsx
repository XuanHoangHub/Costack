import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TranslationProvider } from "@/contexts/TranslationContext";
import InlineHeadScript from "@/components/InlineHeadScript";
import { Analytics } from "@vercel/analytics/next";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const INITIAL_THEME_SCRIPT = `(function(){try{var mode=localStorage.getItem('apexa_theme_mode');if(mode!=='light'&&mode!=='dark'&&mode!=='system'){var legacy=localStorage.getItem('apexa_dark_mode');mode=legacy===null?'system':legacy==='true'?'dark':'light'}var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var root=document.documentElement;root.classList.toggle('dark',dark);root.dataset.theme=dark?'dark':'light';root.dataset.themeMode=mode;root.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
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
  metadataBase: new URL(APP_URL),
  title: {
    default: "Apexa — Vận hành cả doanh nghiệp trong một workspace",
    template: "%s · Apexa",
  },
  description: "Kết nối công việc, kiến thức, khách hàng, tài chính và AI trong một nhịp vận hành rõ ràng cho đội ngũ hiện đại.",
  applicationName: "Apexa",
  authors: [{ name: "Apexa" }],
  creator: "Apexa",
  publisher: "Apexa",
  category: "productivity",
  keywords: ["quản lý công việc", "workspace", "kanban", "CRM", "ERP", "tài liệu", "trợ lý AI", "Apexa"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: "en_US",
    url: "/",
    siteName: "Apexa",
    title: "Apexa — Vận hành cả doanh nghiệp",
    description: "Công việc, kiến thức, khách hàng và dòng tiền — trong một nhịp vận hành.",
    images: [{ url: "/og.png", alt: "Apexa — Vận hành cả doanh nghiệp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apexa — Vận hành cả doanh nghiệp",
    description: "Một workspace cho công việc, kiến thức, khách hàng, tài chính và AI.",
    images: ["/og.png"],
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

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Apexa",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Productivity",
  operatingSystem: "Web",
  url: APP_URL,
  description: "Không gian làm việc hợp nhất cho công việc, tài liệu, cộng tác, CRM, ERP, tài chính và trợ lý AI.",
  inLanguage: ["vi", "en"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "VND",
    category: "Free plan",
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
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <InlineHeadScript id="initial-theme" html={INITIAL_THEME_SCRIPT} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col font-sans bg-[var(--cu-bg)] text-[var(--cu-text-primary)] antialiased`}>
        <TranslationProvider>
          {children}
        </TranslationProvider>
        <Analytics />
      </body>
    </html>
  );
}
