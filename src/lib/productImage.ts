import dentalMirror from "@/assets/dental-mirror.png";
import dentalProbe from "@/assets/dental-probe.png";
import dentalTweezers from "@/assets/dental-tweezers.png";

const BUILTIN: Record<string, string> = {
  "dental-mirror": dentalMirror,
  "dental-probe": dentalProbe,
  "dental-tweezers": dentalTweezers,
};

/**
 * Resolve a product image source.
 * Supports:
 *  - data: URLs (uploaded via admin panel, stored in localStorage)
 *  - http(s):// URLs
 *  - built-in asset keys (dental-mirror, ...)
 */
export function resolveProductImage(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("data:") || image.startsWith("http") || image.startsWith("/")) return image;
  return BUILTIN[image] ?? null;
}

/** Read a File and return a downscaled base64 data URL (max ~512px, JPEG q=0.82). */
export function fileToCompressedDataUrl(
  file: File,
  maxSize = 512,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
