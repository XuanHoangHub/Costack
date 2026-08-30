import { ImageResponse } from 'next/og';

export const socialImageSize = { width: 1200, height: 630 };

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 84px',
          color: '#f8fafc',
          background: 'linear-gradient(135deg, #070b18 0%, #172554 52%, #312e81 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 38,
              fontWeight: 900,
              color: 'white',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: '0 18px 50px rgba(37, 99, 235, 0.35)',
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>Apexa</div>
            <div style={{ marginTop: 4, fontSize: 18, color: '#a5b4fc' }}>AI Productivity Workspace</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 900, letterSpacing: -3 }}>
            Công việc, tài liệu và vận hành trong một workspace.
          </div>
          <div style={{ marginTop: 28, fontSize: 26, lineHeight: 1.4, color: '#cbd5e1' }}>
            Tasks · Smart Docs · Realtime Chat · CRM · ERP · Finance · Apexa Brain AI
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, fontSize: 18, color: '#bfdbfe' }}>
          <span>Việt–Anh</span>
          <span>•</span>
          <span>Local-first</span>
          <span>•</span>
          <span>Workspace RLS</span>
        </div>
      </div>
    ),
    socialImageSize,
  );
}
