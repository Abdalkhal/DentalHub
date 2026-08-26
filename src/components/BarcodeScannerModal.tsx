import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, ScanBarcode, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function BarcodeScannerModal({ onScan, onClose }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const containerId = useRef<string>(`barcode-scanner-${crypto.randomUUID()}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch { /* already stopped */ }
    try {
      scanner.clear();
    } catch { /* already cleared */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(containerId.current, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (cancelled) return;
          void stop();
          onScan(decodedText);
        },
        () => { /* ignore per-frame decode errors */ },
      )
      .catch((e: unknown) => {
        if (cancelled) return;
        setStarting(false);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
      void stop();
    };
  }, [onScan, stop]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <button
          type="button"
          onClick={() => {
            void stop();
            onClose();
          }}
          className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition"
          aria-label={ar ? "إغلاق" : "Close"}
        >
          <X className="size-4" />
        </button>
        <span className="font-display font-extrabold text-sm flex items-center gap-2">
          <ScanBarcode className="size-4" />
          {ar ? "مسح الباركود" : "Scan Barcode"}
        </span>
        <span className="size-9" />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div id={containerId.current} className="absolute inset-0 flex items-center justify-center" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="size-56 rounded-2xl border-2 border-white/70" />
        </div>
        {starting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            <Loader2 className="size-7 animate-spin" />
            <p className="text-xs font-semibold">{ar ? "جارٍ تشغيل الكاميرا..." : "Starting camera..."}</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 bottom-6 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 text-center">
            <p className="text-xs font-semibold text-rose-200 mb-2">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setStarting(true);
                onClose();
              }}
              className="w-full h-10 rounded-xl bg-white text-slate-900 text-xs font-bold"
            >
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 text-center text-[11px] text-white/60 shrink-0">
        {ar ? "وجّه الكاميرا نحو الباركود حتى يتم التعرف عليه تلقائياً" : "Point the camera at the barcode to scan it automatically"}
      </div>
    </div>
  );
}
