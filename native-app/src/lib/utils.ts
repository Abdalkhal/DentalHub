import { clsx, type ClassValue } from "clsx";

// NOTE: `tailwind-merge` will be added once NativeWind is configured (Phase 1).
// For now this simply joins truthy class names.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Normalizes a hand-typed name for matching (diacritics, letter variants,
 * punctuation, case). Two free-text fields that should refer to the same
 * person only line up if every place that groups or matches names uses this
 * same function — using a plain `.trim()` in one place and this in another
 * silently splits one doctor into two buckets.
 */
export function normalizeName(s: string): string {
  return s
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim()
    .toLowerCase();
}
