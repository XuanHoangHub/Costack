'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <html lang="vi">
      <head>
        <title>Khôi phục phiên làm việc · Costack</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#05060b', color: '#f8fafc' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <section style={{ 
            maxWidth: 580, 
            width: '100%', 
            textAlign: 'center', 
            background: 'rgba(12, 14, 24, 0.95)', 
            border: '1px solid rgba(255, 255, 255, 0.12)', 
            borderRadius: 36, 
            padding: '44px 28px',
            boxShadow: '0 32px 80px -20px rgba(0, 0, 0, 0.9)',
            boxSizing: 'border-box'
          }}>
            
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 34,
              boxShadow: '0 12px 28px rgba(0,0,0,0.6)'
            }}>
              ⚠️
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 14px', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Costack đang khôi phục phiên làm việc
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: 14, margin: '0 auto 30px', maxWidth: 460 }}>
              Một gián đoạn tạm thời đã xảy ra trong tiến trình xử lý. Toàn bộ dữ liệu cục bộ của bạn đã được <strong style={{ color: '#38bdf8', whiteSpace: 'nowrap' }}>tự động lưu an toàn</strong>.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', maxWidth: 440, margin: '0 auto' }}>
              <button 
                onClick={reset} 
                style={{ 
                  flex: '1 1 180px',
                  height: 52,
                  border: 0, 
                  borderRadius: 16, 
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)', 
                  color: '#fff', 
                  padding: '0 24px', 
                  fontWeight: 900, 
                  fontSize: 14, 
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(37, 99, 235, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box'
                }}
              >
                <span>🔄 Thử tải lại ngay</span>
              </button>
              <button 
                onClick={() => router.push('/')} 
                style={{ 
                  flex: '1 1 150px',
                  height: 52,
                  border: '1px solid rgba(255,255,255,0.12)', 
                  borderRadius: 16, 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  color: '#e2e8f0', 
                  padding: '0 20px', 
                  fontWeight: 700, 
                  fontSize: 14, 
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box'
                }}
              >
                <span>🏠 Về Trang chủ</span>
              </button>
            </div>

          </section>
        </main>
      </body>
    </html>
  );
}
