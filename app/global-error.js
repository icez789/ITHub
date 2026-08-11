'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, background: '#0a0a0a', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box' }}>
          <section role="alert" style={{ maxWidth: 560, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }} aria-hidden="true">⚠️</div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>ระบบขัดข้องชั่วคราว</h1>
            <p style={{ color: '#d4d4d4', lineHeight: 1.7 }}>
              กรุณาลองโหลดอีกครั้ง หากยังพบปัญหาให้กลับมาใหม่ในอีกสักครู่
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ marginTop: 16, border: 0, borderRadius: 8, background: '#dc2626', color: 'white', padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}
            >
              ลองโหลดอีกครั้ง
            </button>
            {error?.digest && <p style={{ color: '#737373', fontSize: 12, marginTop: 20 }}>รหัสข้อผิดพลาด: {error.digest}</p>}
          </section>
        </main>
      </body>
    </html>
  );
}
