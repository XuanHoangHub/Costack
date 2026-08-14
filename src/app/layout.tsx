import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { TranslationProvider } from "@/contexts/TranslationContext";
import SecurityGuard from "@/components/SecurityGuard";

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
  title: "Apexa Productivity",
  description: "All-in-one productivity workspace for engineering, design, and business.",
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
        <Script
          id="initial-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('apexa_dark_mode');var dark=saved===null?window.matchMedia('(prefers-color-scheme: dark)').matches:saved==='true';var root=document.documentElement;root.classList.toggle('dark',dark);root.dataset.theme=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';}catch(e){}})();`,
          }}
        />
        <Script
          id="ignore-extension-errors"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const ignoreError = (event) => {
                  try {
                    const filename = event.filename;
                    const error = event.error;
                    const message = event.message;
                    
                    const isExtensionError = 
                      (typeof filename === 'string' && filename.includes('chrome-extension://')) ||
                      (error && error.stack && typeof error.stack === 'string' && error.stack.includes('chrome-extension://')) ||
                      (typeof message === 'string' && (message.includes('chrome-extension://') || message.includes('Cannot redefine property: ethereum')));
                    
                    if (isExtensionError) {
                      event.stopImmediatePropagation();
                      event.preventDefault();
                    }
                  } catch (e) {}
                };

                const ignoreRejection = (event) => {
                  try {
                    const reason = event.reason;
                    
                    const isExtensionError = 
                      (reason && reason.stack && typeof reason.stack === 'string' && reason.stack.includes('chrome-extension://')) ||
                      (reason && reason.message && typeof reason.message === 'string' && (reason.message.includes('chrome-extension://') || reason.message.includes('Cannot redefine property: ethereum')));

                    if (isExtensionError) {
                      event.stopImmediatePropagation();
                      event.preventDefault();
                    }
                  } catch (e) {}
                };

                window.addEventListener('error', ignoreError, true);
                window.addEventListener('unhandledrejection', ignoreRejection, true);
              })();
            `
          }}
        />
      </head>
      <body className={`${plusJakarta.className} min-h-full flex flex-col font-sans bg-[var(--cu-bg)] dark:bg-[var(--cu-bg)] text-[var(--cu-text-primary)] antialiased`}>
        <SecurityGuard />
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
