import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { TranslationProvider } from "@/contexts/TranslationContext";
import SecurityGuard from "@/components/SecurityGuard";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avaxa Productivity",
  description: "All-in-one productivity workspace for engineering, design, and business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
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
      <body className={`${inter.className} min-h-full flex flex-col font-sans bg-white dark:bg-black text-slate-900 dark:text-slate-100`}>
        <SecurityGuard />
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
