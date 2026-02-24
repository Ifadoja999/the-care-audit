import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'The Care Audit — Assisted Living Facility Inspection Reports';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              color: 'white',
              fontWeight: 700,
            }}
          >
            CA
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, color: 'white' }}>
            The Care Audit
          </div>
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
          Assisted Living Facility Inspection Reports
        </div>
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
          Free inspection reports for all 50 states &bull; Updated monthly
        </div>
      </div>
    ),
    { ...size }
  );
}
