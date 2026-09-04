import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { resolveCaseFileUrl, releaseCaseFileUrl } from "@/lib/storagePipeline";
import { cn } from "@/lib/utils";

/**
 * Renders a patient-case image held in Storage, addressed by path.
 *
 * The blob is fetched through the SDK so Storage Rules are enforced, and the
 * object URL is revoked on unmount. Values that still look like a URL are
 * rendered directly — those are legacy `getDownloadURL` tokens from before
 * paths were adopted.
 */
export function CaseImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt?: string;
  className?: string;
}) {
  const isLegacyUrl = /^https?:\/\//.test(path);
  const [src, setSrc] = useState<string | null>(isLegacyUrl ? path : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isLegacyUrl) return;

    let cancelled = false;
    let created: string | null = null;

    resolveCaseFileUrl(path)
      .then((url) => {
        if (cancelled) {
          releaseCaseFileUrl(url);
          return;
        }
        created = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (created) releaseCaseFileUrl(created);
    };
  }, [path, isLegacyUrl]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100", className)}>
        <ImageOff className="size-4 text-slate-400" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100", className)}>
        <Loader2 className="size-4 animate-spin text-slate-400" />
      </div>
    );
  }

  return <img src={src} alt={alt ?? ""} className={className} onError={() => setFailed(true)} />;
}
