import { useState } from "react";
import { FileBox, Loader2 } from "lucide-react";
import { resolveCaseFileUrl, releaseCaseFileUrl } from "@/lib/storagePipeline";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Downloads a patient case file by storage path.
 *
 * Fetching happens on click rather than on render: nothing is transferred until
 * someone actually asks for the file, which keeps egress off every list view,
 * and Storage Rules are evaluated against the caller at that moment. A stored
 * download URL would instead be a permanent unauthenticated handle.
 *
 * `url` is the legacy fallback for attachments written before paths existed.
 */
export function CaseFileLink({
  name,
  path,
  url,
  className,
}: {
  name: string;
  path?: string;
  url?: string;
  className?: string;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (!path) return;
    setBusy(true);
    setError(null);
    let objectUrl: string | null = null;
    try {
      objectUrl = await resolveCaseFileUrl(path);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError(ar ? "تعذر فتح الملف" : "Could not open file");
    } finally {
      // The anchor click is synchronous, so the blob can be released once the
      // browser has taken the download.
      const created = objectUrl;
      if (created) setTimeout(() => releaseCaseFileUrl(created), 30_000);
      setBusy(false);
    }
  };

  // Pre-path attachments only ever carried a URL.
  if (!path && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn("flex items-center gap-2 text-xs text-sky-600 underline", className)}
      >
        <FileBox className="size-4 shrink-0 text-sky-500" />
        <span className="truncate">{name}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy || !path}
      className={cn(
        "flex items-center gap-2 text-xs text-sky-600 underline disabled:opacity-50",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <FileBox className="size-4 shrink-0 text-sky-500" />
      )}
      <span className="truncate">{name}</span>
      {error && <span className="text-rose-600">· {error}</span>}
    </button>
  );
}
