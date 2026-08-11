import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Self-hosted QR code for attendance sessions. Generated entirely in the
 * browser so third-party QR APIs (api.qrserver.com) that some networks and ad
 * blockers forbid are never contacted (#fix).
 */
export default function SessionQR({ token, size = 110 }: { token: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(token, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (alive) setDataUrl(url); })
      .catch(() => { if (alive) setDataUrl(''); });
    return () => { alive = false; };
  }, [token]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt="Session QR code"
      style={{ background: '#fff', padding: '6px', borderRadius: '8px', maxWidth: size }}
    />
  );
}
