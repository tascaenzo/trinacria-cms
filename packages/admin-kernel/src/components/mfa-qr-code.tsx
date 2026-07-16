import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

/** Renders the otpauth URI locally; no enrollment secret is sent to a third party. */
export function MfaQrCode({ otpauthUrl, alt }: { otpauthUrl: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void toDataURL(otpauthUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M"
    })
      .then((value) => {
        if (!cancelled) setSrc(value);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  if (!src) {
    return <div className="h-[220px] w-[220px] animate-pulse rounded bg-[color:var(--color-surface-muted)]" />;
  }
  return <img src={src} width={220} height={220} alt={alt} className="rounded bg-white p-2" />;
}
