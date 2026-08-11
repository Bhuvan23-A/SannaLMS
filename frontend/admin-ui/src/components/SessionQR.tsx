'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Self-hosted session QR code.
 *
 * Previously the QR image was fetched from api.qrserver.com, a third-party
 * service that ad blockers and corporate/school firewalls frequently block —
 * which showed a "forbidden resource" error on some users' machines. The QR is
 * now generated entirely in the browser from the session token, so it can never
 * be blocked (#fix). If generation somehow fails, a neutral placeholder is
 * shown instead of a broken image (the raw token + copy button remain).
 */
export default function SessionQR({ token, size = 56 }: { token: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(token, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (alive) setDataUrl(url); })
      .catch(() => { if (alive) setDataUrl(''); });
    return () => { alive = false; };
  }, [token]);

  if (!dataUrl) {
    return (
      <div
        title="QR code unavailable — use the token below"
        style={{
          width: size,
          height: size,
          background: '#fff',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        🔒
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Session QR code"
      style={{ background: '#fff', padding: '4px', borderRadius: '6px', width: size, height: size, flexShrink: 0 }}
    />
  );
}
