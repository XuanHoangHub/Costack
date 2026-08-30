'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <head>
        <title>Sự cố ứng dụng · Apexa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#070b14', color: '#f8fafc' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <section style={{ 
            maxWidth: 480, 
            width: '100%', 
            textAlign: 'center', 
            background: 'rgba(12, 18, 34, 0.9)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: 32, 
            padding: '40px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '6px 14px', 
              borderRadius: 9999, 
              background: 'rgba(245, 158, 11, 0.12)', 
              color: '#fcd34d', 
              fontSize: 12, 
              fontWeight: 800, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 20 
            }}>
              ● Chế độ tự bảo vệ dữ liệu
            </div>

            <div style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              ⚠️
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Khởi động lại phiên Apexa
            </h1>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 14, margin: '0 0 28px' }}>
              Một gián đoạn tạm thời đã xảy ra trong quá trình khởi tạo. Toàn bộ tiến trình làm việc và dữ liệu cục bộ của bạn đã được bảo vệ an toàn.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={reset} 
                style={{ 
                  border: 0, 
                  borderRadius: 16, 
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)', 
                  color: '#fff', 
                  padding: '14px 28px', 
                  fontWeight: 800, 
                  fontSize: 14, 
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)'
                }}
              >
                Khởi động lại ngay
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
