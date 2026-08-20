'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#07090e', color: '#fff' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900 }}>Apexa OS</div>
            <h1>Không thể khởi tạo ứng dụng</h1>
            <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>Hãy thử khởi động lại giao diện. Dữ liệu đã lưu trên thiết bị không bị xóa.</p>
            <button onClick={reset} style={{ border: 0, borderRadius: 12, background: '#2563eb', color: '#fff', padding: '12px 20px', fontWeight: 800, cursor: 'pointer' }}>Khởi động lại</button>
          </section>
        </main>
      </body>
    </html>
  );
}

