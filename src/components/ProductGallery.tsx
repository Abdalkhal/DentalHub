import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  urls: string[];
  alt: string;
  size?: "sm" | "md";
};

/** Inline horizontal thumbnail strip; tap to open a fullscreen viewer. */
export function ProductGallery({ urls, alt, size = "md" }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  if (urls.length === 0) return null;
  const thumb = size === "sm" ? "size-10" : "size-14";
  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        {urls.map((u, i) => (
          <button
            key={u + i}
            type="button"
            onClick={() => setOpen(i)}
            className={`${thumb} shrink-0 rounded-lg overflow-hidden bg-surface border border-border`}
            aria-label={`${alt} – ${i + 1}`}
          >
            <img
              src={u}
              alt={`${alt} ${i + 1}`}
              loading="lazy"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
      {open !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(null);
            }}
            className="absolute top-4 right-4 size-9 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="close"
          >
            <X className="size-5" />
          </button>
          <div
            className="w-full max-w-screen-sm px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory"
            onClick={(e) => e.stopPropagation()}
          >
            {urls.map((u, i) => (
              <img
                key={u + i}
                src={u}
                alt={`${alt} ${i + 1}`}
                className="max-h-[80vh] w-auto object-contain snap-center shrink-0 mx-auto"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
