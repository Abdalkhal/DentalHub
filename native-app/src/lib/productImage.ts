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
// NOTE: removed — this used web-only APIs (document.createElement("canvas"),
// FileReader, Image) and is unused in native-app. Image upload on RN goes
// through expo-image-picker + uploadProductImage instead.

