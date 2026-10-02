import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Loose match for hand-typed Arabic/English names (spacing, case,
// punctuation, alef/yaa variants) — same as native's utils.
export function normalizeName(s: string): string {
  return s
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim()
    .toLowerCase();
}
